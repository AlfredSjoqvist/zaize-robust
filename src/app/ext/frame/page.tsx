// src/app/ext/frame/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { signExtJwt } from "@/lib/extAuth";

export const dynamic = "force-dynamic";

// Single source of truth for where we postMessage back to:
const TARGET_ORIGIN =
  process.env.NEXT_PUBLIC_BASE_ORIGIN || "https://zaize-robust.vercel.app";

// Narrow session type so TS allows user.id
type SafeSession = { user?: { id?: string | null } } | null;

export default async function Page() {
  const session = (await getServerSession(authOptions as any).catch(() => null)) as SafeSession;

  // Default: tell parent we have no session
  let script = `
    try {
      console.debug("[ZAIZE:/ext/frame] no session, posting zaize-no-session to", "${TARGET_ORIGIN}");
      parent.postMessage({ type: "zaize-no-session" }, "${TARGET_ORIGIN}");
    } catch {}
  `;

  const uid = session?.user?.id || undefined;
  if (uid) {
    const token = signExtJwt({ uid }, 600); // 10 min token
    script = `
      (async () => {
        try {
          const token = ${JSON.stringify(token)};
          let highlightedUrl = null;
          try {
            const r = await fetch("/ext/highlighted", {
              headers: { Authorization: "Bearer " + token },
              cache: "no-store"
            });
            if (r.ok) {
              const j = await r.json();
              highlightedUrl = j?.image?.url || null;
            }
          } catch {}
          console.debug("[ZAIZE:/ext/frame] posting zaize-token to", "${TARGET_ORIGIN}", { hasHighlighted: !!highlightedUrl });
          parent.postMessage({ type: "zaize-token", token, highlightedUrl }, "${TARGET_ORIGIN}");
        } catch {
          try {
            console.debug("[ZAIZE:/ext/frame] error, posting zaize-no-session to", "${TARGET_ORIGIN}");
            parent.postMessage({ type: "zaize-no-session" }, "${TARGET_ORIGIN}");
          } catch {}
        }
      })();
    `;
  }

  return (
    <html>
      <body>
        <script dangerouslySetInnerHTML={{ __html: script }} />
      </body>
    </html>
  );
}
