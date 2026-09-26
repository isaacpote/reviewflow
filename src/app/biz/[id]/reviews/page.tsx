"use client";

import { use, useEffect, useState } from "react";
import { renderTemplate, appendOptOutNotice } from "@/lib/template";
import { GoogleBusinessCard } from "@/components/GoogleBusinessCard";
import { reviewLinkForPlace } from "@/lib/google-business";
import { SentLog } from "@/components/SentLog";

const VARIABLES = [
  { token: "{{first_name}}", desc: "Contact's first name" },
  { token: "{{last_name}}", desc: "Contact's last name" },
  { token: "{{business_name}}", desc: "Your business name" },
  { token: "{{review_link}}", desc: "Your Google/Facebook review link" },
];

const DEFAULT_TEMPLATE =
  "Hey {{first_name}}! Thanks for choosing {{business_name}}. Mind leaving us a quick review? {{review_link}}";

export default function ReviewsPage(props: PageProps<"/biz/[id]/reviews">) {
  const { id: businessId } = use(props.params);

  const [businessName, setBusinessName] = useState("");
  const [reviewLink, setReviewLink] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [showPlaceIdHelper, setShowPlaceIdHelper] = useState(false);
  const [placeId, setPlaceId] = useState("");
  const [body, setBody] = useState(DEFAULT_TEMPLATE);

  const [triggerEnabled, setTriggerEnabled] = useState(false);
  const [threshold, setThreshold] = useState(4);

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
      setReviewLink(bizData.business.reviewLink ?? "");
      setGoogleConnected(Boolean(bizData.business.googlePlaceId));
      if (bizData.business.messageTemplate?.body) setBody(bizData.business.messageTemplate.body);
      if (ruleData.rule) {
        setTriggerEnabled(ruleData.rule.enabled);
        setThreshold(ruleData.rule.visitThreshold);
      }
      setLoaded(true);
    });
  }, [businessId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        fetch(`/api/business/${businessId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewLink: reviewLink || undefined }),
        }),
        fetch("/api/template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId, body }),
        }),
        fetch("/api/automation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId, enabled: triggerEnabled, visitThreshold: threshold }),
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
    renderTemplate(body, {
      first_name: "Sam",
      business_name: businessName,
      review_link: reviewLink || "https://g.page/r/your-review-link",
    })
  );

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">
          The message customers get asking for a review, and when it sends.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
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
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Usually a Google Business Profile review link, but any URL works (Facebook, Trustpilot, etc).
                </p>

                <button
                  type="button"
                  onClick={() => setShowPlaceIdHelper((v) => !v)}
                  className="text-[11px] text-emerald-600 underline mt-2"
                >
                  {showPlaceIdHelper ? "Hide" : "Have your Google Place ID instead? →"}
                </button>

                {showPlaceIdHelper && (
                  <div className="mt-2 rounded-lg border border-gray-200 p-3 space-y-2">
                    <p className="text-[11px] text-gray-500">
                      This generates the fastest possible link — it skips straight to Google&apos;s
                      star-rating screen (and opens the Maps app directly on mobile) instead of
                      the business&apos;s listing page. If someone&apos;s already signed into
                      Google on their phone, which most people are, there&apos;s nothing else to
                      tap through.
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={placeId}
                        onChange={(e) => setPlaceId(e.target.value)}
                        placeholder="ChIJ..."
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono"
                      />
                      <button
                        type="button"
                        disabled={!placeId.trim()}
                        onClick={() => {
                          setReviewLink(reviewLinkForPlace(placeId.trim()));
                          setShowPlaceIdHelper(false);
                        }}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 disabled:opacity-40"
                      >
                        Use this
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Find your Place ID with Google&apos;s free{" "}
                      <a
                        href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 underline"
                      >
                        Place ID Finder
                      </a>{" "}
                      — search your business name, no Google account or API key needed.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
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
              <span className="text-sm font-medium">Send automatically</span>
            </label>
            {triggerEnabled && (
              <div className="flex items-center gap-2 mt-2 pl-6">
                <span className="text-sm text-gray-500">After visit #</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-center"
                />
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
            <div className="text-[10px] text-gray-400 mt-2">as it will appear to Sam</div>
          </div>
        </div>
      </div>

      <section className="pt-2 border-t border-gray-100">
        <h2 className="text-lg font-semibold mb-3 pt-6">Sent</h2>
        <SentLog businessId={businessId} kind="REVIEW_REQUEST" refreshKey={refreshKey} />
      </section>
    </div>
  );
}
