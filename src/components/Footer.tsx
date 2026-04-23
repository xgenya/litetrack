import Link from "next/link";

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur-sm py-3 text-center text-xs text-muted-foreground">
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
