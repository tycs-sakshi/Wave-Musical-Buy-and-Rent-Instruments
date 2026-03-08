import express from "express";
import "dotenv/config";
import connectDB from "./database/db.js";
import userRoute from "./routes/userRoute.js";
import instrumentRoute from "./routes/instrumentRoute.js";
import categoryRoute from "./routes/categoryRoute.js";
import orderRoute from "./routes/orderRoute.js";
import paymentRoute from "./routes/paymentRoute.js";
import reviewRoute from "./routes/reviewRoute.js";
import adminRoute from "./routes/adminRoute.js";
import notificationRoute from "./routes/notificationRoute.js";
import dealRoute from "./routes/dealRoute.js";
import brandRoute from "./routes/brandRoute.js";
import { deactivateExpiredDeals } from "./services/dealLifecycleService.js";
import { startRentalReminderScheduler } from "./services/rentalReminderService.js";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(express.json());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/instruments", instrumentRoute);
app.use("/api/v1/categories", categoryRoute);
app.use("/api/v1/orders", orderRoute);
app.use("/api/v1/payments", paymentRoute);
app.use("/api/v1/reviews", reviewRoute);
app.use("/api/v1/admin", adminRoute);
app.use("/api/v1/notifications", notificationRoute);
app.use("/api/v1/deals", dealRoute);
app.use("/api/v1/brands", brandRoute);
// http://localhost:8000/api/v1/user

app.listen(PORT, () => {
  connectDB();
  deactivateExpiredDeals().catch((error) => {
    console.error("Failed to refresh deals on startup:", error.message);
  });
  setInterval(() => {
    deactivateExpiredDeals().catch((error) => {
      console.error("Failed to auto-expire deals:", error.message);
    });
  }, 5 * 60 * 1000);
  startRentalReminderScheduler();
  console.log(`Server is listening at port: ${PORT}`);
});
