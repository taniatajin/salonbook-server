import { Router } from "express";
import multer from "multer";
import { requireRole, verifyToken } from "../middleware/auth";

const router = Router();

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG or WEBP images are allowed"));
  },
});

// POST /api/admin/upload (field name: image)
router.post("/", verifyToken, requireRole("admin"), upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No image file provided" });
    return;
  }

  const body = new URLSearchParams();
  body.append("image", req.file.buffer.toString("base64"));

  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
    { method: "POST", body }
  );
  const data = (await response.json()) as { success?: boolean; data?: { url: string } };

  if (!response.ok || !data.success || !data.data) {
    res.status(502).json({ message: "Image upload failed" });
    return;
  }

  res.json({ url: data.data.url });
});

export default router;