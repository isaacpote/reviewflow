"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { parseCsv } from "@/lib/csv";
import { type ContactMapping, FieldMappingInputs } from "@/components/ContactFieldMapping";

type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  status: "PENDING" | "SENT" | "FAILED" | "OPTED_OUT";
  visitCount: number;
  lastVisitAt: string | null;
  totalPaidCents: number | null;
  reviewRequests: { sentAt: string }[];
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default function ContactsPage(props: PageProps<"/biz/[id]/contacts">) {
  const { id: businessId } = use(props.params);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalPaidCents, setTotalPaidCents] = useState(0);
  const [trackedCount, setTrackedCount] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function refresh() {
    fetch(`/api/contacts?businessId=${businessId}`)
      .then((r) => r.json())
      .then((data) => {
        setContacts(data.contacts);
        setTotalPaidCents(data.totalPaidCents);
        setTrackedCount(data.trackedCount);
      });
  }

  useEffect(refresh, [businessId, refreshKey]);

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Everyone you can message, and the full history with each of them.
          </p>
        </div>
        <button
          onClick={() => setShowImport((v) => !v)}
          className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2 shrink-0"
        >
          {showImport ? "Cancel" : "Import a CSV"}
        </button>
      </div>

      {trackedCount > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-[0_4px_20px_rgba(124,92,252,0.06)] flex flex-wrap items-center gap-x-6 gap-y-1">
          <div>
            <div className="text-xs text-gray-500">Total collected</div>
            <div className="text-lg font-semibold tracking-tight">{formatCents(totalPaidCents)}</div>
          </div>
          <div className="text-xs text-gray-500">
            across {trackedCount} contact{trackedCount === 1 ? "" : "s"} with billing data from your CRM
          </div>
        </div>
      )}

      {showImport && (
        <CsvImportForm
          businessId={businessId}
          onDone={() => {
            setShowImport(false);
            setRefreshKey((k) => k + 1);
          }}
          onCancel={() => setShowImport(false)}
        />
      )}

      {contacts.length === 0 ? (
        <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
          No contacts yet — connect a CRM under Integrations, or import a CSV above.
        </p>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="py-2.5 pl-4 pr-3">Name</th>
                <th className="py-2.5 pr-3">Phone</th>
                <th className="py-2.5 pr-3">Visits</th>
                <th className="py-2.5 pr-3">Paid</th>
                <th className="py-2.5 pr-3">Status</th>
                <th className="py-2.5 pr-4">Last sent</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition">
                  <td className="p-0">
                    <Link
                      href={`/biz/${businessId}/contacts/${c.id}`}
                      className="flex py-2.5 pl-4 pr-3 items-center"
                    >
                      {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs">
                    <Link href={`/biz/${businessId}/contacts/${c.id}`}>{c.phone}</Link>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-gray-500">
                    <Link href={`/biz/${businessId}/contacts/${c.id}`}>{c.visitCount || "—"}</Link>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-gray-500">
                    <Link href={`/biz/${businessId}/contacts/${c.id}`}>
                      {c.totalPaidCents !== null ? formatCents(c.totalPaidCents) : "—"}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Link href={`/biz/${businessId}/contacts/${c.id}`}>
                      <StatusPill status={c.status} />
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    <Link href={`/biz/${businessId}/contacts/${c.id}`}>
                      {c.reviewRequests[0] ? new Date(c.reviewRequests[0].sentAt).toLocaleDateString() : "—"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

function CsvImportForm({
  businessId,
  onDone,
  onCancel,
}: {
  businessId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("CSV import");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ContactMapping>({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    last_visit_date: "",
    visit_count: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const { headers, rows } = parseCsv(String(reader.result));
      setHeaders(headers);
      setRows(rows);
      const guess = (needle: string) => headers.find((h) => h.toLowerCase().includes(needle)) ?? "";
      setMapping({
        first_name: guess("first"),
        last_name: guess("last"),
        phone: guess("phone") || guess("mobile"),
        email: guess("email"),
        last_visit_date: guess("last visit") || guess("last_visit") || guess("lastvisit"),
        visit_count: guess("visit count") || guess("visit_count") || guess("visits"),
      });
    };
    reader.readAsText(file);
  }

  async function submit() {
    if (!mapping.phone) {
      setError("Map a phone number column first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, type: "CSV", name, fieldMapping: mapping, csvRows: rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error));
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
      <div>
        <label className="block text-xs font-medium mb-1">Connection name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">CSV file</label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="text-sm"
        />
        {rows.length > 0 && <p className="text-xs text-gray-500 mt-1">{rows.length} rows detected</p>}
      </div>

      {headers.length > 0 && (
        <div>
          <label className="block text-xs font-medium mb-2">Map columns</label>
          <FieldMappingInputs mapping={mapping} setMapping={setMapping} sourceOptions={headers} includeVisitFields />
        </div>
      )}

      <p className="text-[11px] text-gray-500">
        Map a visit count or last visit date column and automation can trigger off it, same as a
        live CRM. Re-upload this same import later with updated numbers — matching contacts by
        phone number are updated in place, not duplicated.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting || rows.length === 0}
          className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2 disabled:opacity-60"
        >
          {submitting ? "Importing…" : `Import ${rows.length || ""} contacts`}
        </button>
        <button onClick={onCancel} className="text-sm text-gray-500 px-4 py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
