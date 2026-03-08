import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_15%_10%,#fbbf24_0%,transparent_28%),radial-gradient(circle_at_85%_85%,#0f172a_0%,transparent_35%),linear-gradient(120deg,#111827,#1f2937_45%,#451a03_100%)] text-white py-24">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-amber-300 uppercase tracking-[0.22em] text-xs mb-4">
              Buy and Rent Instruments
            </p>
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight">
              Build Your Sound
            </h1>
            <p className="mt-5 text-base md:text-lg text-amber-100/90 max-w-xl">
              Explore premium guitars, keyboards, percussion, and studio gear.
              Purchase what you need today or rent flexibly for your next project.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Button
                className="bg-amber-400 text-slate-900 hover:bg-amber-300 font-semibold px-6"
                onClick={() => navigate("/products")}
              >
                Explore Products
              </Button>
              <Button
                className="bg-transparent border border-amber-300 text-amber-200 hover:bg-amber-300 hover:text-slate-900 px-6"
                onClick={() => navigate("/deals")}
              >
                View Deals
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-amber-300/15 blur-3xl rounded-3xl" />
            <img
              src="/hero1.png"
              alt="Waves Musical instruments"
              className="relative z-10 rounded-3xl shadow-2xl border border-amber-200/30"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
