// src/app/studio/full-body/page.tsx
import { getServerSession, type Session } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth";
import Gallery from "./ui/Gallery";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FullBodyPage() {
  // Tell TS what we expect back
  const session = (await getServerSession(authOptions)) as Session | null;

  // Not logged in? Send to Google sign-in, then back here
  if (!session?.user) {
    redirect(
      `/api/auth/signin/google?callbackUrl=${encodeURIComponent("/studio/full-body")}`
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mx-auto text-center mb-6">
        <div className="h-1.5 rounded-full bg-black/10 mx-auto max-w-xl mb-6" />
        <h1 className="text-3xl font-semibold">Add pictures</h1>
        <p className="mt-2 text-black/70 max-w-xl mx-auto">
          By adding pictures you will be able to see how the clothes look on you. You can
          take a picture now or upload one you already have.
        </p>
        <a className="text-sm underline mt-2 inline-block text-black/70" href="#">
          Read about how we handle your personal data
        </a>
      </div>

      <Gallery />
    </div>
  );
}
