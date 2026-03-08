import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMyBuyOrders, getMyRentOrders, returnRentOrder } from "@/api/orderApi";
import { uploadImageToCloudinary } from "@/utils/cloudinary";
import axiosClient from "@/api/axiosClient";
import { addToCart } from "@/redux/cartSlice";
import { setUser } from "@/redux/userSlice";
import { getWishlist, removeFromWishlistApi } from "@/api/wishlistApi";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const toLabel = (value) => {
  if (!value) return "Unknown";
  if (value === "arrived") return "Delivered";
  const normalized = String(value).replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const normalizeBuyStatus = (status) => {
  if (status === "pending") return "placed";
  if (status === "paid") return "processing";
  if (status === "completed") return "arrived";
  return status;
};

const summarizeBuyOrderItems = (items = []) => {
  const names = items
    .map((item) => item?.name || item?.instrument?.name)
    .filter(Boolean);
  if (names.length === 0) return "Instrument details unavailable";
  if (names.length === 1) return names[0];
  return `${names[0]} + ${names.length - 1} more`;
};

const summarizeRentOrderItem = (order) =>
  order?.instrument?.name || order?.instrumentId?.name || "Instrument rental";

const getStatusBadgeClass = (status) => {
  const normalized = normalizeBuyStatus(status);
  if (normalized === "placed") return "bg-blue-100 text-blue-800 border-blue-200";
  if (normalized === "processing")
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (normalized === "shipped")
    return "bg-violet-100 text-violet-800 border-violet-200";
  if (
    normalized === "arrived" ||
    normalized === "completed" ||
    normalized === "returned"
  ) {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (normalized === "approved" || normalized === "active") {
    return "bg-sky-100 text-sky-800 border-sky-200";
  }
  if (normalized === "rejected" || normalized === "cancelled") {
    return "bg-rose-100 text-rose-800 border-rose-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const getPaymentBadgeClass = (status) => {
  if (status === "paid") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "failed") return "bg-rose-100 text-rose-800 border-rose-200";
  if (status === "refunded")
    return "bg-violet-100 text-violet-800 border-violet-200";
  return "bg-orange-100 text-orange-800 border-orange-200";
};

const buildRentCartPayload = (item, draft) => {
  const startDate = String(draft?.startDate || "");
  const endDate = String(draft?.endDate || "");

  if (!startDate || !endDate) {
    throw new Error("Select rental start and end date");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error("End date must be after start date");
  }

  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const rentPricePerDay = Number(item?.rentPricePerDay || 0);
  const deposit = Number(item?.rentDeposit || 0);
  const totalRent = days * rentPricePerDay + deposit;

  return {
    type: "rent",
    instrumentId: String(item?._id || ""),
    name: item?.name || "Instrument rental",
    image: item?.images?.[0] || "/placeholder.png",
    rentPricePerDay,
    startDate,
    endDate,
    days,
    deposit,
    totalRent,
  };
};

const Profile = () => {
  const currentUser = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [buyOrders, setBuyOrders] = useState([]);
  const [rentOrders, setRentOrders] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [wishlistMovingKey, setWishlistMovingKey] = useState("");
  const [returningRentOrderId, setReturningRentOrderId] = useState("");
  const [wishlistRentDraftById, setWishlistRentDraftById] = useState({});
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    zipCode: "",
    phoneNo: "",
  });

  const tabQueryValue = searchParams.get("tab");
  const tabFromQuery =
    tabQueryValue === "orders" || tabQueryValue === "wishlist"
      ? tabQueryValue
      : "profile";
  const [activeTab, setActiveTab] = useState(tabFromQuery);
  const [orderTypeTab, setOrderTypeTab] = useState("buy");

  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    setActiveTab(tabFromQuery);
  }, [tabFromQuery]);

  useEffect(() => {
    if (!currentUser) return;
    setProfileForm({
      firstName: currentUser.firstName || "",
      lastName: currentUser.lastName || "",
      address: currentUser.address || "",
      city: currentUser.city || "",
      zipCode: currentUser.zipCode || "",
      phoneNo: currentUser.phoneNo || "",
    });
  }, [currentUser]);

  const fetchOrders = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoadingOrders(true);
      const [buyRes, rentRes] = await Promise.all([getMyBuyOrders(), getMyRentOrders()]);
      setBuyOrders(buyRes.data.data || []);
      setRentOrders(rentRes.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load your orders");
    } finally {
      setLoadingOrders(false);
    }
  }, [currentUser]);

  const fetchWishlist = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoadingWishlist(true);
      const res = await getWishlist();
      setWishlistItems(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to load wishlist");
    } finally {
      setLoadingWishlist(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchOrders();
    const poll = setInterval(fetchOrders, 15000);
    return () => clearInterval(poll);
  }, [fetchOrders]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleProfilePicChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPic(true);
      const imageUrl = await uploadImageToCloudinary(file, "waves-musical/profile");
      const res = await axiosClient.put("/user/profile", { profilePic: imageUrl });
      dispatch(setUser(res.data.user));
      toast.success("Profile picture updated");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to upload profile picture");
    } finally {
      setUploadingPic(false);
    }
  };

  const handleProfileFieldChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSave = async () => {
    try {
      setSavingProfile(true);
      const payload = {
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        address: profileForm.address.trim(),
        city: profileForm.city.trim(),
        zipCode: profileForm.zipCode.trim(),
        phoneNo: profileForm.phoneNo.trim(),
      };
      const res = await axiosClient.put("/user/profile", payload);
      dispatch(setUser(res.data.user));
      toast.success("Profile updated");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams);
    if (nextTab === "orders" || nextTab === "wishlist") {
      params.set("tab", nextTab);
    } else {
      params.delete("tab");
    }
    setSearchParams(params, { replace: true });
  };

  const navigateToOrder = (orderId, type) => {
    navigate(`/order/${orderId}?type=${type}`);
  };

  const getWishlistItemId = (item) => String(item?._id || "");

  const removeWishlistLocally = (instrumentId) => {
    setWishlistItems((prev) =>
      prev.filter((item) => String(item?._id || "") !== String(instrumentId))
    );
  };

  const handleRemoveFromWishlist = async (instrumentId) => {
    if (!instrumentId) return;
    try {
      setWishlistMovingKey(`remove:${instrumentId}`);
      await removeFromWishlistApi(instrumentId);
      removeWishlistLocally(instrumentId);
      toast.success("Removed from wishlist");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to remove from wishlist");
    } finally {
      setWishlistMovingKey("");
    }
  };

  const handleMoveWishlistToBuyCart = async (item) => {
    const instrumentId = getWishlistItemId(item);
    if (!instrumentId) return;
    if (!item?.isAvailableForBuy) {
      toast.error("This instrument is not available for buy");
      return;
    }

    try {
      setWishlistMovingKey(`buy:${instrumentId}`);
      dispatch(
        addToCart({
          type: "buy",
          instrumentId,
          name: item?.name || "Instrument",
          price: Number(item?.price || 0),
          quantity: 1,
          image: item?.images?.[0] || "/placeholder.png",
        })
      );

      await removeFromWishlistApi(instrumentId);
      removeWishlistLocally(instrumentId);
      toast.success("Moved to cart");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to move item to cart");
    } finally {
      setWishlistMovingKey("");
    }
  };

  const handleWishlistRentDraftChange = (instrumentId, field, value) => {
    setWishlistRentDraftById((prev) => ({
      ...prev,
      [instrumentId]: {
        ...(prev[instrumentId] || {}),
        [field]: value,
      },
    }));
  };

  const handleMoveWishlistToRentCart = async (item) => {
    const instrumentId = getWishlistItemId(item);
    if (!instrumentId) return;
    if (!item?.isAvailableForRent) {
      toast.error("This instrument is not available for rent");
      return;
    }

    try {
      setWishlistMovingKey(`rent:${instrumentId}`);
      const draft = wishlistRentDraftById[instrumentId] || {};
      const payload = buildRentCartPayload(item, draft);
      dispatch(addToCart(payload));

      await removeFromWishlistApi(instrumentId);
      removeWishlistLocally(instrumentId);
      toast.success("Rental item moved to cart");
    } catch (error) {
      console.error(error);
      toast.error(error.message || error.response?.data?.message || "Failed to move rental");
    } finally {
      setWishlistMovingKey("");
    }
  };

  const handleReturnRentInstrument = async (orderId) => {
    if (!orderId) return;
    try {
      setReturningRentOrderId(orderId);
      const res = await returnRentOrder(orderId);
      toast.success(res.data?.message || "Rental returned");
      await fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to return rental");
    } finally {
      setReturningRentOrderId("");
    }
  };

  const canReturnRentOrder = (order) => {
    if (!order?._id) return false;
    if (order?.rentalReturn?.status === "returned") return false;
    if (["rejected", "cancelled"].includes(order?.status)) return false;

    const now = new Date();
    const endDate = new Date(order?.endDate);
    if (Number.isNaN(endDate.getTime())) return false;
    return now >= endDate;
  };

  if (!currentUser) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1f3a]">
        <div className="text-center">
          <p className="mb-3 text-amber-100">Please login to view your profile.</p>
          <Button
            onClick={() => navigate("/login")}
            className="bg-amber-400 text-slate-900 hover:bg-amber-300"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1f3a]">
      <div className="max-w-6xl mx-auto px-4 pb-10 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-amber-200">My Account</h1>
          <p className="text-sm text-amber-100/80 mt-1">
            Manage profile, orders, and wishlist from one place.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-slate-900/80 border border-amber-400/70 shadow-lg">
            <TabsTrigger
              value="profile"
              className="text-amber-100 data-[state=active]:bg-amber-400 data-[state=active]:text-slate-950"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="text-amber-100 data-[state=active]:bg-amber-400 data-[state=active]:text-slate-950"
            >
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="wishlist"
              className="text-amber-100 data-[state=active]:bg-amber-400 data-[state=active]:text-slate-950"
            >
              Wishlist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="border border-amber-300/70 bg-slate-900/80 text-amber-50 shadow-xl shadow-black/40">
              <CardHeader className="border-b border-amber-400/40 bg-gradient-to-r from-slate-900 to-slate-800/80">
                <CardTitle className="text-lg text-amber-200">Your Profile</CardTitle>
              </CardHeader>
              <CardContent className="pt-8">
                <input
                  id="profile-pic-input"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicChange}
                  disabled={uploadingPic}
                  className="hidden"
                />

                <div className="mx-auto flex max-w-xl flex-col items-center text-center">
                  <img
                    src={currentUser.profilePic || "/placeholder.png"}
                    alt={`${currentUser.firstName} profile`}
                    className="h-28 w-28 rounded-full object-cover border-4 border-amber-400 bg-slate-800 shadow-lg shadow-amber-500/20"
                  />
                  <Button
                    asChild
                    disabled={uploadingPic}
                    className="mt-4 rounded-full bg-amber-400 px-5 text-slate-900 hover:bg-amber-300"
                  >
                    <label htmlFor="profile-pic-input" className="cursor-pointer">
                      {uploadingPic ? "Uploading..." : "Change Picture"}
                    </label>
                  </Button>

                  <h2 className="mt-4 text-xl font-display font-semibold text-amber-100">
                    {`${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() ||
                      "User"}
                  </h2>
                  <p className="text-sm text-amber-100/80">{currentUser.email}</p>
                  <span className="mt-2 rounded-full border border-amber-400/70 bg-amber-300/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200">
                    Role: {currentUser.role}
                  </span>
                  <p className="mt-3 text-xs text-amber-100/70">JPG and PNG files supported.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-amber-300/70 bg-slate-900/80 text-amber-50 shadow-xl shadow-black/40">
              <CardHeader className="border-b border-amber-400/40 bg-gradient-to-r from-slate-900 to-slate-800/80">
                <CardTitle className="text-lg text-amber-200">Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-amber-100">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={profileForm.firstName}
                      onChange={handleProfileFieldChange}
                      className="h-11 border-amber-400/80 bg-slate-950/50 text-amber-50 placeholder:text-amber-100/40 focus-visible:border-amber-300 focus-visible:ring-amber-300/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-amber-100">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={profileForm.lastName}
                      onChange={handleProfileFieldChange}
                      className="h-11 border-amber-400/80 bg-slate-950/50 text-amber-50 placeholder:text-amber-100/40 focus-visible:border-amber-300 focus-visible:ring-amber-300/30"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address" className="text-amber-100">
                      Address
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      value={profileForm.address}
                      onChange={handleProfileFieldChange}
                      className="h-11 border-amber-400/80 bg-slate-950/50 text-amber-50 placeholder:text-amber-100/40 focus-visible:border-amber-300 focus-visible:ring-amber-300/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-amber-100">
                      City
                    </Label>
                    <Input
                      id="city"
                      name="city"
                      value={profileForm.city}
                      onChange={handleProfileFieldChange}
                      className="h-11 border-amber-400/80 bg-slate-950/50 text-amber-50 placeholder:text-amber-100/40 focus-visible:border-amber-300 focus-visible:ring-amber-300/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-amber-100">
                      Postal Code
                    </Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      value={profileForm.zipCode}
                      onChange={handleProfileFieldChange}
                      className="h-11 border-amber-400/80 bg-slate-950/50 text-amber-50 placeholder:text-amber-100/40 focus-visible:border-amber-300 focus-visible:ring-amber-300/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNo" className="text-amber-100">
                      Phone Number
                    </Label>
                    <Input
                      id="phoneNo"
                      name="phoneNo"
                      value={profileForm.phoneNo}
                      onChange={handleProfileFieldChange}
                      className="h-11 border-amber-400/80 bg-slate-950/50 text-amber-50 placeholder:text-amber-100/40 focus-visible:border-amber-300 focus-visible:ring-amber-300/30"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleProfileSave}
                  disabled={savingProfile}
                  className="h-12 w-full rounded-xl bg-amber-400 text-base font-bold text-slate-950 shadow-lg shadow-amber-500/30 hover:bg-amber-300"
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card className="bg-white border border-amber-200">
              <CardHeader className="border-b border-amber-200 bg-gradient-to-r from-amber-50 to-white">
                <CardTitle className="text-lg">Order History</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <Tabs value={orderTypeTab} onValueChange={setOrderTypeTab}>
                  <TabsList className="bg-amber-50 border border-amber-300">
                    <TabsTrigger
                      value="buy"
                      className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                    >
                      Buy Orders ({buyOrders.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="rent"
                      className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                    >
                      Rent Orders ({rentOrders.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="buy" className="mt-4 space-y-3">
                    {loadingOrders ? (
                      <p className="text-sm text-slate-500">Loading buy orders...</p>
                    ) : buyOrders.length === 0 ? (
                      <p className="text-sm text-slate-500">No buy orders found.</p>
                    ) : (
                      buyOrders.map((order) => {
                        const returnStatus = order?.returnRequest?.status || "none";
                        return (
                          <div
                            key={order._id}
                            role="button"
                            tabIndex={0}
                            onClick={() => navigateToOrder(order._id, "buy")}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                navigateToOrder(order._id, "buy");
                              }
                            }}
                            className="rounded-xl border border-amber-200 bg-amber-50 p-4 cursor-pointer hover:border-amber-300 hover:shadow-sm transition"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="font-semibold text-slate-900">
                                  {summarizeBuyOrderItems(order.items || [])}
                                </p>
                                <p className="text-xs text-slate-600">
                                  Order #{order._id.slice(-6).toUpperCase()}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(order.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-slate-900">
                                  {formatCurrency(order.totalAmount)}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Tap to view details</p>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <span
                                className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getStatusBadgeClass(
                                  order.status
                                )}`}
                              >
                                {toLabel(order.status)}
                              </span>
                              <span
                                className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getPaymentBadgeClass(
                                  order.paymentStatus
                                )}`}
                              >
                                {toLabel(order.paymentStatus)}
                              </span>
                              {returnStatus !== "none" && (
                                <span className="text-xs px-2.5 py-1 rounded-full border font-semibold bg-violet-100 text-violet-800 border-violet-200">
                                  Return {toLabel(returnStatus)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </TabsContent>

                  <TabsContent value="rent" className="mt-4 space-y-3">
                    {loadingOrders ? (
                      <p className="text-sm text-slate-500">Loading rent orders...</p>
                    ) : rentOrders.length === 0 ? (
                      <p className="text-sm text-slate-500">No rent orders found.</p>
                    ) : (
                      rentOrders.map((order) => {
                        const canReturn = canReturnRentOrder(order);
                        const returnStatus = order?.rentalReturn?.status || "not_requested";
                        const showReturnBadge =
                          returnStatus && returnStatus !== "not_requested";
                        return (
                          <div
                            key={order._id}
                            role="button"
                            tabIndex={0}
                            onClick={() => navigateToOrder(order._id, "rent")}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                navigateToOrder(order._id, "rent");
                              }
                            }}
                            className="rounded-xl border border-amber-200 bg-amber-50 p-4 cursor-pointer hover:border-amber-300 hover:shadow-sm transition"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="font-semibold text-slate-900">
                                  {summarizeRentOrderItem(order)}
                                </p>
                                <p className="text-xs text-slate-600">
                                  Order #{order._id.slice(-6).toUpperCase()}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(order.startDate).toLocaleDateString()} to{" "}
                                  {new Date(order.endDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-slate-900">
                                  {formatCurrency(order.totalRent)}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Tap to view details</p>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span
                                className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getStatusBadgeClass(
                                  order.status
                                )}`}
                              >
                                {toLabel(order.status)}
                              </span>
                              <span
                                className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getPaymentBadgeClass(
                                  order.paymentStatus
                                )}`}
                              >
                                {toLabel(order.paymentStatus)}
                              </span>
                              {showReturnBadge && (
                                <span className="text-xs px-2.5 py-1 rounded-full border font-semibold bg-violet-100 text-violet-800 border-violet-200">
                                  Return {toLabel(returnStatus)}
                                </span>
                              )}
                            </div>

                            {canReturn && (
                              <div className="mt-3">
                                <Button
                                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                                  disabled={returningRentOrderId === order._id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleReturnRentInstrument(order._id);
                                  }}
                                >
                                  {returningRentOrderId === order._id
                                    ? "Returning..."
                                    : "Return Rental Instrument"}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wishlist">
            <Card className="bg-white border border-amber-200">
              <CardHeader className="border-b border-amber-200 bg-gradient-to-r from-amber-50 to-white">
                <CardTitle className="text-lg">My Wishlist</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {loadingWishlist ? (
                  <p className="text-sm text-slate-500">Loading wishlist...</p>
                ) : wishlistItems.length === 0 ? (
                  <p className="text-sm text-slate-500">Your wishlist is empty.</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {wishlistItems.map((item) => {
                      const instrumentId = getWishlistItemId(item);
                      const movingBuy = wishlistMovingKey === `buy:${instrumentId}`;
                      const movingRent = wishlistMovingKey === `rent:${instrumentId}`;
                      const removing = wishlistMovingKey === `remove:${instrumentId}`;
                      const rentDraft = wishlistRentDraftById[instrumentId] || {};

                      return (
                        <div
                          key={instrumentId}
                          className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-3"
                        >
                          <div className="flex gap-3">
                            <img
                              src={item.images?.[0] || "/placeholder.png"}
                              alt={item.name}
                              className="h-20 w-20 rounded-md object-cover bg-white border border-amber-200"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                              <p className="text-xs text-slate-500">
                                {item.category?.name || "Instrument"}
                              </p>
                              <p className="text-xs text-slate-700 mt-1">
                                Buy: {formatCurrency(item.price)}
                              </p>
                              <p className="text-xs text-slate-700">
                                Rent/day: {formatCurrency(item.rentPricePerDay)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              className="bg-slate-900 text-white hover:bg-slate-800"
                              onClick={() => navigate(`/products/${item.slug || item._id}`)}
                            >
                              View Instrument
                            </Button>
                            <Button
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                              disabled={!item.isAvailableForBuy || movingBuy}
                              onClick={() => handleMoveWishlistToBuyCart(item)}
                            >
                              {movingBuy ? "Moving..." : "Move to Buy Cart"}
                            </Button>
                            <Button
                              variant="outline"
                              className="border-rose-300 text-rose-700 hover:bg-rose-50"
                              disabled={removing}
                              onClick={() => handleRemoveFromWishlist(instrumentId)}
                            >
                              {removing ? "Removing..." : "Remove"}
                            </Button>
                          </div>

                          <div className="rounded-md border border-amber-300 bg-white p-3 space-y-2">
                            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                              Rent and move to cart
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="date"
                                min={todayIso}
                                value={rentDraft.startDate || ""}
                                onChange={(event) =>
                                  handleWishlistRentDraftChange(
                                    instrumentId,
                                    "startDate",
                                    event.target.value
                                  )
                                }
                              />
                              <Input
                                type="date"
                                min={rentDraft.startDate || todayIso}
                                value={rentDraft.endDate || ""}
                                onChange={(event) =>
                                  handleWishlistRentDraftChange(
                                    instrumentId,
                                    "endDate",
                                    event.target.value
                                  )
                                }
                              />
                            </div>
                            <Button
                              className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
                              disabled={!item.isAvailableForRent || movingRent}
                              onClick={() => handleMoveWishlistToRentCart(item)}
                            >
                              {movingRent ? "Moving..." : "Move to Rent Cart"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
