import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-background py-4 text-center text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>© {new Date().getFullYear()} LiteTrack</span>
        <span className="hidden sm:inline text-border">|</span>
        <Link
          href="https://github.com/xgenya/litetrack"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          GitHub
        </Link>
        <span className="hidden sm:inline text-border">|</span>
        <Link
          href="https://github.com/xgenya/litetrack/blob/master/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          GNU GPL v3.0
        </Link>
      </div>
    </footer>
  );
}
