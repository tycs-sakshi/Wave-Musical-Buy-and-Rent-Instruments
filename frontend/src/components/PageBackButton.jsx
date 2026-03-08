import React from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const NAVLESS_PREFIXES = ["/login", "/signup", "/verify"];

const PageBackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === "/") return null;

  const hasNavbar = !NAVLESS_PREFIXES.some(
    (prefix) =>
      location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)
  );

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`group fixed left-4 z-30 ${
        hasNavbar ? "top-24" : "top-5"
      } inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-900 px-4 py-2 text-sm font-semibold text-amber-100 shadow-lg shadow-slate-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-200 hover:text-white hover:shadow-xl`}
      aria-label="Go back to previous page"
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
      Back
    </button>
  );
};

export default PageBackButton;
