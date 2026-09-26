"use client";

import { useEffect, useState } from "react";

type Event = {
  id: string;
  status: string;
  sentAt: string;
  contact: { firstName: string | null; lastName: string | null };
};

export function SentLog({
  businessId,
  kind,
  refreshKey,
}: {
  businessId: string;
  kind: "REVIEW_REQUEST" | "REACTIVATION";
  refreshKey?: number;
}) {
  const [events, setEvents] = useState<Event[] | null>(null);

  useEffect(() => {
    fetch(`/api/activity?businessId=${businessId}&kind=${kind}&limit=20`)
      .then((r) => r.json())
      .then((data) => setEvents(data.events));
  }, [businessId, kind, refreshKey]);

  if (events === null) return null;

  if (events.length === 0) {
    return <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-2xl p-6 text-center">Nothing sent yet.</p>;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
            <th className="py-2.5 pl-4 pr-3">Contact</th>
            <th className="py-2.5 pr-3">Status</th>
            <th className="py-2.5 pr-4">Sent</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-b border-gray-100 last:border-0">
              <td className="py-2.5 pl-4 pr-3">
                {[e.contact.firstName, e.contact.lastName].filter(Boolean).join(" ") || "—"}
              </td>
              <td className="py-2.5 pr-3">
                <StatusPill status={e.status} />
              </td>
              <td className="py-2.5 pr-4 text-xs text-gray-500">
                {new Date(e.sentAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const ok = status === "sent" || status === "delivered" || status === "SENT";
  return (
    <span
      className={`text-[11px] font-medium uppercase tracking-wide rounded-full px-2 py-0.5 ${
        ok ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-500"
      }`}
    >
      {status}
    </span>
  );
}
