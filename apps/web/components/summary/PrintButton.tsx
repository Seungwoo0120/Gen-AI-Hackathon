"use client";

export function PrintButton({ label, className }: { label: string; className?: string }) {
  return (
    <button className={className} onClick={() => window.print()} type="button">
      <span aria-hidden="true">🖨</span> {label}
    </button>
  );
}
