import Link from "next/link";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-10 py-6">
        <Link href="/" className="font-[family-name:var(--font-display)] text-lg italic tracking-tight">
          ReviewFlow
        </Link>
        <Link href="/login" className="text-sm text-gray-500 hover:text-black dark:hover:text-white transition">
          Log in
        </Link>
      </header>
      <main className="flex-1 px-6 sm:px-10 pb-20">
        <article className="max-w-2xl mx-auto">
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl tracking-tight mb-2">
            {title}
          </h1>
          <p className="text-sm text-gray-500 mb-10">Last updated {updated}</p>
          <div className="space-y-8 text-[15px] leading-relaxed [&_h2]:font-[family-name:var(--font-display)] [&_h2]:text-xl [&_h2]:mb-2 [&_p]:text-gray-700 dark:[&_p]:text-gray-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:text-gray-700 dark:[&_ul]:text-gray-300">
            {children}
          </div>
        </article>
      </main>
      <footer className="border-t border-black/10 dark:border-white/10 px-6 sm:px-10 py-6 text-xs text-gray-500 flex gap-4">
        <Link href="/terms" className="hover:underline">Terms</Link>
        <Link href="/privacy" className="hover:underline">Privacy</Link>
      </footer>
    </div>
  );
}
