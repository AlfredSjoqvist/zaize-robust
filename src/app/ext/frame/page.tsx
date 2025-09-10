// src/app/ext/frame/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { signExtToken } from "@/lib/ext-jwt";

export const dynamic = "force-dynamic";

// narrow session shape so TS lets us read user.id
type SafeSession = { user?: { id?: string | null } } | null;

export default async function Page() {
  const session = (await getServerSession(authOptions as any).catch(() => null)) as SafeSession;

  const targetOrigin = process.env.NEXT_PUBLIC_BASE_ORIGIN || "*";

  let script = `
    try { parent.postMessage({ type: "zaize-no-session" }, "${targetOrigin}"); } catch {}
  `;

  const userId = session?.user?.id || undefined;
  if (userId) {
    const token = await signExtToken(userId, 600);
    script = `
      (async () => {
        try {
          const token = ${JSON.stringify(token)};
          let highlightedUrl = null;
          try {
            const r = await fetch("/ext/highlighted", { headers: { Authorization: "Bearer " + token } });
            if (r.ok) {
              const j = await r.json();
              highlightedUrl = j?.image?.url || null;
            }
          } catch {}
          parent.postMessage({ type: "zaize-token", token, highlightedUrl }, "${targetOrigin}");
        } catch {
          parent.postMessage({ type: "zaize-no-session" }, "${targetOrigin}");
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
