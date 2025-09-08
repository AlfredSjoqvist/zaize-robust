"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { Route } from "next"; // 👈 add

export function NavBar() {
  const pathname = usePathname();

  const link = (href: Route, label: string) => (   // 👈 type as Route
    <Link
      key={href}
      href={href}
      className={clsx(
        "px-3 py-2 rounded-xl text-sm font-medium transition-colors",
        pathname === href
          ? "bg-slate-100 text-slate-900"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href={"/" as Route} className="font-semibold tracking-tight">
          <span className="text-black">Zaize</span>{" "}
          <span className="text-slate-600">VTON</span>
        </Link>
        <nav className="flex items-center gap-1">
          {link("/" as Route, "Home")}
          {link("/login" as Route, "Login")}
          {link("#" as Route, "Docs")} {/* or remove if not a real route */}
        </nav>
      </div>
    </header>
  );
}
