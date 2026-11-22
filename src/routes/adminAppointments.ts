import { Router, type Request, type Response } from "express";
import { getDb } from "../config/db";
import { requireRole, verifyToken } from "../middleware/auth";
import { toObjectId } from "../utils/objectId";
import { withCustomer, withService } from "../utils/pipelines";

const router = Router();

router.use(verifyToken, requireRole("admin"));

// GET /api/admin/appointments?status=pending|confirmed|cancelled
router.get("/", async (req, res) => {
  const status = req.query.status;
  const match =
    status === "pending" || status === "confirmed" || status === "cancelled" ? { status } : {};

  const db = await getDb();
  const appointments = await db
    .collection("appointments")
    .aggregate([{ $match: match }, { $sort: { createdAt: -1 } }, ...withService, ...withCustomer])
    .toArray();

  res.json(appointments);
});

// GET /api/admin/appointments/:id
router.get("/:id", async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid appointment id" });
    return;
  }

  const db = await getDb();
  const [appointment] = await db
    .collection("appointments")
    .aggregate([{ $match: { _id } }, ...withService, ...withCustomer])
    .toArray();

  if (!appointment) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }
  res.json(appointment);
});

function changeStatus(from: string[], to: "confirmed" | "cancelled", failMessage: string) {
  return async (req: Request, res: Response) => {
    const _id = toObjectId(req.params.id);
    if (!_id) {
      res.status(400).json({ message: "Invalid appointment id" });
      return;
    }

    const db = await getDb();
    const appointments = db.collection("appointments");

    const updated = await appointments.findOneAndUpdate(
      { _id, status: { $in: from } },
      { $set: { status: to } },
      { returnDocument: "after" }
    );
    if (updated) {
      res.json(updated);
      return;
    }

    const exists = await appointments.findOne({ _id }, { projection: { _id: 1 } });
    res
      .status(exists ? 400 : 404)
      .json({ message: exists ? failMessage : "Appointment not found" });
  };
}

// PATCH /api/admin/appointments/:id/confirm
router.patch(
  "/:id/confirm",
  changeStatus(["pending"], "confirmed", "Only pending appointments can be confirmed")
);

// PATCH /api/admin/appointments/:id/cancel
router.patch(
  "/:id/cancel",
  changeStatus(
    ["pending", "confirmed"],
    "cancelled",
    "Only pending or confirmed appointments can be cancelled"
  )
);

export default router;