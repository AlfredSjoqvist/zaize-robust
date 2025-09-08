// Force Node runtime (Prisma cannot run on Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import NextAuth from "next-auth";
import { authOptions } from "@/server/auth";

// Optional: export options so you can reuse with getServerSession later

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
