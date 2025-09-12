//src/app/admin/tryons/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { prisma } from "@/lib/prisma";

export default async function TryonAdminPage() {
  const items = await prisma.tryOnResult.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">Try-On Cache (latest 50)</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Created</th><th>Status</th><th>Model</th><th>Garment</th><th>Result</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id}>
              <td>{new Date(it.createdAt).toLocaleString()}</td>
              <td>{it.status}</td>
              <td className="truncate max-w-[280px]">{it.modelUrl}</td>
              <td className="truncate max-w-[280px]">{it.garmentUrl}</td>
              <td>{it.resultUrl ? <a className="underline" href={it.resultUrl} target="_blank">open</a> : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
