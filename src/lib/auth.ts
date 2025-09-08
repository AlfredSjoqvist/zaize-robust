import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

/** Returns the logged-in user's id, or null if unauthenticated */
export async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions as any);
  const userId = (session as any)?.user?.id as string | undefined;
  return userId ?? null;
}
