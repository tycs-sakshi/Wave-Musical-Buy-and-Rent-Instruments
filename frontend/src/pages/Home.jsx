import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Features from "@/components/Features";
import Hero from "@/components/Hero";
import { getTrendingInstruments } from "@/api/instrumentApi";

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-5">
    <h2 className="text-3xl font-display font-bold text-slate-900">{title}</h2>
    <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
  </div>
);

const InstrumentGrid = ({ title, subtitle, items = [], onOpen }) => (
  <section className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
    <SectionHeader title={title} subtitle={subtitle} />
    {items.length === 0 ? (
      <p className="text-sm text-slate-500">No activity data available yet.</p>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <button
            key={item._id}
            type="button"
            onClick={() => onOpen(item)}
            className="text-left rounded-xl border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-3 hover:shadow-md transition-shadow"
          >
            <img
              src={item.images?.[0] || "/placeholder.png"}
              alt={item.name}
              className="h-40 w-full rounded-lg object-cover bg-amber-100"
            />
            <p className="font-semibold text-slate-900 mt-3 line-clamp-2">{item.name}</p>
            <p className="text-xs text-slate-500">
              {item.category?.name || "Instrument"} | {item.brandId?.name || item.brand || "-"}
            </p>
            <p className="text-xs text-slate-600 mt-2">
              Purchased: {item.purchaseCount || 0} | Rented: {item.rentCount || 0}
            </p>
            <p className="text-sm font-semibold text-slate-900 mt-1">Rs {item.price}</p>
          </button>
        ))}
      </div>
    )}
  </section>
);

const Home = () => {
  const navigate = useNavigate();
  const [trendingData, setTrendingData] = useState({
    trending: [],
    mostPurchased: [],
    mostRented: [],
  });
  const [loadingTrending, setLoadingTrending] = useState(false);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoadingTrending(true);
        const res = await getTrendingInstruments({ limit: 6 });
        setTrendingData(res.data.data || {});
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingTrending(false);
      }
    };

    fetchTrending();
  }, []);

  const openInstrument = (item) => {
    navigate(`/products/${item.slug || item._id}`);
  };

  return (
    <div>
      <Hero />
      <Features />

      <section className="bg-amber-50 py-14">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          <div className="flex items-center justify-between">
            <SectionHeader
              title="Popular and Trending Instruments"
              subtitle="Live activity from purchases and rentals on Waves Musical"
            />
            <Button
              className="bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => navigate("/products")}
            >
              Explore All
            </Button>
          </div>

          {loadingTrending ? (
            <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center text-slate-500">
              Loading trending instruments...
            </div>
          ) : (
            <div className="space-y-5">
              <InstrumentGrid
                title="Trending Instruments"
                subtitle="Most active based on combined buys and rentals"
                items={trendingData.trending || []}
                onOpen={openInstrument}
              />
              <InstrumentGrid
                title="Most Rented Instruments"
                subtitle="Top instruments with highest rental activity"
                items={trendingData.mostRented || []}
                onOpen={openInstrument}
              />
              <InstrumentGrid
                title="Most Purchased Instruments"
                subtitle="Top instruments with highest purchase activity"
                items={trendingData.mostPurchased || []}
                onOpen={openInstrument}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;

