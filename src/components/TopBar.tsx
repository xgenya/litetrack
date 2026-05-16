"use client";

import { LoginDialog } from "./LoginDialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Package, UserRound, Boxes, ChevronRight } from "lucide-react";
import { useUser } from "@/lib/user-context";

interface TopBarProps {
  title?: string;
  backLink?: string;
  backText?: string;
}

export function TopBar({
  title = "LiteTrack",
  backLink,
  backText = "返回",
}: TopBarProps) {
  const { user } = useUser();
  const pathname = usePathname() ?? "/";
  const isSubPage = !!backLink;
  const showCrumb = isSubPage || title !== "LiteTrack";

  const isActive = (href: string, opts?: { exact?: boolean }) => {
    if (href === "/" || opts?.exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const navItemClass = (
    href: string,
    tone: "default" | "amber" = "default",
    opts?: { exact?: boolean }
  ) => {
    const active = isActive(href, opts);
    if (tone === "amber") {
      return active
        ? "flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2.5 py-1.5 text-sm font-medium text-amber-700 transition-colors dark:bg-amber-400/15 dark:text-amber-300"
        : "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400";
    }
    return active
      ? "flex items-center gap-1.5 rounded-md bg-foreground/8 px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors"
      : "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground";
  };

  const homeActive = isActive("/");

  return (
    <header className="lt-topbar fixed inset-x-0 top-0 z-50 border-b border-foreground/8 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href="/"
            aria-current={homeActive ? "page" : undefined}
            className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight transition-opacity hover:opacity-80"
          >
            <span
              className={`grid h-7 w-7 place-items-center rounded-md text-background shadow-sm transition-colors ${
                homeActive
                  ? "bg-foreground ring-2 ring-foreground/15 ring-offset-2 ring-offset-background"
                  : "bg-foreground"
              }`}
            >
              <Boxes className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="hidden sm:inline">LiteTrack</span>
          </Link>

          {showCrumb && (
            <div className="flex min-w-0 items-center gap-1.5 text-sm">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
              {isSubPage && (
                <>
                  <Link
                    href={backLink!}
                    className="hidden shrink-0 text-muted-foreground transition-colors hover:text-foreground sm:inline"
                  >
                    {backText}
                  </Link>
                  <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground/40 sm:inline" />
                </>
              )}
              <span className="truncate font-medium">{title}</span>
            </div>
          )}
        </div>

        <nav className="flex shrink-0 items-center gap-0.5">
          {user && (
            <Link
              href="/me/claims"
              aria-current={isActive("/me/claims") ? "page" : undefined}
              className={navItemClass("/me/claims")}
            >
              <Package className="h-4 w-4" />
              <span className="hidden md:inline">我的认领</span>
            </Link>
          )}

          {user?.isAdmin && (
            <Link
              href="/admin"
              aria-current={isActive("/admin") ? "page" : undefined}
              className={navItemClass("/admin", "amber")}
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden md:inline">后台</span>
            </Link>
          )}

          {user && (
            <Link
              href="/me"
              aria-current={isActive("/me", { exact: true }) ? "page" : undefined}
              className={navItemClass("/me", "default", { exact: true })}
            >
              <UserRound className="h-4 w-4" />
              <span className="hidden md:inline">我的主页</span>
            </Link>
          )}

          <div className="mx-1 hidden h-5 w-px bg-foreground/10 sm:block" />
          <LoginDialog />
        </nav>
      </div>
    </header>
  );
}
