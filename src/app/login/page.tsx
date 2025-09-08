"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function LoginPage() {
  const { data: session, status } = useSession();

  if (status === "authenticated") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <p className="mb-4">Signed in as {session.user?.email}</p>
        <button onClick={() => signOut()} className="px-4 py-2 rounded-xl border">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="w-full rounded-xl border px-4 py-2"
      >
        Continue with Google
      </button>
    </section>
  );
}
