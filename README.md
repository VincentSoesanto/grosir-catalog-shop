# Grosir Catalog Shop

A responsive online catalog shop for a wholesale store: customers browse products, fill a cart and send the
order to the shop through **WhatsApp**; the shop owner manages products, prices, photos and the home page
from a built-in **admin area**. It runs on Firebase's free plan.

This is a cleaned-up copy of a site I built for a real wholesale shop (party supplies and stationery,
~1,400 products) that is live in production. Shop name, contact details, products and photos here are
**made-up demo data**. The UI text is in Bahasa Indonesia, like the original.

> Screenshots: _coming soon_ (home page, product page, cart, admin product editor, phone view).

## Features

**Shop (customers)**
- Home page with banner slider, side banners, round category pictures and product rows per category
- Product grid with search (every typed word, name or product code), category filter and sorting
- Product page: photo gallery, variants (colour / size / motif, each with its own code, price and stock),
  quantity stepper, description, related products, customer testimonials
- Cart kept in the browser; checkout builds a neat WhatsApp message with an order number, items, total and
  address. No payment gateway or customer accounts needed: the chat *is* the order
- Responsive from small phones to big monitors: sticky header, bottom navigation on phones, swipeable rows
- Sold-out products greyed out and sorted last; hidden products never shown

**Admin (`/admin`, Firebase Auth email + password)**
- Product list with filters and bulk actions (set in stock / sold out, delete), add / edit / delete products,
  photos, variants and testimonials
- Photo import: drop many photos named `CODE_Name_Price.jpg`; new products are created and existing codes updated
- Prepared bulk updates (prices, names, variant photos) with an old -> new preview before applying
- "Tampilan Toko" (store look): banners, home page rows, info bar, contact details, categories (name, picture,
  order), "Tentang Kami" page and Google review quotes
- Pictures are shrunk to WebP **in the browser** before upload, so they fit in Firestore documents and no paid
  file storage is needed

## Tech

- **React 19 + TypeScript**, **Vite**, **Tailwind CSS v4**, React Router, lucide icons
- **Firebase**: Firestore (data), Authentication (admin login), Hosting; stays on the free Spark plan
- oxlint for linting

## Architecture

- `src/pages/` one file per page, `src/components/` reusable UI, `src/lib/` data access and helpers,
  `src/types/` data types, `src/admin/` the admin area (lazy-loaded, so customers never download it).
- Pages read products only through `src/lib/catalog.ts`, which picks the source: **Firestore** when a project
  is configured and imported, otherwise the static **files in `public/data`** (demo mode).
- Built for the free tier: all product summaries live in a few `catalog/list-N` documents, so a whole visit
  costs ~2 Firestore reads instead of one per product; one product page reads one `products/<id>` document.
  Customers use the smaller `firebase/firestore/lite` SDK.
- Writes are protected by `firestore.rules` (everyone may read the catalog, only admin UIDs may write).

## Run it with demo data

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

No Firebase is needed: the shop shows 21 made-up products in 5 categories. `npm run demo-data` regenerates
them (`scripts/make-demo-data.mjs`: catalog JSON + SVG placeholder pictures). The admin page shows a short
"demo mode" notice until you connect Firebase.

Other commands: `npm run build` (type-check + build into `dist/`), `npm run lint`, `npm run preview`.

## Connect your own Firebase

1. Create a project in the [Firebase console](https://console.firebase.google.com/), add a **Web app**, and
   enable **Firestore** and **Authentication > Email/Password**.
2. Create an admin user in Authentication and copy its **UID**.
3. Copy `.env.example` to `.env.local` and fill in the web app config and `VITE_ADMIN_UIDS=<your UID>`.
4. In `firestore.rules`, replace `YOUR_ADMIN_UID` with the same UID and publish the rules
   (`npx firebase-tools deploy --only firestore:rules` after `firebase login` and `firebase use --add`).
5. Run `npm run dev`, open `/admin`, log in and click **Impor data sekarang**: the demo catalog is copied into
   Firestore, and from then on the shop reads from the database.
6. Deploy: `npm run build` then `npx firebase-tools deploy --only hosting`.

## License

[MIT](LICENSE) © Vincent Soesanto
