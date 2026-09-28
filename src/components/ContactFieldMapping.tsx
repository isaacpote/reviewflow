"use client";

export type ContactMapping = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  last_visit_date?: string;
  visit_count?: string;
};

export function FieldMappingInputs({
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
