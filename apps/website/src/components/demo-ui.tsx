import type { ReactNode } from "react";

/** Card wrapper used by every hero demo mockup — a small, believable "app chrome" surface. */
export function DemoCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full max-w-sm rounded-[var(--radius-glow)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-glow)] ${className}`}
    >
      {children}
    </div>
  );
}

/** A gray rounded bar standing in for a line of text — used to sell "skeleton content". */
export function SkeletonLine({
  width = "100%",
  className = "",
  id,
}: {
  width?: string;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`h-2.5 rounded-full bg-[var(--color-border)] ${className}`}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

/** A colored circle with initials, standing in for a user avatar. */
export function Avatar({
  initials,
  className = "",
  id,
}: {
  initials: string;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-semibold text-[var(--color-on-accent)] ${className}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

/** A non-interactive field that looks like a disabled text input, without being a real one. */
export function FakeField({ label, value, id }: { label: string; value: string; id?: string }) {
  return (
    <div id={id}>
      <span className="block text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
      <div className="mt-1 rounded-[var(--radius-glow)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
        {value}
      </div>
    </div>
  );
}

/** A decorative, non-interactive icon button — chrome only, never a tour target. */
export function DecorativeIconButton({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      tabIndex={-1}
      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-glow)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
    >
      {children}
    </span>
  );
}
