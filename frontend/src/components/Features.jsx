import React from "react";
import { Headphones, Shield, Truck } from "lucide-react";

const cards = [
  {
    title: "Fast Delivery",
    description: "Quick dispatch across major cities with reliable tracking.",
    icon: Truck,
    style: "from-sky-500 to-cyan-500",
  },
  {
    title: "Secure Checkout",
    description: "Cash on delivery and Razorpay online payments with verification.",
    icon: Shield,
    style: "from-emerald-500 to-green-500",
  },
  {
    title: "Human Support",
    description: "Get help on WhatsApp and Instagram for custom requests.",
    icon: Headphones,
    style: "from-amber-500 to-orange-500",
  },
];

const Features = () => {
  return (
    <section className="py-16 bg-amber-50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-4xl font-display font-bold text-slate-900 text-center mb-12">
          Why Waves Musical
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((item) => (
            <div
              key={item.title}
              className={`bg-gradient-to-br ${item.style} rounded-2xl p-8 shadow-lg text-white`}
            >
              <div className="h-14 w-14 rounded-full bg-white/20 grid place-items-center mb-4">
                {React.createElement(item.icon, { className: "h-7 w-7" })}
              </div>
              <h3 className="font-display font-semibold text-2xl mb-2">{item.title}</h3>
              <p className="text-sm text-white/90">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
