import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Phone, Puzzle, LayoutDashboard, Settings, BarChart3, RefreshCw, MessageSquareText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

const MOBILE_NAV = [
  { seg: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { seg: "number", label: "Number", icon: Phone },
  { seg: "integrations", label: "Integrations", icon: Puzzle },
  { seg: "reviews", label: "Reviews", icon: MessageSquareText },
  { seg: "reactivation", label: "Reactivation", icon: RefreshCw },
  { seg: "analytics", label: "Analytics", icon: BarChart3 },
  { seg: "settings", label: "Settings", icon: Settings },
];

export default async function BizLayout(props: LayoutProps<"/biz/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await props.params;
  const business = await prisma.business.findUnique({ where: { id } });
  if (!business || business.ownerId !== user.id) notFound();

  return (
    <div className="flex-1 flex">
      <Sidebar
        businessId={id}
        businessName={business.name}
        businessType={business.type}
        userEmail={user.email}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Compact top bar — sidebar is hidden below sm, this is the mobile nav */}
        <header className="sm:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <Link href="/" className="font-semibold text-base tracking-tight">
            ReviewFlow
          </Link>
          <Link href="/app" className="text-xs text-gray-500">
            {business.name}
          </Link>
        </header>
        <nav className="sm:hidden flex items-center justify-around border-b border-gray-200 bg-white py-1.5">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.seg}
                href={`/biz/${id}/${item.seg}`}
                className="flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] text-gray-500"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 px-6 sm:px-10 py-8 overflow-y-auto">{props.children}</main>
      </div>
    </div>
  );
}
