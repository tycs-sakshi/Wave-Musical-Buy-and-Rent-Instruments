import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosClient from "@/api/axiosClient";

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      try {
        await axiosClient.post(
          "/user/verify",
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!mounted) return;
        setStatus("success");
        setMessage("Email verified successfully! Redirecting to login...");

        setTimeout(() => {
          navigate("/login");
        }, 2500);
      } catch (error) {
        console.error(error);
        if (!mounted) return;
        setStatus("error");
        setMessage(
          error.response?.data?.message ||
          "Verification failed. Please request a new verification link."
        );
      }
    };

    verify();

    return () => {
      mounted = false;
    };
  }, [token, navigate]);

  return (
    <div className="pt-24 min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white px-4">
      <div
        className={`w-full max-w-md rounded-2xl border-2 p-8 text-center shadow-lg transition-all duration-500 ${
          status === "verifying"
            ? "border-amber-300 bg-white"
            : status === "success"
              ? "border-green-400 bg-white"
              : "border-red-400 bg-white"
        }`}
      >
        {/* Header Logo */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-widest font-display">
            WAVES MUSICAL
          </h1>
        </div>

        {/* Status Icon */}
        <div className="mb-6">
          {status === "verifying" && (
            <div className="flex justify-center">
              <div className="animate-spin text-4xl">⏳</div>
            </div>
          )}
          {status === "success" && (
            <div className="text-5xl animate-bounce text-emerald-600">✓</div>
          )}
          {status === "error" && (
            <div className="text-5xl text-rose-600">✗</div>
          )}
        </div>

        {/* Message */}
        <h2
          className={`text-xl font-semibold mb-3 ${
            status === "success"
              ? "text-green-600"
              : status === "error"
                ? "text-red-600"
                : "text-amber-700"
          }`}
        >
          {status === "verifying" && "Verifying Your Account"}
          {status === "success" && "Account Verified!"}
          {status === "error" && "Verification Failed"}
        </h2>

        <p className="text-slate-600 mb-6 text-sm leading-relaxed">
          {message}
        </p>

        {/* Decorative Line */}
        <div className="h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 mb-4"></div>

        {status === "error" && (
          <button
            onClick={() => navigate("/signup")}
            className="mt-6 w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 hover:shadow-lg text-white font-semibold rounded-lg transition-all"
          >
            Back to Signup
          </button>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
