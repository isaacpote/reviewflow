"use client";

import { use, useEffect, useState } from "react";
import { renderTemplate, appendOptOutNotice } from "@/lib/template";
import { SentLog } from "@/components/SentLog";

const VARIABLES = [
  { token: "{{first_name}}", desc: "Contact's first name" },
  { token: "{{last_name}}", desc: "Contact's last name" },
  { token: "{{business_name}}", desc: "Your business name" },
];

const DEFAULT_TEMPLATE =
  "Hey {{first_name}}! It's been a while since we've seen you at {{business_name}} — come back and see us soon.";

const COPY: Record<string, { verb: string; noun: string; blurb: string }> = {
  RESTAURANT: {
    verb: "Send an offer",
    noun: "offer",
    blurb: "Win back diners who haven't booked in a while with a return offer.",
  },
  PHYSIO_OSTEO: {
    verb: "Send a reactivation text",
    noun: "reactivation",
    blurb: "Nudge patients who've gone quiet to book back in.",
  },
  TRADIE: {
    verb: "Send a reactivation text",
    noun: "reactivation",
    blurb: "Check back in with customers who haven't booked a job in a while.",
  },
};

export default function ReactivationPage(props: PageProps<"/biz/[id]/reactivation">) {
  const { id: businessId } = use(props.params);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("PHYSIO_OSTEO");
  const [body, setBody] = useState(DEFAULT_TEMPLATE);

  const [triggerEnabled, setTriggerEnabled] = useState(false);
  const [days, setDays] = useState(30);

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch(`/api/business/${businessId}`).then((r) => r.json()),
      fetch(`/api/automation?businessId=${businessId}`).then((r) => r.json()),
    ]).then(([bizData, ruleData]) => {
      setBusinessName(bizData.business.name);
      setBusinessType(bizData.business.type);
      if (bizData.business.reactivationMessage) setBody(bizData.business.reactivationMessage);
      if (ruleData.rule) {
        setTriggerEnabled(ruleData.rule.reactivationEnabled);
        setDays(ruleData.rule.reactivationDays);
      }
      setLoaded(true);
    });
  }, [businessId]);

  const copy = COPY[businessType] ?? COPY.PHYSIO_OSTEO;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        fetch(`/api/business/${businessId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reactivationMessage: body }),
        }),
        fetch("/api/automation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId,
            reactivationEnabled: triggerEnabled,
            reactivationDays: days,
          }),
        }),
      ]);
      setSavedAt(Date.now());
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <p className="text-sm text-gray-500">Loading…</p>;

  const preview = appendOptOutNotice(
    renderTemplate(body, { first_name: "Priya", business_name: businessName })
  );

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reactivation</h1>
        <p className="text-sm text-gray-500 mt-1">{copy.blurb}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-mono"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              {body.length} characters — a &ldquo;Reply STOP to opt out&rdquo; notice is added
              automatically if your message doesn&apos;t already mention it (required by law)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {VARIABLES.map((v) => (
              <button
                key={v.token}
                type="button"
                title={v.desc}
                onClick={() => setBody((b) => b + v.token)}
                className="text-[11px] font-mono rounded-md border border-gray-200 px-2 py-1 hover:bg-gray-50"
              >
                {v.token}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={triggerEnabled}
                onChange={(e) => setTriggerEnabled(e.target.checked)}
              />
              <span className="text-sm font-medium">{copy.verb} automatically</span>
            </label>
            {triggerEnabled && (
              <div className="flex items-center gap-2 mt-2 pl-6">
                <span className="text-sm text-gray-500">Hasn&apos;t visited in</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-center"
                />
                <span className="text-sm text-gray-500">days</span>
                <span className="text-xs text-gray-500">
                  — needs a Cliniko or Nookal connection under Integrations for visit history.
                </span>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {savedAt && <span className="ml-3 text-xs text-gray-500">Saved ✓</span>}
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 mb-2">Live preview</div>
          <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50">
            <div className="rounded-2xl rounded-bl-sm bg-emerald-600 text-white text-sm px-3.5 py-2.5 max-w-[85%] shadow-sm">
              {preview}
            </div>
            <div className="text-[10px] text-gray-400 mt-2">as it will appear to Priya</div>
          </div>
        </div>
      </div>

      <section className="pt-2 border-t border-gray-100">
        <h2 className="text-lg font-semibold mb-3 pt-6">Sent</h2>
        <SentLog businessId={businessId} kind="REACTIVATION" refreshKey={refreshKey} />
      </section>
    </div>
  );
}
