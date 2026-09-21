import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <div className="inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-emerald-600 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Review automation
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Get more reviews, automatically
        </h1>
        <p className="mt-3 text-gray-500 dark:text-gray-400">
          Buy a texting number, connect your CRM, and send review requests
          the moment a customer leaves happy. Built for physios, osteos,
          restaurants, and tradies.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
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
    </main>
  );
}
