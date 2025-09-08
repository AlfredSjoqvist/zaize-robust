import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { signExtToken } from "@/lib/ext-jwt";

export const runtime = "nodejs";

export default async function Handshake() {
  const session = await getServerSession(authOptions as any);
  const userId = (session as any)?.user?.id as string | undefined;

  let script: string;

  if (!userId) {
    // Immediately tell the parent “no session”, then render a sign-in link.
    const callback = encodeURIComponent("/ext/handshake");
    const signInUrl = `/api/auth/signin/google?callbackUrl=${callback}`;
    script = `window.parent.postMessage({ type: "zaize-status", status: "no-session" }, "*");`;
    return (
      <html>
        <body style={{ fontFamily: "sans-serif", padding: 16 }}>
          <script dangerouslySetInnerHTML={{ __html: script }} />
          <p>You’re not signed in.</p>
          <a href={signInUrl}>Sign in with Google</a>
        </body>
      </html>
    );
  }

  const token = await signExtToken(userId, 600);
  script = `
    (function(){
      try { window.parent.postMessage({ type: "zaize-token", token: ${JSON.stringify(token)} }, "*"); }
      catch (e) {}
    })();
  `;

  return (
    <html>
      <body>
        <script dangerouslySetInnerHTML={{ __html: script }} />
      </body>
    </html>
  );
}
