      import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import { randomUUID } from "crypto";
import { PRODUCTS, saveOrder, markOrderPaid, getOrder } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = "https://api.paystack.co";

app.use(cors({ origin: CLIENT_URL }));

app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.headers["x-paystack-signature"];
    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET_KEY)
      .update(req.body)
      .digest("hex");

    if (hash !== signature) {
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(req.body);
    if (event.event === "charge.success") {
      const orderId = event.data.metadata.orderId;
      markOrderPaid(orderId);
    }

    res.json({ received: true });
  }
);

app.use(express.json());

app.get("/api/products", (req, res) => {
  res.json(PRODUCTS.map(({ downloadUrl, ...p }) => p));
});

app.post("/api/checkout", async (req, res) => {
  try {
    const { items, email } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    let total = 0;
    for (const { id, qty } of items) {
      const product = PRODUCTS.find((p) => p.id === id);
      if (!product || qty < 1) continue;
      total += product.price * qty;
    }
    if (total === 0) {
      return res.status(400).json({ error: "No valid items in cart." });
    }

    const orderId = randomUUID();
    saveOrder({ id: orderId, email, items, total, status: "pending" });

    const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: total,
        currency: "NGN",
        callback_url: `${CLIENT_URL}/?order=${orderId}`,
        metadata: { orderId },
      }),
    });

    const data = await response.json();
    if (!data.status) {
      console.error("Paystack init failed:", data);
      return res.status(500).json({ error: "Could not start checkout." });
    }

    res.json({ url: data.data.authorization_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not start checkout." });
  }
});

app.get("/api/orders/:id", async (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });

  const items = JSON.parse(order.items).map(({ id, qty }) => {
    const product = PRODUCTS.find((p) => p.id === id);
    return {
      name: product.name,
      qty,
      downloadUrl: order.status === "paid" ? product.downloadUrl : null,
    };
  });
  res.json({ status: order.status, total: order.total, items });
});

app.listen(PORT, () => console.log(`Store backend running on port ${PORT}`));
