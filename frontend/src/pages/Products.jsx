import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/redux/cartSlice";
import { getCategories, getInstruments } from "@/api/instrumentApi";
import { addToWishlistApi, getWishlist, removeFromWishlistApi } from "@/api/wishlistApi";

const defaultFilters = {
  category: "",
  minPrice: "",
  maxPrice: "",
  search: "",
  availability: "",
};

const RatingStars = ({ avgRating = 0, reviewCount = 0 }) => {
  const rating = Math.max(0, Math.min(5, Number(avgRating) || 0));

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((index) => {
          const fillPercent = Math.min(Math.max(rating - index, 0), 1) * 100;
          return (
            <span key={index} className="relative inline-flex h-4 w-4">
              <Star className="h-4 w-4 text-slate-300" />
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fillPercent}%` }}
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              </span>
            </span>
          );
        })}
      </div>
      {reviewCount > 0 ? (
        <p className="text-xs text-slate-600">
          {rating.toFixed(1)} ({reviewCount})
        </p>
      ) : (
        <p className="text-xs text-slate-500">No reviews yet</p>
      )}
    </div>
  );
};

const Products = () => {
  const [categories, setCategories] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [priceError, setPriceError] = useState("");
  const [showRentModal, setShowRentModal] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [wishlistActionKey, setWishlistActionKey] = useState("");
  const [rentDates, setRentDates] = useState({
    startDate: "",
    endDate: "",
  });

  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.user.user);
  const navigate = useNavigate();
  const location = useLocation();
  const requestCounterRef = useRef(0);

  const syncWishlistIds = useCallback((wishlist = []) => {
    setWishlistIds(new Set((wishlist || []).map((item) => String(item._id))));
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const catRes = await getCategories();
      setCategories(catRes.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load categories");
    }
  }, []);

  const fetchInstruments = useCallback(async (activeFilters) => {
    const requestId = requestCounterRef.current + 1;
    requestCounterRef.current = requestId;

    try {
      setLoading(true);
      const query = {
        category: activeFilters.category || undefined,
        minPrice: activeFilters.minPrice || undefined,
        maxPrice: activeFilters.maxPrice || undefined,
        search: activeFilters.search.trim() || undefined,
      };

      if (activeFilters.availability === "buy") {
        query.availableForBuy = "true";
      } else if (activeFilters.availability === "rent") {
        query.availableForRent = "true";
      } else if (activeFilters.availability === "both") {
        query.availableForBuy = "true";
        query.availableForRent = "true";
      }

      const instrumentRes = await getInstruments(query);
      if (requestId !== requestCounterRef.current) return;
      setInstruments(instrumentRes.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load instruments");
    } finally {
      if (requestId === requestCounterRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!currentUser) {
        setWishlistIds(new Set());
        return;
      }
      try {
        const res = await getWishlist();
        syncWishlistIds(res.data.data || []);
      } catch (error) {
        console.error(error);
      }
    };

    fetchWishlist();
  }, [currentUser, syncWishlistIds]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get("search") || "";
    setFilters((prev) => ({ ...prev, search }));
  }, [location.search]);

  useEffect(() => {
    const min = Number(filters.minPrice || 0);
    const max = Number(filters.maxPrice || 0);
    if (filters.minPrice && filters.maxPrice && min > max) {
      setPriceError("Min price cannot be greater than max price");
      setInstruments([]);
      return;
    }

    setPriceError("");
    const timer = setTimeout(() => {
      fetchInstruments(filters);
    }, 200);

    return () => clearTimeout(timer);
  }, [filters, fetchInstruments]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    if (location.search) {
      navigate("/products", { replace: true });
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    navigate(
      filters.search.trim()
        ? `/products?search=${encodeURIComponent(filters.search.trim())}`
        : "/products"
    );
  };

  const handleAddToCart = (instrument) => {
    if (instrument.stock === 0) {
      toast.error("This item is out of stock");
      return;
    }
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
  };

  const openRentModal = (instrument) => {
    setSelectedInstrument(instrument);
    setRentDates({ startDate: "", endDate: "" });
    setShowRentModal(true);
  };

  const closeRentModal = () => {
    setShowRentModal(false);
    setSelectedInstrument(null);
  };

  const calculateRentDays = () => {
    if (!rentDates.startDate || !rentDates.endDate) return 0;
    const start = new Date(rentDates.startDate);
    const end = new Date(rentDates.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const handleRentSubmit = () => {
    if (!selectedInstrument) return;
    const days = calculateRentDays();
    if (days <= 0) {
      toast.error("Please select valid rent dates");
      return;
    }

    const totalRent =
      days * selectedInstrument.rentPricePerDay +
      (selectedInstrument.rentDeposit || 0);

    dispatch(
      addToCart({
        type: "rent",
        instrumentId: selectedInstrument._id,
        name: selectedInstrument.name,
        rentPricePerDay: selectedInstrument.rentPricePerDay,
        startDate: rentDates.startDate,
        endDate: rentDates.endDate,
        days,
        totalRent,
        deposit: selectedInstrument.rentDeposit || 0,
        image: selectedInstrument.images?.[0] || "/placeholder.png",
      })
    );
    toast.success("Rent item added to cart");
    closeRentModal();
  };

  const handleToggleWishlist = async (instrumentId) => {
    if (!currentUser) {
      toast.error("Please login to use wishlist");
      navigate("/login");
      return;
    }

    try {
      const isWishlisted = wishlistIds.has(String(instrumentId));
      setWishlistActionKey(`${isWishlisted ? "remove" : "add"}:${instrumentId}`);
      const res = isWishlisted
        ? await removeFromWishlistApi(instrumentId)
        : await addToWishlistApi(instrumentId);
      syncWishlistIds(res.data.data || []);
      toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update wishlist");
    } finally {
      setWishlistActionKey("");
    }
  };

  return (
    <div className="pt-24 min-h-screen bg-amber-50">
      <div className="max-w-7xl mx-auto px-4 pb-10">
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <aside className="w-full md:w-1/4">
            <div className="bg-white rounded-xl border border-amber-200 p-5 sticky top-24 shadow-sm">
              <h2 className="font-display font-semibold text-slate-900 mb-4">Filters</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <label className="block mb-1 text-slate-700">Category</label>
                  <select
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    className="w-full border border-amber-300 rounded px-3 py-2"
                  >
                    <option value="">All</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">Availability</label>
                  <select
                    name="availability"
                    value={filters.availability}
                    onChange={handleFilterChange}
                    className="w-full border border-amber-300 rounded px-3 py-2"
                  >
                    <option value="">All</option>
                    <option value="buy">Buy Available</option>
                    <option value="rent">Rent Available</option>
                    <option value="both">Buy + Rent</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block mb-1 text-slate-700">Min</label>
                    <input
                      type="number"
                      name="minPrice"
                      value={filters.minPrice}
                      onChange={handleFilterChange}
                      className="w-full border border-amber-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-700">Max</label>
                    <input
                      type="number"
                      name="maxPrice"
                      value={filters.maxPrice}
                      onChange={handleFilterChange}
                      className="w-full border border-amber-300 rounded px-3 py-2"
                    />
                  </div>
                </div>
                {priceError && (
                  <p className="text-xs text-rose-600 font-medium">{priceError}</p>
                )}
                <Button
                  className="w-full bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200"
                  onClick={handleResetFilters}
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </aside>

          <main className="flex-1">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h1 className="text-4xl font-display font-bold text-slate-900">
                Instruments
              </h1>
              <form className="w-full md:w-80 flex gap-2" onSubmit={handleSearchSubmit}>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search instruments..."
                  className="w-full border border-amber-300 rounded px-4 py-2"
                />
                <Button
                  type="submit"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                >
                  Search
                </Button>
              </form>
            </div>

            {loading ? (
              <p className="text-slate-500">Loading...</p>
            ) : instruments.length === 0 ? (
              <div className="bg-white rounded-xl border border-amber-200 p-8 text-center">
                <p className="text-slate-600">No instruments found for these filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {instruments.map((instrument) => (
                  <div
                    key={instrument._id}
                    className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() =>
                        navigate(`/products/${instrument.slug || instrument._id}`)
                      }
                    >
                      <img
                        src={instrument.images?.[0] || "/placeholder.png"}
                        alt={instrument.name}
                        className="w-full h-48 object-cover rounded-lg bg-amber-50"
                        loading="lazy"
                      />
                      <h3 className="font-semibold text-slate-900 mt-3 line-clamp-2">
                        {instrument.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {instrument.brandId?.name || instrument.brand}
                      </p>

                      <RatingStars
                        avgRating={instrument.avgRating}
                        reviewCount={instrument.reviewCount}
                      />
                    </button>

                    <div className="mt-3 text-sm">
                      <p className="font-semibold text-slate-900">Rs {instrument.price}</p>
                      <p className="text-amber-700">
                        Rent: Rs {instrument.rentPricePerDay} / day
                      </p>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        className={`flex-1 ${
                          instrument.stock === 0
                            ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        }`}
                        onClick={() => handleAddToCart(instrument)}
                        disabled={instrument.stock === 0}
                      >
                        {instrument.stock === 0 ? "Out of Stock" : "Buy"}
                      </Button>
                      <Button
                        className={`flex-1 ${
                          instrument.rentStock === 0
                            ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                            : "bg-amber-500 text-white hover:bg-amber-600"
                        }`}
                        onClick={() => openRentModal(instrument)}
                        disabled={instrument.rentStock === 0}
                      >
                        {instrument.rentStock === 0 ? "Unavailable" : "Rent"}
                      </Button>
                    </div>
                    <Button
                      className={`w-full mt-2 border ${
                        wishlistIds.has(String(instrument._id))
                          ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                      onClick={() => handleToggleWishlist(instrument._id)}
                      disabled={
                        wishlistActionKey === `add:${instrument._id}` ||
                        wishlistActionKey === `remove:${instrument._id}`
                      }
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      {wishlistActionKey === `add:${instrument._id}` ||
                      wishlistActionKey === `remove:${instrument._id}`
                        ? "Updating..."
                        : wishlistIds.has(String(instrument._id))
                          ? "Remove from Wishlist"
                          : "Add to Wishlist"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {showRentModal && selectedInstrument && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full border border-amber-200 shadow-xl">
            <h2 className="text-xl font-display font-semibold text-slate-900 mb-4">
              Rent {selectedInstrument.name}
            </h2>

            <div className="grid gap-3">
              <div>
                <label className="block mb-1 text-sm text-slate-700">Start Date</label>
                <input
                  type="date"
                  value={rentDates.startDate}
                  onChange={(event) =>
                    setRentDates((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                  className="w-full border border-amber-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm text-slate-700">End Date</label>
                <input
                  type="date"
                  value={rentDates.endDate}
                  onChange={(event) =>
                    setRentDates((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                  className="w-full border border-amber-300 rounded px-3 py-2"
                />
              </div>
            </div>

            {calculateRentDays() > 0 && (
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-slate-700 space-y-1">
                <p>Duration: {calculateRentDays()} day(s)</p>
                <p>
                  Rent: Rs {calculateRentDays() * selectedInstrument.rentPricePerDay}
                </p>
                <p>Deposit: Rs {selectedInstrument.rentDeposit || 0}</p>
                <p className="font-semibold">
                  Total: Rs{" "}
                  {calculateRentDays() * selectedInstrument.rentPricePerDay +
                    (selectedInstrument.rentDeposit || 0)}
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <Button
                className="flex-1 bg-slate-200 text-slate-800 hover:bg-slate-300"
                onClick={closeRentModal}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
                onClick={handleRentSubmit}
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
