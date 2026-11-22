import { Router } from "express";
import type { Sort } from "mongodb";
import { getDb } from "../config/db";
import { toObjectId } from "../utils/objectId";

const router = Router();

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/services?search=&category=&sort=price-asc|price-desc&limit=
router.get("/", async (req, res) => {
  const { search, category, sort, limit } = req.query;

  const filter: Record<string, unknown> = { status: "active" };

  if (typeof category === "string" && category && category !== "all") {
    filter.category = category;
  }
  if (typeof search === "string" && search.trim()) {
    filter.serviceName = { $regex: escapeRegex(search.trim()), $options: "i" };
  }

  const sortOption: Sort =
    sort === "price-asc" ? { price: 1 } : sort === "price-desc" ? { price: -1 } : { createdAt: -1 };

  const db = await getDb();
  let cursor = db.collection("services").find(filter).sort(sortOption);

  const max = Number(limit);
  if (max > 0) cursor = cursor.limit(Math.min(max, 50));

  res.json(await cursor.toArray());
});

// GET /api/services/:id
router.get("/:id", async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid service id" });
    return;
  }

  const db = await getDb();
  const service = await db.collection("services").findOne({ _id });
  if (!service) {
    res.status(404).json({ message: "Service not found" });
    return;
  }

  res.json(service);
});

export default router;