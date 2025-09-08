"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Img = {
  id: string;
  url: string;
  primary: boolean;
  width?: number;
  height?: number;
  bytes?: number;
};

export default function Gallery() {
  const [images, setImages] = useState<Img[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function load() {
    const r = await fetch("/api/images/full-body", { cache: "no-store" });
    const data = await r.json();
    setImages(data);
  }

  useEffect(() => { load(); }, []);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // 1) presign
      const ext = file.name.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";
      const presign = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext, kind: "full_body", contentType: file.type }),
      }).then(r => r.json());

      // 2) upload to S3/R2
      await fetch(presign.url, { method: "PUT", body: file });

      // 3) create DB row (build a public URL; use CDN_BASE if set server-side by your API)
      const publicUrl = process.env.NEXT_PUBLIC_CDN_BASE_URL
        ? `${process.env.NEXT_PUBLIC_CDN_BASE_URL}/${presign.key}`
        : (presign.publicUrl || `/${presign.key}`); // if you add publicUrl in presign, prefer that

      await fetch("/api/images/full-body", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: presign.key,
          url: publicUrl,
          width: undefined,
          height: undefined,
          bytes: file.size,
        }),
      });

      await load();
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function setPrimary(id: string) {
    await fetch("/api/images/full-body/select", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div>
      {/* Grid: uploaded images + add tile always present */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map(img => (
          <button
            key={img.id}
            onClick={() => setPrimary(img.id)}
            className={`group relative aspect-[3/4] rounded-2xl border ${img.primary ? "border-black" : "border-black/10"} overflow-hidden`}
            title={img.primary ? "Selected" : "Click to select"}
          >
            <img
              src={img.url}
              alt=""
              className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            />
            {img.primary && (
              <div className="absolute inset-2 rounded-xl ring-2 ring-black pointer-events-none" />
            )}
          </button>
        ))}

        {/* Add tile */}
        <label className="aspect-[3/4] rounded-2xl border border-black/10 bg-black/5 flex flex-col items-center justify-center cursor-pointer">
          <span className="text-3xl">+</span>
          <span className="mt-1 text-sm text-black/60">Add picture</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickFile}
            disabled={loading}
          />
        </label>
      </div>

      {/* “Continue without pictures” link (optional) */}
      <div className="text-center mt-6">
        <button className="px-4 py-2 rounded-xl border border-black/10 hover:bg-black/5">
          Create account without pictures
        </button>
      </div>
    </div>
  );
}
