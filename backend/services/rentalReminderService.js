import { RentOrder } from "../models/rentOrderModel.js";
import { sendRentalReminderEmail } from "./emailService.js";

const DEFAULT_DAYS_BEFORE = 2;
const DEFAULT_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

const getReminderDaysBefore = () => {
  const parsed = Number(process.env.RENTAL_REMINDER_DAYS_BEFORE);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_DAYS_BEFORE;
  return Math.floor(parsed);
};

const getSweepIntervalMs = () => {
  const parsed = Number(process.env.RENTAL_REMINDER_SWEEP_MS);
  if (!Number.isFinite(parsed) || parsed < 60 * 1000) return DEFAULT_SWEEP_INTERVAL_MS;
  return Math.floor(parsed);
};

const getTargetDayWindow = (daysBefore) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const targetStart = new Date(todayStart);
  targetStart.setDate(targetStart.getDate() + daysBefore);

  const targetEnd = new Date(targetStart);
  targetEnd.setDate(targetEnd.getDate() + 1);

  return { targetStart, targetEnd };
};

export const runRentalReminderSweep = async () => {
  try {
    const daysBefore = getReminderDaysBefore();
    const { targetStart, targetEnd } = getTargetDayWindow(daysBefore);

    const rentals = await RentOrder.find({
      status: { $in: ["approved", "active"] },
      reminderSentAt: null,
      endDate: {
        $gte: targetStart,
        $lt: targetEnd,
      },
    })
      .populate("user", "email")
      .populate("instrument", "name");

    for (const rental of rentals) {
      const email = rental.user?.email;
      if (!email) continue;

      await sendRentalReminderEmail({
        to: email,
        orderId: rental._id,
        instrumentName: rental.instrument?.name || "Instrument rental",
        rentalEndDate: rental.endDate,
        daysRemaining: daysBefore,
      });

      await RentOrder.findByIdAndUpdate(rental._id, {
        $set: { reminderSentAt: new Date() },
      });
    }
  } catch (error) {
    console.error("Failed rental reminder sweep:", error.message);
  }
};

let reminderInterval = null;

export const startRentalReminderScheduler = () => {
  if (reminderInterval) return;

  runRentalReminderSweep().catch((error) => {
    console.error("Initial rental reminder sweep failed:", error.message);
  });

  const intervalMs = getSweepIntervalMs();
  reminderInterval = setInterval(() => {
    runRentalReminderSweep().catch((error) => {
      console.error("Scheduled rental reminder sweep failed:", error.message);
    });
  }, intervalMs);
};
