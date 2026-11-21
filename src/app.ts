import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import adminServicesRouter from "./routes/adminServices";
import servicesRouter from "./routes/services";
import uploadRouter from "./routes/upload";

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// Stripe webhook route eikhane, express.json()-er AGE boshbe (pore)

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "SalonBook API running" });
});

app.use("/api/services", servicesRouter);
app.use("/api/admin/services", adminServicesRouter);
app.use("/api/admin/upload", uploadRouter);
// ROUTES_HERE

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use(
  (err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    const isClientError =
      err.name === "MulterError" || err.message.startsWith("Only JPG");
    const status = isClientError ? 400 : err.status ?? 500;
    res.status(status).json({
      message: status === 500 ? "Something went wrong on the server" : err.message,
    });
  }
);

export default app;