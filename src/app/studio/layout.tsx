export const runtime = "nodejs";

import Link from "next/link";
import { ReactNode } from "react";
import clsx from "clsx";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b border-black/10">
        <div className="mx-auto max-w-6xl h-14 flex items-center px-4">
          <span className="font-semibold tracking-tight">Zaize</span>
          <span className="text-black/60 ml-2">VTON</span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl grid grid-cols-[220px_1fr] gap-6 px-4 py-6">
        <aside className="border-r border-black/10 pr-4">
          <nav className="space-y-2">
            <Link
              href="/studio/full-body"
              className={clsx(
                "block w-full rounded-xl px-3 py-2 text-sm border border-black/10 hover:bg-black/5"
              )}
            >
              Full body pictures
            </Link>
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
