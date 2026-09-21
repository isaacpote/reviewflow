import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { TabNav } from "@/components/TabNav";
import { LogoutButton } from "@/components/LogoutButton";

const TYPE_LABEL: Record<string, string> = {
  PHYSIO_OSTEO: "Physio / Osteo",
  RESTAURANT: "Restaurant",
  TRADIE: "Tradie",
};

export default async function BizLayout(props: LayoutProps<"/biz/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await props.params;
  const business = await prisma.business.findUnique({ where: { id } });
  if (!business || business.ownerId !== user.id) notFound();

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            ReviewFlow
          </Link>
          <Link href="/app" className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            Switch business
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium">{business.name}</div>
            <div className="text-xs text-gray-500">{TYPE_LABEL[business.type]}</div>
          </div>
          <LogoutButton />
        </div>
      </header>
      <TabNav businessId={id} />
      <div className="flex-1 px-6 sm:px-10 py-8">{props.children}</div>
    </div>
  );
}
