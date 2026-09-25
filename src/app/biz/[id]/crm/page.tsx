"use client";

import { use, useEffect, useState } from "react";
import { parseCsv } from "@/lib/csv";

type Connection = {
  id: string;
  type: "CSV" | "WEBHOOK" | "CLINIKO" | "NOOKAL" | "HUBSPOT" | "GOHIGHLEVEL";
  name: string;
  webhookToken: string | null;
  fieldMapping: string | null;
  lastSyncedAt: string | null;
};

type Rule = {
  enabled: boolean;
  visitThreshold: number;
  reactivationEnabled: boolean;
  reactivationDays: number;
};

const REACTIVATION_LABEL: Record<string, { verb: string; noun: string; blurb: string }> = {
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

const NATIVE_CRMS = [
  { key: "HUBSPOT", label: "HubSpot" },
  { key: "GOHIGHLEVEL", label: "GoHighLevel" },
  { key: "SQUARE", label: "Square Appointments" },
  { key: "SERVICEM8", label: "ServiceM8" },
  { key: "TRADIFY", label: "Tradify" },
  { key: "SALESFORCE", label: "Salesforce" },
];

type Mode = "CSV" | "WEBHOOK" | "CLINIKO" | "NOOKAL" | null;

export default function CrmPage(props: PageProps<"/biz/[id]/crm">) {
  const { id: businessId } = use(props.params);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [rule, setRule] = useState<Rule>({
    enabled: false,
    visitThreshold: 4,
    reactivationEnabled: false,
    reactivationDays: 30,
  });
  const [businessType, setBusinessType] = useState<string>("PHYSIO_OSTEO");
  const [reactivationMessage, setReactivationMessage] = useState("");
  const [mode, setMode] = useState<Mode>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function refresh() {
    Promise.all([
      fetch(`/api/crm/connection?businessId=${businessId}`).then((r) => r.json()),
      fetch(`/api/automation?businessId=${businessId}`).then((r) => r.json()),
      fetch(`/api/business/${businessId}`).then((r) => r.json()),
    ]).then(([connData, ruleData, bizData]) => {
      setConnections(connData.connections);
      if (ruleData.rule) {
        setRule({
          enabled: ruleData.rule.enabled,
          visitThreshold: ruleData.rule.visitThreshold,
          reactivationEnabled: ruleData.rule.reactivationEnabled,
          reactivationDays: ruleData.rule.reactivationDays,
        });
      }
      setBusinessType(bizData.business.type);
      setReactivationMessage(bizData.business.reactivationMessage ?? "");
      setRefreshKey((k) => k + 1);
    });
  }

  useEffect(refresh, [businessId]);

  const hasCrmSync = connections.some((c) => c.type === "CLINIKO" || c.type === "NOOKAL");
  const reactivationCopy = REACTIVATION_LABEL[businessType] ?? REACTIVATION_LABEL.PHYSIO_OSTEO;

  return (
    <div className="max-w-3xl space-y-10">
      <section>
        <h2 className="text-lg font-semibold mb-1">Connections</h2>
        <p className="text-sm text-gray-500 mb-4">
          Where contacts come from, and — for Cliniko and Nookal — when a review request fires.
        </p>
        {connections.length === 0 ? (
          <p className="text-sm text-gray-500 border border-dashed border-black/10 dark:border-white/15 rounded-xl p-6 text-center">
            No connections yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {connections.map((c) => (
              <li key={c.id} className="rounded-xl border border-black/10 dark:border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {c.type}
                      {c.lastSyncedAt && (
                        <> · last synced {new Date(c.lastSyncedAt).toLocaleString()}</>
                      )}
                    </div>
                  </div>
                  {c.type === "WEBHOOK" && c.webhookToken && <WebhookUrl token={c.webhookToken} />}
                  {(c.type === "CLINIKO" || c.type === "NOOKAL") && (
                    <SyncButton connectionId={c.id} onSynced={refresh} />
                  )}
                </div>
                {(c.type === "CLINIKO" || c.type === "NOOKAL") && (
                  <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                    <TriggerEditor
                      businessId={businessId}
                      rule={rule}
                      reactivationMessage={reactivationMessage}
                      reactivationCopy={reactivationCopy}
                      onSaved={refresh}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {!hasCrmSync && connections.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            CSV and webhook contacts don&apos;t carry visit history, so they&apos;re sent manually from
            the dashboard — connect Cliniko or Nookal for automatic sending by visit count.
          </p>
        )}
      </section>

      <section className="border-t border-black/10 dark:border-white/10 pt-8">
        <h2 className="text-lg font-semibold mb-4">Add a connection</h2>

        {!mode && (
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => setMode("CLINIKO")}
              className="text-left rounded-xl border border-black/10 dark:border-white/10 p-4 hover:border-emerald-500 transition"
            >
              <div className="text-sm font-medium">Cliniko</div>
              <div className="text-xs text-gray-500 mt-1">
                Pull patients + visit history via your Cliniko API key.
              </div>
            </button>
            <button
              onClick={() => setMode("NOOKAL")}
              className="text-left rounded-xl border border-black/10 dark:border-white/10 p-4 hover:border-emerald-500 transition"
            >
              <div className="text-sm font-medium">Nookal</div>
              <div className="text-xs text-gray-500 mt-1">
                Pull patients + visit history via your Nookal API key.
              </div>
            </button>
            <button
              onClick={() => setMode("CSV")}
              className="text-left rounded-xl border border-black/10 dark:border-white/10 p-4 hover:border-emerald-500 transition"
            >
              <div className="text-sm font-medium">Upload a CSV</div>
              <div className="text-xs text-gray-500 mt-1">
                Export contacts from any CRM as CSV and upload them here.
              </div>
            </button>
            <button
              onClick={() => setMode("WEBHOOK")}
              className="text-left rounded-xl border border-black/10 dark:border-white/10 p-4 hover:border-emerald-500 transition"
            >
              <div className="text-sm font-medium">Generic webhook</div>
              <div className="text-xs text-gray-500 mt-1">
                Get a URL you can point Zapier, Make, or any CRM&apos;s outgoing webhook at.
              </div>
            </button>
          </div>
        )}

        {mode === "CLINIKO" && (
          <ClinikoConnectionForm
            businessId={businessId}
            initialRule={rule}
            reactivationCopy={reactivationCopy}
            initialReactivationMessage={reactivationMessage}
            onDone={() => { setMode(null); refresh(); }}
            onCancel={() => setMode(null)}
          />
        )}
        {mode === "NOOKAL" && (
          <NookalConnectionForm
            businessId={businessId}
            initialRule={rule}
            reactivationCopy={reactivationCopy}
            initialReactivationMessage={reactivationMessage}
            onDone={() => { setMode(null); refresh(); }}
            onCancel={() => setMode(null)}
          />
        )}
        {mode === "CSV" && (
          <CsvConnectionForm businessId={businessId} onDone={() => { setMode(null); refresh(); }} onCancel={() => setMode(null)} />
        )}
        {mode === "WEBHOOK" && (
          <WebhookConnectionForm businessId={businessId} onDone={() => { setMode(null); refresh(); }} onCancel={() => setMode(null)} />
        )}

        <div className="mt-8 rounded-xl border border-dashed border-black/10 dark:border-white/15 p-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Native integrations (coming soon)</div>
          <div className="flex flex-wrap gap-2">
            {NATIVE_CRMS.map((c) => (
              <span
                key={c.key}
                className="text-[11px] rounded-full border border-black/10 dark:border-white/15 px-2.5 py-1 text-gray-500"
              >
                {c.label}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            Until these are wired up, use the CSV upload or generic webhook — Zapier/Make can bridge
            to any of these systems today.
          </p>
        </div>
      </section>

      <ContactsPreview businessId={businessId} refreshKey={refreshKey} />
    </div>
  );
}

function WebhookUrl({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/api/crm/webhook/${token}` : "";
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-[11px] font-mono rounded-md border border-black/10 dark:border-white/15 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5"
    >
      {copied ? "Copied!" : "Copy webhook URL"}
    </button>
  );
}

/** Checkbox + threshold number input — the actual trigger-selection UI,
 * reused both inline in each Cliniko/Nookal row and inside their connect forms. */
function TriggerFields({
  enabled,
  setEnabled,
  threshold,
  setThreshold,
}: {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  threshold: number;
  setThreshold: (v: number) => void;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <span className="text-sm font-medium">Send the review request automatically</span>
      </label>
      {enabled && (
        <div className="flex items-center gap-2 mt-2 pl-6">
          <span className="text-sm text-gray-500">After visit #</span>
          <input
            type="number"
            min={1}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-16 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-2 py-1 text-sm text-center"
          />
        </div>
      )}
    </div>
  );
}

/** Checkbox + days threshold + message — the win-back / reactivation trigger,
 * reused inline and inside the connect forms, same as TriggerFields. */
function ReactivationFields({
  enabled,
  setEnabled,
  days,
  setDays,
  message,
  setMessage,
  copy,
}: {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  days: number;
  setDays: (v: number) => void;
  message: string;
  setMessage: (v: string) => void;
  copy: { verb: string; noun: string; blurb: string };
}) {
  return (
    <div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <span className="text-sm font-medium">{copy.verb} automatically</span>
      </label>
      <p className="text-[11px] text-gray-500 mt-0.5 pl-6">{copy.blurb}</p>
      {enabled && (
        <div className="pl-6 mt-2 space-y-2">
          <div className="flex items-center gap-2">
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
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder={`Hey {{first_name}}! It's been a while since we've seen you at {{business_name}} — come back and see us soon.`}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
}

/** Inline summary + editable trigger settings shown under each Cliniko/Nookal
 * connection row. The rules are shared across the whole business, so editing
 * from any connection updates the same ones everyone sees. */
function TriggerEditor({
  businessId,
  rule,
  reactivationMessage,
  reactivationCopy,
  onSaved,
}: {
  businessId: string;
  rule: Rule;
  reactivationMessage: string;
  reactivationCopy: { verb: string; noun: string; blurb: string };
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [enabled, setEnabled] = useState(rule.enabled);
  const [threshold, setThreshold] = useState(rule.visitThreshold);
  const [reactEnabled, setReactEnabled] = useState(rule.reactivationEnabled);
  const [reactDays, setReactDays] = useState(rule.reactivationDays);
  const [message, setMessage] = useState(reactivationMessage);
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setEnabled(rule.enabled);
    setThreshold(rule.visitThreshold);
    setReactEnabled(rule.reactivationEnabled);
    setReactDays(rule.reactivationDays);
    setMessage(reactivationMessage);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/automation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId,
            enabled,
            visitThreshold: threshold,
            reactivationEnabled: reactEnabled,
            reactivationDays: reactDays,
          }),
        }),
        message.trim()
          ? fetch(`/api/business/${businessId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reactivationMessage: message.trim() }),
            })
          : Promise.resolve(),
      ]);
      onSaved();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 space-y-0.5">
          <p>
            {rule.enabled ? (
              <>
                <span className="text-emerald-600 font-medium">Auto-sends</span> after visit #
                {rule.visitThreshold}
              </>
            ) : (
              "Review requests not automated — send manually from the dashboard"
            )}
          </p>
          <p>
            {rule.reactivationEnabled ? (
              <>
                <span className="text-emerald-600 font-medium">
                  {reactivationCopy.noun[0].toUpperCase() + reactivationCopy.noun.slice(1)} auto-sends
                </span>{" "}
                after {rule.reactivationDays} quiet days
              </>
            ) : (
              `No ${reactivationCopy.noun} automation configured`
            )}
          </p>
        </div>
        <button onClick={startEditing} className="text-[11px] text-gray-500 underline shrink-0">
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TriggerFields enabled={enabled} setEnabled={setEnabled} threshold={threshold} setThreshold={setThreshold} />
      <div className="pt-3 border-t border-gray-100">
        <ReactivationFields
          enabled={reactEnabled}
          setEnabled={setReactEnabled}
          days={reactDays}
          setDays={setReactDays}
          message={message}
          setMessage={setMessage}
          copy={reactivationCopy}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="text-[11px] font-medium rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 disabled:opacity-60"
        >
          Save
        </button>
        <button onClick={() => setEditing(false)} className="text-[11px] text-gray-500">
          Cancel
        </button>
      </div>
    </div>
  );
}

function FieldMappingInputs({
  mapping,
  setMapping,
  sourceOptions,
}: {
  mapping: { first_name: string; last_name: string; phone: string; email: string };
  setMapping: (m: { first_name: string; last_name: string; phone: string; email: string }) => void;
  sourceOptions?: string[];
}) {
  const fields: { key: keyof typeof mapping; label: string; required?: boolean }[] = [
    { key: "phone", label: "Phone number", required: true },
    { key: "first_name", label: "First name" },
    { key: "last_name", label: "Last name" },
    { key: "email", label: "Email" },
  ];
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-xs font-medium mb-1">
            {f.label} {f.required && <span className="text-red-500">*</span>}
          </label>
          {sourceOptions ? (
            <select
              value={mapping[f.key]}
              onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
              className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm"
            >
              <option value="">— not mapped —</option>
              {sourceOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={mapping[f.key]}
              onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
              placeholder={`JSON key, e.g. "${f.key}"`}
              className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm font-mono"
            />
          )}
        </div>
      ))}
    </div>
  );
}

function CsvConnectionForm({
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
  const [mapping, setMapping] = useState({ first_name: "", last_name: "", phone: "", email: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const { headers, rows } = parseCsv(String(reader.result));
      setHeaders(headers);
      setRows(rows);
      const guess = (needle: string) =>
        headers.find((h) => h.toLowerCase().includes(needle)) ?? "";
      setMapping({
        first_name: guess("first"),
        last_name: guess("last"),
        phone: guess("phone") || guess("mobile"),
        email: guess("email"),
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
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 space-y-4 mt-2">
      <div>
        <label className="block text-xs font-medium mb-1">Connection name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm"
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
          <FieldMappingInputs mapping={mapping} setMapping={setMapping} sourceOptions={headers} />
        </div>
      )}

      <p className="text-[11px] text-gray-500">
        A CSV is a one-time snapshot — these contacts are sent manually from the dashboard, since
        there&apos;s no ongoing visit data to trigger on automatically.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting || rows.length === 0}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
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

function WebhookConnectionForm({
  businessId,
  onDone,
  onCancel,
}: {
  businessId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Incoming webhook");
  const [mapping, setMapping] = useState({ first_name: "first_name", last_name: "last_name", phone: "phone", email: "email" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!mapping.phone) {
      setError("Set the JSON key for phone number first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, type: "WEBHOOK", name, fieldMapping: mapping }),
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
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 space-y-4 mt-2">
      <div>
        <label className="block text-xs font-medium mb-1">Connection name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-2">
          Field mapping — the JSON key each value will arrive under
        </label>
        <FieldMappingInputs mapping={mapping} setMapping={setMapping} />
      </div>

      <p className="text-[11px] text-gray-500">
        Webhook contacts are sent manually from the dashboard — point your automation tool
        (Zapier/Make) at this URL per event, and trigger sends here once they land.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create webhook"}
        </button>
        <button onClick={onCancel} className="text-sm text-gray-500 px-4 py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

const CLINIKO_SHARDS = ["au1", "au2", "au3", "au4", "uk1", "us1", "ca1"];

function ClinikoConnectionForm({
  businessId,
  initialRule,
  reactivationCopy,
  initialReactivationMessage,
  onDone,
  onCancel,
}: {
  businessId: string;
  initialRule: Rule;
  reactivationCopy: { verb: string; noun: string; blurb: string };
  initialReactivationMessage: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Cliniko");
  const [apiKey, setApiKey] = useState("");
  const [shard, setShard] = useState("au4");
  const [autoEnabled, setAutoEnabled] = useState(initialRule.enabled);
  const [autoThreshold, setAutoThreshold] = useState(initialRule.visitThreshold);
  const [reactEnabled, setReactEnabled] = useState(initialRule.reactivationEnabled);
  const [reactDays, setReactDays] = useState(initialRule.reactivationDays);
  const [reactMessage, setReactMessage] = useState(initialReactivationMessage);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!apiKey.trim()) {
      setError("Enter your Cliniko API key first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/cliniko", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, name, apiKey, shard }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Couldn't connect to Cliniko.");
      await Promise.all([
        fetch("/api/automation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId,
            enabled: autoEnabled,
            visitThreshold: autoThreshold,
            reactivationEnabled: reactEnabled,
            reactivationDays: reactDays,
          }),
        }),
        reactMessage.trim()
          ? fetch(`/api/business/${businessId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reactivationMessage: reactMessage.trim() }),
            })
          : Promise.resolve(),
      ]);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 space-y-4 mt-2">
      <div>
        <label className="block text-xs font-medium mb-1">Connection name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">API key</label>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="From Cliniko → My Info → API Keys"
            className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Shard (region)</label>
          <select
            value={shard}
            onChange={(e) => setShard(e.target.value)}
            className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm"
          >
            {CLINIKO_SHARDS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-[11px] text-gray-500">
        The shard is in your Cliniko URL, e.g. <code>au4</code> in{" "}
        <code>yourclinic.au4.cliniko.com</code>.
      </p>

      <div className="pt-3 border-t border-black/5 dark:border-white/5">
        <TriggerFields
          enabled={autoEnabled}
          setEnabled={setAutoEnabled}
          threshold={autoThreshold}
          setThreshold={setAutoThreshold}
        />
        <p className="text-[11px] text-gray-500 mt-2">
          Checked every time this connection syncs — visits come from Cliniko&apos;s appointment
          history.
        </p>
      </div>

      <div className="pt-3 border-t border-black/5 dark:border-white/5">
        <ReactivationFields
          enabled={reactEnabled}
          setEnabled={setReactEnabled}
          days={reactDays}
          setDays={setReactDays}
          message={reactMessage}
          setMessage={setReactMessage}
          copy={reactivationCopy}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
        >
          {submitting ? "Connecting…" : "Connect & sync"}
        </button>
        <button onClick={onCancel} className="text-sm text-gray-500 px-4 py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

function NookalConnectionForm({
  businessId,
  initialRule,
  reactivationCopy,
  initialReactivationMessage,
  onDone,
  onCancel,
}: {
  businessId: string;
  initialRule: Rule;
  reactivationCopy: { verb: string; noun: string; blurb: string };
  initialReactivationMessage: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Nookal");
  const [apiKey, setApiKey] = useState("");
  const [autoEnabled, setAutoEnabled] = useState(initialRule.enabled);
  const [autoThreshold, setAutoThreshold] = useState(initialRule.visitThreshold);
  const [reactEnabled, setReactEnabled] = useState(initialRule.reactivationEnabled);
  const [reactDays, setReactDays] = useState(initialRule.reactivationDays);
  const [reactMessage, setReactMessage] = useState(initialReactivationMessage);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!apiKey.trim()) {
      setError("Enter your Nookal API key first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/nookal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, name, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Couldn't connect to Nookal.");
      await Promise.all([
        fetch("/api/automation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId,
            enabled: autoEnabled,
            visitThreshold: autoThreshold,
            reactivationEnabled: reactEnabled,
            reactivationDays: reactDays,
          }),
        }),
        reactMessage.trim()
          ? fetch(`/api/business/${businessId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reactivationMessage: reactMessage.trim() }),
            })
          : Promise.resolve(),
      ]);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 space-y-4 mt-2">
      <div>
        <label className="block text-xs font-medium mb-1">Connection name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">API key</label>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="From Nookal → Setup → API Access"
          className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm font-mono"
        />
      </div>

      <div className="pt-3 border-t border-black/5 dark:border-white/5">
        <TriggerFields
          enabled={autoEnabled}
          setEnabled={setAutoEnabled}
          threshold={autoThreshold}
          setThreshold={setAutoThreshold}
        />
        <p className="text-[11px] text-gray-500 mt-2">
          Checked every time this connection syncs — visits come from Nookal&apos;s appointment
          history.
        </p>
      </div>

      <div className="pt-3 border-t border-black/5 dark:border-white/5">
        <ReactivationFields
          enabled={reactEnabled}
          setEnabled={setReactEnabled}
          days={reactDays}
          setDays={setReactDays}
          message={reactMessage}
          setMessage={setReactMessage}
          copy={reactivationCopy}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
        >
          {submitting ? "Connecting…" : "Connect & sync"}
        </button>
        <button onClick={onCancel} className="text-sm text-gray-500 px-4 py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

function SyncButton({ connectionId, onSynced }: { connectionId: string; onSynced: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed.");
      onSynced();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="text-right">
      <button
        onClick={sync}
        disabled={syncing}
        className="text-[11px] font-medium rounded-md border border-black/10 dark:border-white/15 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-60"
      >
        {syncing ? "Syncing…" : "Sync now"}
      </button>
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function ContactsPreview({ businessId, refreshKey }: { businessId: string; refreshKey: number }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/contacts?businessId=${businessId}`)
      .then((r) => r.json())
      .then((data) => setCount(data.contacts.length));
  }, [businessId, refreshKey]);

  if (count === null) return null;

  return (
    <section className="border-t border-black/10 dark:border-white/10 pt-8">
      <p className="text-sm text-gray-500">
        <span className="font-medium text-gray-800 dark:text-gray-200">{count}</span> contact
        {count === 1 ? "" : "s"} imported so far. Head to the{" "}
        <a href={`/biz/${businessId}/dashboard`} className="text-emerald-600 underline">
          dashboard
        </a>{" "}
        to send review requests.
      </p>
    </section>
  );
}
