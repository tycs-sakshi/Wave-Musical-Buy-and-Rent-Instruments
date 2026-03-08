import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Verify from "./pages/Verify";
import VerifyEmail from "./pages/VerifyEmail";
import Footer from "./components/Footer";
import Profile from "./pages/Profile";
import OrderDetails from "./pages/OrderDetails";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import InstrumentDetail from "./pages/InstrumentDetail";
import AdminDashboard from "./pages/AdminDashboard";
import AdminOrders from "./pages/AdminOrders";
import AdminInstruments from "./pages/AdminInstruments";
import AdminCategories from "./pages/AdminCategories";
import DealOfTheDay from "./pages/DealOfTheDay";
import AdminDeals from "./pages/AdminDeals";
import AdminUsers from "./pages/AdminUsers";
import AdminBrands from "./pages/AdminBrands";
import SocialContactButtons from "./components/SocialContactButtons";
import PageBackButton from "./components/PageBackButton";

const withLayout = (Component, options = { showFooter: true }) => (
  <>
    <Navbar />
    <PageBackButton />
    <Component />
    {options.showFooter && <Footer />}
    <SocialContactButtons />
  </>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: withLayout(Home),
  },
  {
    path: "/signup",
    element: (
      <>
        <PageBackButton />
        <Signup />
      </>
    ),
  },
  {
    path: "/login",
    element: (
      <>
        <PageBackButton />
        <Login />
      </>
    ),
  },
  {
    path: "/verify",
    element: (
      <>
        <PageBackButton />
        <Verify />
      </>
    ),
  },
  {
    path: "/verify/:token",
    element: (
      <>
        <PageBackButton />
        <VerifyEmail />
      </>
    ),
  },
  {
    path: "/profile",
    element: withLayout(Profile),
  },
  {
    path: "/order/:orderId",
    element: withLayout(OrderDetails),
  },
  {
    path: "/products",
    element: withLayout(Products),
  },
  {
    path: "/products/:idOrSlug",
    element: withLayout(InstrumentDetail),
  },
  {
    path: "/cart",
    element: withLayout(Cart),
  },
  {
    path: "/checkout",
    element: withLayout(Checkout),
  },
  {
    path: "/admin",
    element: withLayout(AdminDashboard),
  },
  {
    path: "/admin/orders",
    element: withLayout(AdminOrders),
  },
  {
    path: "/admin/instruments",
    element: withLayout(AdminInstruments),
  },
  {
    path: "/admin/categories",
    element: withLayout(AdminCategories),
  },
  {
    path: "/admin/brands",
    element: withLayout(AdminBrands),
  },
  {
    path: "/deals",
    element: withLayout(DealOfTheDay),
  },
  {
    path: "/admin/deals",
    element: withLayout(AdminDeals),
  },
  {
    path: "/admin/users",
    element: withLayout(AdminUsers),
  },
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
