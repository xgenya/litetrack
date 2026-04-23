"use client";

import { useState, useEffect, useRef } from "react";
import { LoginDialog } from "./LoginDialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Package, UserRound } from "lucide-react";
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
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isSubPage = !!backLink;

  return (
    <div
      className={`sticky top-3 z-40 flex justify-center px-4 mb-2 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
      }`}
    >
      <header className="bg-background/90 backdrop-blur-md border border-border/50 rounded-2xl px-4 sm:px-8 py-2 shadow-lg shadow-black/5 w-full max-w-4xl">
        <div className="flex items-center justify-between gap-4">

          {/* Left */}
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="font-semibold text-sm hover:text-primary transition-colors flex-shrink-0">
              LiteTrack
            </Link>

            {isSubPage && (
              <>
                <span className="text-border select-none flex-shrink-0">/</span>
                <Link
                  href={backLink!}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 hidden sm:block"
                >
                  {backText}
                </Link>
                <span className="text-border select-none flex-shrink-0 hidden sm:block">/</span>
                <span className="font-medium text-sm truncate">{title}</span>
              </>
            )}

            {!isSubPage && title !== "LiteTrack" && (
              <>
                <span className="text-border select-none flex-shrink-0">/</span>
                <span className="font-medium text-sm truncate">{title}</span>
              </>
            )}
          </div>

          {/* Right: nav (home only) + user */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {!isSubPage && user && pathname !== "/me/claims" && (
              <Link
                href="/me/claims"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">我的认领</span>
              </Link>
            )}

            {!isSubPage && user?.isAdmin && pathname !== "/admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-500 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">后台管理</span>
              </Link>
            )}

            {user && pathname !== "/me" && (
              <Link
                href="/me"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <UserRound className="w-4 h-4" />
                <span className="hidden sm:inline">我的主页</span>
              </Link>
            )}

            <LoginDialog />
          </div>

        </div>
      </header>
    </div>
  );
}

