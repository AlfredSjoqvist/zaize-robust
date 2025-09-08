import Gallery from "./ui/Gallery";

export default function FullBodyPage() {
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
