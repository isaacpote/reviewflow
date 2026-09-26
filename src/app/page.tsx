import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Stethoscope, UtensilsCrossed, Wrench, Users, Send, Clock3, RefreshCw } from "lucide-react";

const STAR_PATH =
  "M12 2.5l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7-5.4-4.7 7.1-.7z";

function Star({ index, filled = true }: { index: number; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 animate-star-fill ${filled ? "fill-emerald-500" : "fill-gray-200"}`}
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
      {/* Announcement banner — real feature, not a placeholder */}
      <div className="bg-emerald-50 text-emerald-800 text-xs sm:text-sm text-center py-2.5 px-4">
        New: automatic win-back texts for customers who&apos;ve gone quiet —{" "}
        <a href="#reactivation" className="underline font-medium">
          see how it works
        </a>
      </div>

      <header className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shrink-0">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
              <path d={STAR_PATH} />
            </svg>
          </span>
          <span className="font-semibold text-[15px] tracking-tight">ReviewFlow</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-8 text-sm text-gray-600">
          <a href="#features" className="hover:text-black transition">Features</a>
          <a href="#reactivation" className="hover:text-black transition">Reactivation</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-500 hover:text-black transition">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 transition"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-6 sm:px-10 pt-16 sm:pt-20 pb-20">
          <div className="max-w-6xl mx-auto grid gap-14 lg:grid-cols-[1fr_1fr] items-center">
            {/* Left: the thesis */}
            <div>
              <h1 className="animate-rise-in text-[2.5rem] sm:text-[3.25rem] font-semibold leading-[1.05] tracking-tight">
                Turn happy customers into{" "}
                <span className="text-emerald-600">five-star reviews.</span>
              </h1>

              <p
                className="animate-rise-in mt-5 text-base sm:text-lg text-gray-500 max-w-md leading-relaxed"
                style={{ "--rise-delay": "80ms" } as React.CSSProperties}
              >
                Buy a texting number, connect your CRM, and send review requests
                the moment a customer leaves happy — automatically. Built for
                physios, osteos, restaurants, and tradies.
              </p>

              <div
                className="animate-rise-in mt-9 flex items-center gap-4"
                style={{ "--rise-delay": "160ms" } as React.CSSProperties}
              >
                <Link
                  href="/signup"
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-5 py-2.5 transition"
                >
                  Get started →
                </Link>
                <a href="#features" className="text-sm font-medium text-gray-600 hover:text-black transition">
                  See how it works →
                </a>
              </div>
            </div>

            {/* Right: mosaic of floating product cards */}
            <div
              className="animate-rise-in relative h-[420px] hidden sm:block"
              style={{ "--rise-delay": "200ms" } as React.CSSProperties}
            >
              <div className="absolute -z-10 inset-0 translate-x-4 translate-y-4 rounded-3xl bg-emerald-500/10 blur-3xl" />

              {/* Main card: the SMS + stars */}
              <div className="absolute top-0 right-0 w-[340px] rounded-2xl border border-gray-200 bg-white shadow-lg p-5">
                <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-3">
                  Sent automatically after visit #4
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-emerald-600 text-white text-xs px-3.5 py-2.5 shadow-sm">
                  Hey Sam! Mind leaving us a quick review? g.page/r/northside
                </div>
                <div className="mt-4 flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} index={i} />
                  ))}
                  <span className="ml-2 text-xs text-gray-500">4 minutes later</span>
                </div>
              </div>

              {/* Small card: stat cluster */}
              <div className="absolute bottom-24 left-0 w-[220px] rounded-2xl border border-gray-200 bg-white shadow-lg p-4">
                <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-3">
                  This week
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <Users className="h-3.5 w-3.5 text-emerald-600 mx-auto mb-1" />
                    <div className="text-sm font-semibold">128</div>
                  </div>
                  <div>
                    <Send className="h-3.5 w-3.5 text-emerald-600 mx-auto mb-1" />
                    <div className="text-sm font-semibold">34</div>
                  </div>
                  <div>
                    <Clock3 className="h-3.5 w-3.5 text-emerald-600 mx-auto mb-1" />
                    <div className="text-sm font-semibold">6</div>
                  </div>
                </div>
              </div>

              {/* Small card: reactivation */}
              <div className="absolute bottom-0 right-8 w-[260px] rounded-2xl border border-gray-200 bg-white shadow-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center">
                    <RefreshCw className="h-3 w-3 text-emerald-700" />
                  </span>
                  <span className="text-xs font-medium">Reactivation</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Hey Priya! It&apos;s been a while — come back and see us soon.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Honest "built for" row — real business categories, not fake logos */}
        <section className="px-6 sm:px-10 pb-16">
          <div className="max-w-6xl mx-auto">
            <p className="text-center text-xs font-medium uppercase tracking-wide text-gray-400 mb-6">
              Built for local businesses across Australia
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <BusinessBadge icon={Stethoscope} label="Physio / Osteo / Allied Health" />
              <BusinessBadge icon={UtensilsCrossed} label="Restaurant / Hospitality" />
              <BusinessBadge icon={Wrench} label="Tradie / Home Services" />
            </div>
          </div>
        </section>

        <section id="features" className="px-6 sm:px-10 py-16 border-t border-gray-100">
          <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8">
            <FeatureCard
              icon={Send}
              title="Automatic review requests"
              body="Connect Cliniko, Nookal, or upload a CSV. Set a visit threshold and requests send themselves — no manual follow-up."
            />
            <FeatureCard
              icon={RefreshCw}
              title="Reactivation texts"
              body="Nudge customers who've gone quiet with an automatic win-back message after N days of silence."
            />
            <FeatureCard
              icon={Users}
              title="Your own number"
              body="A real, verified texting number for your business — with an alphanumeric sender ID where supported."
            />
          </div>
        </section>

        <section id="reactivation" className="px-6 sm:px-10 py-16 border-t border-gray-100 bg-gray-50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Bring quiet customers back, automatically.
            </h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto leading-relaxed">
              If someone hasn&apos;t visited in a while, ReviewFlow can send a
              personal, automatic text to bring them back — no spreadsheets,
              no manual reminders.
            </p>
            <Link
              href="/signup"
              className="inline-block mt-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-5 py-2.5 transition"
            >
              Get started →
            </Link>
          </div>
        </section>
      </main>

      <footer className="px-6 sm:px-10 py-6 text-xs text-gray-500 flex gap-4 border-t border-gray-100">
        <Link href="/terms" className="hover:underline">Terms</Link>
        <Link href="/privacy" className="hover:underline">Privacy</Link>
      </footer>
    </div>
  );
}

function BusinessBadge({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2">
      <Icon className="h-4 w-4 text-emerald-600" />
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-emerald-600" />
      </div>
      <h3 className="text-base font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
    </div>
  );
}
