export function GoogleButton({ label }: { label: string }) {
  return (
    <a
      href="/api/auth/google"
      className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black/20 hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium py-2.5 transition"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.56-5.17 3.56-8.66Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.87-3a7.2 7.2 0 0 1-10.7-3.78H1.4v3.09A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.37 14.32a7.2 7.2 0 0 1 0-4.63V6.6H1.4a12 12 0 0 0 0 10.8l3.97-3.08Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44A11.6 11.6 0 0 0 12 0 12 12 0 0 0 1.4 6.6l3.97 3.09A7.2 7.2 0 0 1 12 4.77Z"
        />
      </svg>
      {label}
    </a>
  );
}
