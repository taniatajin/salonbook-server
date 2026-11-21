import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import adminAppointmentsRouter from "./routes/adminAppointments";
import adminServicesRouter from "./routes/adminServices";
import adminStatsRouter from "./routes/adminStats";
import adminTransactionsRouter from "./routes/adminTransactions";
import adminUsersRouter from "./routes/adminUsers";
import appointmentsRouter from "./routes/appointments";
import paymentsRouter from "./routes/payments";
import servicesRouter from "./routes/services";
import uploadRouter from "./routes/upload";
import { stripeWebhook } from "./routes/webhook";

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// Stripe webhook: raw body lagbe, tai express.json()-er AGE
app.post("/api/webhook/stripe", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "SalonBook API running" });
});

app.use("/api/services", servicesRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/admin/services", adminServicesRouter);
app.use("/api/admin/upload", uploadRouter);
app.use("/api/admin/appointments", adminAppointmentsRouter);
app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin/stats", adminStatsRouter);
app.use("/api/admin/transactions", adminTransactionsRouter);

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