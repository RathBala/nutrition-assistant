"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { User } from "firebase/auth";

const DEFAULT_CONTENT_CLASSNAME =
  "mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-16 pt-10 sm:px-6 lg:px-8";

type AppShellProps = {
  user: User;
  onSignOut: () => void;
  signOutPending?: boolean;
  children: ReactNode;
  contentClassName?: string;
};

type NavigationItem = {
  label: string;
  href: string;
  isActive: (pathname: string | null) => boolean;
};

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/",
    isActive: (pathname) => pathname === "/",
  },
  {
    label: "Settings",
    href: "/settings",
    isActive: (pathname) => !!pathname && pathname.startsWith("/settings"),
  },
];

export function AppShell({
  user,
  onSignOut,
  signOutPending = false,
  children,
  contentClassName = DEFAULT_CONTENT_CLASSNAME,
}: AppShellProps) {
  const pathname = usePathname();

  const userEmail = user.email ?? "";
  const userDisplayName = user.displayName?.trim() || userEmail.split("@")[0] || "Member";
  const userInitials =
    user.displayName?.trim()
      ? user.displayName
          .trim()
          .split(/\s+/)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("")
          .slice(0, 2) || "U"
      : userEmail.split("@")[0]?.slice(0, 2).toUpperCase() || "U";

  const handleSignOutClick = () => {
    onSignOut();
  };

  return (
    <>
      <header className="border-b border-slate-200 bg-white/80 py-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            <Link
              href="/"
              className="text-lg font-semibold tracking-[0.4em] text-slate-900"
              style={{ fontVariant: "small-caps" }}
              aria-label="Thrive home"
            >
              thrive
            </Link>
            <nav aria-label="Primary" className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              {navigationItems.map((item) => {
                const isActive = item.isActive(pathname);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded-full px-3 py-1 transition ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right text-xs sm:block">
              <p className="font-semibold text-slate-900">{userDisplayName}</p>
              {userEmail ? <p className="text-slate-500">{userEmail}</p> : null}
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold uppercase text-emerald-700"
              aria-hidden="true"
            >
              {userInitials}
            </div>
            <button
              type="button"
              onClick={handleSignOutClick}
              disabled={signOutPending}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {signOutPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border border-slate-400 border-t-transparent" aria-hidden="true" />
                  Signing out…
                </>
              ) : (
                "Sign out"
              )}
            </button>
          </div>
        </div>
      </header>

      <main className={contentClassName}>{children}</main>
    </>
  );
}
