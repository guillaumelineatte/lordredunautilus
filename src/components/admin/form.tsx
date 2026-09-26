"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import type { ActionResult } from "@/lib/action-result";
import { buttonClass } from "./ui";
import { useToast } from "./toast";

type FormState = { errors: Record<string, string>; pending: boolean };
const FormContext = createContext<FormState>({ errors: {}, pending: false });

export function useFormState() {
  return useContext(FormContext);
}

type ActionFormProps<T> = {
  action: (data: FormData) => Promise<ActionResult<T>>;
  children: ReactNode;
  /** Message affiché en cas de succès. */
  success?: string;
  /** Redirection après succès. */
  redirectTo?: string | ((data: T) => string);
  onSuccess?: (data: T) => void;
  resetOnSuccess?: boolean;
  /** Données ajoutées au FormData (identifiants, JSON…). */
  extra?: Record<string, string>;
  className?: string;
  confirm?: string;
};

/**
 * Formulaire relié à une Server Action : envoie le FormData, affiche les erreurs
 * par champ, notifie le succès et rafraîchit la page.
 */
export function ActionForm<T>({
  action,
  children,
  success,
  redirectTo,
  onSuccess,
  resetOnSuccess,
  extra,
  className,
  confirm,
}: ActionFormProps<T>) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const data = new FormData(e.currentTarget);
    for (const [k, v] of Object.entries(extra ?? {})) data.set(k, v);
    startTransition(async () => {
      const result = await action(data);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.error);
        notify(result.error, "error");
        return;
      }
      setErrors({});
      setMessage(null);
      if (success) notify(success);
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(result.data);
      if (redirectTo) {
        router.push(typeof redirectTo === "function" ? redirectTo(result.data) : redirectTo);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <FormContext.Provider value={{ errors, pending }}>
      <form ref={ref} onSubmit={onSubmit} className={clsx("grid gap-4", className)} noValidate>
        {message ? (
          <p
            role="alert"
            className="rounded-s border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {message}
          </p>
        ) : null}
        {children}
      </form>
    </FormContext.Provider>
  );
}

export function Field({
  label,
  name,
  hint,
  children,
  className,
}: {
  label: string;
  name: string;
  hint?: ReactNode;
  children: (props: {
    id: string;
    name: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const { errors } = useFormState();
  const error = errors[name];
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={clsx("grid gap-1.5", className)}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children({ id, name, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-err`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ivory-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  name,
  hint,
  className,
  ...input
}: { label: string; name: string; hint?: ReactNode } & ComponentProps<"input">) {
  return (
    <Field label={label} name={name} hint={hint} className={className}>
      {(p) => <input {...p} {...input} className="field-input" />}
    </Field>
  );
}

export function TextAreaField({
  label,
  name,
  hint,
  className,
  ...input
}: { label: string; name: string; hint?: ReactNode } & ComponentProps<"textarea">) {
  return (
    <Field label={label} name={name} hint={hint} className={className}>
      {(p) => <textarea {...p} rows={4} {...input} className="field-input min-h-24" />}
    </Field>
  );
}

export function SelectField({
  label,
  name,
  hint,
  options,
  className,
  placeholder,
  ...input
}: {
  label: string;
  name: string;
  hint?: ReactNode;
  options: { value: string; label: string }[];
  placeholder?: string;
} & ComponentProps<"select">) {
  return (
    <Field label={label} name={name} hint={hint} className={className}>
      {(p) => (
        <select {...p} {...input} className="field-input">
          {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function CheckboxField({
  label,
  name,
  hint,
  className,
  ...input
}: { label: ReactNode; name: string; hint?: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  const id = useId();
  const { errors } = useFormState();
  return (
    <div className={clsx("grid gap-1", className)}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          id={id}
          name={name}
          type="checkbox"
          className="mt-0.5 size-4 accent-rose"
          {...input}
        />
        <span>{label}</span>
      </label>
      {errors[name] ? (
        <p className="text-xs text-danger">{errors[name]}</p>
      ) : hint ? (
        <p className="pl-6.5 text-xs text-ivory-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
}) {
  const { pending } = useFormState();
  return (
    <button type="submit" disabled={pending} className={clsx(buttonClass(variant), className)}>
      {pending ? "Enregistrement…" : children}
    </button>
  );
}

export function FormError({ name }: { name: string }) {
  const { errors } = useFormState();
  return errors[name] ? <p className="text-xs text-danger">{errors[name]}</p> : null;
}
