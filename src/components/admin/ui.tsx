import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowLeftIcon } from "./icons";

type Variant = "primary" | "ghost" | "danger" | "subtle";

const variants: Record<Variant, string> = {
  primary: "bg-rose text-abyss border-rose hover:bg-ivory hover:border-ivory",
  ghost: "border-line-strong text-ivory hover:border-ivory hover:bg-ivory/5",
  danger: "border-danger/60 text-danger hover:bg-danger/10",
  subtle: "border-transparent text-ivory-2 hover:text-ivory hover:bg-ivory/5",
};

export type ButtonSize = "sm" | "md" | "icon";

export function buttonClass(variant: Variant = "ghost", size: ButtonSize = "md") {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-full border font-head tracking-[0.06em] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    size === "icon"
      ? "size-8 shrink-0"
      : size === "sm"
        ? "px-3 py-1.5 text-xs"
        : "px-4 py-2 text-sm",
    variants[variant],
  );
}

export function Button({
  variant = "ghost",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: ButtonSize }) {
  return (
    <button type="button" className={clsx(buttonClass(variant, size), className)} {...props} />
  );
}

export function LinkButton({
  variant = "ghost",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: ButtonSize }) {
  return <Link className={clsx(buttonClass(variant, size), className)} {...props} />;
}

type Tone = "neutral" | "ok" | "warn" | "danger" | "rose";
const tones: Record<Tone, string> = {
  neutral: "border-line-strong text-ivory-2",
  ok: "border-ok/50 text-ok",
  warn: "border-warn/50 text-warn",
  danger: "border-danger/50 text-danger",
  rose: "border-rose/60 text-rose",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.72rem] tracking-[0.04em] whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  kicker,
  title,
  back,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  /** Lien de retour affiché au-dessus du titre (petite flèche). */
  back?: { href: string; label: string };
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1.5">
        {back ? (
          <Link
            href={back.href}
            className="mb-1 inline-flex w-fit items-center gap-1.5 font-head text-xs tracking-[0.06em] text-ivory-3 transition-colors hover:text-rose"
          >
            <ArrowLeftIcon />
            {back.label}
          </Link>
        ) : null}
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <h1 className="text-3xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-ivory-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("card p-5", className)}>
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title ? <h2 className="text-lg">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-m border border-dashed border-line-strong p-8 text-center text-sm text-ivory-2">
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="card p-4">
      <p className="label">{label}</p>
      <p
        className={clsx(
          "mt-1 font-head text-3xl font-extralight",
          tone === "warn" && "text-warn",
          tone === "rose" && "text-rose",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ivory-3">{hint}</p> : null}
    </div>
  );
}

export function DefinitionList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ivory-3">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
