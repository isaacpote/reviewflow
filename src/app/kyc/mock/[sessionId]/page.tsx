"use client";

import { use, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export default function MockVerifyPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(props.params);
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId") ?? "";
  const returnUrl = searchParams.get("return") ?? "/";
  const [submitting, setSubmitting] = useState<"verified" | "failed" | null>(null);

  async function complete(outcome: "verified" | "failed") {
    setSubmitting(outcome);
    await fetch("/api/kyc/mock-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, sessionId, outcome }),
    });
    window.location.href = returnUrl;
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center mb-5">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl mb-2">
          Verify your identity
        </h1>
        <p className="text-sm text-gray-500 mb-1">
          This stands in for Stripe&apos;s real hosted verification page — in mock mode, no
          document capture actually happens.
        </p>
        <p className="text-xs text-gray-400 font-mono mb-8">{sessionId}</p>

        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 space-y-3 text-left mb-6 bg-gray-50 dark:bg-white/[0.03]">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Simulated document capture
          </div>
          <div className="h-24 rounded-lg border-2 border-dashed border-black/10 dark:border-white/15 flex items-center justify-center text-xs text-gray-400">
            Driver&apos;s licence / passport
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => complete("verified")}
            disabled={submitting !== null}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2.5 disabled:opacity-60"
          >
            {submitting === "verified" ? "Submitting…" : "Simulate: document verified"}
          </button>
          <button
            onClick={() => complete("failed")}
            disabled={submitting !== null}
            className="rounded-lg border border-black/10 dark:border-white/15 text-sm font-medium py-2.5 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-60"
          >
            {submitting === "failed" ? "Submitting…" : "Simulate: verification failed"}
          </button>
        </div>
      </div>
    </main>
  );
}
