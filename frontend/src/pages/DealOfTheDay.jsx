import React, { useEffect, useState } from "react";
import dealApi from "@/api/dealApi";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "@/redux/cartSlice";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const DealOfTheDay = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.user.user);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const res = await dealApi.getDeals();
      setDeals(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load deals");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (deal) => {
    if (!currentUser) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }

    if (deal.dealType === "buy") {
      dispatch(
        addToCart({
          type: "buy",
          instrumentId: deal.instrumentId._id,
          name: deal.instrumentId.name,
          price: deal.dealPrice,
          quantity: 1,
          dealId: deal._id,
          image: deal.image || deal.instrumentId.images?.[0] || "/placeholder.png",
        })
      );
      toast.success("Added to cart");
      return;
    }

    const targetId = deal.instrumentId?.slug || deal.instrumentId?._id;
    if (targetId) {
      toast.info("Select rent dates on the product detail page.");
      navigate(`/products/${targetId}?dealId=${deal._id}`);
      return;
    }

    toast.error("This rent deal is not available right now.");
  };

  const calculateTimeLeft = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end - now;

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}d ${hours}h left`;
    }
    return `${hours}h left`;
  };

  return (
    <div className="pt-24 min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-bold font-display mb-3 text-slate-900">
            Deal of the Day
          </h1>
          <p className="text-lg text-slate-600 font-semibold">
            Discover incredible discounts on premium musical instruments
          </p>
          <div className="mt-4 h-1 w-20 bg-gradient-to-r from-amber-500 to-orange-500 mx-auto rounded-full"></div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-slate-600 text-lg">Loading amazing deals...</p>
          </div>
        ) : deals.length === 0 ? (
          <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow border border-amber-200">
            <p className="text-slate-600 text-lg">No deals available at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deals.map((deal) => (
              <div
                key={deal._id}
                className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-amber-200"
              >
                {/* Image Section */}
                <div className="relative overflow-hidden bg-amber-50 h-48">
                  <img
                    src={deal.image || deal.instrumentId?.images?.[0] || "/placeholder.png"}
                    alt={deal.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3 bg-rose-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg">
                    {deal.discount}% OFF
                  </div>
                  <div className="absolute bottom-3 left-3 bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    {calculateTimeLeft(deal.endDate)}
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">
                    {deal.title}
                  </h3>
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                    {deal.description}
                  </p>

                  {/* Instrument Details */}
                  <div className="mb-3 pb-3 border-b border-amber-200">
                    <p className="text-sm font-semibold text-slate-900 mb-1">
                      {deal.instrumentId?.brand || "Instrument"}
                    </p>
                    <p className="text-xs text-amber-700 font-semibold">
                      {deal.dealType === "buy" ? "Purchase Deal" : "Rental Deal"}
                    </p>
                  </div>

                  {/* Price Section */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-3xl font-bold text-slate-900">
                        ₹{deal.dealPrice}
                      </span>
                      <span className="text-sm text-slate-400 line-through">
                        ₹{deal.originalPrice}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-700 font-semibold">
                        Save ₹{deal.originalPrice - deal.dealPrice}
                      </span>
                    </div>
                  </div>

                  {/* Button */}
                  <Button
                    className="w-full bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg font-semibold py-2 rounded-lg transition transform hover:scale-105"
                    onClick={() => handleAddToCart(deal)}
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealOfTheDay;
