"use client";

import { useActionState } from "react";
import {
  submitTrainingRegistration,
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

const COURSE_OPTIONS = [
  "Basic fire extinguisher use",
  "Evacuation drill facilitation",
  "Combined extinguisher & evacuation training",
  "On-site staff training (custom)",
] as const;

export function TrainingRegistrationForm() {
  const [state, action, pending] = useActionState(
    submitTrainingRegistration,
    initialState
  );

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Contact name" required>
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
        <FormField label="Phone" required>
          <TextInput name="phone" type="tel" placeholder="066 270 0293" required />
        </FormField>
        <FormField label="Course" required>
          <SelectInput name="course" required defaultValue="">
            <option value="" disabled>
              Select a course
            </option>
            {COURSE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label="Attendees" required>
          <TextInput
            name="attendees"
            type="number"
            min={1}
            max={200}
            defaultValue={1}
            required
          />
        </FormField>
        <FormField
          label="Preferred date"
          hint="Optional — we'll confirm availability."
          className="sm:col-span-2"
        >
          <TextInput name="preferred_date" type="date" />
        </FormField>
        <FormField label="Notes" className="sm:col-span-2">
          <TextAreaInput
            name="message"
            placeholder="Site location, staff roles, or special requirements"
          />
        </FormField>
      </div>

      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}

      <FormLegalNotice />

      <FormActions>
        <span />
        <PrimarySubmitButton pending={pending}>Register for training</PrimarySubmitButton>
      </FormActions>
    </form>
  );
}
