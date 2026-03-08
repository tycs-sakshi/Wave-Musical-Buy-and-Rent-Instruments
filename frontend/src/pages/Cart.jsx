import React, { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getOrderQuote } from "@/api/orderApi";
import { removeFromCart, updateQuantity } from "@/redux/cartSlice";

const formatPrice = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const getCartItemKey = (item) =>
  item.type === "buy"
    ? `buy-${item.instrumentId}`
    : `rent-${item.instrumentId}-${item.startDate}-${item.endDate}`;

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

const Cart = () => {
  const items = useSelector((state) => state.cart.items);
  const currentUser = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

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

  if (!currentUser) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-center">
          <p className="text-slate-700 mb-3">Please login to access your cart.</p>
          <Button onClick={() => navigate("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  const fallbackSubtotal = items.reduce((sum, item) => {
    if (item.type === "buy") return sum + Number(item.price || 0) * Number(item.quantity || 0);
    if (item.type === "rent") return sum + Number(item.totalRent || 0);
    return sum;
  }, 0);

  const subtotal = quote?.subtotal ?? fallbackSubtotal;
  const gstAmount = quote?.gstAmount ?? 0;
  const shippingCharge = quote?.shippingCharge ?? 0;
  const total = quote?.total ?? subtotal;

  const increaseQuantity = (index, item) => {
    dispatch(
      updateQuantity({
        index,
        quantity: Number(item.quantity || 0) + 1,
      })
    );
  };

  const decreaseQuantity = (index, item) => {
    const nextQuantity = Number(item.quantity || 0) - 1;
    if (nextQuantity <= 0) {
      dispatch(removeFromCart(index));
      return;
    }

    dispatch(
      updateQuantity({
        index,
        quantity: nextQuantity,
      })
    );
  };

  return (
    <div className="pt-24 min-h-screen bg-amber-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-display font-bold text-slate-900 mb-8">Your Cart</h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-amber-200 p-8 text-center">
            <p className="text-slate-600">Your cart is empty.</p>
            <Button className="mt-4" onClick={() => navigate("/products")}>
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              {items.map((item, index) => {
                const pricing = quoteItemMap.get(getCartItemKey(item));
                const displaySubtotal =
                  pricing?.subtotal ??
                  (item.type === "buy"
                    ? Number(item.price || 0) * Number(item.quantity || 0)
                    : Number(item.totalRent || 0));
                const displayGstAmount = pricing?.gstAmount ?? 0;
                const displayLineTotal = pricing?.lineTotal ?? displaySubtotal;

                return (
                  <div
                    key={`${item.instrumentId}-${index}`}
                    className="flex gap-4 bg-white rounded-xl border border-amber-200 p-4"
                  >
                    <img
                      src={item.image || "/placeholder.png"}
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded-lg bg-amber-50"
                    />
                    <div className="flex-1">
                      <h2 className="font-medium text-slate-900">{item.name}</h2>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.type === "buy" ? "Buy Item" : "Rent Item"}
                      </p>

                      {item.type === "buy" ? (
                        <div className="mt-3 flex items-center gap-3">
                          <span className="text-slate-700">{formatPrice(item.price)}</span>
                          <div className="inline-flex items-center gap-4 rounded-full border-2 border-amber-400 px-2 py-1">
                            <button
                              type="button"
                              className="text-slate-800 hover:text-rose-600"
                              onClick={() => decreaseQuantity(index, item)}
                              aria-label={
                                Number(item.quantity) <= 1 ? "Remove item" : "Decrease quantity"
                              }
                            >
                              {Number(item.quantity) <= 1 ? (
                                <Trash2 className="h-4 w-4" />
                              ) : (
                                <Minus className="h-4 w-4" />
                              )}
                            </button>
                            <span className="min-w-4 text-center text-sm font-semibold text-slate-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              className="text-slate-800 hover:text-emerald-700"
                              onClick={() => increaseQuantity(index, item)}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600 mt-3">
                          <p>
                            {item.startDate} to {item.endDate} ({item.days} day(s))
                          </p>
                          <p>
                            Rent: {formatPrice(item.rentPricePerDay)}/day | Deposit:{" "}
                            {formatPrice(item.deposit)}
                          </p>
                        </div>
                      )}

                      <div className="mt-2 text-xs text-slate-600 space-y-1">
                        <p>Taxable Amount: {formatPrice(displaySubtotal)}</p>
                        <p>
                          GST ({Number(pricing?.gstRate || 0).toFixed(2)}%):{" "}
                          {formatPrice(displayGstAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <span className="font-semibold text-slate-900">
                        {formatPrice(displayLineTotal)}
                      </span>
                      {item.type !== "buy" && (
                        <Button
                          className="bg-rose-600 text-white hover:bg-rose-700"
                          onClick={() => dispatch(removeFromCart(index))}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-xl border border-amber-200 p-5 h-fit">
              <h2 className="font-display font-semibold text-slate-900 mb-4">
                Order Summary
              </h2>
              <div className="space-y-2 text-sm text-slate-700">
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
                <div className="border-t border-amber-200 pt-2 flex justify-between font-semibold text-slate-900">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                GST is automatically calculated from product category and can vary
                per item.
              </p>
              {quoteLoading && (
                <p className="mt-2 text-xs text-amber-700">Refreshing tax and shipping...</p>
              )}
              <Button
                className="w-full mt-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg"
                onClick={() => navigate("/checkout")}
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
