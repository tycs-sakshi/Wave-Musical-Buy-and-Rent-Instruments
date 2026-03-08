import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  emailOrderInvoice,
  getBuyOrderById,
  getOrderInvoice,
  getRentOrderById,
  requestBuyOrderReturn,
} from "@/api/orderApi";

const BUY_ORDER_STEPS = ["placed", "processing", "shipped", "arrived"];
const BUY_RETURN_REASONS = [
  "Damaged Item",
  "Wrong Product",
  "Not Satisfied",
  "Quality Issue",
  "Other",
];
const DEFAULT_INSTRUMENT_IMAGE = "/instrument.png";

const normalizeBuyStatus = (status) => {
  if (status === "pending") return "placed";
  if (status === "paid") return "processing";
  if (status === "completed") return "arrived";
  if (status === "returned") return "arrived";
  return status;
};

const toLabel = (value) => {
  if (!value) return "Unknown";
  if (value === "arrived") return "Delivered";
  const normalized = String(value).replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const getBuyStatusBadgeClass = (status) => {
  const normalized = normalizeBuyStatus(status);
  if (normalized === "placed") return "bg-blue-100 text-blue-800 border-blue-200";
  if (normalized === "processing")
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (normalized === "shipped")
    return "bg-violet-100 text-violet-800 border-violet-200";
  if (normalized === "arrived" || normalized === "completed" || normalized === "returned")
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (normalized === "rejected" || normalized === "cancelled")
    return "bg-rose-100 text-rose-800 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const getPaymentBadgeClass = (status) => {
  if (status === "paid") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "failed") return "bg-rose-100 text-rose-800 border-rose-200";
  if (status === "refunded")
    return "bg-violet-100 text-violet-800 border-violet-200";
  return "bg-orange-100 text-orange-800 border-orange-200";
};

const getBuySubtotal = (order) =>
  Number(
    order?.subtotal ??
      (order?.items || []).reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
  );

const getBuyGstAmount = (order) =>
  Number(
    order?.gstAmount ??
      (order?.items || []).reduce((sum, item) => sum + Number(item.gstAmount || 0), 0)
  );

const getBuyShippingCharge = (order) => Number(order?.shippingCharge || 0);

const getRentGstAmount = (order) => Number(order?.gstAmount || 0);

const getRentShippingCharge = (order) => Number(order?.shippingCharge || 0);

const getRentSubtotal = (order) => {
  const subtotal = Number(order?.subtotal);
  if (Number.isFinite(subtotal) && subtotal > 0) return subtotal;

  const totalRent = Number(order?.totalRent || 0);
  const gstAmount = getRentGstAmount(order);
  const shippingCharge = getRentShippingCharge(order);
  const derivedSubtotal = totalRent - gstAmount - shippingCharge;

  if (Number.isFinite(derivedSubtotal) && derivedSubtotal > 0) {
    return derivedSubtotal;
  }

  return totalRent;
};

const resolveInstrumentImage = (images) => {
  if (Array.isArray(images)) {
    const firstValid = images.find(
      (img) => typeof img === "string" && String(img).trim().length > 0
    );
    return firstValid || DEFAULT_INSTRUMENT_IMAGE;
  }

  if (typeof images === "string" && images.trim().length > 0) {
    return images;
  }

  return DEFAULT_INSTRUMENT_IMAGE;
};

const StatusTracker = ({ status }) => {
  const activeIndex = BUY_ORDER_STEPS.indexOf(normalizeBuyStatus(status));
  const progress = activeIndex < 0 ? 0 : ((activeIndex + 1) / BUY_ORDER_STEPS.length) * 100;

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4">
      <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">
        Order Tracking
      </p>
      <div className="relative mt-4">
        <div className="absolute left-0 right-0 top-[10px] h-1 rounded-full bg-slate-200" />
        <div
          className="absolute left-0 top-[10px] h-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
        <div className="relative grid grid-cols-4 gap-2">
          {BUY_ORDER_STEPS.map((step, index) => {
            const isActive = index <= activeIndex;
            return (
              <div key={step} className="space-y-2 text-center">
                <div
                  className={`mx-auto h-5 w-5 rounded-full border-2 ${
                    isActive
                      ? "border-emerald-600 bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]"
                      : "border-slate-300 bg-white"
                  }`}
                />
                <p
                  className={`text-[11px] ${
                    isActive ? "font-semibold text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {toLabel(step)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const OrderDetails = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.user.user);

  const [loading, setLoading] = useState(false);
  const [orderType, setOrderType] = useState("");
  const [order, setOrder] = useState(null);
  const [invoiceActionKey, setInvoiceActionKey] = useState("");
  const [returnReason, setReturnReason] = useState(BUY_RETURN_REASONS[0]);
  const [returnNote, setReturnNote] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const requestedType = searchParams.get("type");

  const loadOrder = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoading(true);

      if (requestedType === "buy") {
        const res = await getBuyOrderById(orderId);
        setOrder(res.data.data);
        setOrderType("buy");
        return;
      }

      if (requestedType === "rent") {
        const res = await getRentOrderById(orderId);
        setOrder(res.data.data);
        setOrderType("rent");
        return;
      }

      try {
        const buyRes = await getBuyOrderById(orderId);
        setOrder(buyRes.data.data);
        setOrderType("buy");
        return;
      } catch {
        const rentRes = await getRentOrderById(orderId);
        setOrder(rentRes.data.data);
        setOrderType("rent");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to load order details");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, requestedType]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const parseBlobErrorMessage = async (blobData) => {
    if (!(blobData instanceof Blob)) return "";
    try {
      const text = await blobData.text();
      const parsed = JSON.parse(text);
      return parsed?.message || "";
    } catch {
      return "";
    }
  };

  const downloadInvoicePDF = (blobContent, type, id) => {
    const fileBlob = new Blob([blobContent], { type: "application/pdf" });
    const fileUrl = window.URL.createObjectURL(fileBlob);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `waves-${type}-invoice-${id.slice(-6).toUpperCase()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(fileUrl);
  };

  const handleDownloadInvoice = async () => {
    if (!order?._id || !orderType) return;
    const actionKey = `${orderType}:${order._id}`;
    const toastId = toast.loading("Preparing your invoice...");

    try {
      setInvoiceActionKey(actionKey);
      const res = await getOrderInvoice(orderType, order._id, {
        params: { format: "pdf" },
        responseType: "blob",
      });

      if (!(res.data instanceof Blob) || res.data.size === 0) {
        throw new Error("Failed to generate invoice");
      }

      downloadInvoicePDF(res.data, orderType, order._id);
      toast.success("Invoice downloaded successfully.", { id: toastId });

      void emailOrderInvoice(orderType, order._id).catch((emailError) => {
        console.error(emailError);
        toast.error("Invoice downloaded, but email delivery failed.");
      });
    } catch (error) {
      console.error(error);
      const blobMessage = await parseBlobErrorMessage(error.response?.data);
      toast.error(blobMessage || error.response?.data?.message || "Failed to download invoice", {
        id: toastId,
      });
    } finally {
      setInvoiceActionKey("");
    }
  };

  const buyReturnStatus = order?.returnRequest?.status || "none";
  const canRequestReturn =
    orderType === "buy" &&
    normalizeBuyStatus(order?.status) === "arrived" &&
    ["none", "rejected"].includes(buyReturnStatus);

  const handleSubmitReturn = async () => {
    if (!order?._id || orderType !== "buy") return;
    const note = returnNote.trim();
    const reason =
      returnReason === "Other"
        ? note
        : note
          ? `${returnReason} - ${note}`
          : returnReason;
    if (!reason) {
      toast.error("Please select a return reason");
      return;
    }

    try {
      setSubmittingReturn(true);
      await requestBuyOrderReturn(order._id, { reason });
      toast.success("Return request submitted");
      setReturnNote("");
      await loadOrder();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to submit return request");
    } finally {
      setSubmittingReturn(false);
    }
  };

  const orderItems = useMemo(() => {
    if (!order) return [];
    if (orderType === "buy") {
      return (order.items || []).map((item, idx) => ({
        key: `${item._id || idx}`,
        image: resolveInstrumentImage(item.instrument?.images),
        name: item.name || item.instrument?.name || "Instrument",
        quantity: item.quantity || 1,
        price: item.lineTotal || item.subtotal || 0,
      }));
    }

    return [
      {
        key: order._id,
        image: resolveInstrumentImage(order.instrument?.images),
        name: order.instrument?.name || "Instrument rental",
        quantity: 1,
        price: order.totalRent || 0,
      },
    ];
  }, [order, orderType]);

  if (!currentUser) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-center">
          <p className="text-slate-700 mb-3">Please login to view order details.</p>
          <Button onClick={() => navigate("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-amber-50">
      <div className="max-w-5xl mx-auto px-4 pb-10 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">
              Order Details
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Review order, tracking, return, and invoice.
            </p>
          </div>
          <Button
            className="bg-slate-900 text-white hover:bg-slate-800"
            onClick={() => navigate("/profile?tab=orders")}
          >
            Back to Orders
          </Button>
        </div>

        {loading ? (
          <Card className="bg-white border border-amber-200">
            <CardContent className="p-8 text-center text-slate-500">
              Loading order details...
            </CardContent>
          </Card>
        ) : !order ? (
          <Card className="bg-white border border-amber-200">
            <CardContent className="p-8 text-center text-slate-500">
              Order not found.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-white border border-amber-200 shadow-sm">
              <CardHeader className="border-b border-amber-200 bg-gradient-to-r from-amber-50 to-white">
                <CardTitle className="text-lg">
                  Order #{order._id.slice(-6).toUpperCase()}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getBuyStatusBadgeClass(order.status)}`}
                  >
                    {toLabel(order.status)}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getPaymentBadgeClass(order.paymentStatus)}`}
                  >
                    {toLabel(order.paymentStatus)}
                  </span>
                  {orderType === "buy" && buyReturnStatus !== "none" && (
                    <span className="text-xs px-2.5 py-1 rounded-full border font-semibold bg-violet-100 text-violet-800 border-violet-200">
                      Return {toLabel(buyReturnStatus)}
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-4">
                {orderType === "buy" && <StatusTracker status={order.status} />}

                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">Items in this order</p>
                  {orderItems.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-14 w-14 rounded-md object-cover bg-white border border-amber-200"
                          onError={(event) => {
                            if (event.currentTarget.dataset.fallbackApplied) return;
                            event.currentTarget.dataset.fallbackApplied = "true";
                            event.currentTarget.src = DEFAULT_INSTRUMENT_IMAGE;
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                          <p className="text-xs text-slate-600">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-slate-900">{formatCurrency(item.price)}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>
                      {formatCurrency(
                        orderType === "buy" ? getBuySubtotal(order) : getRentSubtotal(order)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST</span>
                    <span>
                      {formatCurrency(
                        orderType === "buy" ? getBuyGstAmount(order) : getRentGstAmount(order)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>
                      {formatCurrency(
                        orderType === "buy"
                          ? getBuyShippingCharge(order)
                          : getRentShippingCharge(order)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total Payable</span>
                    <span>{formatCurrency(orderType === "buy" ? order.totalAmount : order.totalRent)}</span>
                  </div>
                </div>

                {orderType === "buy" && canRequestReturn && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">Return Product</p>
                    <select
                      value={returnReason}
                      onChange={(event) => setReturnReason(event.target.value)}
                      className="w-full border border-amber-300 rounded px-2 py-1.5 text-sm"
                    >
                      {BUY_RETURN_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={returnNote}
                      onChange={(event) => setReturnNote(event.target.value)}
                      placeholder={
                        returnReason === "Other"
                          ? "Please specify return reason"
                          : "Optional note"
                      }
                    />
                    <Button
                      onClick={handleSubmitReturn}
                      disabled={submittingReturn}
                      className="w-full bg-amber-500 text-white hover:bg-amber-600"
                    >
                      {submittingReturn ? "Submitting..." : "Return Product"}
                    </Button>
                  </div>
                )}

                {orderType === "buy" && buyReturnStatus !== "none" && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs text-slate-700 space-y-1">
                    <p>
                      <span className="font-semibold">Return Status:</span> {toLabel(buyReturnStatus)}
                    </p>
                    {order.returnRequest?.reason && (
                      <p>
                        <span className="font-semibold">Return Reason:</span> {order.returnRequest.reason}
                      </p>
                    )}
                    {order.returnRequest?.refundStatus && (
                      <p>
                        <span className="font-semibold">Refund Status:</span>{" "}
                        {toLabel(order.returnRequest.refundStatus)}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleDownloadInvoice}
                  disabled={invoiceActionKey === `${orderType}:${order._id}`}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg"
                >
                  {invoiceActionKey === `${orderType}:${order._id}`
                    ? "Preparing invoice..."
                    : "Download + Email Invoice"}
                </Button>
                <p className="text-[11px] text-slate-500">
                  Invoice is downloaded instantly and emailed to{" "}
                  <span className="font-medium">{currentUser?.email}</span>.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;
