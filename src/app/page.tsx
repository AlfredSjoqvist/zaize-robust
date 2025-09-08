
import Link from "next/link";

export default function HomePage() {
  return (
    <section className="container py-16">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
            Production starter
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-black">
            Photorealistic <span className="underline decoration-slate-300">Virtual Try-On</span>
          </h1>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Upload a model image and a garment, then generate production-grade try-on results.
            This starter focuses on a crisp white UI and a clean foundation for your VTON pipeline.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/login" className="btn btn-primary">Sign in to Continue</Link>
            <Link href="#" className="btn btn-ghost">Learn more</Link>
          </div>
        </div>
        <div className="card p-6">
          <div className="aspect-[4/3] w-full rounded-xl border border-slate-200 bg-slate-50 grid place-items-center">
            <span className="text-slate-500">Preview Placeholder</span>
          </div>
          <div className="mt-4 text-xs text-slate-500">
            Replace with your upload widget + status when backend is ready.
          </div>
        </div>
      </div>
    </section>
  );
}
