"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BUSINESS_TYPES, type BusinessTypeValue } from "@/lib/business-types";

export default function NewBusinessPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<BusinessTypeValue>("PHYSIO_OSTEO");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter a business name first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error));
      router.push(`/biz/${data.business.id}/number`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight mb-6 text-center">Add a business</h1>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-black/10 dark:border-white/10 p-6 sm:p-8 space-y-6 bg-white/50 dark:bg-white/[0.03]"
        >
          <div>
            <label className="block text-sm font-medium mb-1.5">Business name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Northside Physio"
              className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">What kind of business is this?</label>
            <div className="space-y-2">
              {BUSINESS_TYPES.map((t) => (
                <label
                  key={t.value}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition ${
                    type === t.value
                      ? "border-emerald-500 bg-emerald-500/5"
                      : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    className="mt-1"
                    checked={type === t.value}
                    onChange={() => setType(t.value)}
                  />
                  <span>
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t.blurb}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium py-2.5 transition"
          >
            {loading ? "Creating…" : "Create business →"}
          </button>
        </form>
      </div>
    </main>
  );
}
