"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type KycState = {
  kycStatus: "PENDING" | "VERIFIED" | "FAILED" | null;
  kycVerifiedName: string | null;
  kycFailureReason: string | null;
};

export function KycCard({ businessId }: { businessId: string }) {
  const [state, setState] = useState<KycState | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  function refresh() {
    fetch(`/api/kyc/status?businessId=${businessId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.business) {
          setState({
            kycStatus: data.business.kycStatus,
            kycVerifiedName: data.business.kycVerifiedName,
            kycFailureReason: data.business.kycFailureReason,
          });
        }
      });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  useEffect(() => {
    if (searchParams.get("kyc") === "return") refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/kyc/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't start verification.");
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setStarting(false);
    }
  }

  if (!state) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 mt-3 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
        Identity verification
      </div>

      {state.kycStatus === "VERIFIED" ? (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-sm font-medium">{state.kycVerifiedName ?? "Verified"}</div>
            <div className="text-xs text-gray-500 mt-0.5">Government ID confirmed</div>
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wide rounded-full px-2 py-1 bg-emerald-500/15 text-emerald-600">
            Verified
          </span>
        </div>
      ) : state.kycStatus === "PENDING" ? (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-gray-500">Verification submitted — awaiting result.</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide rounded-full px-2 py-1 bg-amber-500/15 text-amber-600">
              Pending
            </span>
            <button onClick={refresh} className="text-xs text-gray-500 underline">
              Check status
            </button>
          </div>
        </div>
      ) : (
        <div>
          {state.kycStatus === "FAILED" && (
            <p className="text-sm text-red-500 mb-2">
              {state.kycFailureReason ?? "Verification didn't go through."} Try again below.
            </p>
          )}
          <button
            onClick={start}
            disabled={starting}
            className="text-sm font-medium rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 disabled:opacity-60"
          >
            {starting ? "Starting…" : "Verify identity"}
          </button>
          <p className="text-[11px] text-gray-500 mt-2">
            Confirms the authorized representative with a government ID — a photo of your
            driver&apos;s licence or passport.
          </p>
        </div>
      )}
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}
