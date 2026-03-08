import React from "react";

const Verify = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-amber-200 w-full max-w-md text-center">
        <h2 className="text-2xl font-display font-semibold text-slate-900 mb-3">
          Check Your Email
        </h2>
        <p className="text-sm text-slate-600">
          We sent a verification link to your email address. Please open it to
          activate your account.
        </p>
      </div>
    </div>
  );
};

export default Verify;
