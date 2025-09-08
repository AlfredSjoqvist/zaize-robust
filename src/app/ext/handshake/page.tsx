import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { signExtToken } from "@/lib/ext-jwt";

export const runtime = "nodejs";

export default async function Handshake() {
  const session = await getServerSession(authOptions as any);
  const userId = (session as any)?.user?.id as string | undefined;

  // If not logged in, render a simple page that links to Google sign-in and returns here.
  if (!userId) {
    const callback = encodeURIComponent("/ext/handshake");
    const signInUrl = `/api/auth/signin/google?callbackUrl=${callback}`;
    return (
      <html>
        <body style={{ fontFamily: "sans-serif", padding: 16 }}>
          <p>You’re not signed in.</p>
          <a href={signInUrl}>Sign in with Google</a>
        </body>
      </html>
    );
  }

  const token = await signExtToken(userId, 600); // 10 minutes

  // Post the token up to the embedding page (the extension’s iframe parent)
  const script = `
    (function(){
      try {
        window.parent.postMessage({ type: "zaize-token", token: ${JSON.stringify(token)} }, "*");
      } catch (e) {}
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
