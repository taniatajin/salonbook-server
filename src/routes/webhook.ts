import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import type Stripe from "stripe";
import { getDb } from "../config/db";
import { getStripe } from "../config/stripe";

async function recordPayment(session: Stripe.Checkout.Session, status: "paid" | "failed") {
  const appointmentId = session.metadata?.appointmentId;
  const customerId = session.metadata?.customerId;
  if (!appointmentId || !customerId || !ObjectId.isValid(appointmentId) || !ObjectId.isValid(customerId)) {
    return;
  }

  const db = await getDb();

  // upsert: Stripe same event abar pathale duplicate transaction hobe na
  try {
    await db.collection("transactions").updateOne(
      { stripeSessionId: session.id },
      {
        $setOnInsert: {
          appointmentId: new ObjectId(appointmentId),
          customerId: new ObjectId(customerId),
          amount: (session.amount_total ?? 0) / 100,
          currency: session.currency ?? "usd",
          stripeSessionId: session.id,
          status,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
  }

  if (status === "paid") {
    await db
      .collection("appointments")
      .updateOne(
        { _id: new ObjectId(appointmentId), paymentStatus: "unpaid" },
        { $set: { paymentStatus: "paid" } }
      );
  }
}

export async function stripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    res.status(400).send("Missing Stripe signature");
    return;
  }

  let event: Stripe.Event;
  try {
    // req.body ekhane raw Buffer, tai signature verify kora jay
    event = getStripe().webhooks.constructEvent(req.body, signature, secret);
  } catch {
    res.status(400).send("Invalid Stripe signature");
    return;
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    if (session.payment_status === "paid") {
      await recordPayment(session, "paid");
    }
  }

  if (event.type === "checkout.session.async_payment_failed") {
    await recordPayment(event.data.object, "failed");
  }

  res.json({ received: true });
}