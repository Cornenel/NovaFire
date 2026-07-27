"use client";

import { useActionState } from "react";
import {
  submitQuoteRequest,
  type WebsiteFormState,
} from "@/app/forms/actions";
import { FormLegalNotice } from "@/components/form-legal-notice";
import {
  FormActions,
  FormAlert,
  FormField,
  PrimarySubmitButton,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "@/components/forms/form-controls";

const initialState: WebsiteFormState = { ok: false };

const SERVICE_OPTIONS = [
  "Fire extinguisher servicing",
  "Fire hose reel servicing",
  "Fire hydrant supply & installation",
  "Compliance assessment",
  "Fire risk assessment",
  "Detection / alarm support",
  "Staff fire training",
  "Site-specific SLA",
  "Other",
] as const;

export function QuoteRequestForm() {
  const [state, action, pending] = useActionState(submitQuoteRequest, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Your name" required>
          <TextInput name="name" placeholder="First and last name" required />
        </FormField>
        <FormField label="Company">
          <TextInput name="company" placeholder="Business or site name" />
        </FormField>
        <FormField label="Email" required>
          <TextInput
            name="email"
            type="email"
            placeholder="you@company.co.za"
            required
          />
        </FormField>
        <FormField label="Phone">
          <TextInput name="phone" type="tel" placeholder="066 270 0293" />
        </FormField>
        <FormField label="Service needed" required className="sm:col-span-2">
          <SelectInput name="service_interest" required defaultValue="">
            <option value="" disabled>
              Select a service
            </option>
            {SERVICE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField
          label="Site details"
          hint="Business type, extinguisher quantities, location, or urgency."
          required
          className="sm:col-span-2"
        >
          <TextAreaInput
            name="message"
            placeholder="Example: Lodge in Limpopo, 24 extinguishers due for annual service..."
            required
          />
        </FormField>
      </div>

      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}

      <FormLegalNotice />

      <FormActions>
        <span />
        <PrimarySubmitButton pending={pending}>Request quote</PrimarySubmitButton>
      </FormActions>
    </form>
  );
}
