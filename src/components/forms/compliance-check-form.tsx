"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  submitComplianceLead,
  type WebsiteFormState,
} from "@/app/forms/actions";
import { FormLegalNotice } from "@/components/form-legal-notice";
import {
  ChoiceGroup,
  FormActions,
  FormAlert,
  FormField,
  PrimarySubmitButton,
  SecondaryButton,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "@/components/forms/form-controls";
import {
  COMPLIANCE_QUESTIONS,
  EMPLOYEE_RANGES,
  INDUSTRY_OPTIONS,
  calculateComplianceScore,
  complianceBand,
  type ComplianceAnswer,
  type ComplianceQuestionId,
} from "@/lib/forms/compliance-questions";
import { cn } from "@/lib/utils";

const initialState: WebsiteFormState = { ok: false };

const STEPS = ["Business", "Equipment", "Training", "Systems", "Results"] as const;

export function ComplianceCheckForm() {
  const [step, setStep] = useState(0);
  const [state, action, pending] = useActionState(submitComplianceLead, initialState);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [employees, setEmployees] = useState("");
  const [message, setMessage] = useState("");
  const [answers, setAnswers] = useState<
    Partial<Record<ComplianceQuestionId, ComplianceAnswer | "na">>
  >({});

  const score = useMemo(() => calculateComplianceScore(answers), [answers]);
  const band = useMemo(() => complianceBand(score), [score]);

  const questionGroups = [
    COMPLIANCE_QUESTIONS.slice(0, 2),
    COMPLIANCE_QUESTIONS.slice(2, 5),
    COMPLIANCE_QUESTIONS.slice(5),
  ];

  function setAnswer(id: ComplianceQuestionId, value: ComplianceAnswer | "na") {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!company.trim()) return "Enter your company's legal name.";
      if (!name.trim()) return "Enter your name.";
      if (!email.trim()) return "Enter your email address.";
      if (!phone.trim()) return "Enter your phone number.";
      if (!industry) return "Select your industry.";
      if (!employees) return "Select your employee count.";
      return null;
    }

    const group = questionGroups[step - 1];
    if (!group) return null;
    for (const question of group) {
      if (!answers[question.id]) {
        return "Please answer every question before continuing.";
      }
    }
    return null;
  }

  const [stepError, setStepError] = useState<string | null>(null);

  function goNext() {
    const error = validateStep();
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="answers" value={JSON.stringify(answers)} />
      {step > 0 ? (
        <>
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="company" value={company} />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="phone" value={phone} />
          <input type="hidden" name="industry" value={industry} />
          <input type="hidden" name="employees" value={employees} />
        </>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-[0.18em] text-zinc-500">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {step === 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Company legal name" required className="sm:col-span-2">
            <TextInput
              name="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Registered business name"
              required
            />
          </FormField>
          <FormField label="Your name" required>
            <TextInput
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First and last name"
              required
            />
          </FormField>
          <FormField label="Phone" required>
            <TextInput
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="066 270 0293"
              required
            />
          </FormField>
          <FormField label="Email" required className="sm:col-span-2">
            <TextInput
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.co.za"
              required
            />
          </FormField>
          <FormField label="Industry" required>
            <SelectInput
              name="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              required
            >
              <option value="">Select industry</option>
              {INDUSTRY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label="Employees" required>
            <SelectInput
              name="employees"
              value={employees}
              onChange={(e) => setEmployees(e.target.value)}
              required
            >
              <option value="">Select range</option>
              {EMPLOYEE_RANGES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
          </FormField>
        </div>
      ) : null}

      {step >= 1 && step <= 3 ? (
        <div className="space-y-6">
          {questionGroups[step - 1]?.map((question) => (
            <FormField
              key={question.id}
              label={question.question}
              hint={question.hint}
              required
            >
              <ChoiceGroup
                name={question.id}
                value={answers[question.id]}
                onChange={(value) => setAnswer(question.id, value)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                  { value: "unsure", label: "Not sure" },
                  ...( "allowNa" in question && question.allowNa
                    ? [{ value: "na" as const, label: "Not applicable" }]
                    : []),
                ]}
              />
            </FormField>
          ))}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-6">
          <div
            className={cn(
              "rounded-2xl border p-6 text-center",
              band.tone === "high" && "border-emerald-500/30 bg-emerald-500/10",
              band.tone === "medium" && "border-amber-500/30 bg-amber-500/10",
              band.tone === "low" && "border-red-500/30 bg-red-500/10"
            )}
          >
            <p className="text-sm font-mono uppercase tracking-[0.18em] text-zinc-400 mb-2">
              Compliance score
            </p>
            <p className="text-5xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">
              {score}%
            </p>
            <p className="text-lg font-semibold text-white mb-2">{band.label}</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{band.summary}</p>
          </div>

          <FormField
            label="Anything else we should know?"
            hint="Optional — site details, upcoming audits, or urgent concerns."
          >
            <TextAreaInput
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your site or compliance concerns"
            />
          </FormField>

          <FormLegalNotice />
        </div>
      ) : null}

      {stepError ? <FormAlert tone="error">{stepError}</FormAlert> : null}
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}

      <FormActions>
        {step > 0 && step < 4 ? (
          <SecondaryButton onClick={goBack}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </SecondaryButton>
        ) : (
          <span />
        )}

        {step < 4 ? (
          <SecondaryButton onClick={goNext}>
            Continue
            <ArrowRight className="w-4 h-4" />
          </SecondaryButton>
        ) : (
          <PrimarySubmitButton pending={pending}>
            Submit & book inspection
          </PrimarySubmitButton>
        )}
      </FormActions>
    </form>
  );
}
