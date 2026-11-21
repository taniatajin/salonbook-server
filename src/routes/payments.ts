import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { getStripe } from "../config/stripe";
import { requireRole, verifyToken } from "../middleware/auth";
import { toObjectId } from "../utils/objectId";
import { withAppointmentAndService } from "../utils/pipelines";

const router = Router();

router.use(verifyToken, requireRole("customer"));

// POST /api/payments/checkout-session  { appointmentId }
router.post("/checkout-session", async (req, res) => {
  const appointmentId = toObjectId(req.body?.appointmentId);
  if (!appointmentId) {
    res.status(400).json({ message: "Invalid appointment id" });
    return;
  }

  const db = await getDb();
  const customerId = new ObjectId(req.user!.id);

  const appointment = await db.collection("appointments").findOne({ _id: appointmentId, customerId });
  if (!appointment) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }
  if (appointment.status !== "confirmed") {
    res.status(400).json({ message: "You can pay only for confirmed appointments" });
    return;
  }
  if (appointment.paymentStatus === "paid") {
    res.status(400).json({ message: "This appointment is already paid" });
    return;
  }

  const service = await db.collection("services").findOne({ _id: appointment.serviceId });

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: req.user!.email,
    client_reference_id: appointmentId.toString(),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(appointment.servicePrice * 100),
          product_data: {
            name: service?.serviceName ?? "Salon appointment",
            description: `${appointment.appointmentDate} at ${appointment.timeSlot}`,
          },
        },
      },
    ],
    metadata: {
      appointmentId: appointmentId.toString(),
      customerId: customerId.toString(),
    },
    success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
  });

  res.json({ url: session.url });
});

// GET /api/payments/session/:sessionId
// Success page eta diye dekhe payment confirm hoyeche kina. Eta kichu update kore na,
// shudhu webhook-er save kora transaction pore.
router.get("/session/:sessionId", async (req, res) => {
  const sessionId = req.params.sessionId;
  if (!sessionId.startsWith("cs_")) {
    res.status(400).json({ message: "Invalid session id" });
    return;
  }

  const db = await getDb();
  const customerId = new ObjectId(req.user!.id);

  const [transaction] = await db
    .collection("transactions")
    .aggregate([
      { $match: { stripeSessionId: sessionId, customerId } },
      ...withAppointmentAndService,
    ])
    .toArray();

  if (!transaction) {
    // webhook ekhono pouchayni
    res.json({ status: "processing" });
    return;
  }
  res.json(transaction);
});

// GET /api/payments/my (payment history)
router.get("/my", async (req, res) => {
  const db = await getDb();
  const customerId = new ObjectId(req.user!.id);

  const transactions = await db
    .collection("transactions")
    .aggregate([{ $match: { customerId } }, { $sort: { createdAt: -1 } }, ...withAppointmentAndService])
    .toArray();

  res.json(transactions);
});

export default router;