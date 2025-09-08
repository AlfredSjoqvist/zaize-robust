
# Zaize VTON – Clean White Starter (Next.js + Tailwind)

A clean, **white-primary / black-secondary** starter for a Virtual Try-On web app.

## Features
- **Next.js 14 (App Router) + TypeScript**
- **TailwindCSS** with white theme utilities and reusable `.btn`, `.card`, `.input` classes
- Pages:
  - `/` Home (hero + placeholder card)
  - `/login` Login (UI only)

## Run
```bash
pnpm i
pnpm dev
# http://localhost:3000
```

## Customize
- Global theme in `src/app/globals.css`
- Nav/Footer in `src/components/*`
- Adjust accent via `brand.500` in `tailwind.config.ts` (currently black)
