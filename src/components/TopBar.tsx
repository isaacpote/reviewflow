"use client";

import { useRouter } from "next/navigation";
import { Search, Bell, Settings as SettingsIcon, LogOut } from "lucide-react";
import { useState } from "react";

export function TopBar({ businessId, userEmail }: { businessId: string; userEmail: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const initial = userEmail.charAt(0).toUpperCase();

  return (
    <header className="hidden sm:flex items-center gap-4 px-8 py-4">
      <div className="flex-1 max-w-sm relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search…"
          disabled
          className="w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-3 py-2.5 text-sm placeholder:text-gray-400 outline-none shadow-[0_2px_10px_rgba(124,92,252,0.05)] disabled:cursor-default"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Notifications"
          className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 transition shadow-[0_2px_10px_rgba(124,92,252,0.05)]"
        >
          <Bell className="h-4 w-4" />
        </button>
        <a
          href={`/biz/${businessId}/settings`}
          title="Settings"
          className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 transition shadow-[0_2px_10px_rgba(124,92,252,0.05)]"
        >
          <SettingsIcon className="h-4 w-4" />
        </a>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full bg-white border border-gray-200 pl-1 pr-3 py-1 hover:border-emerald-500/50 transition shadow-[0_2px_10px_rgba(124,92,252,0.05)]"
          >
            <span className="h-8 w-8 rounded-full bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center">
              {initial}
            </span>
            <span className="text-sm font-medium text-gray-700 max-w-[140px] truncate">{userEmail}</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-gray-200 bg-white shadow-[0_8px_24px_rgba(124,92,252,0.12)] py-1.5 z-10">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
