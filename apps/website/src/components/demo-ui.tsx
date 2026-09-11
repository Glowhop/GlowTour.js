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
      className={`w-full max-w-sm rounded-glow border border-border bg-surface shadow-glow ${className}`}
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
      className={`h-2.5 rounded-full bg-border ${className}`}
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
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-on-accent ${className}`}
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
      <span className="block text-xs font-medium text-text-muted">{label}</span>
      <div className="mt-1 rounded-glow border border-border bg-surface-muted px-3 py-2 text-sm text-text-muted">
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
      className="flex h-8 w-8 items-center justify-center rounded-glow border border-border text-text-muted"
    >
      {children}
    </span>
  );
}
