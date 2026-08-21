"use client";

import { useRef, useState } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { SOS_STORAGE_HINT, type EmergencyContact } from "@/types/sos";
import { validatePhone } from "@/lib/sos/validation";

const BUTTON_BASE =
  "h-14 w-full rounded-2xl px-4 text-lg font-bold tracking-wide transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent";

interface ContactSlot {
  name: string;
  phone: string;
}

interface SlotError {
  name?: string;
  phone?: string;
}

interface SosSettingsProps {
  open: boolean;
  contacts: EmergencyContact[];
  onSave: (contacts: EmergencyContact[]) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

function emptyForm(): [ContactSlot, ContactSlot] {
  return [
    { name: "", phone: "" },
    { name: "", phone: "" },
  ];
}

function nextContactId(index: number): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `contact-${Date.now()}-${index}`;
}

/**
 * Emergency contact setup. Contacts are stored only in local browser
 * storage on this device (see lib/sos/storage.ts); they are never sent
 * to the server or to the assistant. Provides create, edit, and delete
 * for a primary and an optional secondary contact.
 */
export function SosSettings({
  open,
  contacts,
  onSave,
  onDelete,
  onClearAll,
  onClose,
}: SosSettingsProps) {
  const [form, setForm] = useState<[ContactSlot, ContactSlot]>(emptyForm);
  const [errors, setErrors] = useState<[SlotError, SlotError]>([{}, {}]);
  const [status, setStatus] = useState<string | null>(null);
  const [lastOpen, setLastOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const containerRef = useDialogFocus({
    open,
    onEscape: onClose,
    initialFocusRef: closeButtonRef,
  });

  // Reset the form from the current contacts whenever the dialog opens.
  // State is adjusted during render (the React-recommended pattern for
  // syncing state to a prop change) so no effect is needed.
  if (open && !lastOpen) {
    setLastOpen(true);
    setForm([
      {
        name: contacts[0]?.name ?? "",
        phone: contacts[0]?.phone ?? "",
      },
      {
        name: contacts[1]?.name ?? "",
        phone: contacts[1]?.phone ?? "",
      },
    ]);
    setErrors([{}, {}]);
    setStatus(null);
  } else if (!open && lastOpen) {
    setLastOpen(false);
  }

  const updateSlot = (index: 0 | 1, field: keyof ContactSlot, value: string) => {
    setForm((current) => {
      const next: [ContactSlot, ContactSlot] = [
        { ...current[0] },
        { ...current[1] },
      ];
      next[index][field] = value;
      return next;
    });
  };

  const saveSlot = (index: 0 | 1) => {
    const name = form[index].name.trim();
    const phoneResult = validatePhone(form[index].phone);
    const nextErrors: [SlotError, SlotError] = [{}, {}];

    if (!name) {
      nextErrors[index].name = "Contact name is required.";
    }
    if (!phoneResult.valid) {
      nextErrors[index].phone = phoneResult.reason;
    }
    setErrors(nextErrors);
    if (!name || !phoneResult.valid) return;

    const existing = contacts[index];
    const contact: EmergencyContact = {
      id: existing?.id ?? nextContactId(index),
      name,
      phone: phoneResult.normalized,
      enabled: true,
    };
    const next = [...contacts];
    next[index] = contact;
    onSave(next);
    setStatus(`Emergency contact saved. ${SOS_STORAGE_HINT}`);
  };

  const deleteSlot = (index: 0 | 1) => {
    const existing = contacts[index];
    if (existing) {
      onDelete(existing.id);
      setStatus("Emergency contact deleted.");
    }
    setForm((current) => {
      const next: [ContactSlot, ContactSlot] = [
        { ...current[0] },
        { ...current[1] },
      ];
      next[index] = { name: "", phone: "" };
      return next;
    });
  };

  const clearAll = () => {
    onClearAll();
    setForm(emptyForm());
    setStatus("All emergency contacts cleared.");
  };

  if (!open) return null;

  const renderSlot = (
    index: 0 | 1,
    label: string,
    hint: string,
  ) => (
    <fieldset className="rounded-2xl border border-border bg-black/30 p-4">
      <legend className="px-1 text-sm font-bold text-foreground">{label}</legend>
      <div className="mt-2 flex flex-col gap-3">
        <div>
          <label
            htmlFor={`sos-contact-${index}-name`}
            className="block text-xs font-semibold text-muted"
          >
            Contact name
          </label>
          <input
            id={`sos-contact-${index}-name`}
            type="text"
            value={form[index].name}
            onChange={(event) => updateSlot(index, "name", event.target.value)}
            autoComplete="name"
            placeholder="e.g. Alex"
            aria-invalid={errors[index].name ? true : undefined}
            aria-describedby={
              errors[index].name ? `sos-contact-${index}-name-error` : undefined
            }
            className="mt-1 h-14 w-full rounded-xl border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted/60 focus:border-accent focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          {errors[index].name && (
            <p
              id={`sos-contact-${index}-name-error`}
              className="mt-1 text-xs text-red-300"
            >
              {errors[index].name}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor={`sos-contact-${index}-phone`}
            className="block text-xs font-semibold text-muted"
          >
            Phone number
          </label>
          <input
            id={`sos-contact-${index}-phone`}
            type="tel"
            inputMode="tel"
            value={form[index].phone}
            onChange={(event) => updateSlot(index, "phone", event.target.value)}
            autoComplete="tel"
            placeholder="e.g. +1 555 123 4567"
            aria-invalid={errors[index].phone ? true : undefined}
            aria-describedby={
              errors[index].phone ? `sos-contact-${index}-phone-error` : undefined
            }
            className="mt-1 h-14 w-full rounded-xl border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted/60 focus:border-accent focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          {errors[index].phone && (
            <p
              id={`sos-contact-${index}-phone-error`}
              className="mt-1 text-xs text-red-300"
            >
              {errors[index].phone}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => saveSlot(index)}
            className={`${BUTTON_BASE} bg-accent text-accent-contrast hover:bg-accent-hover sm:flex-1`}
          >
            SAVE {label.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={() => deleteSlot(index)}
            disabled={!contacts[index]}
            className={`${BUTTON_BASE} border border-border bg-surface text-foreground hover:border-red-500/60 hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40 sm:w-36`}
          >
            DELETE
          </button>
        </div>
        {index === 1 && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </fieldset>
  );

  return (
    <div
      className="fixed inset-0 z-60 flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/80" aria-hidden="true" />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-settings-title"
        className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto rounded-3xl border border-border bg-surface-raised shadow-2xl"
      >
        <header className="sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-surface-raised px-5 py-4">
          <h2
            id="sos-settings-title"
            className="text-lg font-black tracking-widest text-foreground"
          >
            EMERGENCY CONTACTS
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close emergency contacts settings"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-lg font-bold text-foreground hover:border-accent/60 hover:bg-surface-raised focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            ✕
          </button>
        </header>

        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-foreground/85">{SOS_STORAGE_HINT}</p>

          {renderSlot(0, "Primary contact", "")}
          {renderSlot(
            1,
            "Secondary contact",
            "Optional — add a second emergency contact if you like.",
          )}

          <div
            aria-live="polite"
            className="rounded-xl border border-border bg-black/30 px-4 py-3 text-xs text-muted"
          >
            {status ?? "No changes saved yet."}
          </div>

          <button
            type="button"
            onClick={clearAll}
            disabled={contacts.length === 0}
            className={`${BUTTON_BASE} border border-red-500/50 bg-red-950/30 text-red-200 hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            CLEAR ALL CONTACTS
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`${BUTTON_BASE} border border-border bg-surface text-foreground hover:border-accent/60 hover:bg-surface-raised`}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}