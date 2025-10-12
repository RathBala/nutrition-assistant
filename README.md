# Nutrition Assistant UI Prototype

A responsive Next.js proof-of-concept that demonstrates how a nutrition assistant could let people upload meal photos, review instant macro breakdowns, and receive a supportive AI recap—all without any back-end integration yet.

## Getting started

```bash
npm install
cp .env .env.local
npm run dev
```

Then open <http://localhost:3000> to explore the prototype.

## Tech stack

- [Next.js 14](https://nextjs.org/) with the App Router and TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [lucide-react](https://lucide.dev/) icon set for quick prototyping

## Mock data

All content is currently mocked inside `app/page.tsx`. Swap in your own photos, macro estimates, or targets to experiment with different nutrition scenarios.

## Next steps

- Connect a meal recognition API to analyze uploaded photos
- Persist entries with a database and expose an API
- Personalize goals and AI messages per user profile
