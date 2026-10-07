import express from "express";
import cors from "cors";
import authRoutes from "./module/auth/auth.route";
import userRoutes from "./module/user/user.route";
import taskRoutes from "./module/task/task.route";
import paymentRoute from "./module/payment/payment.route";
import globalErrorHandler from "./middleware/globalErrorHandler";
import { notFoundHandler } from "./middleware/notFound";
import projectRoute from "./module/project/project.route";
import adminRoute from "./module/admin/admin.route";
import auditRoute from "./module/audit/audit.route";

const app = express();

app.use(cors());

app.get("/", (req, res) => {
  res.send("Backend server is running!"); 
});

// Stripe webhook MUST receive raw body
app.use(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
);

// Normal JSON body parser
app.use(express.json());

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/projects", projectRoute);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/payments", paymentRoute);
app.use("/api/v1/admin", adminRoute);
app.use("/api/v1/audit", auditRoute);


// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(globalErrorHandler);

export default app;