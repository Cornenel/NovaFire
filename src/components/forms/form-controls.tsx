import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const labelCls = "block text-sm font-medium text-zinc-300";
const hintCls = "text-xs text-zinc-500 leading-relaxed";
const fieldCls =
  "novafire-form-field w-full text-sm disabled:opacity-60 disabled:cursor-not-allowed";
const errorCls = "text-xs text-red-400";

export function FormField({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("novafire-form-group", className)}>
      <label className={labelCls}>
        {label}
        {required ? <span className="text-red-400"> *</span> : null}
      </label>
      {children}
      {hint ? <p className={hintCls}>{hint}</p> : null}
      {error ? <p className={errorCls}>{error}</p> : null}
    </div>
  );
}

export function TextInput(props: ComponentPropsWithoutRef<"input">) {
  return <input {...props} className={cn(fieldCls, props.className)} />;
}

export function SelectInput(props: ComponentPropsWithoutRef<"select">) {
  return <select {...props} className={cn(fieldCls, props.className)} />;
}

export function TextAreaInput(props: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(fieldCls, "min-h-[120px] resize-y", props.className)}
    />
  );
}

export function FormAlert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        tone === "error" ? "novafire-form-error" : "novafire-form-success"
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
      {children}
    </div>
  );
}

export function PrimarySubmitButton({
  pending,
  children,
}: {
  pending?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl nf-btn-primary text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Submitting…" : children}
    </button>
  );
}

export function SecondaryButton({
  type = "button",
  onClick,
  children,
}: {
  type?: "button" | "submit";
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl nf-btn-ghost text-white text-sm font-medium"
    >
      {children}
    </button>
  );
}

export function ChoiceGroup<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value?: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  const columns =
    options.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3";

  return (
    <div className={cn("grid gap-2", columns)}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <label
            key={option.value}
            className={cn(
              "cursor-pointer rounded-xl border px-4 py-3 text-sm text-center transition-colors",
              active
                ? "border-red-500/50 bg-red-500/10 text-white"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
