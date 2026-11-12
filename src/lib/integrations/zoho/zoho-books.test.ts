/** @vitest-environment node */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { planCustomerWrite } from "./apply-plan";
import { zohoBooksGet, zohoBooksReadOperations } from "./client";
import {
  adminAccessDecision,
  inspectRedirectUri,
  isAllowedApiDomain,
  readZohoConfig,
  resolveAccountsServer,
} from "./config";
import { decryptSecret, encryptSecret, mergeRefreshToken, safeEqual } from "./crypto";
import { duplicateCustomerReason, hasAnotherContactPage, matchZohoContact } from "./matching";
import { buildAuthorizationUrl, evaluateOAuthState, parseTokenResponse } from "./oauth";
import { proposeCustomerChanges } from "./proposals";
import { FINANCIAL_WRITES_ENABLED, type NovaCustomer, type ZohoContact } from "./types";

function customer(overrides: Partial<NovaCustomer> = {}): NovaCustomer {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Kambaku Lodge",
    tradingName: null,
    email: null,
    phone: null,
    vatNumber: null,
    registrationNumber: null,
    billingAddress: null,
    physicalAddress: "Lodge gate, Hoedspruit",
    contactPerson: null,
    legacyZohoCustomerId: null,
    ...overrides,
  };
}

function contact(overrides: Partial<ZohoContact> = {}): ZohoContact {
  return {
    contactId: "9001",
    contactName: "Kambaku Safari Lodge (Pty) Ltd",
    companyName: "Kambaku Safari Lodge (Pty) Ltd",
    email: null,
    phone: null,
    mobile: null,
    vatNumber: null,
    registrationNumber: null,
    billingAddress: null,
    contactPerson: null,
    status: "active",
    detailLoaded: true,
    ...overrides,
  };
}

describe("administrator access", () => {
  it("rejects signed-out, inactive and non-admin users", () => {
    expect(adminAccessDecision(null, null)).toBe("unauthenticated");
    expect(adminAccessDecision("user", { role: "admin", is_active: false })).toBe("forbidden");
    expect(adminAccessDecision("user", { role: "dispatcher", is_active: true })).toBe("forbidden");
    expect(adminAccessDecision("user", { role: "technician", is_active: true })).toBe("forbidden");
    expect(adminAccessDecision("user", { role: "admin", is_active: true })).toBe("ok");
  });
});

describe("Zoho configuration", () => {
  it("reports missing variables without returning their values", () => {
    const previous = {
      id: process.env.ZOHO_CLIENT_ID,
      secret: process.env.ZOHO_CLIENT_SECRET,
      redirect: process.env.ZOHO_REDIRECT_URI,
      accounts: process.env.ZOHO_ACCOUNTS_URL,
      key: process.env.ZOHO_TOKEN_ENCRYPTION_KEY,
    };
    delete process.env.ZOHO_CLIENT_ID;
    delete process.env.ZOHO_CLIENT_SECRET;
    delete process.env.ZOHO_REDIRECT_URI;
    delete process.env.ZOHO_ACCOUNTS_URL;
    delete process.env.ZOHO_TOKEN_ENCRYPTION_KEY;
    const result = readZohoConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual(
        expect.arrayContaining([
          "ZOHO_CLIENT_ID",
          "ZOHO_CLIENT_SECRET",
          "ZOHO_REDIRECT_URI",
          "ZOHO_ACCOUNTS_URL",
          "ZOHO_TOKEN_ENCRYPTION_KEY",
        ])
      );
      expect(JSON.stringify(result)).not.toMatch(/1000\./);
    }
    const restore = (name: string, value: string | undefined) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    };
    restore("ZOHO_CLIENT_ID", previous.id);
    restore("ZOHO_CLIENT_SECRET", previous.secret);
    restore("ZOHO_REDIRECT_URI", previous.redirect);
    restore("ZOHO_ACCOUNTS_URL", previous.accounts);
    restore("ZOHO_TOKEN_ENCRYPTION_KEY", previous.key);
  });

  it("accepts the registered callback when it has quotes or a trailing slash", () => {
    expect(
      inspectRedirectUri(' "https://www.novafire.co.za/api/integrations/zoho/callback/" ')
    ).toEqual({
      valid: true,
      normalized: "https://www.novafire.co.za/api/integrations/zoho/callback",
      problem: null,
      upgradedFromHttp: false,
    });
    expect(inspectRedirectUri("http://www.novafire.co.za/api/integrations/zoho/callback")).toEqual({
      valid: true,
      normalized: "https://www.novafire.co.za/api/integrations/zoho/callback",
      problem: null,
      upgradedFromHttp: true,
    });
    expect(inspectRedirectUri("https://www.novafire.co.za").problem).toMatch(/path is \//);
  });

  it("uses the accounts server Zoho returns and ignores an untrusted host", () => {
    expect(
      resolveAccountsServer({
        configuredAccountsUrl: "https://accounts.zoho.com",
        accountsServer: "https://accounts.zoho.eu",
        location: "eu",
      })
    ).toEqual({ ok: true, accountsUrl: "https://accounts.zoho.eu" });
    expect(
      resolveAccountsServer({
        configuredAccountsUrl: "https://accounts.zoho.com",
        accountsServer: "https://evil.example",
        location: null,
      })
    ).toEqual({ ok: true, accountsUrl: "https://accounts.zoho.com" });
    expect(
      resolveAccountsServer({
        configuredAccountsUrl: "https://evil.example",
        accountsServer: "https://also-evil.example",
        location: "zz",
      }).ok
    ).toBe(false);
    expect(isAllowedApiDomain("https://www.zohoapis.eu")).toBe(true);
    expect(isAllowedApiDomain("https://books.example.com")).toBe(false);
  });
});

describe("OAuth state and tokens", () => {
  const record = {
    adminUserId: "admin-1",
    expiresAt: new Date("2026-11-11T12:10:00Z"),
    consumedAt: null,
  };

  it("rejects mismatched, expired and replayed state", () => {
    expect(
      evaluateOAuthState({
        queryState: "a",
        cookieState: "b",
        record,
        currentUserId: "admin-1",
        now: new Date("2026-11-11T12:00:00Z"),
        statesMatch: false,
      }).ok
    ).toBe(false);
    expect(
      evaluateOAuthState({
        queryState: "a",
        cookieState: "a",
        record,
        currentUserId: "someone-else",
        now: new Date("2026-11-11T12:00:00Z"),
        statesMatch: true,
      })
    ).toMatchObject({ ok: false, reason: "mismatch" });
    expect(
      evaluateOAuthState({
        queryState: "a",
        cookieState: "a",
        record,
        currentUserId: "admin-1",
        now: new Date("2026-11-11T12:11:00Z"),
        statesMatch: true,
      })
    ).toMatchObject({ ok: false, reason: "expired" });
    expect(
      evaluateOAuthState({
        queryState: "a",
        cookieState: "a",
        record: { ...record, consumedAt: new Date("2026-11-11T12:01:00Z") },
        currentUserId: "admin-1",
        now: new Date("2026-11-11T12:02:00Z"),
        statesMatch: true,
      })
    ).toMatchObject({ ok: false, reason: "replay" });
    expect(
      evaluateOAuthState({
        queryState: "a",
        cookieState: "a",
        record,
        currentUserId: "admin-1",
        now: new Date("2026-11-11T12:02:00Z"),
        statesMatch: safeEqual("a", "a"),
      }).ok
    ).toBe(true);
  });

  it("builds an offline consent URL for the configured region and read-only scopes", () => {
    const url = new URL(
      buildAuthorizationUrl(
        {
          clientId: "client",
          clientSecret: "secret",
          redirectUri: "https://www.novafire.co.za/api/integrations/zoho/callback",
          accountsUrl: "https://accounts.zoho.eu",
          encryptionKey: Buffer.alloc(32),
          scopes: [
            "ZohoBooks.settings.READ",
            "ZohoBooks.contacts.READ",
            "ZohoBooks.estimates.READ",
            "ZohoBooks.invoices.READ",
          ],
        },
        "state-1"
      )
    );
    expect(url.origin).toBe("https://accounts.zoho.eu");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("state-1");
    expect(url.searchParams.get("scope")).not.toContain("CREATE");
    expect(url.searchParams.get("scope")).not.toContain(".ALL");
  });

  it("rejects an unknown API domain and keeps the stored refresh token when Zoho omits a new one", () => {
    expect(parseTokenResponse({ access_token: "a", api_domain: "https://evil.example", expires_in: 3600 }).ok).toBe(false);
    expect(
      parseTokenResponse({
        access_token: "access",
        refresh_token: "refresh",
        api_domain: "https://www.zohoapis.eu",
        expires_in: 3600,
      })
    ).toMatchObject({ ok: true, token: { apiDomain: "https://www.zohoapis.eu", refreshToken: "refresh" } });
    expect(parseTokenResponse({ error: "invalid_code" })).toEqual({
      ok: false,
      error: "Zoho authorisation failed (invalid_code).",
    });
    expect(mergeRefreshToken("stored-refresh", null)).toBe("stored-refresh");
    expect(mergeRefreshToken("stored-refresh", "")).toBe("stored-refresh");
    expect(mergeRefreshToken("stored-refresh", "next-refresh")).toBe("next-refresh");
  });

  it("round-trips token ciphertext and rejects tampering", () => {
    const key = Buffer.from("a".repeat(32));
    const encrypted = encryptSecret("refresh-token", key);
    expect(encrypted).not.toContain("refresh-token");
    expect(decryptSecret(encrypted, key)).toBe("refresh-token");
    const [version, iv, tag, data] = encrypted.split(".");
    expect(() => decryptSecret([version, iv, tag, `${data}x`].join("."), key)).toThrow();
  });
});

describe("customer matching", () => {
  it("updates an abbreviated lodge name when a unique contact detail confirms it", () => {
    const result = matchZohoContact({
      contact: contact({ email: "reservations@kambaku.example" }),
      customers: [customer({ email: "reservations@kambaku.example" })],
      mappings: [],
    });
    expect(result).toMatchObject({
      category: "verified_match",
      customerId: "11111111-1111-4111-8111-111111111111",
    });
    expect(["abbreviated_name", "unique_email"]).toContain(result.method);
    const proposals = proposeCustomerChanges(
      customer({ email: "reservations@kambaku.example" }),
      contact({ email: "reservations@kambaku.example", billingAddress: "12 Accounts Road" })
    );
    expect(proposals.find((item) => item.field === "name")?.action).toBe("update");
    expect(proposals.find((item) => item.field === "trading_name")).toMatchObject({
      action: "add",
      zoho: "Kambaku Lodge",
    });
    expect(proposals.find((item) => item.field === "billing_address")?.action).toBe("add");
    expect(proposals.find((item) => item.field === "physical_address")?.action).toBe("preserve");
    expect(proposals.find((item) => item.field === "site_addresses")?.action).toBe("preserve");
  });

  it("does not automatically merge different lodges that share a management email", () => {
    const result = matchZohoContact({
      contact: contact({
        contactId: "2",
        contactName: "Sabi Sand House",
        companyName: "Sabi Sand House",
        email: "accounts@management.example",
      }),
      customers: [
        customer({ id: "a", name: "Kambaku Lodge", email: "accounts@management.example" }),
        customer({ id: "b", name: "Londolozi House", email: "accounts@management.example" }),
      ],
      mappings: [],
    });
    expect(result.category).toBe("unmatched");
  });

  it("sends a similar legal name without supporting evidence to review", () => {
    const result = matchZohoContact({
      contact: contact({ contactId: "3", contactName: "Rethread Mbombela", companyName: "Rethread Mbombela" }),
      customers: [customer({ name: "Rethread" })],
      mappings: [],
    });
    expect(result.category).toBe("needs_review");
    expect(result.customerId).toBeNull();
  });

  it("accepts Rethread Mbombela when the phone number uniquely confirms it", () => {
    const result = matchZohoContact({
      contact: contact({
        contactName: "Rethread Mbombela",
        companyName: "Rethread Mbombela",
        phone: "+27 13 555 0101",
      }),
      customers: [customer({ name: "Rethread", phone: "0135550101" })],
      mappings: [],
    });
    expect(result.category).toBe("verified_match");
    expect(["abbreviated_name", "unique_phone"]).toContain(result.method);
  });

  it("reuses an existing mapping and does not propose a second customer", () => {
    const existing = customer();
    const result = matchZohoContact({
      contact: contact(),
      customers: [existing, customer({ id: "other", name: "Another Lodge" })],
      mappings: [{ zohoContactId: "9001", customerId: existing.id }],
    });
    expect(result).toMatchObject({ category: "verified_match", method: "existing_mapping", customerId: existing.id });
  });

  it("holds a second Zoho contact when the customer is already mapped", () => {
    const result = matchZohoContact({
      contact: contact({ contactId: "9002", vatNumber: "4123456789" }),
      customers: [customer({ vatNumber: "4123456789" })],
      mappings: [{ zohoContactId: "9001", customerId: "11111111-1111-4111-8111-111111111111" }],
    });
    expect(result.category).toBe("needs_review");
    expect(result.reason).toMatch(/already mapped/i);
  });

  it("matches a unique VAT number when the names are compatible", () => {
    const result = matchZohoContact({
      contact: contact({ vatNumber: "4123456789" }),
      customers: [customer({ vatNumber: "4123 456 789" })],
      mappings: [],
    });
    expect(result).toMatchObject({ category: "verified_match", method: "vat_number" });
  });

  it("does not auto-link a unique phone when the company names disagree", () => {
    const result = matchZohoContact({
      contact: contact({
        contactName: "Northern Workshop",
        companyName: "Northern Workshop",
        phone: "0825550101",
      }),
      customers: [customer({ name: "Southern Workshop", phone: "082 555 0101" })],
      mappings: [],
    });
    expect(result.category).toBe("needs_review");
    expect(result.method).toBe("unique_phone");
    expect(result.customerId).toBeNull();
  });

  it("auto-links a unique email when the company names are compatible", () => {
    const result = matchZohoContact({
      contact: contact({
        contactName: "Acme Trading Sandton",
        companyName: "Acme Trading Sandton",
        email: "books@acme.example",
      }),
      customers: [
        customer({
          id: "22222222-2222-4222-8222-222222222222",
          name: "Acme Trading Holdings (Pty) Ltd",
          email: "books@acme.example",
        }),
      ],
      mappings: [],
    });
    expect(result).toMatchObject({
      category: "verified_match",
      method: "unique_email",
      customerId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("auto-links a unique exact name even when only Zoho has the email", () => {
    const result = matchZohoContact({
      contact: contact({
        contactName: "Kambaku Lodge",
        companyName: "Kambaku Lodge",
        email: "new@kambaku.example",
      }),
      customers: [customer({ name: "Kambaku Lodge", email: null })],
      mappings: [],
    });
    expect(result).toMatchObject({
      category: "verified_match",
      method: "normalized_name",
    });
  });

  it("refuses to create a customer that already exists by name or VAT number", () => {
    expect(
      duplicateCustomerReason(contact({ vatNumber: "4123456789" }), [
        customer({ name: "Other Lodge", vatNumber: "4123 456 789" }),
      ])
    ).toMatch(/Other Lodge/);
    expect(
      duplicateCustomerReason(
        contact({ contactName: "Kambaku Lodge", companyName: "Kambaku Lodge", vatNumber: null }),
        [customer({ name: "Kambaku Lodge" })]
      )
    ).toMatch(/already has Kambaku Lodge/);
    expect(
      duplicateCustomerReason(
        contact({ contactName: "New Workshop", companyName: "New Workshop", vatNumber: null }),
        [customer()]
      )
    ).toBeNull();
  });

  it("stops contact pagination when Zoho returns an empty extra page", () => {
    expect(hasAnotherContactPage({ has_more_page: true }, 0)).toBe(false);
    expect(hasAnotherContactPage({ has_more_page: true }, 200)).toBe(true);
    expect(hasAnotherContactPage({ has_more_page: false }, 200)).toBe(false);
  });
});

describe("customer enrichment integrity", () => {
  it("keeps the same customer id and never writes site or asset fields", () => {
    const current = customer({ email: "lodge@example.com", phone: "0820000000" });
    const zoho = contact({
      email: "accounts@example.com",
      phone: "0830000000",
      billingAddress: "Billing street",
    });
    const proposals = proposeCustomerChanges(current, zoho);
    const plan = planCustomerWrite({
      decision: "approve_update",
      customer: current,
      contact: zoho,
      proposals,
    });
    expect(plan.type).toBe("update");
    if (plan.type !== "update") return;
    expect(plan.customerId).toBe(current.id);
    expect(plan.patch.name).toBe("Kambaku Safari Lodge (Pty) Ltd");
    expect(plan.patch.billing_address).toBe("Billing street");
    expect(plan.patch.email).toBeUndefined();
    expect(plan.patch.phone).toBeUndefined();
    expect(Object.keys(plan.patch)).not.toEqual(expect.arrayContaining(["physical_address", "id", "site_id"]));
    expect(JSON.stringify(plan)).not.toMatch(/assets|inspections|jobs|defects/);
  });

  it("does not overwrite a populated email with an empty Zoho value or a newer local edit", () => {
    const current = customer({ email: "kept@example.com" });
    const proposals = proposeCustomerChanges(current, contact({ email: null }));
    expect(proposals.find((item) => item.field === "email")?.action).toBe("keep");
    const stale = proposeCustomerChanges(customer({ billingAddress: null }), contact({ billingAddress: "New billing" }));
    const changedSincePreview = planCustomerWrite({
      decision: "approve_update",
      customer: customer({ billingAddress: "Entered by admin" }),
      contact: contact({ billingAddress: "New billing" }),
      proposals: stale,
    });
    expect(changedSincePreview.type).toBe("update");
    if (changedSincePreview.type === "update") {
      expect(changedSincePreview.patch.billing_address).toBeUndefined();
    }
  });

  it("blocks unconfirmed customer creation and repeated creation when the identity already exists", () => {
    const blocked = planCustomerWrite({
      decision: "create_customer",
      customer: null,
      contact: contact(),
      confirmDistinct: false,
    });
    expect(blocked).toMatchObject({ type: "blocked" });
    const duplicate = planCustomerWrite({
      decision: "create_customer",
      customer: null,
      contact: contact({ vatNumber: "4123456789" }),
      confirmDistinct: true,
      identifierTaken: true,
    });
    expect(duplicate).toMatchObject({ type: "blocked" });
  });

  it("creates a customer only from Zoho billing fields", () => {
    const plan = planCustomerWrite({
      decision: "create_customer",
      customer: null,
      contact: contact({ billingAddress: "Accounts office", email: "new@example.com" }),
      confirmDistinct: true,
      identifierTaken: false,
    });
    expect(plan.type).toBe("create");
    if (plan.type !== "create") return;
    expect(plan.values.name).toBe("Kambaku Safari Lodge (Pty) Ltd");
    expect(plan.values).not.toHaveProperty("physical_address");
    expect(plan.values.billing_address).toBe("Accounts office");
  });
});

describe("read-only Zoho Books client", () => {
  it("sends only GET requests with the Zoho OAuth header and refuses other paths", async () => {
    expect(FINANCIAL_WRITES_ENABLED).toBe(false);
    expect(zohoBooksReadOperations.join(" ")).not.toMatch(/create|update|delete/i);
    const calls: Array<{ url: string; method: string; authorization: string }> = [];
    const result = await zohoBooksGet({
      apiDomain: "https://www.zohoapis.eu",
      accessToken: "access-token",
      path: "/contacts",
      query: { organization_id: "42", page: 1 },
      fetchImpl: (async (url, init) => {
        calls.push({
          url: String(url),
          method: init?.method ?? "GET",
          authorization: new Headers(init?.headers).get("authorization") ?? "",
        });
        return new Response(JSON.stringify({ code: 0, contacts: [], page_context: { has_more_page: false } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }) as typeof fetch,
    });
    expect(result.ok).toBe(true);
    expect(calls[0]?.method).toBe("GET");
    expect(calls[0]?.authorization).toBe("Zoho-oauthtoken access-token");
    expect(calls[0]?.url).toContain("https://www.zohoapis.eu/books/v3/contacts");
    expect(calls[0]?.url).toContain("organization_id=42");
    const rejected = await zohoBooksGet({
      apiDomain: "https://example.com",
      accessToken: "access-token",
      path: "/invoices",
      fetchImpl: fetch,
    });
    expect(rejected.ok).toBe(false);
  });
});

describe("database safeguards", () => {
  const sql = readFileSync(
    path.join(process.cwd(), "supabase/migrations/00017_zoho_books_integration.sql"),
    "utf8"
  );

  it("prevents concurrent running previews, browser token access and financial writes", () => {
    expect(sql).toContain("where status = 'running'");
    expect(sql).toContain("revoke all on table public.zoho_books_token_secrets");
    expect(sql).toContain("revoke all on table public.zoho_oauth_states");
    expect(sql).toContain("financial_writes_enabled = false");
    expect(sql).toContain("unique (organization_id, zoho_contact_id)");
    expect(sql).not.toMatch(/drop table public\.customers|delete from public\.customers/i);
  });
});

describe("Zoho catalogue classification", () => {
  it("treats goods with item_type sales as stock, not services", async () => {
    const { classifyZohoCatalogItem } = await import("./items");
    const classified = classifyZohoCatalogItem({
      item_type: "sales",
      product_type: "goods",
      stock_on_hand: 12,
    });
    expect(classified.isInventory).toBe(true);
    expect(classified.isService).toBe(false);
  });

  it("treats product_type service as a service even when stock_on_hand is 0", async () => {
    const { classifyZohoCatalogItem } = await import("./items");
    const classified = classifyZohoCatalogItem({
      item_type: "sales",
      product_type: "service",
      stock_on_hand: 0,
    });
    expect(classified.isService).toBe(true);
    expect(classified.isInventory).toBe(false);
  });

  it("treats inventory-tracked and capital goods as stock", async () => {
    const { classifyZohoCatalogItem } = await import("./items");
    expect(
      classifyZohoCatalogItem({
        item_type: "inventory",
        product_type: "goods",
        track_inventory: true,
      }).isInventory
    ).toBe(true);
    expect(
      classifyZohoCatalogItem({
        item_type: "sales_and_purchases",
        product_type: "capital_goods",
      }).isInventory
    ).toBe(true);
    expect(
      classifyZohoCatalogItem({
        item_type: "sales",
        product_type: "capital_service",
      }).isService
    ).toBe(true);
  });

  it("never classifies goods named like services as services", async () => {
    const { classifyZohoCatalogItem } = await import("./items");
    const classified = classifyZohoCatalogItem({
      item_type: "sales_and_purchases",
      product_type: "goods",
      name: "Extinguisher service 9KG DCP",
      track_inventory: false,
      stock_on_hand: "",
    });
    expect(classified.isInventory).toBe(true);
    expect(classified.isService).toBe(false);
  });
});

describe("Zoho Items.csv export", () => {
  it("classifies the Books export by Product Type only", async () => {
    const { readFileSync, existsSync } = await import("node:fs");
    const csvPath = "C:/Users/ic kempton/Downloads/Items.csv";
    if (!existsSync(csvPath)) return;

    const { parseZohoItemsCsv } = await import("./csv");
    const parsed = parseZohoItemsCsv(readFileSync(csvPath, "utf8"));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const services = parsed.items.filter((i) => i.isService);
    const goods = parsed.items.filter((i) => i.isInventory);
    expect(parsed.items.length).toBe(931);
    expect(services.length).toBe(19);
    expect(goods.length).toBe(912);
    expect(services.some((s) => /extinguisher service/i.test(s.name))).toBe(true);
    expect(goods.some((g) => g.name === "Extinguisher service 9KG DCP")).toBe(true);
    expect(
      goods.find((g) => g.name === "Extinguisher service 9KG DCP")?.isService
    ).toBe(false);
  });
});
