"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { LoginDialog } from "./LoginDialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useUser } from "@/lib/user-context";

interface TopBarProps {
  title?: string;
  backLink?: string;
  backText?: string;
  actions?: ReactNode;
}

export function TopBar({ 
  title = "LiteTrack", 
  backLink, 
  backText = "返回",
  actions 
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

  return (
    <div
      className={`sticky top-3 z-40 flex justify-center px-4 mb-2 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
      }`}
    >
      <header className="bg-background/90 backdrop-blur-md border border-border/50 rounded-2xl px-4 sm:px-8 py-2 shadow-lg shadow-black/5 w-full max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {backLink && (
              <Link
                href={backLink}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{backText}</span>
              </Link>
            )}
            
            {backLink ? (
              <span className="font-semibold text-sm">{title}</span>
            ) : (
              <Link href="/" className="font-semibold text-sm hover:text-primary transition-colors">
                {title}
              </Link>
            )}

            {user?.isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  pathname.startsWith("/admin")
                    ? "text-amber-600 font-medium"
                    : "text-amber-600 hover:text-amber-500"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">后台管理</span>
              </Link>
            )}

            {actions && (
              <>
                <div className="h-4 w-px bg-border/50" />
                <div className="flex items-center gap-3">
                  {actions}
                </div>
              </>
            )}
          </div>

          <LoginDialog />
        </div>
      </header>
    </div>
  );
}
