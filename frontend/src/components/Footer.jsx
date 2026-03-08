import React from "react";
import { Link } from "react-router-dom";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-slate-950 text-amber-100 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <Link to="/" className="text-2xl font-display font-bold text-amber-300">
            Waves Musical
          </Link>
          <p className="mt-3 text-sm text-amber-100/80">
            Buy and rent musical instruments with trusted quality, transparent
            pricing, and responsive support.
          </p>
        </div>

        <div>
          <h3 className="font-display font-semibold text-amber-300 mb-3">
            Store
          </h3>
          <ul className="space-y-2 text-sm text-amber-100/80">
            <li>
              <Link to="/products" className="hover:text-amber-200">
                Instruments
              </Link>
            </li>
            <li>
              <Link to="/deals" className="hover:text-amber-200">
                Deals
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-amber-200">
                Cart
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-display font-semibold text-amber-300 mb-3">
            Contact
          </h3>
          <ul className="space-y-2 text-sm text-amber-100/80">
            <li>Email: contact@wavesmusical.com</li>
            <li>Phone: +91 22 2533 4455</li>
            <li>Thane West, Maharashtra</li>
          </ul>
        </div>

        <div>
          <h3 className="font-display font-semibold text-amber-300 mb-3">
            Custom Requests
          </h3>
          <p className="text-sm text-amber-100/80 mb-3">
            Reach us directly for bulk orders, studio setups, and special imports.
          </p>
          <div className="flex gap-3">
            <a
              href="https://wa.me/919999999999?text=Hi%20Waves%20Musical%2C%20I%20need%20a%20custom%20instrument%20request."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700"
            >
              <FaWhatsapp />
              WhatsApp
            </a>
            <a
              href="https://www.instagram.com/wavesmusical/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-fuchsia-600 text-white px-3 py-2 rounded-md hover:bg-fuchsia-700"
            >
              <FaInstagram />
              Instagram
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 pt-6 border-t border-amber-700/40 text-xs text-amber-100/70">
        © {new Date().getFullYear()} Waves Musical. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
