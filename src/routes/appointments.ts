import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { requireRole, verifyToken } from "../middleware/auth";
import { toObjectId } from "../utils/objectId";
import { withService } from "../utils/pipelines";
import { parseAppointmentBody } from "../utils/validateAppointment";

const router = Router();

router.use(verifyToken, requireRole("customer"));

// POST /api/appointments
router.post("/", async (req, res) => {
  const parsed = parseAppointmentBody(req.body);
  if ("error" in parsed) {
    res.status(400).json({ message: parsed.error });
    return;
  }
  const { appointmentDate, timeSlot, message } = parsed.data;

  const serviceId = toObjectId(parsed.data.serviceId);
  if (!serviceId) {
    res.status(400).json({ message: "Invalid service id" });
    return;
  }

  const db = await getDb();
  const service = await db.collection("services").findOne({ _id: serviceId });
  if (!service) {
    res.status(404).json({ message: "Service not found" });
    return;
  }
  if (service.status !== "active") {
    res.status(400).json({ message: "This service is currently unavailable for booking" });
    return;
  }

  const appointments = db.collection("appointments");
  const slotTaken = await appointments.findOne({
    serviceId,
    appointmentDate,
    timeSlot,
    status: { $in: ["pending", "confirmed"] },
  });
  if (slotTaken) {
    res.status(409).json({ message: "This time slot is already booked. Please choose another slot." });
    return;
  }

  const doc = {
    serviceId,
    customerId: new ObjectId(req.user!.id),
    appointmentDate,
    timeSlot,
    message,
    servicePrice: service.price, // price server theke ashe, client theke na
    paymentStatus: "unpaid",
    status: "pending",
    createdAt: new Date(),
  };

  try {
    const result = await appointments.insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ message: "This time slot is already booked. Please choose another slot." });
      return;
    }
    throw err;
  }
});

// GET /api/appointments/my
router.get("/my", async (req, res) => {
  const db = await getDb();
  const customerId = new ObjectId(req.user!.id);

  const appointments = await db
    .collection("appointments")
    .aggregate([{ $match: { customerId } }, { $sort: { createdAt: -1 } }, ...withService])
    .toArray();

  res.json(appointments);
});

// GET /api/appointments/my/stats
router.get("/my/stats", async (req, res) => {
  const db = await getDb();
  const customerId = new ObjectId(req.user!.id);

  const rows = await db
    .collection("appointments")
    .aggregate([{ $match: { customerId } }, { $group: { _id: "$status", count: { $sum: 1 } } }])
    .toArray();

  const count = (status: string) => rows.find((r) => r._id === status)?.count ?? 0;

  res.json({
    total: rows.reduce((sum, r) => sum + r.count, 0),
    pending: count("pending"),
    confirmed: count("confirmed"),
    cancelled: count("cancelled"),
  });
});

// GET /api/appointments/:id (shudhu nijer appointment)
router.get("/:id", async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid appointment id" });
    return;
  }

  const db = await getDb();
  const customerId = new ObjectId(req.user!.id);

  const [appointment] = await db
    .collection("appointments")
    .aggregate([{ $match: { _id, customerId } }, ...withService])
    .toArray();

  if (!appointment) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }
  res.json(appointment);
});

// PATCH /api/appointments/:id/cancel (shudhu nijer pending appointment)
router.patch("/:id/cancel", async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid appointment id" });
    return;
  }

  const db = await getDb();
  const customerId = new ObjectId(req.user!.id);
  const appointments = db.collection("appointments");

  const updated = await appointments.findOneAndUpdate(
    { _id, customerId, status: "pending" },
    { $set: { status: "cancelled" } },
    { returnDocument: "after" }
  );

  if (updated) {
    res.json(updated);
    return;
  }

  const exists = await appointments.findOne({ _id, customerId }, { projection: { _id: 1 } });
  if (!exists) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }
  res.status(400).json({ message: "Only pending appointment requests can be cancelled" });
});

export default router;