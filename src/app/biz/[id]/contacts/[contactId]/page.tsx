"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type ReviewRequest = {
  id: string;
  kind: "REVIEW_REQUEST" | "REACTIVATION";
  messageBody: string;
  status: string;
  sentAt: string;
};

type ContactDetail = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  status: "PENDING" | "SENT" | "FAILED" | "OPTED_OUT";
  visitCount: number;
  lastVisitAt: string | null;
  totalPaidCents: number | null;
  reviewRequests: ReviewRequest[];
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default function ContactDetailPage(props: PageProps<"/biz/[id]/contacts/[contactId]">) {
  const { id: businessId, contactId } = use(props.params);
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/contacts/${contactId}`)
      .then(async (r) => {
        if (!r.ok) {
          setNotFound(true);
          return;
        }
        const data = await r.json();
        setContact(data.contact);
      });
  }, [contactId]);

  if (notFound) {
    return (
      <div className="max-w-2xl">
        <p className="text-sm text-gray-500">Contact not found.</p>
        <Link href={`/biz/${businessId}/contacts`} className="text-sm text-emerald-600 underline mt-2 inline-block">
          Back to Contacts
        </Link>
      </div>
    );
  }

  if (!contact) return <p className="text-sm text-gray-500">Loading…</p>;

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.phone;

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href={`/biz/${businessId}/contacts`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Contacts
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
        <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-500">Phone</div>
            <div className="font-mono text-xs mt-0.5">{contact.phone}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Email</div>
            <div className="mt-0.5">{contact.email || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Visits</div>
            <div className="mt-0.5">{contact.visitCount || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Last visit</div>
            <div className="mt-0.5">
              {contact.lastVisitAt ? new Date(contact.lastVisitAt).toLocaleDateString() : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total paid</div>
            <div className="mt-0.5">
              {contact.totalPaidCents !== null ? formatCents(contact.totalPaidCents) : "—"}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Message history</h2>
        {contact.reviewRequests.length === 0 ? (
          <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-2xl p-6 text-center">
            Nothing sent to {name.split(" ")[0]} yet.
          </p>
        ) : (
          <div className="space-y-3">
            {contact.reviewRequests.map((r) => (
              <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-[11px] font-medium uppercase tracking-wide rounded-full px-2 py-0.5 ${
                      r.kind === "REACTIVATION" ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"
                    }`}
                  >
                    {r.kind === "REACTIVATION" ? "Reactivation" : "Review request"}
                  </span>
                  <span className="text-[11px] text-gray-400">{new Date(r.sentAt).toLocaleString()}</span>
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-emerald-500 text-white text-sm px-3.5 py-2.5 max-w-[85%] shadow-sm">
                  {r.messageBody}
                </div>
                <div className="text-[11px] text-gray-400 mt-1.5">{r.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
