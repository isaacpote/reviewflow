"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TabNav({ businessId }: { businessId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/biz/${businessId}/number`, label: "1. Number" },
    { href: `/biz/${businessId}/message`, label: "2. Message" },
    { href: `/biz/${businessId}/crm`, label: "3. CRM & Contacts" },
    { href: `/biz/${businessId}/dashboard`, label: "4. Dashboard" },
  ];

  return (
    <nav className="flex gap-1 border-b border-black/10 dark:border-white/10 px-6 sm:px-10 overflow-x-auto">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap px-3.5 py-3 text-sm font-medium border-b-2 -mb-px transition ${
              active
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
