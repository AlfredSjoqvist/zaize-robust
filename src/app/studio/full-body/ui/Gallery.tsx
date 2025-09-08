"use client";

import { useEffect, useRef, useState } from "react";

type Img = { id: string; url: string; primary: boolean; bytes?: number };

export default function Gallery() {
  const [images, setImages] = useState<Img[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch("/api/images/full-body", { cache: "no-store" });
    setImages(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const presign = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext, kind: "full_body", contentType: file.type }),
      }).then(r => r.json());

      await fetch(presign.url, { method: "PUT", body: file }); // upload to R2

      await fetch("/api/images/full-body", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: presign.key,
          url: presign.publicUrl,
          bytes: file.size,
        }),
      });

      await load();
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function select(id: string) {
    await fetch("/api/images/full-body/select", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  async function remove(id: string) {
    const ok = confirm("Delete this picture? This cannot be undone.");
    if (!ok) return;

    // optimistic UI
    const prev = images;
    setImages(prev => prev.filter(i => i.id !== id));

    const res = await fetch(`/api/images/full-body/${id}`, { method: "DELETE" });
    if (!res.ok) {
      // revert on failure
      setImages(prev);
      alert("Failed to delete image. Please try again.");
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map(img => (
          <div
            key={img.id}
            className={`group relative aspect-[3/4] rounded-2xl overflow-hidden border
              ${img.primary ? "border-black" : "border-black/10"}`}
          >
            <button
              onClick={() => select(img.id)}
              className="absolute inset-0"
              title={img.primary ? "Selected" : "Click to select"}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              {img.primary && (
                <div className="absolute inset-2 rounded-xl ring-2 ring-black pointer-events-none" />
              )}
            </button>

            {/* Trash button (bottom-right) */}
            <button
              onClick={(e) => { e.stopPropagation(); remove(img.id); }}
              className="absolute bottom-2 right-2 rounded-lg bg-white/90 border border-black/10
                         px-2 py-1 text-xs text-black/80 shadow
                         opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete"
            >
              {/* tiny trash icon (SVG) */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 3h6m-9 4h12m-10 0v12m6-12v12M5 7l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
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
            onChange={pick}
            disabled={busy}
          />
        </label>
      </div>

      <div className="text-center mt-6">
        <button className="px-4 py-2 rounded-xl border border-black/10 hover:bg-black/5">
          Create account without pictures
        </button>
      </div>
    </div>
  );
}
