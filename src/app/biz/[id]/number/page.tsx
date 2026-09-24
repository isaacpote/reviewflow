"use client";

import { use, useEffect, useState } from "react";
import type { AvailableNumber } from "@/lib/twilio";
import { AbnCard } from "@/components/AbnCard";
import { KycCard } from "@/components/KycCard";

type PhoneNumberRecord = {
  id: string;
  phoneNumber: string;
  friendlyName: string;
  alphaSenderId: string | null;
  country: string;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED";
  isMock: boolean;
};

const COUNTRIES = [
  { code: "US", label: "United States", alphaSupported: false },
  { code: "AU", label: "Australia", alphaSupported: true },
  { code: "GB", label: "United Kingdom", alphaSupported: true },
];

export default function NumberPage(props: PageProps<"/biz/[id]/number">) {
  const { id: businessId } = use(props.params);

  const [numbers, setNumbers] = useState<PhoneNumberRecord[]>([]);
  const [country, setCountry] = useState("AU");
  const [areaCode, setAreaCode] = useState("");
  const [results, setResults] = useState<AvailableNumber[]>([]);
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [friendlyName, setFriendlyName] = useState("");
  const [alphaSenderId, setAlphaSenderId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/business/${businessId}`)
      .then((r) => r.json())
      .then((data) => {
        setNumbers(data.business.phoneNumbers);
        setFriendlyName(data.business.name + " Reviews");
        setLoaded(true);
      });
  }, [businessId]);

  const alphaSupported = COUNTRIES.find((c) => c.code === country)?.alphaSupported;

  async function search() {
    setSearching(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(`/api/numbers/search?country=${country}&areaCode=${areaCode}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.numbers);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSearching(false);
    }
  }

  async function buy(phoneNumber: string) {
    setBuying(phoneNumber);
    setError(null);
    try {
      const res = await fetch("/api/numbers/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          phoneNumber,
          country,
          friendlyName: friendlyName || "Review Requests",
          alphaSenderId: alphaSupported ? alphaSenderId.trim() || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error));
      setNumbers((prev) => [data.number, ...prev]);
      setResults([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBuying(null);
    }
  }

  if (!loaded) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-10">
      <AbnCard businessId={businessId} />
      <KycCard businessId={businessId} />

      <section className="border-t border-black/10 dark:border-white/10 pt-8">
        <h2 className="text-lg font-semibold mb-1">Your numbers</h2>
        <p className="text-sm text-gray-500 mb-4">
          The number(s) review requests will be sent from.
        </p>
        {numbers.length === 0 ? (
          <p className="text-sm text-gray-500 border border-dashed border-black/10 dark:border-white/15 rounded-xl p-6 text-center">
            No number yet — buy one below.
          </p>
        ) : (
          <ul className="space-y-2">
            {numbers.map((n) => (
              <NumberRow key={n.id} number={n} onUpdate={(updated) =>
                setNumbers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
              } />
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-black/10 dark:border-white/10 pt-8">
        <h2 className="text-lg font-semibold mb-1">Buy a number</h2>
        <p className="text-sm text-gray-500 mb-4">
          Search available numbers, name it, and optionally set an alphanumeric
          sender ID (business name instead of a phone number — only supported
          outside the US/Canada).
        </p>

        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Area code (optional)</label>
              <input
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                placeholder="e.g. 02"
                className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={search}
                disabled={searching}
                className="w-full rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium py-2 disabled:opacity-60"
              >
                {searching ? "Searching…" : "Search numbers"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Name this number</label>
              <input
                value={friendlyName}
                onChange={(e) => setFriendlyName(e.target.value)}
                placeholder="e.g. Northside Physio Reviews"
                className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Alphanumeric sender ID {alphaSupported ? "(optional)" : "(not supported in this country)"}
              </label>
              <input
                value={alphaSenderId}
                onChange={(e) => setAlphaSenderId(e.target.value.slice(0, 11))}
                disabled={!alphaSupported}
                placeholder="e.g. NORTHSIDE"
                maxLength={11}
                className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm disabled:opacity-50"
              />
              <p className="text-[11px] text-gray-500 mt-1">Max 11 letters/numbers, no symbols.</p>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {results.length > 0 && (
            <ul className="divide-y divide-black/10 dark:divide-white/10 rounded-lg border border-black/10 dark:border-white/10">
              {results.map((n) => (
                <li key={n.phoneNumber} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{n.phoneNumber}</div>
                    <div className="text-xs text-gray-500">
                      {n.locality}, {n.region} · ${n.monthlyPrice}/mo
                    </div>
                  </div>
                  <button
                    onClick={() => buy(n.phoneNumber)}
                    disabled={buying === n.phoneNumber}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-60"
                  >
                    {buying === n.phoneNumber ? "Buying…" : "Buy"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function NumberRow({
  number,
  onUpdate,
}: {
  number: PhoneNumberRecord;
  onUpdate: (n: PhoneNumberRecord) => void;
}) {
  const [showVerify, setShowVerify] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startVerify() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/numbers/verify/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId: number.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate({ ...number, verificationStatus: "PENDING" });
      setShowVerify(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function checkCode() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/numbers/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId: number.id, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.approved) {
        onUpdate(data.number);
        setShowVerify(false);
      } else {
        setError("Code not accepted — try again.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <li className="rounded-xl border border-black/10 dark:border-white/10 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-medium">
            {number.friendlyName}
            {number.isMock && (
              <span className="ml-2 text-[10px] uppercase tracking-wide bg-amber-500/15 text-amber-600 rounded px-1.5 py-0.5">
                mock
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {number.phoneNumber}
            {number.alphaSenderId && <> · sends as &ldquo;{number.alphaSenderId}&rdquo;</>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={number.verificationStatus} />
          {number.verificationStatus !== "VERIFIED" && (
            <button
              onClick={startVerify}
              disabled={sending}
              className="text-xs font-medium rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-60"
            >
              {number.verificationStatus === "PENDING" ? "Enter code" : "Verify number"}
            </button>
          )}
        </div>
      </div>

      {showVerify && (
        <div className="mt-3 flex items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            className="rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-1.5 text-sm w-32"
          />
          <button
            onClick={checkCode}
            disabled={sending}
            className="text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 disabled:opacity-60"
          >
            Confirm
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: PhoneNumberRecord["verificationStatus"] }) {
  const styles = {
    VERIFIED: "bg-emerald-500/15 text-emerald-600",
    PENDING: "bg-amber-500/15 text-amber-600",
    UNVERIFIED: "bg-gray-500/15 text-gray-500",
  };
  return (
    <span className={`text-[11px] font-medium uppercase tracking-wide rounded-full px-2 py-1 ${styles[status]}`}>
      {status}
    </span>
  );
}
