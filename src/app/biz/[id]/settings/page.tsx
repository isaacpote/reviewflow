"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TYPE_LABEL: Record<string, string> = {
  PHYSIO_OSTEO: "Physio / Osteo / Allied Health",
  RESTAURANT: "Restaurant / Hospitality",
  TRADIE: "Tradie / Home Services",
};

type BusinessDetail = {
  id: string;
  name: string;
  type: string;
  reviewLink: string | null;
  kycStatus: "PENDING" | "VERIFIED" | "FAILED" | null;
  googlePlaceId: string | null;
  notifyOnFailure: boolean;
  notifyEmail: string | null;
};

export default function SettingsPage(props: PageProps<"/biz/[id]/settings">) {
  const { id: businessId } = use(props.params);
  const router = useRouter();

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [name, setName] = useState("");
  const [reviewLink, setReviewLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notifyOnFailure, setNotifyOnFailure] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [savingNotify, setSavingNotify] = useState(false);
  const [savedNotify, setSavedNotify] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/business/${businessId}`)
      .then((r) => r.json())
      .then((data) => {
        setBusiness(data.business);
        setName(data.business.name);
        setReviewLink(data.business.reviewLink ?? "");
        setNotifyOnFailure(data.business.notifyOnFailure);
        setNotifyEmail(data.business.notifyEmail ?? "");
      });
  }, [businessId]);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/business/${businessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ...(reviewLink.trim() ? { reviewLink: reviewLink.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Couldn't save changes.");
      setBusiness(data.business);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function saveNotifications() {
    if (notifyOnFailure && !notifyEmail.trim()) {
      setNotifyError("Add an email address to receive alerts.");
      return;
    }
    setSavingNotify(true);
    setSavedNotify(false);
    setNotifyError(null);
    try {
      const res = await fetch(`/api/business/${businessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyOnFailure, notifyEmail: notifyEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Couldn't save changes.");
      setBusiness(data.business);
      setSavedNotify(true);
    } catch (err) {
      setNotifyError((err as Error).message);
    } finally {
      setSavingNotify(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (!business) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-10">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
        <div>
          <h2 className="text-base font-semibold">Business details</h2>
          <p className="text-sm text-gray-500 mt-0.5">{TYPE_LABEL[business.type] ?? business.type}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Business name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)] focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Google review link</label>
          <input
            value={reviewLink}
            onChange={(e) => setReviewLink(e.target.value)}
            placeholder="https://g.page/r/your-business/review"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)] focus:ring-2 focus:ring-emerald-500/50"
          />
          <p className="text-xs text-gray-500 mt-1.5">
            The link sent to customers to leave a review. Find yours by searching your business on
            Google Maps → Share → Ask for reviews.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved.</span>}
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
        <div>
          <h2 className="text-base font-semibold">Notifications</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Get an email when a text fails to send, so you're not relying on a customer to tell you.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyOnFailure}
            onChange={(e) => setNotifyOnFailure(e.target.checked)}
          />
          <span className="text-sm font-medium">Email me when a message fails to send</span>
        </label>

        {notifyOnFailure && (
          <div className="pl-6">
            <label className="block text-xs font-medium mb-1.5">Alert email</label>
            <input
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="you@business.com"
              className="w-full max-w-xs rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)] focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={saveNotifications}
            disabled={savingNotify}
            className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2 disabled:opacity-60"
          >
            {savingNotify ? "Saving…" : "Save changes"}
          </button>
          {savedNotify && <span className="text-sm text-emerald-600">Saved.</span>}
          {notifyError && <span className="text-sm text-red-500">{notifyError}</span>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
        <h2 className="text-base font-semibold">Verification</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Identity (KYC)</span>
          <StatusText value={business.kycStatus ?? "Not started"} ok={business.kycStatus === "VERIFIED"} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Google Business Profile</span>
          <StatusText value={business.googlePlaceId ? "Connected" : "Not connected"} ok={!!business.googlePlaceId} />
        </div>
        <p className="text-xs text-gray-500">
          Manage identity verification from the Number tab.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
        <h2 className="text-base font-semibold mb-1">Account</h2>
        <p className="text-sm text-gray-500 mb-4">Log out of ReviewFlow on this device.</p>
        <button
          onClick={logout}
          className="rounded-full border border-gray-200 text-sm font-medium px-5 py-2 hover:bg-gray-50 transition"
        >
          Log out
        </button>
      </section>
    </div>
  );
}

function StatusText({ value, ok }: { value: string; ok: boolean }) {
  return (
    <span className={`text-sm font-medium ${ok ? "text-emerald-600" : "text-gray-400"}`}>
      {value}
    </span>
  );
}
