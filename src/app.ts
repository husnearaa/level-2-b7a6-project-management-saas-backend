import express from "express";
import cors from "cors";

import authRoutes from "./module/auth/auth.route";
import userRoutes from "./module/user/user.route";

import globalErrorHandler from "./middleware/globalErrorHandler";
import { notFoundHandler } from "./middleware/notFound";
import projectRoute from "./module/project/project.route";


const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/projects", projectRoute);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(globalErrorHandler);

export default app;