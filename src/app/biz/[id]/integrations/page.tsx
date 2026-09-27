"use client";

import { use, useEffect, useState } from "react";
import { parseCsv } from "@/lib/csv";
import { Database, FileSpreadsheet, Webhook as WebhookIcon, RefreshCw } from "lucide-react";

type Connection = {
  id: string;
  type:
    | "CSV"
    | "WEBHOOK"
    | "CLINIKO"
    | "NOOKAL"
    | "HALAXY"
    | "SPLOSE"
    | "FERGUS"
    | "DOSHII"
    | "HUBSPOT"
    | "GOHIGHLEVEL";
  name: string;
  webhookToken: string | null;
  fieldMapping: string | null;
  lastSyncedAt: string | null;
};

const SYNCED_TYPES = ["CLINIKO", "NOOKAL", "HALAXY", "SPLOSE", "FERGUS", "DOSHII"] as const;

const NATIVE_CRMS = [
  { key: "HUBSPOT", label: "HubSpot" },
  { key: "GOHIGHLEVEL", label: "GoHighLevel" },
  { key: "SQUARE", label: "Square Appointments" },
  { key: "SERVICEM8", label: "ServiceM8" },
  { key: "TRADIFY", label: "Tradify" },
  { key: "SALESFORCE", label: "Salesforce" },
];

const TYPE_ICON: Record<Connection["type"], React.ComponentType<{ className?: string }>> = {
  CLINIKO: Database,
  NOOKAL: Database,
  HALAXY: Database,
  SPLOSE: Database,
  FERGUS: Database,
  DOSHII: Database,
  CSV: FileSpreadsheet,
  WEBHOOK: WebhookIcon,
  HUBSPOT: Database,
  GOHIGHLEVEL: Database,
};

type Mode = "CSV" | "WEBHOOK" | "CLINIKO" | "NOOKAL" | "HALAXY" | "SPLOSE" | "FERGUS" | "DOSHII" | null;

export default function IntegrationsPage(props: PageProps<"/biz/[id]/integrations">) {
  const { id: businessId } = use(props.params);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function refresh() {
    fetch(`/api/crm/connection?businessId=${businessId}`)
      .then((r) => r.json())
      .then((data) => {
        setConnections(data.connections);
        setRefreshKey((k) => k + 1);
      });
  }

  useEffect(refresh, [businessId]);

  const hasCrmSync = connections.some((c) =>
    (SYNCED_TYPES as readonly string[]).includes(c.type)
  );

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Where your contacts come from. Manage when messages send from the Reviews and
          Reactivation tabs.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Connected</h2>
        {connections.length === 0 ? (
          <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-2xl p-6 text-center">
            No connections yet.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {connections.map((c) => {
              const Icon = TYPE_ICON[c.type];
              return (
                <div key={c.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-emerald-600" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {c.type}
                          {c.lastSyncedAt && (
                            <> · synced {new Date(c.lastSyncedAt).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                    </div>
                    {c.type === "WEBHOOK" && c.webhookToken && <WebhookUrl token={c.webhookToken} />}
                    {(SYNCED_TYPES as readonly string[]).includes(c.type) && (
                      <SyncButton connectionId={c.id} onSynced={refresh} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!hasCrmSync && connections.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            CSV and webhook contacts don&apos;t carry visit history, so they&apos;re sent manually from
            the dashboard — connect a synced CRM above to enable automatic sending.
          </p>
        )}
      </section>

      <section className="border-t border-gray-100 pt-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Add an integration</h2>

        {!mode && (
          <div className="grid sm:grid-cols-2 gap-3">
            <IntegrationOption
              icon={Database}
              label="Cliniko"
              blurb="Pull patients + visit history via your Cliniko API key."
              onClick={() => setMode("CLINIKO")}
            />
            <IntegrationOption
              icon={Database}
              label="Nookal"
              blurb="Pull patients + visit history via your Nookal API key."
              onClick={() => setMode("NOOKAL")}
            />
            <IntegrationOption
              icon={Database}
              label="Halaxy"
              blurb="Pull patients via your Halaxy Client ID + Secret."
              onClick={() => setMode("HALAXY")}
            />
            <IntegrationOption
              icon={Database}
              label="Splose"
              blurb="Pull patients via your Splose API key."
              onClick={() => setMode("SPLOSE")}
            />
            <IntegrationOption
              icon={Database}
              label="Fergus"
              blurb="Pull customers + job history via your Fergus personal access token."
              onClick={() => setMode("FERGUS")}
            />
            <IntegrationOption
              icon={Database}
              label="Doshii"
              blurb="Pull diners via your Doshii partner Client ID + Secret."
              onClick={() => setMode("DOSHII")}
            />
            <IntegrationOption
              icon={FileSpreadsheet}
              label="Upload a CSV"
              blurb="Export contacts from any CRM as CSV and upload them here."
              onClick={() => setMode("CSV")}
            />
            <IntegrationOption
              icon={WebhookIcon}
              label="Generic webhook"
              blurb="Get a URL you can point Zapier, Make, or any CRM's outgoing webhook at."
              onClick={() => setMode("WEBHOOK")}
            />
          </div>
        )}

        {mode === "CLINIKO" && (
          <ClinikoConnectionForm businessId={businessId} onDone={() => { setMode(null); refresh(); }} onCancel={() => setMode(null)} />
        )}
        {mode === "NOOKAL" && (
          <NookalConnectionForm businessId={businessId} onDone={() => { setMode(null); refresh(); }} onCancel={() => setMode(null)} />
        )}
        {mode === "HALAXY" && (
          <HalaxyConnectionForm businessId={businessId} onDone={() => { setMode(null); refresh(); }} onCancel={() => setMode(null)} />
        )}
        {mode === "SPLOSE" && (
          <SploseConnectionForm businessId={businessId} onDone={() => { setMode(null); refresh(); }} onCancel={() => setMode(null)} />
        )}
        {mode === "FERGUS" && (
          <FergusConnectionForm businessId={businessId} onDone={() => { setMode(null); refresh(); }} onCancel={() => setMode(null)} />
        )}
        {mode === "DOSHII" && (
          <DoshiiConnectionForm businessId={businessId} onDone={() => { setMode(null); refresh(); }} onCancel={() => setMode(null)} />
        )}
        {mode === "CSV" && (
          <CsvConnectionForm businessId={businessId} onDone={() => { setMode(null); refresh(); }} onCancel={() => setMode(null)} />
        )}
        {mode === "WEBHOOK" && (
          <WebhookConnectionForm businessId={businessId} onDone={() => { setMode(null); refresh(); }} onCancel={() => setMode(null)} />
        )}

        <div className="mt-8 rounded-2xl border border-dashed border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Coming soon</div>
          <div className="flex flex-wrap gap-2">
            {NATIVE_CRMS.map((c) => (
              <span
                key={c.key}
                className="text-[11px] rounded-full border border-gray-200 px-2.5 py-1 text-gray-500"
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

function IntegrationOption({
  icon: Icon,
  label,
  blurb,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  blurb: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_20px_rgba(124,92,252,0.06)] hover:border-emerald-500 transition"
    >
      <div className="flex items-center gap-3 mb-1">
        <span className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-emerald-600" />
        </span>
        <div className="text-sm font-medium">{label}</div>
      </div>
      <div className="text-xs text-gray-500">{blurb}</div>
    </button>
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
      className="text-[11px] font-mono rounded-full border border-gray-200 px-3 py-1 hover:bg-gray-50 shrink-0"
    >
      {copied ? "Copied!" : "Copy URL"}
    </button>
  );
}

type ContactMapping = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  last_visit_date?: string;
  visit_count?: string;
};

function FieldMappingInputs({
  mapping,
  setMapping,
  sourceOptions,
  includeVisitFields,
}: {
  mapping: ContactMapping;
  setMapping: (m: ContactMapping) => void;
  sourceOptions?: string[];
  includeVisitFields?: boolean;
}) {
  const fields: { key: keyof ContactMapping; label: string; required?: boolean }[] = [
    { key: "phone", label: "Phone number", required: true },
    { key: "first_name", label: "First name" },
    { key: "last_name", label: "Last name" },
    { key: "email", label: "Email" },
    ...(includeVisitFields
      ? ([
          { key: "last_visit_date", label: "Last visit date" },
          { key: "visit_count", label: "Visit count" },
        ] as const)
      : []),
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
              value={mapping[f.key] ?? ""}
              onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
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
              value={mapping[f.key] ?? ""}
              onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
              placeholder={`JSON key, e.g. "${f.key}"`}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
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
      const guess = (needle: string) =>
        headers.find((h) => h.toLowerCase().includes(needle)) ?? "";
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 mt-2 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 mt-2 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
      <div>
        <label className="block text-xs font-medium mb-1">Connection name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
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
          className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2 disabled:opacity-60"
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

function ClinikoConnectionForm({
  businessId,
  onDone,
  onCancel,
}: {
  businessId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Cliniko");
  const [apiKey, setApiKey] = useState("");
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
        body: JSON.stringify({ businessId, name, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Couldn't connect to Cliniko.");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 mt-2 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
      <div>
        <label className="block text-xs font-medium mb-1">Connection name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">API key</label>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="From Cliniko → My Info → API Keys"
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
        />
        <p className="text-[11px] text-gray-500 mt-1">
          That's it — your region is detected automatically from the key.
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2 disabled:opacity-60"
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
  onDone,
  onCancel,
}: {
  businessId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Nookal");
  const [apiKey, setApiKey] = useState("");
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
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 mt-2 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
      <div>
        <label className="block text-xs font-medium mb-1">Connection name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">API key</label>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="From Nookal → Setup → API Access"
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2 disabled:opacity-60"
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

function HalaxyConnectionForm({
  businessId,
  onDone,
  onCancel,
}: {
  businessId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Halaxy");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError("Enter your Halaxy Client ID and Secret first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/halaxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, name, clientId, clientSecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Couldn't connect to Halaxy.");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 mt-2 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
      <div>
        <label className="block text-xs font-medium mb-1">Connection name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Client ID</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="From Halaxy → Developer → API keys"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Client Secret</label>
          <input
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2 disabled:opacity-60"
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

function SploseConnectionForm({
  businessId,
  onDone,
  onCancel,
}: {
  businessId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Splose");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!apiKey.trim()) {
      setError("Enter your Splose API key first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/splose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, name, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Couldn't connect to Splose.");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 mt-2 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
      <div>
        <label className="block text-xs font-medium mb-1">Connection name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">API key</label>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="From Splose → Settings → API"
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2 disabled:opacity-60"
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

function FergusConnectionForm({
  businessId,
  onDone,
  onCancel,
}: {
  businessId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Fergus");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!accessToken.trim()) {
      setError("Enter your Fergus personal access token first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/fergus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, name, accessToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Couldn't connect to Fergus.");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 mt-2 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
      <div>
        <label className="block text-xs font-medium mb-1">Connection name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Personal access token</label>
        <input
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="From Fergus → Account settings → API tokens"
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2 disabled:opacity-60"
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

function DoshiiConnectionForm({
  businessId,
  onDone,
  onCancel,
}: {
  businessId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Doshii");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError("Enter your Doshii partner Client ID and Secret first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/doshii", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, name, clientId, clientSecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Couldn't connect to Doshii.");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 mt-2 shadow-[0_4px_20px_rgba(124,92,252,0.06)]">
      <div>
        <label className="block text-xs font-medium mb-1">Connection name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Client ID</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="From Doshii → Partner dashboard"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Client Secret</label>
          <input
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono shadow-[inset_0_1px_2px_rgba(124,92,252,0.06)]"
          />
        </div>
      </div>
      <p className="text-[11px] text-gray-500">
        Doshii is a middleware hub, not a customer directory itself — whether diner contact
        details are available depends on the specific POS connected to your venue.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2 disabled:opacity-60"
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
    <div className="text-right shrink-0">
      <button
        onClick={sync}
        disabled={syncing}
        className="flex items-center gap-1 text-[11px] font-medium rounded-full border border-gray-200 px-2.5 py-1 hover:bg-gray-50 disabled:opacity-60"
      >
        <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing…" : "Sync"}
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
    <section className="border-t border-gray-100 pt-8">
      <p className="text-sm text-gray-500">
        <span className="font-medium text-gray-800">{count}</span> contact
        {count === 1 ? "" : "s"} imported so far. Head to the{" "}
        <a href={`/biz/${businessId}/dashboard`} className="text-emerald-600 underline">
          dashboard
        </a>{" "}
        to send review requests.
      </p>
    </section>
  );
}
