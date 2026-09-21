"use client";

import { useEffect, useState } from "react";

export function AutomationCard({ businessId }: { businessId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(4);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/automation?businessId=${businessId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.rule) {
          setEnabled(data.rule.enabled);
          setThreshold(data.rule.visitThreshold);
        }
        setLoaded(true);
      });
  }, [businessId]);

  async function save(next: { enabled: boolean; visitThreshold: number }) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, ...next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save automation settings.");
      setSavedAt(Date.now());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <section className="border-t border-black/10 dark:border-white/10 pt-8">
      <h2 className="text-lg font-semibold mb-1">Automation</h2>
      <p className="text-sm text-gray-500 mb-4">
        Send this message automatically — no manual click needed. Requires patients synced from
        Cliniko or Nookal (visit counts come from there).
      </p>

      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked);
              save({ enabled: e.target.checked, visitThreshold: threshold });
            }}
          />
          <span className="text-sm font-medium">Send automatically after a visit threshold</span>
        </label>

        <div className="flex items-center gap-2 pl-7">
          <span className="text-sm text-gray-500">Send after the</span>
          <input
            type="number"
            min={1}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            onBlur={() => save({ enabled, visitThreshold: threshold })}
            className="w-16 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-2 py-1 text-sm text-center"
          />
          <span className="text-sm text-gray-500">
            {threshold === 1 ? "st" : threshold === 2 ? "nd" : threshold === 3 ? "rd" : "th"} visit
          </span>
        </div>

        <p className="text-[11px] text-gray-500 pl-7">
          Fires once per contact when they cross this threshold — checked every time a Cliniko/Nookal
          sync runs, not on a fixed schedule.
        </p>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {saving && <p className="text-xs text-gray-400">Saving…</p>}
        {!saving && savedAt && <p className="text-xs text-emerald-600">Saved ✓</p>}
      </div>
    </section>
  );
}
