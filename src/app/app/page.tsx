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
      <header className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-gray-200 bg-white">
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
              className="text-sm font-medium rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2"
            >
              + Add business
            </Link>
          </div>

          {businesses.length === 0 ? (
            <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
              No businesses yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {businesses.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/biz/${b.id}/number`}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_20px_rgba(124,92,252,0.06)] hover:border-emerald-500 transition"
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
