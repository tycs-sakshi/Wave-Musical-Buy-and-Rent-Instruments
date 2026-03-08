import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "./ui/button";
import axiosClient from "@/api/axiosClient";
import { logout } from "@/redux/userSlice";

const Navbar = () => {
  const currentUser = useSelector((state) => state.user.user);
  const cartCount = useSelector((state) => state.cart.items.length);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const logoutHandle = async () => {
    try {
      await axiosClient.post("/user/logout");
      dispatch(logout());
      localStorage.removeItem("accessToken");
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Logout failed");
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    navigate(`/products?search=${encodeURIComponent(term)}`);
  };

  return (
    <header className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-900 fixed w-full z-20 border-b border-amber-600/40 shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center py-4 px-4 gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="font-display font-bold text-2xl text-amber-300 hover:text-amber-200 transition-colors"
          >
            Waves Musical
          </Link>
        </div>

        <nav className="flex gap-4 items-center">
          <ul className="hidden lg:flex gap-6 items-center text-sm font-semibold text-amber-100">
            <li>
              <Link to="/" className="hover:text-amber-300 transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link to="/products" className="hover:text-amber-300 transition-colors">
                Products
              </Link>
            </li>
            <li>
              <Link to="/deals" className="hover:text-amber-300 transition-colors">
                Deals
              </Link>
            </li>
            {currentUser?.role === "admin" && (
              <li>
                <Link to="/admin" className="hover:text-amber-300 transition-colors">
                  Admin
                </Link>
              </li>
            )}
            {currentUser && (
              <li>
                <Link
                  to="/profile?tab=wishlist"
                  className="hover:text-amber-300 transition-colors"
                >
                  Wishlist
                </Link>
              </li>
            )}
            {currentUser && (
              <li>
                <Link to="/profile" className="hover:text-amber-300 transition-colors">
                  {currentUser.firstName}
                </Link>
              </li>
            )}
          </ul>

          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center bg-white/10 rounded-full px-3 py-1.5 border border-white/10"
          >
            <input
              type="text"
              placeholder="Search instruments"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="bg-transparent text-amber-100 placeholder:text-amber-200/60 text-sm focus:outline-none w-40"
            />
            <Button
              type="submit"
              className="bg-amber-400 text-slate-900 text-xs px-3 py-1 hover:bg-amber-300 rounded-full font-semibold ml-2"
            >
              Search
            </Button>
          </form>

          <Link to="/cart" className="relative group">
            <ShoppingCart className="w-6 h-6 text-amber-300 group-hover:text-amber-200 transition-colors" />
            <span className="bg-amber-400 text-slate-900 rounded-full absolute text-xs font-bold -top-2 -right-2 px-2 py-0.5">
              {cartCount}
            </span>
          </Link>

          <Link to="/profile?tab=wishlist" className="group">
            <Heart className="w-6 h-6 text-amber-300 group-hover:text-amber-200 transition-colors" />
          </Link>

          {currentUser ? (
            <Button
              onClick={logoutHandle}
              className="bg-amber-400 text-slate-900 hover:bg-amber-300 font-semibold rounded-full"
            >
              Logout
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/login")}
              className="bg-amber-400 text-slate-900 hover:bg-amber-300 font-semibold rounded-full"
            >
              Login
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
