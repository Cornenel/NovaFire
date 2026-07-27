"use client";

import { useActionState } from "react";
import {
  submitServiceRequest,
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

const SERVICE_TYPES = [
  "Annual fire equipment service",
  "Emergency call-out",
  "Compliance inspection",
  "Defect remedial work",
  "Fire risk assessment",
  "Staff training",
  "Other",
] as const;

export function ServiceRequestForm() {
  const [state, action, pending] = useActionState(submitServiceRequest, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Contact name" required>
          <TextInput name="name" placeholder="First and last name" required />
        </FormField>
        <FormField label="Company / site">
          <TextInput name="company" placeholder="Site or business name" />
        </FormField>
        <FormField label="Email" required>
          <TextInput
            name="email"
            type="email"
            placeholder="you@company.co.za"
            required
          />
        </FormField>
        <FormField label="Phone" required>
          <TextInput name="phone" type="tel" placeholder="066 270 0293" required />
        </FormField>
        <FormField label="Service type" required className="sm:col-span-2">
          <SelectInput name="service_interest" required defaultValue="">
            <option value="" disabled>
              Select service type
            </option>
            {SERVICE_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField
          label="Request details"
          hint="Include site, equipment, urgency, and preferred timing."
          required
          className="sm:col-span-2"
        >
          <TextAreaInput
            name="message"
            placeholder="Describe the service or call-out you need"
            required
          />
        </FormField>
      </div>

      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}

      <FormLegalNotice />

      <FormActions>
        <span />
        <PrimarySubmitButton pending={pending}>Submit request</PrimarySubmitButton>
      </FormActions>
    </form>
  );
}
