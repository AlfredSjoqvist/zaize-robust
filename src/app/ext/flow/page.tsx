// src/app/ext/flow/page.tsx

// node runtime
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { signExtJwt } from "@/lib/extAuth";

// The origin your content script expects (must match PM_ORIGIN in content.js)
const PM_TARGET =
  process.env.NEXT_PUBLIC_EXTENSION_PM_TARGET_ORIGIN ||
  "https://zaize-robust.vercel.app";

async function getHighlighted(userId: string) {
  return prisma.image.findFirst({
    where: { userId, kind: "full_body", primary: true },
    select: { id: true, url: true },
  });
}

export default async function ExtFlowPage() {
  const session = await getServerSession(authOptions as any);
  const userId = (session as any)?.user?.id as string | undefined;

  // Not logged in? Kick to Google inside this popup.
  if (!userId) {
    const callback = encodeURIComponent("/ext/flow");
    const signInUrl = `/api/auth/signin/google?callbackUrl=${callback}`;
    return (
      <html>
        <body style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
          <h3>Sign in to Zaize</h3>
          <p>Continue with Google to connect your account.</p>
          <a
            href={signInUrl}
            style={{
              display: "inline-block",
              padding: "8px 12px",
              border: "1px solid #ccc",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Continue with Google
          </a>
        </body>
      </html>
    );
  }

  // Logged in → mint short-lived extension token with the SAME secret verifier uses
  const token = signExtJwt({ uid: userId }, 600); // 10 minutes

  // Do we already have a highlighted image?
  const hi = await getHighlighted(userId);

  if (hi?.url) {
    // Post token + highlighted back and close
    const script = `
      (function(){
        try {
          window.opener && window.opener.postMessage(
            { type: "zaize-token", token: ${JSON.stringify(token)}, highlightedUrl: ${JSON.stringify(hi.url)} },
            ${JSON.stringify(PM_TARGET)}
          );
        } catch(e){}
        window.close();
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

  // No highlighted → compact uploader inside the popup.
  // Reuse the ALREADY minted token (no extra API call).
  const exposeTokenScript = `
    window.__ZAIZE_TOKEN__ = ${JSON.stringify(token)};
  `;

  const uploader = `
    async function uploadAndSelect(file) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const presign = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ext, kind: 'full_body', contentType: file.type || 'image/jpeg' })
      }).then(r => r.json());

      // PUT to presigned URL
      await fetch(presign.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file
      });

      // Save DB record
      const meta = { key: presign.key, url: presign.publicUrl, width: 0, height: 0, bytes: file.size };
      const created = await fetch('/api/images/full-body', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(meta)
      }).then(r => r.json());

      // Mark as primary
      await fetch('/api/images/full-body/select', {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id: created.id })
      });

      return presign.publicUrl;
    }

    (function(){
      const frm = document.getElementById('uploader');
      const input = document.getElementById('file');
      const status = document.getElementById('status');

      frm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!input.files || !input.files[0]) return;
        status.textContent = 'Uploading...';
        try {
          const url = await uploadAndSelect(input.files[0]);
          status.textContent = 'Done. Connecting...';
          (function(){
            try {
              var token = window.__ZAIZE_TOKEN__;
              window.opener && window.opener.postMessage(
                { type: "zaize-token", token: token, highlightedUrl: url },
                ${JSON.stringify(PM_TARGET)}
              );
            } catch(e){}
            window.close();
          })();
        } catch(e) {
          console.error('[ZAIZE:/ext/flow] upload failed', e);
          status.textContent = 'Upload failed. Please try again.';
        }
      });
    })();
  `;

  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
        <h3>Add your model photo</h3>
        <p>Upload one photo to continue.</p>
        <form id="uploader">
          <input id="file" type="file" accept="image/*" required />
          <button type="submit" style={{ marginLeft: 8 }}>Upload</button>
        </form>
        <p id="status" style={{ fontSize: 12, color: "#555" }}></p>
        <script dangerouslySetInnerHTML={{ __html: exposeTokenScript }} />
        <script dangerouslySetInnerHTML={{ __html: uploader }} />
      </body>
    </html>
  );
}
