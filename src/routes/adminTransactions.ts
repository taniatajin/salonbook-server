import { Router } from "express";
import { getDb } from "../config/db";
import { requireRole, verifyToken } from "../middleware/auth";
import { withAppointmentAndService, withCustomer } from "../utils/pipelines";

const router = Router();

router.use(verifyToken, requireRole("admin"));

// GET /api/admin/transactions (read-only)
router.get("/", async (_req, res) => {
  const db = await getDb();

  const transactions = await db
    .collection("transactions")
    .aggregate([{ $sort: { createdAt: -1 } }, ...withAppointmentAndService, ...withCustomer])
    .toArray();

  res.json(transactions);
});

export default router;