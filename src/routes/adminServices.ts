import { Router } from "express";
import { getDb } from "../config/db";
import { requireRole, verifyToken } from "../middleware/auth";
import { toObjectId } from "../utils/objectId";
import { parseServiceBody } from "../utils/validateService";

const router = Router();

router.use(verifyToken, requireRole("admin"));

// GET /api/admin/services (active + inactive shob)
router.get("/", async (_req, res) => {
  const db = await getDb();
  const services = await db.collection("services").find().sort({ createdAt: -1 }).toArray();
  res.json(services);
});

// POST /api/admin/services
router.post("/", async (req, res) => {
  const parsed = parseServiceBody(req.body, true);
  if ("error" in parsed) {
    res.status(400).json({ message: parsed.error });
    return;
  }

  const db = await getDb();
  const doc = {
    ...parsed.data,
    status: parsed.data.status ?? "active",
    createdAt: new Date(),
  };
  const result = await db.collection("services").insertOne(doc);

  res.status(201).json({ ...doc, _id: result.insertedId });
});

// PUT /api/admin/services/:id
router.put("/:id", async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid service id" });
    return;
  }

  const parsed = parseServiceBody(req.body, false);
  if ("error" in parsed) {
    res.status(400).json({ message: parsed.error });
    return;
  }

  const db = await getDb();
  const updated = await db
    .collection("services")
    .findOneAndUpdate({ _id }, { $set: parsed.data }, { returnDocument: "after" });

  if (!updated) {
    res.status(404).json({ message: "Service not found" });
    return;
  }
  res.json(updated);
});

// PATCH /api/admin/services/:id/status
router.patch("/:id/status", async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid service id" });
    return;
  }

  const status = req.body?.status;
  if (status !== "active" && status !== "inactive") {
    res.status(400).json({ message: "Status must be active or inactive" });
    return;
  }

  const db = await getDb();
  const updated = await db
    .collection("services")
    .findOneAndUpdate({ _id }, { $set: { status } }, { returnDocument: "after" });

  if (!updated) {
    res.status(404).json({ message: "Service not found" });
    return;
  }
  res.json(updated);
});

// DELETE /api/admin/services/:id
router.delete("/:id", async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid service id" });
    return;
  }

  const db = await getDb();
  const result = await db.collection("services").deleteOne({ _id });

  if (result.deletedCount === 0) {
    res.status(404).json({ message: "Service not found" });
    return;
  }
  res.json({ message: "Service deleted successfully" });
});

export default router;