# Nova Fire Ops API v1 — Customers, Sites, Assets

Secure HTTP API to create, read, and update customer master data, site information, and site-specific equipment/devices (assets). Built for ops tooling and bulk register import (e.g. Grok bot).

## Auth (required)

One of:

1. **Ops API key** (recommended for integrations)
   - Header: `x-api-key: <secret>` (or `x-novafire-api-key`)
   - Env: `NOVAFIRE_OPS_API_KEY` (Production/Preview on Vercel)
   - Uses the service-role client server-side; never expose this key in browsers

2. **Admin user**
   - Signed-in admin session cookie, or
   - `Authorization: Bearer <supabase_access_token>`
   - Profile must be `role=admin` and `is_active=true`

## Base URL

`https://www.novafire.co.za/api/v1`

## Endpoints

### Customers

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/customers?q=&limit=&offset=` | List / search |
| GET | `/customers/:id` | Fetch one |
| POST | `/customers` | Create |
| PATCH | `/customers/:id` | Update fields |

Create/update fields: `name` (required on create), `trading_name`, `contact_person`, `phone`, `email`, `vat_number`, `registration_number`, `billing_address`, `physical_address`, `notes`, `status` (`active`\|`inactive`), `is_sla_client`, `confirm_duplicates`.

Duplicate name/email/phone matches return **409** unless `confirm_duplicates: true`.

### Sites

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/sites?customer_id=&limit=&offset=` | List (optionally by customer) |
| GET | `/sites/:id` | Fetch one |
| POST | `/sites` | Create |
| PATCH | `/sites/:id` | Update fields |

Create requires: `customer_id`, `name`, `address`. Optional: `latitude`, `longitude`, `contact_person`, `contact_phone`, `access_notes`.

Same customer + same name + address returns **409**.

### Assets (equipment / devices)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/assets?site_id=&customer_id=&limit=&offset=` | List by site or customer |
| GET | `/assets/:id` | Fetch one |
| POST | `/assets` | Create |
| PATCH | `/assets/:id` | Update fields |

Create requires: `site_id`, `asset_type`. Optional: `asset_medium`, `size_capacity`, `customer_asset_number`, `serial_number`, `location_description`, service/test dates (`YYYY-MM-DD`), `status`, `notes`.

`asset_code` and `qr_token` are **server-generated** on create (do not send them).

Fire extinguishers require `asset_medium`, `size_capacity`, and `location_description`.

Same site + same `customer_asset_number` returns **409**.

### Bulk import (recommended for register load)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/import` | Nested create: customers → sites → assets |

Max **100 customers** per request. Paginate ~247 customers into batches. Existing customers/sites are matched (not duplicated); assets with an existing `customer_asset_number` on that site are skipped.

```json
{
  "confirm_duplicates": true,
  "customers": [
    {
      "name": "Acme (Pty) Ltd",
      "phone": "0115551234",
      "email": "ops@acme.co.za",
      "sites": [
        {
          "name": "Head Office",
          "address": "1 Main Rd, Sandton",
          "assets": [
            {
              "asset_type": "fire_extinguisher",
              "asset_medium": "DCP",
              "size_capacity": "4.5kg",
              "location_description": "Reception",
              "customer_asset_number": "FE-001"
            }
          ]
        }
      ]
    }
  ]
}
```

Response includes counts (`customers_created`, `customers_matched`, `sites_*`, `assets_*`), per-path `errors`, and created id lists.

## Examples

```bash
# Create customer
curl -X POST "https://www.novafire.co.za/api/v1/customers" \
  -H "x-api-key: $NOVAFIRE_OPS_API_KEY" \
  -H "content-type: application/json" \
  -d '{"name":"Acme (Pty) Ltd","phone":"0115551234","confirm_duplicates":true}'

# Create site
curl -X POST "https://www.novafire.co.za/api/v1/sites" \
  -H "x-api-key: $NOVAFIRE_OPS_API_KEY" \
  -H "content-type: application/json" \
  -d '{"customer_id":"<uuid>","name":"Head Office","address":"1 Main Rd, Sandton"}'

# Create equipment
curl -X POST "https://www.novafire.co.za/api/v1/assets" \
  -H "x-api-key: $NOVAFIRE_OPS_API_KEY" \
  -H "content-type: application/json" \
  -d '{"site_id":"<uuid>","asset_type":"fire_extinguisher","asset_medium":"DCP","size_capacity":"4.5kg","location_description":"Kitchen"}'

# Bulk import batch
curl -X POST "https://www.novafire.co.za/api/v1/import" \
  -H "x-api-key: $NOVAFIRE_OPS_API_KEY" \
  -H "content-type: application/json" \
  -d @batch-01.json

# Update customer
curl -X PATCH "https://www.novafire.co.za/api/v1/customers/<uuid>" \
  -H "x-api-key: $NOVAFIRE_OPS_API_KEY" \
  -H "content-type: application/json" \
  -d '{"phone":"0662700293","physical_address":"123 Main Rd"}'

# List devices for a site
curl "https://www.novafire.co.za/api/v1/assets?site_id=<uuid>" \
  -H "x-api-key: $NOVAFIRE_OPS_API_KEY"
```

## Setup checklist

1. Restore/active Supabase project
2. Confirm Vercel `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Add `NOVAFIRE_OPS_API_KEY` (long random secret) for Production + Preview
4. Redeploy
5. Call POST `/import` (or single POSTs) with the key

## Notes

- Zoho Books remains authoritative for financial customer/commercial records. This API updates **operational** Nova Fire records.
- Customer PATCH still writes `customer_update_history` via the existing DB trigger when using a user session (`auth.uid()`). API-key updates may log `updated_by` as null.
- Do not put the ops API key in frontend code or public repos.
- For ~7400 devices, prefer nested `/import` in customer batches of ≤100; keep asset arrays reasonable per site (schema max 500 assets/site in one import payload).
