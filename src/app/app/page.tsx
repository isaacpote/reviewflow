import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/LogoutButton";

const TYPE_LABEL: Record<string, string> = {
  PHYSIO_OSTEO: "Physio / Osteo",
  RESTAURANT: "Restaurant",
  TRADIE: "Tradie",
};

export default async function AppHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const businesses = await prisma.business.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-black/10 dark:border-white/10">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          ReviewFlow
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user.email}</span>
          <LogoutButton />
        </div>
      </header>

      <div className="flex-1 px-6 sm:px-10 py-10">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Your businesses</h1>
            <Link
              href="/app/new"
              className="text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2"
            >
              + Add business
            </Link>
          </div>

          {businesses.length === 0 ? (
            <p className="text-sm text-gray-500 border border-dashed border-black/10 dark:border-white/15 rounded-xl p-8 text-center">
              No businesses yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {businesses.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/biz/${b.id}/number`}
                    className="flex items-center justify-between rounded-xl border border-black/10 dark:border-white/10 p-4 hover:border-emerald-500 transition"
                  >
                    <div>
                      <div className="text-sm font-medium">{b.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{TYPE_LABEL[b.type]}</div>
                    </div>
                    <span className="text-gray-400">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
