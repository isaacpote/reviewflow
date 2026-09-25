"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Users, Send, Clock3, ArrowRight } from "lucide-react";

type ReviewRequest = { id: string; status: string; sentAt: string };
type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  status: "PENDING" | "SENT" | "FAILED" | "OPTED_OUT";
  visitCount: number;
  autoSentAtVisitCount: number | null;
  reviewRequests: ReviewRequest[];
};

export default function DashboardPage(props: PageProps<"/biz/[id]/dashboard">) {
  const { id: businessId } = use(props.params);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function refresh() {
    fetch(`/api/contacts?businessId=${businessId}`)
      .then((r) => r.json())
      .then((data) => setContacts(data.contacts));
  }

  useEffect(refresh, [businessId]);

  const pending = contacts.filter((c) => c.status === "PENDING" || c.status === "FAILED");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === pending.length ? new Set() : new Set(pending.map((c) => c.id))));
  }

  async function send(contactIds?: string[]) {
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, contactIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotice(`Sent ${data.sent} of ${data.results.length} review requests.`);
      setSelected(new Set());
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const sentCount = contacts.filter((c) => c.status === "SENT").length;

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl">Dashboard</h1>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total contacts" value={contacts.length} icon={Users} />
        <Stat label="Requests sent" value={sentCount} icon={Send} />
        <Stat label="Pending" value={pending.length} icon={Clock3} />
      </div>

      <Link
        href={`/biz/${businessId}/reviews`}
        className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm hover:border-emerald-500/50 transition"
      >
        <span className="text-gray-600">See review &amp; reactivation performance over time</span>
        <ArrowRight className="h-4 w-4 text-gray-400" />
      </Link>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {notice && <p className="text-sm text-emerald-600">{notice}</p>}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contacts</h2>
        <div className="flex gap-2">
          <button
            onClick={() => send(Array.from(selected))}
            disabled={sending || selected.size === 0}
            className="text-sm font-medium rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 disabled:opacity-40"
          >
            Send to selected ({selected.size})
          </button>
          <button
            onClick={() => send()}
            disabled={sending || pending.length === 0}
            className="text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 disabled:opacity-40"
          >
            {sending ? "Sending…" : `Send to all pending (${pending.length})`}
          </button>
        </div>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-gray-500 border border-dashed border-black/10 dark:border-white/15 rounded-xl p-6 text-center">
          No contacts yet — import some from the CRM & Contacts tab.
        </p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-black/10 dark:border-white/10">
              <th className="py-2 pr-3 w-8">
                <input
                  type="checkbox"
                  checked={pending.length > 0 && selected.size === pending.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Phone</th>
              <th className="py-2 pr-3">Visits</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Last sent</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">
                  {(c.status === "PENDING" || c.status === "FAILED") && (
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  )}
                </td>
                <td className="py-2 pr-3">
                  {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="py-2 pr-3 font-mono text-xs">{c.phone}</td>
                <td className="py-2 pr-3 text-xs text-gray-500">{c.visitCount || "—"}</td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1.5">
                    <StatusPill status={c.status} />
                    {c.autoSentAtVisitCount !== null && (
                      <span
                        title={`Auto-sent at visit ${c.autoSentAtVisitCount}`}
                        className="text-[10px] font-medium uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-blue-500/15 text-blue-500"
                      >
                        auto
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 pr-3 text-xs text-gray-500">
                  {c.reviewRequests[0] ? new Date(c.reviewRequests[0].sentAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold">{value}</div>
        <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <Icon className="h-4 w-4 text-emerald-600" />
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function StatusPill({ status }: { status: Contact["status"] }) {
  const styles: Record<Contact["status"], string> = {
    PENDING: "bg-gray-500/15 text-gray-500",
    SENT: "bg-emerald-500/15 text-emerald-600",
    FAILED: "bg-red-500/15 text-red-500",
    OPTED_OUT: "bg-amber-500/15 text-amber-600",
  };
  return (
    <span className={`text-[11px] font-medium uppercase tracking-wide rounded-full px-2 py-0.5 ${styles[status]}`}>
      {status}
    </span>
  );
}
