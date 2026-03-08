import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  CircleDollarSign,
  Heart,
  RefreshCw,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import dealApi from "@/api/dealApi";
import { addToCart } from "@/redux/cartSlice";
import { getInstrumentByIdOrSlug, getInstruments } from "@/api/instrumentApi";
import { addReview, getReviews } from "@/api/reviewApi";
import { addToWishlistApi, getWishlist, removeFromWishlistApi } from "@/api/wishlistApi";

const formatPrice = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const ProductTrustPills = () => {
  const items = [
    {
      icon: Truck,
      title: "Free Delivery",
      subtitle: "On eligible orders",
    },
    {
      icon: WalletCards,
      title: "Pay on Delivery",
      subtitle: "COD and online options",
    },
    {
      icon: RefreshCw,
      title: "10 Days Replacement",
      subtitle: "Easy replacement policy",
    },
    {
      icon: ShieldCheck,
      title: "6 Month Warranty",
      subtitle: "Manufacturer-backed",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-y border-amber-200 py-4">
      {items.map((item) => (
        <div key={item.title} className="flex flex-col items-center text-center gap-1">
          <item.icon className="h-6 w-6 text-amber-700" />
          <p className="text-sm font-semibold text-slate-800">{item.title}</p>
          <p className="text-[11px] text-slate-500">{item.subtitle}</p>
        </div>
      ))}
    </div>
  );
};

const InstrumentDetail = () => {
  const { idOrSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.user.user);

  const [instrument, setInstrument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeImage, setActiveImage] = useState("");
  const [brandRecommendations, setBrandRecommendations] = useState([]);
  const [loadingBrandRecommendations, setLoadingBrandRecommendations] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [rentDates, setRentDates] = useState({
    startDate: "",
    endDate: "",
  });
  const [activeRentDeal, setActiveRentDeal] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    const fetchInstrument = async () => {
      try {
        setLoading(true);
        const res = await getInstrumentByIdOrSlug(idOrSlug);
        const fetchedInstrument = res.data.data;
        setInstrument(fetchedInstrument);
        setActiveImage(fetchedInstrument.images?.[0] || "/placeholder.png");

        try {
          setLoadingReviews(true);
          const reviewRes = await getReviews(fetchedInstrument._id);
          setReviews(reviewRes.data.data || []);
        } catch (error) {
          console.error("Failed to load reviews:", error);
        } finally {
          setLoadingReviews(false);
        }

        if (fetchedInstrument.brandId?._id) {
          try {
            setLoadingBrandRecommendations(true);
            const brandRes = await getInstruments({
              brandId: fetchedInstrument.brandId._id,
              limit: 8,
            });
            const related = (brandRes.data.data || [])
              .filter((item) => item._id !== fetchedInstrument._id)
              .slice(0, 6);
            setBrandRecommendations(related);
          } catch (error) {
            console.error("Failed to load brand recommendations:", error);
          } finally {
            setLoadingBrandRecommendations(false);
          }
        } else {
          setBrandRecommendations([]);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load instrument");
      } finally {
        setLoading(false);
      }
    };

    fetchInstrument();
  }, [idOrSlug]);

  useEffect(() => {
    const resolveDeal = async () => {
      const dealId = searchParams.get("dealId");
      if (!dealId || !instrument?._id) {
        setActiveRentDeal(null);
        return;
      }

      try {
        const dealsRes = await dealApi.getDeals();
        const matchingDeal = (dealsRes.data.data || []).find(
          (deal) =>
            deal._id === dealId &&
            deal.dealType === "rent" &&
            String(deal.instrumentId?._id) === String(instrument._id)
        );
        setActiveRentDeal(matchingDeal || null);
      } catch (error) {
        console.error("Failed to resolve deal:", error);
        setActiveRentDeal(null);
      }
    };

    resolveDeal();
  }, [instrument?._id, searchParams]);

  useEffect(() => {
    const fetchWishlistState = async () => {
      if (!currentUser || !instrument?._id) {
        setIsWishlisted(false);
        return;
      }
      try {
        const res = await getWishlist();
        const ids = new Set((res.data.data || []).map((item) => String(item._id)));
        setIsWishlisted(ids.has(String(instrument._id)));
      } catch (error) {
        console.error(error);
      }
    };

    fetchWishlistState();
  }, [currentUser, instrument?._id]);

  const galleryImages = useMemo(() => {
    if (!instrument?.images || instrument.images.length === 0) {
      return ["/placeholder.png"];
    }
    return instrument.images;
  }, [instrument?.images]);

  const technicalDetails = useMemo(() => {
    if (!instrument) return [];

    const specsEntries = Object.entries(instrument.specs || {}).filter(
      ([key, value]) => key && value
    );

    if (specsEntries.length > 0) {
      return specsEntries;
    }

    return [
      ["Brand", instrument.brandId?.name || instrument.brand || "-"],
      ["Category", instrument.category?.name || "-"],
      ["Condition", instrument.condition || "-"],
      ["Buy Price", formatPrice(instrument.price)],
      ["Rent / Day", formatPrice(instrument.rentPricePerDay)],
      ["Rent Deposit", formatPrice(instrument.rentDeposit || 0)],
      ["Buy Stock", String(instrument.stock ?? "-")],
      ["Rent Stock", String(instrument.rentStock ?? "-")],
    ];
  }, [instrument]);

  const rentDays = useMemo(() => {
    if (!rentDates.startDate || !rentDates.endDate) return 0;
    const start = new Date(rentDates.startDate);
    const end = new Date(rentDates.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [rentDates]);

  const effectiveRentPricePerDay = activeRentDeal
    ? Number(activeRentDeal.dealPrice)
    : Number(instrument?.rentPricePerDay || 0);

  const estimatedRent = useMemo(() => {
    if (!instrument || rentDays <= 0) return 0;
    return (
      rentDays * effectiveRentPricePerDay + Number(instrument.rentDeposit || 0)
    );
  }, [effectiveRentPricePerDay, instrument, rentDays]);

  const handleBuy = () => {
    if (!instrument) return;
    dispatch(
      addToCart({
        type: "buy",
        instrumentId: instrument._id,
        name: instrument.name,
        price: instrument.price,
        quantity: 1,
        image: instrument.images?.[0] || "/placeholder.png",
      })
    );
    toast.success("Added to cart");
    navigate("/cart");
  };

  const handleRent = () => {
    if (!instrument) return;
    if (rentDays <= 0) {
      toast.error("Please select valid rent dates");
      return;
    }

    dispatch(
      addToCart({
        type: "rent",
        instrumentId: instrument._id,
        name: instrument.name,
        rentPricePerDay: effectiveRentPricePerDay,
        startDate: rentDates.startDate,
        endDate: rentDates.endDate,
        days: rentDays,
        totalRent: estimatedRent,
        deposit: instrument.rentDeposit || 0,
        image: instrument.images?.[0] || "/placeholder.png",
        ...(activeRentDeal ? { dealId: activeRentDeal._id } : {}),
      })
    );
    toast.success("Rent item added to cart");
    navigate("/cart");
  };

  const handleToggleWishlist = async () => {
    if (!instrument?._id) return;
    if (!currentUser) {
      toast.error("Please login to use wishlist");
      navigate("/login");
      return;
    }

    try {
      setWishlistLoading(true);
      const res = isWishlisted
        ? await removeFromWishlistApi(instrument._id)
        : await addToWishlistApi(instrument._id);
      const ids = new Set((res.data.data || []).map((item) => String(item._id)));
      setIsWishlisted(ids.has(String(instrument._id)));
      toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update wishlist");
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!currentUser) {
      toast.error("Please login to add a review");
      navigate("/login");
      return;
    }

    if (!reviewForm.comment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    try {
      setSubmittingReview(true);
      await addReview(instrument._id, {
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
      });
      toast.success("Review submitted successfully");
      setReviewForm({ rating: 5, comment: "" });
      const reviewRes = await getReviews(instrument._id);
      setReviews(reviewRes.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  if (!instrument) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-slate-600">Instrument not found.</p>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-amber-50">
      <div className="max-w-6xl mx-auto px-4 pb-10">
        <div className="grid lg:grid-cols-[520px,1fr] gap-8">
          <section className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm">
            <div className="grid grid-cols-[72px,1fr] gap-4">
              <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1">
                {galleryImages.map((imageUrl) => (
                  <button
                    key={imageUrl}
                    type="button"
                    className={`h-16 w-16 rounded-lg border overflow-hidden transition ${
                      activeImage === imageUrl
                        ? "border-pink-500 ring-2 ring-pink-200"
                        : "border-amber-200 hover:border-amber-400"
                    }`}
                    onClick={() => setActiveImage(imageUrl)}
                  >
                    <img
                      src={imageUrl}
                      alt={instrument.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
                <img
                  src={activeImage || "/placeholder.png"}
                  alt={instrument.name}
                  className="w-full h-[420px] object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                {instrument.category?.name || "Instrument"}
              </p>
              <h1 className="text-3xl font-display font-bold text-slate-900 mt-1">
                {instrument.name}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {instrument.brandId?.name || instrument.brand || "Unbranded"}
              </p>

              <div className="mt-5 space-y-1">
                <p className="text-3xl font-bold text-slate-900">
                  {formatPrice(instrument.price)}
                </p>
                <p className="text-amber-700 font-semibold">
                  Rent: {formatPrice(effectiveRentPricePerDay)} / day
                </p>
                {activeRentDeal && (
                  <p className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    <CircleDollarSign className="h-3.5 w-3.5" />
                    Deal Applied: {activeRentDeal.discount}% OFF
                  </p>
                )}
              </div>

              <p className="text-slate-700 mt-4 leading-relaxed">
                {instrument.description || "No description available."}
              </p>

              <ProductTrustPills />

              <div className="mt-5">
                <Button
                  className={`${
                    instrument.stock === 0
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                  onClick={handleBuy}
                  disabled={instrument.stock === 0}
                >
                  {instrument.stock === 0 ? "Out of Stock" : "Buy Now"}
                </Button>
                <Button
                  className={`ml-2 border ${
                    isWishlisted
                      ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  {wishlistLoading
                    ? "Updating..."
                    : isWishlisted
                      ? "Remove Wishlist"
                      : "Add Wishlist"}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <h2 className="font-display font-semibold text-slate-900 mb-3">
                Rent This Instrument
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={rentDates.startDate}
                    onChange={(event) =>
                      setRentDates((prev) => ({
                        ...prev,
                        startDate: event.target.value,
                      }))
                    }
                    className="w-full border border-amber-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={rentDates.endDate}
                    onChange={(event) =>
                      setRentDates((prev) => ({
                        ...prev,
                        endDate: event.target.value,
                      }))
                    }
                    className="w-full border border-amber-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {rentDays > 0 && (
                <p className="text-sm text-slate-700 mt-3">
                  Duration: {rentDays} day(s) | Estimated Total:{" "}
                  <span className="font-semibold">{formatPrice(estimatedRent)}</span>
                </p>
              )}

              <Button
                className={`w-full mt-4 ${
                  instrument.rentStock === 0
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-amber-500 text-white hover:bg-amber-600"
                }`}
                onClick={handleRent}
                disabled={instrument.rentStock === 0 || rentDays <= 0}
              >
                {instrument.rentStock === 0 ? "Rent Not Available" : "Add Rent to Cart"}
              </Button>
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-display font-bold text-slate-900 mb-6">
            Product Information
          </h2>
          <h3 className="text-xl font-display font-semibold text-slate-900 mb-4">
            Technical Details
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {technicalDetails.map(([label, value]) => (
                  <tr key={label} className="border-b border-slate-200">
                    <td className="py-2.5 pr-3 font-semibold text-slate-700 w-1/3">
                      {label}
                    </td>
                    <td className="py-2.5 text-slate-700">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-3xl font-display font-bold text-slate-900 mb-6">
            More From This Brand
          </h2>
          {loadingBrandRecommendations ? (
            <div className="bg-white rounded-xl border border-amber-200 p-8 text-center">
              <p className="text-slate-600">Loading brand recommendations...</p>
            </div>
          ) : brandRecommendations.length === 0 ? (
            <div className="bg-white rounded-xl border border-amber-200 p-8 text-center">
              <p className="text-slate-600">
                No additional products from this brand right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {brandRecommendations.map((product) => (
                <button
                  type="button"
                  key={product._id}
                  className="text-left bg-white rounded-xl border border-amber-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/products/${product.slug || product._id}`)}
                >
                  <img
                    src={product.images?.[0] || "/placeholder.png"}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg bg-amber-50"
                    loading="lazy"
                  />
                  <p className="font-semibold text-slate-900 mt-3 line-clamp-2">
                    {product.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {product.brandId?.name || product.brand || "-"}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-2">
                    {formatPrice(product.price)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 border-t border-amber-200 pt-10">
          <h2 className="text-3xl font-display font-bold text-slate-900 mb-8">
            Customer Reviews
          </h2>

          {currentUser && (
            <div className="mb-8 p-6 rounded-xl bg-white border border-amber-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Share Your Review
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rating
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm((prev) => ({ ...prev, rating: star }))}
                        className={`text-3xl transition-transform hover:scale-110 ${
                          star <= reviewForm.rating ? "text-yellow-400" : "text-slate-300"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Comment
                  </label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(event) =>
                      setReviewForm((prev) => ({ ...prev, comment: event.target.value }))
                    }
                    placeholder="Share your experience..."
                    className="w-full border border-amber-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    rows="4"
                  />
                </div>
                <Button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg font-semibold py-3"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {loadingReviews ? (
              <p className="text-center text-slate-600 py-8">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <p className="text-center text-slate-600 py-8">No reviews yet. Be the first!</p>
            ) : (
              reviews.map((review) => (
                <div key={review._id} className="p-4 rounded-lg border border-amber-200 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {review.user?.firstName} {review.user?.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex">
                      {[...Array(5)].map((_, index) => (
                        <span
                          key={index}
                          className={index < review.rating ? "text-yellow-400" : "text-slate-300"}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-700">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default InstrumentDetail;
