"use client";

import { useEffect, useState } from "react";

type AbnState = {
  abn: string | null;
  abnVerifiedName: string | null;
  abnStatus: string | null;
};

export function AbnCard({ businessId }: { businessId: string }) {
  const [state, setState] = useState<AbnState | null>(null);
  const [input, setInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/business/${businessId}`)
      .then((r) => r.json())
      .then((data) => {
        setState({
          abn: data.business.abn,
          abnVerifiedName: data.business.abnVerifiedName,
          abnStatus: data.business.abnStatus,
        });
        setInput(data.business.abn ?? "");
      });
  }, [businessId]);

  async function verify() {
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/abn/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, abn: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't verify that ABN.");
      setState({
        abn: data.business.abn,
        abnVerifiedName: data.business.abnVerifiedName,
        abnStatus: data.business.abnStatus,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  }

  if (!state) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">Business verification</h2>
      <p className="text-sm text-gray-500 mb-4">
        Verify your ABN — checked against the Australian Business Register.
      </p>

      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5">
        {state.abnVerifiedName ? (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-sm font-medium">{state.abnVerifiedName}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                ABN {state.abn} · {state.abnStatus}
              </div>
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wide rounded-full px-2 py-1 bg-emerald-500/15 text-emerald-600">
              Verified
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="11-digit ABN"
              className="flex-1 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={verify}
              disabled={verifying || !input.trim()}
              className="text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 disabled:opacity-60"
            >
              {verifying ? "Checking…" : "Verify"}
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>
    </section>
  );
}
