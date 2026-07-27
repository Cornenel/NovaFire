"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateComplianceScore } from "@/lib/forms/compliance-questions";
import {
  complianceLeadSchema,
  parseComplianceAnswers,
  quoteRequestSchema,
  serviceRequestSchema,
  trainingRegistrationSchema,
} from "@/lib/forms/schemas";

export type WebsiteFormState = {
  ok: boolean;
  error?: string;
  score?: number;
};

function formError(message: string): WebsiteFormState {
  return { ok: false, error: message };
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function readAnswers(formData: FormData): Record<string, string> {
  const raw = formData.get("answers");
  if (typeof raw !== "string" || !raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

async function insertOrError(
  table: "compliance_leads" | "quote_requests" | "training_registrations",
  row: Record<string, unknown>
): Promise<WebsiteFormState> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from(table).insert(row);
    if (error) {
      console.error(`[forms] ${table} insert failed`, error);
      return formError("We could not save your submission. Please try again or call us.");
    }
    return { ok: true };
  } catch (error) {
    console.error(`[forms] ${table} insert error`, error);
    return formError(
      "Form submissions are not configured on this environment. Please contact us by phone or email."
    );
  }
}

export async function submitComplianceLead(
  _prev: WebsiteFormState,
  formData: FormData
): Promise<WebsiteFormState> {
  const answers = readAnswers(formData);
  const parsed = complianceLeadSchema.safeParse({
    name: readString(formData, "name"),
    company: readString(formData, "company"),
    email: readString(formData, "email"),
    phone: readString(formData, "phone"),
    industry: readString(formData, "industry"),
    employees: readString(formData, "employees"),
    answers,
    message: readString(formData, "message") || undefined,
  });

  if (!parsed.success) {
    return formError(parsed.error.issues[0]?.message ?? "Please check the form and try again.");
  }

  const score = calculateComplianceScore(parseComplianceAnswers(parsed.data.answers));
  const result = await insertOrError("compliance_leads", {
    name: parsed.data.name,
    company: parsed.data.company,
    email: parsed.data.email,
    phone: parsed.data.phone,
    answers: {
      industry: parsed.data.industry,
      employees: parsed.data.employees,
      message: parsed.data.message ?? null,
      responses: parsed.data.answers,
    },
    score,
  });

  if (!result.ok) return result;
  redirect(`/thank-you?source=compliance&score=${score}`);
}

export async function submitQuoteRequest(
  _prev: WebsiteFormState,
  formData: FormData
): Promise<WebsiteFormState> {
  const parsed = quoteRequestSchema.safeParse({
    name: readString(formData, "name"),
    company: readString(formData, "company") || undefined,
    email: readString(formData, "email"),
    phone: readString(formData, "phone") || undefined,
    service_interest: readString(formData, "service_interest"),
    message: readString(formData, "message"),
  });

  if (!parsed.success) {
    return formError(parsed.error.issues[0]?.message ?? "Please check the form and try again.");
  }

  const result = await insertOrError("quote_requests", {
    name: parsed.data.name,
    company: parsed.data.company ?? null,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    service_interest: parsed.data.service_interest,
    message: parsed.data.message,
  });

  if (!result.ok) return result;
  redirect("/thank-you?source=quote");
}

export async function submitTrainingRegistration(
  _prev: WebsiteFormState,
  formData: FormData
): Promise<WebsiteFormState> {
  const parsed = trainingRegistrationSchema.safeParse({
    name: readString(formData, "name"),
    company: readString(formData, "company") || undefined,
    email: readString(formData, "email"),
    phone: readString(formData, "phone"),
    course: readString(formData, "course"),
    attendees: readString(formData, "attendees"),
    preferred_date: readString(formData, "preferred_date") || undefined,
    message: readString(formData, "message") || undefined,
  });

  if (!parsed.success) {
    return formError(parsed.error.issues[0]?.message ?? "Please check the form and try again.");
  }

  const result = await insertOrError("training_registrations", {
    name: parsed.data.name,
    company: parsed.data.company ?? null,
    email: parsed.data.email,
    phone: parsed.data.phone,
    course: parsed.data.course,
    attendees: parsed.data.attendees,
    preferred_date: parsed.data.preferred_date || null,
    message: parsed.data.message ?? null,
  });

  if (!result.ok) return result;
  redirect("/thank-you?source=training");
}

export async function submitServiceRequest(
  _prev: WebsiteFormState,
  formData: FormData
): Promise<WebsiteFormState> {
  const parsed = serviceRequestSchema.safeParse({
    name: readString(formData, "name"),
    company: readString(formData, "company") || undefined,
    email: readString(formData, "email"),
    phone: readString(formData, "phone"),
    service_interest: readString(formData, "service_interest"),
    message: readString(formData, "message"),
  });

  if (!parsed.success) {
    return formError(parsed.error.issues[0]?.message ?? "Please check the form and try again.");
  }

  const result = await insertOrError("quote_requests", {
    name: parsed.data.name,
    company: parsed.data.company ?? null,
    email: parsed.data.email,
    phone: parsed.data.phone,
    service_interest: `Portal: ${parsed.data.service_interest}`,
    message: parsed.data.message,
  });

  if (!result.ok) return result;
  redirect("/thank-you?source=service");
}
