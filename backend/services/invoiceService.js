import { BuyOrder } from "../models/buyOrderModel.js";
import { RentOrder } from "../models/rentOrderModel.js";
import nodemailer from "nodemailer";
import { existsSync } from "node:fs";
import path from "node:path";
import "dotenv/config";

const DEFAULT_PUPPETEER_CACHE_DIR = path.resolve(
  process.cwd(),
  ".cache",
  "puppeteer"
);
const configuredPuppeteerCacheDir = String(
  process.env.PUPPETEER_CACHE_DIR || ""
).trim();
const normalizedPuppeteerCacheDir =
  configuredPuppeteerCacheDir && !configuredPuppeteerCacheDir.startsWith("/tmp")
    ? configuredPuppeteerCacheDir
    : DEFAULT_PUPPETEER_CACHE_DIR;

process.env.PUPPETEER_CACHE_DIR = normalizedPuppeteerCacheDir;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const isValidInvoiceType = (type) => type === "buy" || type === "rent";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getOrderByType = async (type, orderId) => {
  if (type === "buy") {
    return BuyOrder.findById(orderId).populate("items.instrument user");
  }

  return RentOrder.findById(orderId).populate("instrument user");
};

let puppeteerModule = null;
let invoiceBrowserPromise = null;

const getPuppeteer = async () => {
  if (puppeteerModule) return puppeteerModule;

  try {
    const imported = await import("puppeteer");
    puppeteerModule = imported.default || imported;
    return puppeteerModule;
  } catch (_error) {
    throw new Error(
      "Invoice PDF generator is unavailable. Install 'puppeteer' in backend dependencies."
    );
  }
};

const getInvoiceBrowser = async () => {
  const puppeteer = await getPuppeteer();
  if (!invoiceBrowserPromise) {
    const configuredExecutablePath = String(
      process.env.PUPPETEER_EXECUTABLE_PATH || ""
    ).trim();
    const launchOptions = {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };

    if (configuredExecutablePath && existsSync(configuredExecutablePath)) {
      launchOptions.executablePath = configuredExecutablePath;
    } else if (configuredExecutablePath) {
      console.warn(
        `[invoice] Ignoring invalid PUPPETEER_EXECUTABLE_PATH: ${configuredExecutablePath}`
      );
    }

    const tryLaunchBrowser = async () => {
      try {
        return await puppeteer.launch(launchOptions);
      } catch (error) {
        const message = String(error?.message || "");
        if (
          launchOptions.executablePath &&
          message.includes("configured executablePath")
        ) {
          console.warn(
            `[invoice] Failed to launch using executablePath (${launchOptions.executablePath}). Falling back to Puppeteer managed Chrome.`
          );
          const fallbackLaunchOptions = { ...launchOptions };
          delete fallbackLaunchOptions.executablePath;
          return puppeteer.launch(fallbackLaunchOptions);
        }
        throw error;
      }
    };

    invoiceBrowserPromise = tryLaunchBrowser()
      .then((browser) => {
        browser.on("disconnected", () => {
          invoiceBrowserPromise = null;
        });
        return browser;
      })
      .catch((error) => {
        invoiceBrowserPromise = null;
        const message = String(error?.message || "");
        if (message.includes("Could not find Chrome")) {
          throw new Error(
            `Unable to generate invoice PDF because Chrome is not installed in Puppeteer cache (${process.env.PUPPETEER_CACHE_DIR}). Run backend postinstall on Render with the same cache path.`
          );
        }
        throw error;
      });
  }

  return invoiceBrowserPromise;
};

const generateInvoiceHTML = (order, user, type = "buy") => {
  const invoiceNumber = order._id.toString().slice(-8).toUpperCase();
  const customerName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Customer";
  const fallbackBuySubtotal = (order.items || []).reduce(
    (sum, item) => sum + Number(item.subtotal || 0),
    0
  );
  const fallbackBuyGst = (order.items || []).reduce(
    (sum, item) => sum + Number(item.gstAmount || 0),
    0
  );

  const items =
    type === "buy"
      ? order.items || []
      : [
          {
            name: order.instrument?.name || "Instrument Rental",
            quantity: order.days || 1,
            subtotal: order.subtotal || order.totalRent || 0,
            gstRate: order.gstRate || 0,
            gstAmount: order.gstAmount || 0,
            lineTotal:
              (order.subtotal || order.totalRent || 0) + (order.gstAmount || 0),
          },
        ];
  const subtotal =
    type === "buy"
      ? Number(order.subtotal ?? fallbackBuySubtotal)
      : Number(order.subtotal ?? order.totalRent ?? 0);
  const gstAmount =
    type === "buy" ? Number(order.gstAmount ?? fallbackBuyGst) : Number(order.gstAmount || 0);
  const shippingCharge = Number(order.shippingCharge || 0);
  const total = type === "buy" ? order.totalAmount : order.totalRent;
  const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; }
        .container { max-width: 860px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 15px 40px rgba(15, 23, 42, 0.08); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 18px; margin-bottom: 28px; }
        .brand { font-size: 24px; font-weight: 800; color: #db2777; letter-spacing: 0.04em; }
        .invoice-title { text-align: right; }
        .invoice-title h1 { margin: 0; font-size: 22px; color: #1e293b; }
        .invoice-title p { margin: 6px 0 0 0; color: #475569; font-size: 13px; }
        .details { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
        .detail-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
        .detail-box h3 { margin: 0 0 10px 0; color: #334155; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
        .detail-box p { margin: 6px 0; color: #334155; font-size: 13px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
        .items-table th { background: #f8fafc; padding: 10px; text-align: left; color: #334155; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
        .items-table td { padding: 10px; font-size: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .items-table tr:last-child td { border-bottom: none; }
        .align-right { text-align: right; }
        .summary-table { width: 100%; margin-top: 8px; border-collapse: collapse; }
        .summary-table td { padding: 8px 2px; font-size: 13px; color: #334155; }
        .summary-table .label { text-align: right; }
        .summary-table .value { text-align: right; font-weight: 600; min-width: 120px; }
        .summary-table .grand-total td { border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 16px; color: #0f172a; font-weight: 800; }
        .total-row { display: flex; justify-content: space-between; margin-top: 14px; padding: 14px; border-radius: 12px; background: linear-gradient(90deg, #fdf2f8, #faf5ff); border: 1px solid #fbcfe8; color: #be185d; font-size: 18px; font-weight: 700; }
        .footer { margin-top: 24px; font-size: 12px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">WAVES MUSICAL</div>
          <div class="invoice-title">
            <h1>${type === "buy" ? "PURCHASE INVOICE" : "RENTAL INVOICE"}</h1>
            <p>Invoice #${invoiceNumber}</p>
          </div>
        </div>

        <div class="details">
          <div class="detail-box">
            <h3>Bill To</h3>
            <p><strong>${customerName}</strong></p>
            <p>${user?.email || "N/A"}</p>
            <p>${user?.phoneNo || "N/A"}</p>
            <p>${user?.address || "N/A"}, ${user?.city || "N/A"}</p>
            <p>${user?.zipCode || "N/A"}</p>
          </div>
          <div class="detail-box">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Payment Status:</strong> ${order.paymentStatus || "pending"}</p>
            ${
              type === "buy"
                ? `<p><strong>Status:</strong> ${order.status || "placed"}</p>`
                : `<p><strong>Rental Period:</strong> ${new Date(order.startDate).toLocaleDateString("en-IN")} to ${new Date(order.endDate).toLocaleDateString("en-IN")}</p>`
            }
            ${type === "buy" ? `<p><strong>Ship To:</strong> ${order.shippingAddress?.line1 || "-"}, ${order.shippingAddress?.city || "-"}</p>` : ""}
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th class="align-right">Qty</th>
              <th class="align-right">Taxable</th>
              <th class="align-right">GST</th>
              <th class="align-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => `
              <tr>
                <td>${item.name || "Instrument"}</td>
                <td class="align-right">${item.quantity || 1}</td>
                <td class="align-right">&#8377;${formatCurrency(item.subtotal || 0)}</td>
                <td class="align-right">${Number(item.gstRate || 0).toFixed(2)}% (&#8377;${formatCurrency(item.gstAmount || 0)})</td>
                <td class="align-right">&#8377;${formatCurrency(item.lineTotal || (Number(item.subtotal || 0) + Number(item.gstAmount || 0)))}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <table class="summary-table">
          <tr>
            <td class="label">Subtotal</td>
            <td class="value">&#8377;${formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <td class="label">GST</td>
            <td class="value">&#8377;${formatCurrency(gstAmount)}</td>
          </tr>
          <tr>
            <td class="label">Shipping</td>
            <td class="value">&#8377;${formatCurrency(shippingCharge)}</td>
          </tr>
          <tr class="grand-total">
            <td class="label">Total Amount</td>
            <td class="value">&#8377;${formatCurrency(total)}</td>
          </tr>
        </table>

        <div class="footer">
          <p>Thank you for shopping with Waves Musical.</p>
          <p>Support: ${process.env.MAIL_USER || "support@wavesmusical.com"}</p>
          <p>${new Date().getFullYear()} Waves Musical. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateInvoicePDFBuffer = async (invoiceHTML) => {
  const browser = await getInvoiceBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(invoiceHTML, { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        right: "10mm",
        bottom: "12mm",
        left: "10mm",
      },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
};

export const sendInvoiceEmail = async (order, user, type = "buy") => {
  try {
    if (!user?.email) return false;

    const invoiceHTML = generateInvoiceHTML(order, user, type);
    const invoiceNumber = order._id.toString().slice(-8).toUpperCase();
    const pdfBuffer = await generateInvoicePDFBuffer(invoiceHTML);

    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: user.email,
      subject: `Waves Musical - ${type === "buy" ? "Purchase" : "Rental"} Invoice #${invoiceNumber}`,
      html: `
        <p>Hello ${user.firstName || "there"},</p>
        <p>Your invoice is attached to this email.</p>
        <p>Order ID: ${order._id}</p>
        <p>Thank you for choosing Waves Musical.</p>
      `,
      attachments: [
        {
          filename: `waves-${type}-invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return true;
  } catch (error) {
    console.error("Error sending invoice email:", error);
    return false;
  }
};

export const getOrderInvoice = async (req, res) => {
  try {
    const { orderId, type } = req.params;
    const userId = req.id;
    const format = String(req.query.format || "pdf").toLowerCase();

    if (!isValidInvoiceType(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order type. Use 'buy' or 'rent'.",
      });
    }

    const order = await getOrderByType(type, orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (String(order.user?._id || order.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access this order",
      });
    }

    const invoiceHTML = generateInvoiceHTML(order, order.user, type);
    const invoiceNumber = order._id.toString().slice(-8).toUpperCase();

    if (format === "html") {
      return res.status(200).json({
        success: true,
        data: {
          html: invoiceHTML,
          orderId: order._id,
          orderType: type,
          invoiceNumber,
        },
      });
    }

    const pdfBuffer = await generateInvoicePDFBuffer(invoiceHTML);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"waves-${type}-invoice-${invoiceNumber}.pdf\"`
    );
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const emailOrderInvoice = async (req, res) => {
  try {
    const { orderId, type } = req.params;
    const userId = req.id;

    if (!isValidInvoiceType(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order type. Use 'buy' or 'rent'.",
      });
    }

    const order = await getOrderByType(type, orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (String(order.user?._id || order.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access this order",
      });
    }

    const sent = await sendInvoiceEmail(order, order.user, type);
    if (!sent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send invoice email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice sent to your registered email",
      data: {
        orderId: order._id,
        orderType: type,
        email: order.user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
