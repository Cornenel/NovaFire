import { z } from "zod";
import {
  COMPLIANCE_QUESTIONS,
  type ComplianceAnswer,
  type ComplianceQuestionId,
} from "./compliance-questions";

const email = z.string().trim().email("Enter a valid email address");
const phone = z
  .string()
  .trim()
  .min(7, "Enter a contact number")
  .max(30, "Phone number is too long");
const name = z.string().trim().min(2, "Enter your name").max(120);
const company = z.string().trim().min(2, "Enter your company name").max(160);

const complianceAnswerSchema = z.enum(["yes", "no", "unsure", "na"]);

export const complianceLeadSchema = z.object({
  name,
  company,
  email,
  phone,
  industry: z.string().trim().min(1, "Select your industry"),
  employees: z.string().trim().min(1, "Select employee count"),
  answers: z
    .record(z.string(), complianceAnswerSchema)
    .refine(
      (answers) =>
        COMPLIANCE_QUESTIONS.every((q) => {
          const value = answers[q.id];
          if (!value) return false;
          if (value === "na" && !("allowNa" in q && q.allowNa)) return false;
          return true;
        }),
      "Please answer every compliance question"
    ),
  message: z.string().trim().max(2000).optional(),
});

export const quoteRequestSchema = z.object({
  name,
  company: company.optional(),
  email,
  phone: phone.optional().or(z.literal("")),
  service_interest: z.string().trim().min(1, "Select a service"),
  message: z.string().trim().min(10, "Tell us a bit about your site or needs").max(4000),
});

export const trainingRegistrationSchema = z.object({
  name,
  company: company.optional(),
  email,
  phone,
  course: z.string().trim().min(1, "Select a course"),
  attendees: z.coerce.number().int().min(1, "At least one attendee").max(200),
  preferred_date: z.string().trim().optional(),
  message: z.string().trim().max(2000).optional(),
});

export const serviceRequestSchema = z.object({
  name,
  company: company.optional(),
  email,
  phone,
  service_interest: z.string().trim().min(1, "Select a service type"),
  message: z.string().trim().min(10, "Describe the service you need").max(4000),
});

export type ComplianceLeadInput = z.infer<typeof complianceLeadSchema>;
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
export type TrainingRegistrationInput = z.infer<typeof trainingRegistrationSchema>;
export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;

export function parseComplianceAnswers(
  raw: Record<string, string>
): Partial<Record<ComplianceQuestionId, ComplianceAnswer | "na">> {
  const parsed: Partial<Record<ComplianceQuestionId, ComplianceAnswer | "na">> = {};
  for (const question of COMPLIANCE_QUESTIONS) {
    const value = raw[question.id];
    if (value === "yes" || value === "no" || value === "unsure" || value === "na") {
      parsed[question.id] = value;
    }
  }
  return parsed;
}
