import { getDb } from "./db";

export async function ensureIndexes() {
  const db = await getDb();

  try {
    // same service + date + slot-e ekta-r beshi active (pending/confirmed) appointment hobe na
    await db.collection("appointments").createIndex(
      { serviceId: 1, appointmentDate: 1, timeSlot: 1 },
      {
        name: "unique_active_slot",
        unique: true,
        partialFilterExpression: { status: { $in: ["pending", "confirmed"] } },
      }
    );
    await db.collection("appointments").createIndex({ customerId: 1 });

    // ek Stripe session-er jonno ekta-i transaction
    await db
      .collection("transactions")
      .createIndex({ stripeSessionId: 1 }, { unique: true, name: "unique_stripe_session" });
  } catch (err) {
    console.warn("Could not create indexes:", err);
  }
}