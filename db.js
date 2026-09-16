import Database from "better-sqlite3";

// NOTE: on Render's free tier the disk is ephemeral (wiped on redeploy/restart).
// This is fine for testing. For real persistent order history, swap this file's
// connection string for a free Postgres instance (e.g. Supabase) later —
// everything else in server.js stays the same since the query shapes are simple.

const db = new Database("store.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    email TEXT,
    items TEXT,
    total INTEGER,
    status TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Your product catalog lives here. Edit this list to match your real products —
// the id must match what the front end sends when adding to cart.
// Currency is NGN (naira). Stripe/Paystack both expect the amount in the
// smallest unit — kobo — so price is naira * 100.
export const CURRENCY = "ngn";

export const PRODUCTS = [
  {
    id: "s1",
    name: "Accurate Dollar",
    format: "PDF guide",
    price: 1000000, // 10,000 NGN in kobo (10000 * 100)
    blurb: "The Accurate Dollar guide.",
    // Placeholder unique link — replace with where you actually host the file
    // (Google Drive share link, Dropbox, S3/Backblaze bucket, etc.)
    downloadUrl: "https://accuratedollar.com/files/66658d25-f4fa-4d1f-aed8-a44e6cca15d0.pdf",
  },
];

export function saveOrder(order) {
  db.prepare(
    "INSERT INTO orders (id, email, items, total, status) VALUES (?, ?, ?, ?, ?)"
  ).run(order.id, order.email, JSON.stringify(order.items), order.total, order.status);
}

export function markOrderPaid(id) {
  db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(id);
}

export function getOrder(id) {
  return db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
}

export default db;
