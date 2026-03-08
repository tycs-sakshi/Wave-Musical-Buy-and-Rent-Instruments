import nodemailer from "nodemailer";
import "dotenv/config";

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

export const sendOrderEmail = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.MAIL_USER,
    to,
    subject,
    ...(html ? { html } : { text }),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending order email:", error.message);
  }
};

const ORDER_STATUS_LABELS = {
  placed: "Order Placed",
  processing: "Processing",
  shipped: "Shipped",
  arrived: "Delivered",
  returned: "Returned",
};

const RETURN_STATUS_LABELS = {
  requested: "Return Requested",
  approved: "Return Approved",
  rejected: "Return Rejected",
  returned: "Returned",
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "N/A";

export const sendBuyOrderStatusEmail = async ({ to, order, status }) => {
  if (!to || !order?._id || !status) return;
  const statusLabel = ORDER_STATUS_LABELS[status] || status;

  await sendOrderEmail({
    to,
    subject: `Waves Musical - ${statusLabel} (#${String(order._id).slice(-6).toUpperCase()})`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;">
        <h2 style="margin-bottom:8px;">Order Status Update</h2>
        <p>Your order <strong>#${String(order._id).slice(-6).toUpperCase()}</strong> is now <strong>${statusLabel}</strong>.</p>
        <p style="margin:0;">Current status timeline: Placed → Processing → Shipped → Delivered</p>
      </div>
    `,
  });
};

export const sendBuyReturnUpdateEmail = async ({
  to,
  order,
  returnStatus,
  reason,
  adminNote,
  refundStatus,
}) => {
  if (!to || !order?._id || !returnStatus) return;
  const statusLabel = RETURN_STATUS_LABELS[returnStatus] || returnStatus;

  await sendOrderEmail({
    to,
    subject: `Waves Musical - ${statusLabel} (#${String(order._id).slice(-6).toUpperCase()})`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;">
        <h2 style="margin-bottom:8px;">Return Request Update</h2>
        <p>Order <strong>#${String(order._id).slice(-6).toUpperCase()}</strong> return status: <strong>${statusLabel}</strong>.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
        ${adminNote ? `<p><strong>Admin note:</strong> ${adminNote}</p>` : ""}
        ${refundStatus ? `<p><strong>Refund status:</strong> ${refundStatus}</p>` : ""}
      </div>
    `,
  });
};

export const sendRentalReminderEmail = async ({
  to,
  orderId,
  instrumentName,
  rentalEndDate,
  daysRemaining,
}) => {
  if (!to) return;

  const orderLabel = orderId ? String(orderId).slice(-6).toUpperCase() : "N/A";
  const safeDays = Number(daysRemaining) || 0;

  await sendOrderEmail({
    to,
    subject: `Waves Musical - Rental return reminder (#${orderLabel})`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;">
        <h2 style="margin-bottom:8px;">Rental Return Reminder</h2>
        <p>Your rented instrument <strong>${instrumentName || "Instrument"}</strong> will expire in <strong>${safeDays} day(s)</strong>.</p>
        <p><strong>Rental end date:</strong> ${formatDate(rentalEndDate)}</p>
        <p>Your rented instrument will expire in ${safeDays} days. Please return it before the due date to avoid late fees.</p>
      </div>
    `,
  });
};

export const sendRentalReturnSummaryEmail = async ({
  to,
  orderId,
  instrumentName,
  returnedAt,
  lateDays,
  lateFee,
}) => {
  if (!to) return;
  const orderLabel = orderId ? String(orderId).slice(-6).toUpperCase() : "N/A";
  const safeLateDays = Number(lateDays) || 0;
  const safeLateFee = Number(lateFee) || 0;

  await sendOrderEmail({
    to,
    subject: `Waves Musical - Rental return recorded (#${orderLabel})`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;">
        <h2 style="margin-bottom:8px;">Rental Return Confirmation</h2>
        <p>We recorded the return for <strong>${instrumentName || "Instrument"}</strong>.</p>
        <p><strong>Returned on:</strong> ${formatDate(returnedAt)}</p>
        <p><strong>Late days:</strong> ${safeLateDays}</p>
        <p><strong>Late fee:</strong> Rs ${safeLateFee.toFixed(2)}</p>
      </div>
    `,
  });
};

