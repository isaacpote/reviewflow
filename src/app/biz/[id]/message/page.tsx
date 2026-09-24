"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { renderTemplate, appendOptOutNotice } from "@/lib/template";
import { GoogleBusinessCard } from "@/components/GoogleBusinessCard";

const VARIABLES = [
  { token: "{{first_name}}", desc: "Contact's first name" },
  { token: "{{last_name}}", desc: "Contact's last name" },
  { token: "{{business_name}}", desc: "Your business name" },
  { token: "{{review_link}}", desc: "Your Google/Facebook review link" },
];

const DEFAULT_TEMPLATE =
  "Hey {{first_name}}! Thanks for choosing {{business_name}}. Mind leaving us a quick review? {{review_link}}";

export default function MessagePage(props: PageProps<"/biz/[id]/message">) {
  const { id: businessId } = use(props.params);

  const [businessName, setBusinessName] = useState("");
  const [reviewLink, setReviewLink] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [body, setBody] = useState(DEFAULT_TEMPLATE);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/business/${businessId}`)
      .then((r) => r.json())
      .then((data) => {
        setBusinessName(data.business.name);
        setReviewLink(data.business.reviewLink ?? "");
        setGoogleConnected(Boolean(data.business.googlePlaceId));
        if (data.business.messageTemplate?.body) setBody(data.business.messageTemplate.body);
        setLoaded(true);
      });
  }, [businessId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await fetch(`/api/business/${businessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewLink: reviewLink || undefined }),
      });
      const res = await fetch("/api/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error));
      setSavedAt(Date.now());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <p className="text-sm text-gray-500">Loading…</p>;

  const preview = appendOptOutNotice(
    renderTemplate(body, {
      first_name: "Sam",
      business_name: businessName,
      review_link: reviewLink || "https://g.page/r/your-review-link",
    })
  );

  return (
    <div className="max-w-3xl space-y-10">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-1">Review request message</h2>
            <p className="text-sm text-gray-500">
              This is what customers receive by SMS. Use the variables below to personalize it.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Your review link</label>
            <GoogleBusinessCard
              businessId={businessId}
              onLinkUpdated={(link) => {
                setReviewLink(link);
                setGoogleConnected(true);
              }}
            />
            {googleConnected ? (
              <p className="text-[11px] text-gray-500 font-mono break-all">{reviewLink}</p>
            ) : (
              <>
                <input
                  value={reviewLink}
                  onChange={(e) => setReviewLink(e.target.value)}
                  placeholder="https://g.page/r/your-google-review-link"
                  className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Usually a Google Business Profile review link, but any URL works (Facebook, Trustpilot, etc).
                </p>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 px-3 py-2.5 text-sm font-mono"
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
                className="text-[11px] font-mono rounded-md border border-black/10 dark:border-white/15 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5"
              >
                {v.token}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save message"}
          </button>
          {savedAt && <span className="ml-3 text-xs text-gray-500">Saved ✓</span>}
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 mb-2">Live preview</div>
          <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4 bg-gray-50 dark:bg-white/[0.03]">
            <div className="rounded-2xl rounded-bl-sm bg-emerald-600 text-white text-sm px-3.5 py-2.5 max-w-[85%] shadow-sm">
              {preview}
            </div>
            <div className="text-[10px] text-gray-400 mt-2">as it will appear to Sam</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-black/10 dark:border-white/15 p-4 text-sm text-gray-500">
        Automation (when this fires) is set up alongside your CRM connection — head to{" "}
        <Link href={`/biz/${businessId}/crm`} className="text-emerald-600 underline">
          CRM & Contacts
        </Link>{" "}
        to connect Cliniko/Nookal and choose when it sends.
      </div>
    </div>
  );
}
