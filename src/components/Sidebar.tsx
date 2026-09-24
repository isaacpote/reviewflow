"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Phone, MessageSquare, Database, LayoutDashboard, ChevronsUpDown, LogOut } from "lucide-react";
import { useState } from "react";

const TYPE_LABEL: Record<string, string> = {
  PHYSIO_OSTEO: "Physio / Osteo",
  RESTAURANT: "Restaurant",
  TRADIE: "Tradie",
};

export function Sidebar({
  businessId,
  businessName,
  businessType,
  userEmail,
}: {
  businessId: string;
  businessName: string;
  businessType: string;
  userEmail: string;
}) {
  const pathname = usePathname();

  const nav = [
    { href: `/biz/${businessId}/number`, label: "Number", icon: Phone },
    { href: `/biz/${businessId}/message`, label: "Message", icon: MessageSquare },
    { href: `/biz/${businessId}/crm`, label: "CRM & Contacts", icon: Database },
    { href: `/biz/${businessId}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
  ];

  return (
    <aside className="hidden sm:flex w-64 shrink-0 flex-col border-r border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
      <div className="px-5 py-5">
        <Link href="/" className="font-[family-name:var(--font-display)] text-lg italic tracking-tight">
          ReviewFlow
        </Link>
      </div>

      <div className="px-3">
        <Link
          href="/app"
          className="flex items-center justify-between gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2.5 hover:border-emerald-500/50 transition"
        >
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{businessName}</div>
            <div className="text-xs text-gray-500">{TYPE_LABEL[businessType] ?? businessType}</div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <UserFooter userEmail={userEmail} />
    </aside>
  );
}

function UserFooter({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="border-t border-black/10 dark:border-white/10 px-3 py-3 flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500 truncate">{userEmail}</span>
      <button
        onClick={logout}
        disabled={loggingOut}
        title="Log out"
        className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
