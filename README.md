# Store backend

Express API that handles products, Paystack checkout, and orders.

## What's in here

- `server.js` — the API (products, checkout, webhook, order lookup)
- `db.js` — your product catalog + a tiny SQLite database for orders
- `.env.example` — copy to `.env` and fill in your real key

## 1. Edit your product

Open `db.js` and update the `PRODUCTS` array — name, price (in kobo:
naira × 100), blurb, and `downloadUrl` (a link to the actual file —
e.g. a Google Drive share link, Dropbox, or an S3/Backblaze bucket).

## 2. Get a Paystack key

1. Create a free account at https://dashboard.paystack.com
2. Go to Settings → API Keys & Webhooks
3. Copy your **test** secret key
4. Paste it into `.env` as `PAYSTACK_SECRET_KEY` (copy `.env.example` to `.env` first)

You can test the whole flow in Paystack's test mode with a test card before
ever using real money. Once you're ready to go live, switch to your live
secret key and complete Paystack's business verification (needed for real
payouts to your bank account).

## 3. Run it locally

```
npm install
npm start
```

The API runs at `http://localhost:4000`.

## 4. Deploy for free (Render)

1. Push this `backend` folder to a GitHub repo
2. Go to https://render.com → New → Web Service → connect your repo
3. Build command: `npm install`  ·  Start command: `npm start`
4. Add your `.env` values under Render's "Environment" tab
5. Once deployed, copy your Render URL (e.g. `https://your-app.onrender.com`)

## 5. Connect the Paystack webhook

1. In Paystack dashboard → Settings → API Keys & Webhooks
2. Webhook URL: `https://your-app.onrender.com/api/webhook`
3. Paystack signs every webhook with your secret key automatically —
   no separate webhook secret needed (unlike Stripe)

## 6. Point your front end at it

In the front end, replace the mock cart/checkout logic with:

```js
// Get products
const products = await fetch(`${API_URL}/api/products`).then(r => r.json());

// Start checkout (Paystack requires a customer email)
const { url } = await fetch(`${API_URL}/api/checkout`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: customerEmail,
    items: cartItems.map(i => ({ id: i.id, qty: i.qty })),
  }),
}).then(r => r.json());

window.location.href = url; // sends the customer to Paystack's hosted checkout page
```

Deploy the front end to Vercel or Netlify (both free), set `API_URL` to your
Render URL, and set `CLIENT_URL` in Render to your Vercel/Netlify URL.

## Note on the database

This uses SQLite (a single file, `store.db`) for simplicity. Render's free
tier wipes disk on redeploy, so completed orders won't persist long-term.
That's fine for testing. When you're ready to go live for real, swap this
for a free Postgres database (Supabase's free tier works well) — the rest
of the code stays the same.
