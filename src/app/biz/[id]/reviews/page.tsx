"use client";

import { use, useEffect, useState } from "react";
import { Star, RefreshCw, TrendingUp } from "lucide-react";

type DayBucket = { date: string; reviewRequests: number; reactivations: number };
type Summary = {
  totalReviewRequests: number;
  totalReactivations: number;
  reactivatedCount: number;
  days: DayBucket[];
};

export default function ReviewsPage(props: PageProps<"/biz/[id]/reviews">) {
  const { id: businessId } = use(props.params);
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    fetch(`/api/reviews-summary?businessId=${businessId}`)
      .then((r) => r.json())
      .then(setData);
  }, [businessId]);

  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Review requests sent" value={data.totalReviewRequests} icon={Star} />
        <Stat label="Reactivation messages sent" value={data.totalReactivations} icon={RefreshCw} />
        <Stat label="Contacts won back" value={data.reactivatedCount} icon={TrendingUp} />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold mb-1">Last 14 days</h2>
        <p className="text-xs text-gray-500 mb-4">Messages sent per day, by type.</p>
        <ActivityChart days={data.days} />
      </section>

      <section className="rounded-2xl border border-dashed border-gray-200 p-5">
        <h2 className="text-sm font-semibold mb-1">Actual star ratings</h2>
        <p className="text-xs text-gray-500">
          Real review counts and star ratings need a connected Google Business Profile, which
          requires Google&apos;s API approval (pending — see the Number tab for status). Once
          connected, your actual rating and review volume will show here instead of just send
          counts.
        </p>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold">{value}</div>
        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-emerald-600" />
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

const REVIEW_COLOR = "#2563eb"; // matches --color-emerald-600 (primary blue)
const REACTIVATION_COLOR = "#16a34a"; // matches --color-blue-500 (secondary green)

function ActivityChart({ days }: { days: DayBucket[] }) {
  const width = 720;
  const height = 200;
  const padding = { top: 8, right: 8, bottom: 24, left: 8 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const max = Math.max(1, ...days.map((d) => Math.max(d.reviewRequests, d.reactivations)));
  const groupW = plotW / days.length;
  const barW = Math.min(14, groupW * 0.32);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[600px]" role="img" aria-label="Messages sent per day">
        {/* recessive baseline */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        {days.map((d, i) => {
          const cx = padding.left + groupW * i + groupW / 2;
          const baseY = height - padding.bottom;
          const rH = Math.max((d.reviewRequests / max) * plotH, 2);
          const aH = Math.max((d.reactivations / max) * plotH, 2);
          const showLabel = i === 0 || i === days.length - 1 || i % 3 === 0;
          return (
            <g key={d.date}>
              <title>
                {d.date}: {d.reviewRequests} review request{d.reviewRequests === 1 ? "" : "s"},{" "}
                {d.reactivations} reactivation{d.reactivations === 1 ? "" : "s"}
              </title>
              <rect
                x={cx - barW - 2}
                y={baseY - rH}
                width={barW}
                height={rH}
                rx={2}
                fill={REVIEW_COLOR}
                opacity={d.reviewRequests === 0 ? 0.15 : 1}
              />
              <rect
                x={cx + 2}
                y={baseY - aH}
                width={barW}
                height={aH}
                rx={2}
                fill={REACTIVATION_COLOR}
                opacity={d.reactivations === 0 ? 0.15 : 1}
              />
              {showLabel && (
                <text
                  x={cx}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#94a3b8"
                >
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: REVIEW_COLOR }} />
          Review requests
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: REACTIVATION_COLOR }} />
          Reactivations
        </span>
      </div>
    </div>
  );
}
