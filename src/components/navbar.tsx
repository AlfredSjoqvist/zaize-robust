
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export function NavBar() {
  const pathname = usePathname();
  const link = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={clsx(
        "px-3 py-2 rounded-xl text-sm font-medium transition-colors",
        pathname === href
          ? "bg-slate-100 text-black"
          : "text-slate-600 hover:text-black hover:bg-slate-100"
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="container h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          <span className="text-black">ZAIZE</span>{" "}
        </Link>
        <nav className="flex items-center gap-1">
          {link("/", "Home")}
          {link("/login", "Login")}
          {link("#", "Docs")}
        </nav>
      </div>
    </header>
  );
}
