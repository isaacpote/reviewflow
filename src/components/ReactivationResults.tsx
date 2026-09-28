"use client";

import { useEffect, useState } from "react";

type Result = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  sentAt: string;
  returned: boolean;
  returnedAt: string | null;
  value: number | null;
};

type Summary = {
  avgCustomerValue: number | null;
  totalSent: number;
  returnedCount: number;
  totalValue: number | null;
  results: Result[];
};

export function ReactivationResults({
  businessId,
  refreshKey,
}: {
  businessId: string;
  refreshKey?: number;
}) {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    fetch(`/api/reactivation-results?businessId=${businessId}`)
      .then((r) => r.json())
      .then(setData);
  }, [businessId, refreshKey]);

  if (!data) return null;

  if (data.totalSent === 0) {
    return (
      <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-2xl p-6 text-center">
        No reactivation texts sent yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-emerald-50 text-emerald-700 font-medium px-3 py-1">
          {data.returnedCount} of {data.totalSent} came back
        </span>
        {data.totalValue !== null ? (
          <span className="rounded-full bg-emerald-500 text-white font-medium px-3 py-1">
            ${data.totalValue.toLocaleString()} estimated value
          </span>
        ) : (
          <span className="text-gray-500 text-xs">
            Set an average customer value in Settings to see dollar value here.
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
              <th className="py-2.5 pl-4 pr-3">Contact</th>
              <th className="py-2.5 pr-3">Sent</th>
              <th className="py-2.5 pr-3">Came back?</th>
              <th className="py-2.5 pr-4">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0">
                <td className="py-2.5 pl-4 pr-3">
                  {[r.firstName, r.lastName].filter(Boolean).join(" ") || r.phone}
                </td>
                <td className="py-2.5 pr-3 text-xs text-gray-500">
                  {new Date(r.sentAt).toLocaleDateString()}
                </td>
                <td className="py-2.5 pr-3">
                  {r.returned ? (
                    <span className="text-[11px] font-medium uppercase tracking-wide rounded-full px-2 py-0.5 bg-emerald-500/15 text-emerald-600">
                      Yes — {r.returnedAt ? new Date(r.returnedAt).toLocaleDateString() : ""}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium uppercase tracking-wide rounded-full px-2 py-0.5 bg-gray-500/15 text-gray-500">
                      Not yet
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">
                  {r.value !== null ? `$${r.value.toLocaleString()}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
