import { Router, type Request, type Response } from "express";
import { getDb } from "../config/db";
import { requireRole, verifyToken } from "../middleware/auth";
import { toObjectId } from "../utils/objectId";

const router = Router();

router.use(verifyToken, requireRole("admin"));

const publicFields = { name: 1, email: 1, image: 1, phone: 1, isBlocked: 1, createdAt: 1 };

// GET /api/admin/users (shudhu customer)
router.get("/", async (_req, res) => {
  const db = await getDb();
  const users = await db
    .collection("user")
    .find({ role: "customer" }, { projection: publicFields })
    .sort({ createdAt: -1 })
    .toArray();

  res.json(users);
});

// GET /api/admin/users/:id
router.get("/:id", async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid user id" });
    return;
  }

  const db = await getDb();
  const user = await db
    .collection("user")
    .findOne({ _id, role: "customer" }, { projection: publicFields });

  if (!user) {
    res.status(404).json({ message: "Customer not found" });
    return;
  }

  const appointmentCount = await db.collection("appointments").countDocuments({ customerId: _id });
  res.json({ ...user, appointmentCount });
});

function setBlocked(value: boolean) {
  return async (req: Request, res: Response) => {
    const _id = toObjectId(req.params.id);
    if (!_id) {
      res.status(400).json({ message: "Invalid user id" });
      return;
    }

    const db = await getDb();
    // role: "customer" filter thakar karone admin ke block kora jabe na
    const updated = await db
      .collection("user")
      .findOneAndUpdate(
        { _id, role: "customer" },
        { $set: { isBlocked: value } },
        { returnDocument: "after", projection: publicFields }
      );

    if (!updated) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }
    res.json(updated);
  };
}

// PATCH /api/admin/users/:id/block
router.patch("/:id/block", setBlocked(true));

// PATCH /api/admin/users/:id/unblock
router.patch("/:id/unblock", setBlocked(false));

export default router;