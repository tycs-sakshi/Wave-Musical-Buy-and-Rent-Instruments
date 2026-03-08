import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clearCart } from "@/redux/cartSlice";
import { createBuyOrder, createRentOrder, getOrderQuote } from "@/api/orderApi";
import {
  createRazorpayOrderApi,
  verifyRazorpayPaymentApi,
} from "@/api/paymentApi";
import OrderSuccessDialog from "@/components/OrderSuccessDialog";

const initialShipping = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
};

const INDIA_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const RENT_SERVICEABLE_STATE = "Maharashtra";

const formatPrice = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const buildQuotePayload = (items) => ({
  items: items.map((item) =>
    item.type === "buy"
      ? {
          type: "buy",
          instrumentId: item.instrumentId,
          quantity: item.quantity,
          dealId: item.dealId,
        }
      : {
          type: "rent",
          instrumentId: item.instrumentId,
          startDate: item.startDate,
          endDate: item.endDate,
          days: item.days,
          dealId: item.dealId,
        }
  ),
});

const getItemKey = (item) =>
  item.type === "buy"
    ? `buy-${item.instrumentId}`
    : `rent-${item.instrumentId}-${item.startDate}-${item.endDate}`;

const Checkout = () => {
  const items = useSelector((state) => state.cart.items);
  const currentUser = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState(initialShipping);
  const [loading, setLoading] = useState(false);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successOrderType, setSuccessOrderType] = useState("buy");
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const hasBuy = useMemo(() => items.some((item) => item.type === "buy"), [items]);
  const hasRent = useMemo(() => items.some((item) => item.type === "rent"), [items]);

  const fallbackSubtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      if (item.type === "buy") return sum + item.price * item.quantity;
      if (item.type === "rent") return sum + (item.totalRent || 0);
      return sum;
    }, 0);
  }, [items]);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!currentUser || items.length === 0) {
        setQuote(null);
        return;
      }

      try {
        setQuoteLoading(true);
        const res = await getOrderQuote(buildQuotePayload(items));
        setQuote(res.data.data);
      } catch (error) {
        console.error(error);
        setQuote(null);
        toast.error(error.response?.data?.message || "Failed to calculate GST/shipping");
      } finally {
        setQuoteLoading(false);
      }
    };

    fetchQuote();
  }, [currentUser, items]);

  const subtotal = quote?.subtotal ?? fallbackSubtotal;
  const gstAmount = quote?.gstAmount ?? 0;
  const shippingCharge = quote?.shippingCharge ?? 0;
  const total = quote?.total ?? subtotal;
  const availableStates = hasRent ? [RENT_SERVICEABLE_STATE] : INDIA_STATES;

  const quoteItemMap = useMemo(() => {
    const map = new Map();
    (quote?.buy?.items || []).forEach((item) => {
      map.set(`buy-${item.instrumentId}`, item);
    });
    (quote?.rent?.items || []).forEach((item) => {
      map.set(`rent-${item.instrumentId}-${item.startDate}-${item.endDate}`, item);
    });
    return map;
  }, [quote]);

  useEffect(() => {
    setShipping((prev) => ({
      ...prev,
      country: "India",
    }));
  }, []);

  useEffect(() => {
    if (!hasRent) return;
    setShipping((prev) => ({
      ...prev,
      state: prev.state || RENT_SERVICEABLE_STATE,
      country: "India",
    }));
  }, [hasRent]);

  if (!currentUser) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-center">
          <p className="text-slate-700 mb-3">You need to login to continue checkout.</p>
          <Button onClick={() => navigate("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  const isShippingComplete = () => {
    return (
      shipping.line1.trim() &&
      shipping.line2.trim() &&
      shipping.city.trim() &&
      shipping.state.trim() &&
      shipping.country.trim() &&
      shipping.postalCode.trim()
    );
  };

  const validateShippingRules = () => {
    if (!isShippingComplete()) {
      toast.error("Please complete shipping details first");
      return false;
    }

    if (shipping.country !== "India") {
      toast.error("Orders are available in India only.");
      return false;
    }

    if (hasRent && shipping.state !== RENT_SERVICEABLE_STATE) {
      toast.error("Rent service is currently available only in Maharashtra.");
      return false;
    }

    return true;
  };

  const validateCartType = () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return false;
    }

    if (hasBuy && hasRent) {
      toast.error("Please checkout buy and rent items separately.");
      return false;
    }

    if (hasRent && items.filter((item) => item.type === "rent").length > 1) {
      toast.error("Please checkout one rent item at a time.");
      return false;
    }

    return true;
  };

  const createOrderForCheckout = async () => {
    if (!validateCartType()) {
      throw new Error("Invalid cart state");
    }

    if (hasBuy) {
      const payload = {
        items: items.map((item) => ({
          instrumentId: item.instrumentId,
          quantity: item.quantity,
          dealId: item.dealId,
        })),
        shippingAddress: shipping,
      };
      const buyRes = await createBuyOrder(payload);
      return { type: "buy", order: buyRes.data.data };
    }

    const rentItem = items[0];
    const rentPayload = {
      instrumentId: rentItem.instrumentId,
      startDate: rentItem.startDate,
      endDate: rentItem.endDate,
      dealId: rentItem.dealId,
      notes: "",
      shippingAddress: shipping,
    };
    const rentRes = await createRentOrder(rentPayload);
    return { type: "rent", order: rentRes.data.data };
  };

  const handlePlaceOrder = async () => {
    if (!validateShippingRules()) {
      return;
    }

    try {
      setLoading(true);
      const { type } = await createOrderForCheckout();
      setSuccessOrderType(type);
      dispatch(clearCart());
      setShowSuccessDialog(true);
    } catch (error) {
      console.error(error);
      if (error.message !== "Invalid cart state") {
        toast.error(error.response?.data?.message || "Failed to place order");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayOnline = async () => {
    if (!validateShippingRules()) {
      return;
    }

    if (!window.Razorpay) {
      toast.error("Razorpay script not loaded");
      return;
    }

    try {
      setOnlineLoading(true);
      const { type, order } = await createOrderForCheckout();
      const payableAmount = Number(
        type === "buy" ? order.totalAmount : order.totalRent
      );

      if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
        throw new Error("Invalid payable amount");
      }

      const paymentRes = await createRazorpayOrderApi({
        type,
        orderId: order._id,
        amount: payableAmount,
        currency: "INR",
      });

      const { keyId, razorpayOrderId, amount, currency, paymentId } =
        paymentRes.data.data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: "Waves Musical",
        description: type === "buy" ? "Instrument Purchase" : "Instrument Rental",
        order_id: razorpayOrderId,
        handler: async (response) => {
          try {
            await verifyRazorpayPaymentApi({
              paymentId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            dispatch(clearCart());
            setSuccessOrderType(type);
            setShowSuccessDialog(true);
          } catch (error) {
            console.error(error);
            toast.error("Failed to verify payment");
          }
        },
        prefill: {
          name: `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim(),
          email: currentUser.email || "",
          contact: currentUser.phoneNo || "",
        },
        theme: {
          color: "#111827",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error(error);
      if (error.message === "Invalid payable amount") {
        toast.error("Invalid payable amount. Please refresh cart and try again.");
      } else if (error.message !== "Invalid cart state") {
        toast.error(
          error.response?.data?.message || "Failed to initiate online payment"
        );
      }
    } finally {
      setOnlineLoading(false);
    }
  };

  return (
    <>
      <OrderSuccessDialog
        isOpen={showSuccessDialog}
        orderType={successOrderType}
        onClose={() => setShowSuccessDialog(false)}
      />
      <div className="pt-24 min-h-screen bg-gradient-to-b from-amber-50 to-white">
        <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
        <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          {/* Step Indicator */}
          <div className="mb-8 relative px-6">
            <div className="absolute left-10 right-10 top-4 h-1 bg-slate-200 rounded-full" />
            <div
              className="absolute left-10 top-4 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: step === 1 ? "0%" : "calc(100% - 5rem)" }}
            />

            <div className="relative z-10 grid grid-cols-2">
              <div className="flex flex-col items-center">
                <span
                  className={`h-8 w-8 grid place-items-center rounded-full text-sm font-medium transition-all duration-300 ${
                    step >= 1
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  1
                </span>
                <span className="mt-2 text-sm font-medium text-slate-600">Shipping</span>
              </div>

              <div className="flex flex-col items-center">
                <span
                  className={`h-8 w-8 grid place-items-center rounded-full text-sm font-medium transition-all duration-300 ${
                    step >= 2
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  2
                </span>
                <span className="mt-2 text-sm font-medium text-slate-600">Payment</span>
              </div>
            </div>
          </div>

          {step === 1 ? (
            <div className="space-y-4 text-sm animate-in fade-in duration-300">
              <div>
                <LabelText>Address Line 1</LabelText>
                <Field
                  name="line1"
                  value={shipping.line1}
                  onChange={setShipping}
                  placeholder="Street and house number"
                />
              </div>
              <div>
                <LabelText>Address Line 2</LabelText>
                <Field
                  name="line2"
                  value={shipping.line2}
                  onChange={setShipping}
                  placeholder="Landmark / area"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <LabelText>City</LabelText>
                  <Field name="city" value={shipping.city} onChange={setShipping} />
                </div>
                <div>
                  <LabelText>State</LabelText>
                  <select
                    name="state"
                    value={shipping.state}
                    onChange={(event) =>
                      setShipping((prev) => ({
                        ...prev,
                        state: event.target.value,
                      }))
                    }
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Select state</option>
                    {availableStates.map((stateName) => (
                      <option key={stateName} value={stateName}>
                        {stateName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <LabelText>Country</LabelText>
                  <input
                    value="India"
                    readOnly
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <LabelText>Postal Code</LabelText>
                  <Field
                    name="postalCode"
                    value={shipping.postalCode}
                    onChange={setShipping}
                  />
                </div>
              </div>
              {hasRent && (
                <p className="text-xs rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">
                  Rent orders are serviceable only in Maharashtra.
                </p>
              )}

              <Button
                className="w-full bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg transform hover:scale-105 transition-all duration-200 py-3 font-semibold"
                onClick={() => {
                  if (!validateShippingRules()) {
                    return;
                  }
                  setStep(2);
                }}
              >
                Continue to Payment →
              </Button>
            </div>
          ) : (
            <div className="space-y-4 text-sm text-slate-700 animate-in fade-in duration-300">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                <p className="font-semibold text-green-900 mb-2">✓ Shipping Details Confirmed</p>
                <p className="text-sm text-green-800 leading-relaxed">
                  {shipping.line1}, {shipping.line2}, {shipping.city}, {shipping.state},{" "}
                  {shipping.country} - {shipping.postalCode}
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => setStep(1)}
              >
                ← Edit Shipping
              </Button>
            </div>
          )}
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 sticky top-24 h-fit">
          <h2 className="text-2xl font-display font-semibold mb-6 text-slate-900">
            Order Summary
          </h2>
          <div className="space-y-3 text-sm mb-6 max-h-64 overflow-y-auto">
            {items.map((item, index) => (
              (() => {
                const pricing = quoteItemMap.get(getItemKey(item));
                const lineSubtotal =
                  pricing?.subtotal ??
                  (item.type === "buy"
                    ? Number(item.price || 0) * Number(item.quantity || 0)
                    : Number(item.totalRent || 0));
                const lineGst = pricing?.gstAmount || 0;
                const lineTotal = pricing?.lineTotal || lineSubtotal;

                return (
                  <div
                    key={`${item.instrumentId}-${index}`}
                    className="border-b border-amber-100 pb-2"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.type === "buy"
                            ? `Buy x${item.quantity}`
                            : `Rent ${item.days} day(s)`}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-900">
                        {formatPrice(lineTotal)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Taxable: {formatPrice(lineSubtotal)} | GST{" "}
                      {Number(pricing?.gstRate || 0).toFixed(2)}%: {formatPrice(lineGst)}
                    </p>
                  </div>
                );
              })()
            ))}
          </div>
          <div className="space-y-2 text-sm border-t border-amber-200 pt-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST</span>
              <span>{formatPrice(gstAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{formatPrice(shippingCharge)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg text-slate-900">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            GST and shipping are calculated automatically from category rules.
          </p>
          {quoteLoading && (
            <p className="text-xs text-amber-700 mt-1">Refreshing tax and shipping...</p>
          )}
          <div className="space-y-3 mt-6">
            <Button
              className="w-full bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg transform hover:scale-105 transition-all duration-200 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePlaceOrder}
              disabled={loading || onlineLoading || step !== 2}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Placing order...
                </span>
              ) : (
                "Place Order (COD)"
              )}
            </Button>
            <Button
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-lg transform hover:scale-105 transition-all duration-200 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePayOnline}
              disabled={loading || onlineLoading || step !== 2}
            >
              {onlineLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Opening Razorpay...
                </span>
              ) : (
                "Pay Online (Razorpay)"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

const LabelText = ({ children }) => (
  <label className="block mb-1 text-xs font-medium text-slate-600">{children}</label>
);

const Field = ({ name, value, onChange, placeholder = "" }) => (
  <input
    name={name}
    value={value}
    placeholder={placeholder}
    onChange={(event) =>
      onChange((prev) => ({
        ...prev,
        [name]: event.target.value,
      }))
    }
    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
  />
);

export default Checkout;
