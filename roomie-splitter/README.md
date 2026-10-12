# RoomieSplit

A responsive React + Vite app for three roommates to track shared costs and settle balances.

## Features
- Add an expense with description, amount, category, payer, and date.
- Split each expense equally in integer paise; leftover paise are assigned in a stable order (Roommate 1, then 2, then 3).
- Calculate each roommate's net balance and suggest settlement transfers.
- Edit roommate names, remove individual expenses, clear all expenses, and copy settlement details.
- Automatically saves expenses and roommate names in browser `localStorage`.
- Responsive desktop and mobile layouts.

## Run locally
Requires Node.js 18+.

```bash
npm install
npm run dev
```

To create a production build:

```bash
npm run build
npm run preview
```

## Deploy to Vercel
Import the repository in Vercel. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.

## Notes
This version stores data in the current browser only. It does not yet synchronize expenses across different devices or users; shared multi-device access would require a backend/database and authentication.
