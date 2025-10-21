"use client";

import React from "react";

export function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-default bg-[var(--color-surface)]">
      <div className="border-b border-default px-6 py-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="divide-y divide-default">
        {children}
      </div>
    </section>
  );
}

export function FormRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-12 sm:gap-6">
      <div className="sm:col-span-3">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
        ) : null}
      </div>
      <div className="sm:col-span-9">
        {children}
      </div>
    </div>
  );
}