// src/app/ext/frame/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { signExtJwt } from "@/lib/extAuth";

export const dynamic = "force-dynamic";

// Use the PARENT origin (bjornborg.com, etc.). If unknown, fall back to "*".
const parentOrigin =
  typeof document !== "undefined" && document.referrer
    ? new URL(document.referrer).origin
    : "*";

// Narrow session type so TS allows user.id
type SafeSession = { user?: { id?: string | null } } | null;

export default async function Page() {
  const session = (await getServerSession(authOptions as any).catch(() => null)) as SafeSession;

  // Default: tell parent we have no session
  let script = `
    try {
      console.debug("[ZAIZE:/ext/frame] no session, posting zaize-no-session to", "${parentOrigin}");
      parent.postMessage({ type: "zaize-no-session" }, "${parentOrigin}");
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
          console.debug("[ZAIZE:/ext/frame] posting zaize-token to", "${parentOrigin}", { hasHighlighted: !!highlightedUrl });
          parent.postMessage({ type: "zaize-token", token, highlightedUrl }, "${parentOrigin}");
        } catch {
          try {
            console.debug("[ZAIZE:/ext/frame] error, posting zaize-no-session to", "${parentOrigin}");
            parent.postMessage({ type: "zaize-no-session" }, "${parentOrigin}");
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
