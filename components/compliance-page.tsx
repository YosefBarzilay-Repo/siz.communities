"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function CompliancePage({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-[100dvh] bg-background px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="rounded-[2rem] bg-white p-6 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-primary">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-text-muted">{subtitle}</p>
            </div>
            <Link href="/" className="rounded-full bg-surface-soft px-4 py-2 text-sm font-semibold text-text">
              חזרה לאפליקציה
            </Link>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
