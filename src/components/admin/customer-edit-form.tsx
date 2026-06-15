"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useActionState, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Pencil, X } from "lucide-react";
import {
  updateCustomer,
  type UpdateCustomerState,
} from "@/app/admin/actions";

interface EditableCustomer {
  id: string;
  name: string;
  trading_name: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  vat_number: string | null;
  registration_number: string | null;
  billing_address: string | null;
  physical_address: string | null;
  notes: string | null;
  status: string | null;
}

const initialState: UpdateCustomerState = { ok: false };
const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";
const labelCls = "block text-xs text-zinc-400 mb-1.5";

export function CustomerEditPanel({ customer }: { customer: EditableCustomer }) {
  const [editing, setEditing] = useState(false);
  const [formKey, setFormKey] = useState(0);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold text-zinc-200 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Pencil className="w-4 h-4" />
        Edit Customer
      </button>
    );
  }

  return (
    <CustomerEditForm
      key={formKey}
      customer={customer}
      onCancel={() => {
        setEditing(false);
        setFormKey((key) => key + 1);
      }}
      onSaved={() => {
        setEditing(false);
        setFormKey((key) => key + 1);
      }}
    />
  );
}

function CustomerEditForm({
  customer,
  onCancel,
  onSaved,
}: {
  customer: EditableCustomer;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState(updateCustomer, initialState);

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form
      action={action}
      className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 space-y-4"
    >
      <input type="hidden" name="customer_id" value={customer.id} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-300">Edit Customer</h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Cancel editing"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{state.error}</p>
        </div>
      )}

      {state.duplicates && state.duplicates.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 space-y-2">
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-200">
                Possible duplicate customer found
              </p>
              <p className="text-xs text-amber-100/80">
                Review the match before saving. Continuing updates this customer only.
              </p>
            </div>
          </div>
          <div className="space-y-1">
            {state.duplicates.map((duplicate) => (
              <Link
                key={duplicate.id}
                href={`/admin/customers/${duplicate.id}`}
                className="block rounded-md bg-black/20 px-2.5 py-2 text-xs text-amber-100 hover:bg-black/30"
              >
                <span className="font-semibold">{duplicate.name}</span>
                <span className="text-amber-100/70">
                  {" "}
                  matched by {duplicate.reasons.join(", ")}
                  {duplicate.email ? ` · ${duplicate.email}` : ""}
                  {duplicate.phone ? ` · ${duplicate.phone}` : ""}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Customer name *">
          <input
            name="name"
            defaultValue={customer.name}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Trading name">
          <input
            name="trading_name"
            defaultValue={customer.trading_name ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Contact person">
          <input
            name="contact_person"
            defaultValue={customer.contact_person ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Phone number">
          <input
            name="phone"
            type="tel"
            placeholder="+27 or 0..."
            defaultValue={customer.phone ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Email address">
          <input
            name="email"
            type="email"
            defaultValue={customer.email ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Status">
          <select
            name="status"
            defaultValue={customer.status === "inactive" ? "inactive" : "active"}
            className={inputCls}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <Field label="VAT number">
          <input
            name="vat_number"
            defaultValue={customer.vat_number ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Company registration number">
          <input
            name="registration_number"
            defaultValue={customer.registration_number ?? ""}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Billing address">
        <textarea
          name="billing_address"
          rows={2}
          defaultValue={customer.billing_address ?? ""}
          className={inputCls}
        />
      </Field>
      <Field label="Physical / site address stored on customer">
        <textarea
          name="physical_address"
          rows={2}
          defaultValue={customer.physical_address ?? ""}
          className={inputCls}
        />
      </Field>
      <Field label="Notes">
        <textarea
          name="notes"
          rows={3}
          defaultValue={customer.notes ?? ""}
          className={inputCls}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Save Customer
        </button>
        {state.duplicates && state.duplicates.length > 0 && (
          <button
            type="submit"
            name="confirm_duplicates"
            value="true"
            disabled={pending}
            className="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Continue and Save
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 text-sm font-semibold transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label>
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}
