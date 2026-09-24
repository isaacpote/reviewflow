import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STAR_PATH =
  "M12 2.5l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7-5.4-4.7 7.1-.7z";

function Star({ index, filled = true }: { index: number; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 animate-star-fill ${filled ? "fill-emerald-500" : "fill-gray-200 dark:fill-gray-800"}`}
      style={{ "--star-index": index } as React.CSSProperties}
      aria-hidden="true"
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    const firstBusiness = await prisma.business.findFirst({
      where: { ownerId: user.id },
      orderBy: { createdAt: "asc" },
    });
    redirect(firstBusiness ? `/biz/${firstBusiness.id}/number` : "/app");
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-10 py-6">
        <span className="font-[family-name:var(--font-display)] text-lg italic tracking-tight">
          ReviewFlow
        </span>
        <Link
          href="/login"
          className="text-sm text-gray-500 hover:text-black dark:hover:text-white transition"
        >
          Log in
        </Link>
      </header>

      <main className="flex-1 flex items-center px-6 sm:px-10 pb-16">
        <div className="w-full max-w-5xl mx-auto grid gap-14 lg:grid-cols-[1.05fr_0.95fr] items-center">
          {/* Left: the thesis */}
          <div>
            <div
              className="animate-rise-in inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-emerald-600 mb-5"
              style={{ "--rise-delay": "0ms" } as React.CSSProperties}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Review automation for local business
            </div>

            <h1
              className="animate-rise-in font-[family-name:var(--font-display)] text-[2.75rem] sm:text-[3.5rem] leading-[1.05] tracking-tight"
              style={{ "--rise-delay": "80ms" } as React.CSSProperties}
            >
              Turn happy customers into five-star reviews.
            </h1>

            <p
              className="animate-rise-in mt-5 text-base sm:text-lg text-gray-500 max-w-md leading-relaxed"
              style={{ "--rise-delay": "160ms" } as React.CSSProperties}
            >
              Buy a texting number, connect your CRM, and send review requests
              the moment a customer leaves happy — automatically. Built for
              physios, osteos, restaurants, and tradies.
            </p>

            <div
              className="animate-rise-in mt-9 flex items-center gap-3"
              style={{ "--rise-delay": "240ms" } as React.CSSProperties}
            >
              <Link
                href="/signup"
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-5 py-2.5 transition"
              >
                Get started →
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-black/10 dark:border-white/15 text-sm font-medium px-5 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                Log in
              </Link>
            </div>
          </div>

          {/* Right: the signature — a review request arriving, and the five
              stars it turns into, filling in on load */}
          <div
            className="animate-rise-in relative"
            style={{ "--rise-delay": "200ms" } as React.CSSProperties}
          >
            <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-6 sm:p-8">
              <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-4">
                Sent automatically after visit #4
              </div>

              <div className="rounded-2xl rounded-bl-sm bg-emerald-600 text-white text-sm px-4 py-3 shadow-sm max-w-[90%]">
                Hey Sam! Thanks for choosing Northside Physio. Mind leaving us
                a quick review? g.page/r/northside · Reply STOP to opt out.
              </div>

              <div className="mt-6 flex items-center gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} index={i} />
                ))}
                <span className="ml-2 text-sm text-gray-500">
                  Sam left a review 4 minutes later.
                </span>
              </div>
            </div>

            <div className="absolute -z-10 inset-0 translate-x-4 translate-y-4 rounded-3xl bg-emerald-500/10 blur-2xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
