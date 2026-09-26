"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Users, Send, Clock3, ArrowRight, Star, RefreshCw } from "lucide-react";

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
type ActivityEvent = {
  id: string;
  kind: "REVIEW_REQUEST" | "REACTIVATION";
  status: string;
  sentAt: string;
  contact: { firstName: string | null; lastName: string | null };
};

export default function DashboardPage(props: PageProps<"/biz/[id]/dashboard">) {
  const { id: businessId } = use(props.params);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function refresh() {
    fetch(`/api/contacts?businessId=${businessId}`)
      .then((r) => r.json())
      .then((data) => setContacts(data.contacts));
    fetch(`/api/activity?businessId=${businessId}`)
      .then((r) => r.json())
      .then((data) => setActivity(data.events));
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
    <div className="max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total contacts" value={contacts.length} icon={Users} />
        <Stat label="Requests sent" value={sentCount} icon={Send} />
        <Stat label="Pending" value={pending.length} icon={Clock3} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {notice && <p className="text-sm text-emerald-600">{notice}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Contacts</h2>
            <div className="flex gap-2">
              <button
                onClick={() => send(Array.from(selected))}
                disabled={sending || selected.size === 0}
                className="text-sm font-medium rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40"
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
            <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl p-6 text-center">
              No contacts yet — import some from the CRM & Contacts tab.
            </p>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                    <th className="py-2.5 pl-4 pr-3 w-8">
                      <input
                        type="checkbox"
                        checked={pending.length > 0 && selected.size === pending.length}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="py-2.5 pr-3">Name</th>
                    <th className="py-2.5 pr-3">Phone</th>
                    <th className="py-2.5 pr-3">Visits</th>
                    <th className="py-2.5 pr-3">Status</th>
                    <th className="py-2.5 pr-4">Last sent</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2.5 pl-4 pr-3">
                        {(c.status === "PENDING" || c.status === "FAILED") && (
                          <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{c.phone}</td>
                      <td className="py-2.5 pr-3 text-xs text-gray-500">{c.visitCount || "—"}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-1.5">
                          <StatusPill status={c.status} />
                          {c.autoSentAtVisitCount !== null && (
                            <span
                              title={`Auto-sent at visit ${c.autoSentAtVisitCount}`}
                              className="text-[10px] font-medium uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-emerald-50 text-emerald-700"
                            >
                              auto
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-500">
                        {c.reviewRequests[0] ? new Date(c.reviewRequests[0].sentAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Link
            href={`/biz/${businessId}/analytics`}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm hover:border-emerald-500/50 transition"
          >
            <span className="text-gray-600">Review &amp; reactivation performance</span>
            <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
          </Link>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold mb-3">Activity</h3>
            {activity.length === 0 ? (
              <p className="text-xs text-gray-500">Nothing sent yet.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((e) => (
                  <li key={e.id} className="flex items-start gap-2.5">
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                        e.kind === "REACTIVATION" ? "bg-emerald-50" : "bg-blue-500/10"
                      }`}
                    >
                      {e.kind === "REACTIVATION" ? (
                        <RefreshCw className="h-3 w-3 text-emerald-700" />
                      ) : (
                        <Star className="h-3 w-3 text-blue-500" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">
                          {[e.contact.firstName, e.contact.lastName].filter(Boolean).join(" ") || "Someone"}
                        </span>{" "}
                        {e.kind === "REACTIVATION" ? "got a reactivation text" : "got a review request"}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(e.sentAt).toLocaleString()} · {e.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
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
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
        <Icon className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
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
