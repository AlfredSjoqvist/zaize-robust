
export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container py-8 text-sm text-slate-500">
        © {new Date().getFullYear()} Zaize AI — Virtual Try-On
      </div>
    </footer>
  );
}
