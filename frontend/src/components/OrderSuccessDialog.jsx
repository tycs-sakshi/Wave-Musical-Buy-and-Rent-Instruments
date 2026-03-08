import React, { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const OrderSuccessDialog = ({ isOpen, orderType = "buy", onClose }) => {
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    onClose();
    navigate("/profile?tab=orders");
  }, [navigate, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      handleClose();
    }, 2200);
    return () => clearTimeout(timer);
  }, [handleClose, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-500">
        {/* Animated Gradient Header */}
        <div className="relative h-32 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-900 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl animate-bounce">✓</div>
          </div>
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">
            🎉 Thank You!
          </h2>

          <p className="text-xl text-amber-600 font-semibold mb-4">
            Your Order Has Been Placed Successfully
          </p>

          <div className="bg-gradient-to-r from-amber-50 to-pink-50 border border-pink-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-slate-700 leading-relaxed">
              Thank you for ordering from{" "}
              <span className="font-bold text-pink-600">Waves Musical</span> ❤️
            </p>
            <p className="text-xs text-slate-600 mt-2">
              We're excited to prepare your
              {orderType === "buy" ? " purchase" : " rental"} for you. You'll
              receive a confirmation email shortly with all the details.
            </p>
          </div>

          {/* Order Details Preview */}
          <div className="space-y-2 mb-6 text-left bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Order Type
            </p>
            <p className="text-sm font-medium text-slate-900 capitalize">
              {orderType === "buy" ? "Purchase" : "Rental"}
            </p>
          </div>

          {/* Divider */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent mb-6"></div>

          {/* Loading Animation */}
          <div className="flex justify-center gap-1 mb-6">
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>

          <p className="text-xs text-slate-500 mb-6">Redirecting to your orders...</p>

          {/* CTA Button */}
          <button
            onClick={handleClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-900  text-white font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            View My Orders
          </button>

          {/* Footer Message */}
          <p className="text-xs text-slate-500 mt-4">
            ✨ Explore our collection of premium instruments ✨
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessDialog;
