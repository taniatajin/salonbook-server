import { Router } from "express";
import { getDb } from "../config/db";
import { requireRole, verifyToken } from "../middleware/auth";

const router = Router();

router.use(verifyToken, requireRole("admin"));

// GET /api/admin/stats
router.get("/", async (_req, res) => {
  const db = await getDb();

  const [
    totalCustomers,
    activeServices,
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    successfulPayments,
  ] = await Promise.all([
    db.collection("user").countDocuments({ role: "customer" }),
    db.collection("services").countDocuments({ status: "active" }),
    db.collection("appointments").countDocuments(),
    db.collection("appointments").countDocuments({ status: "pending" }),
    db.collection("appointments").countDocuments({ status: "confirmed" }),
    db.collection("transactions").countDocuments({ status: "paid" }),
  ]);

  res.json({
    totalCustomers,
    activeServices,
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    successfulPayments,
  });
});

export default router;