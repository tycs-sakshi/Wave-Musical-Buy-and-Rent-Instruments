import React from "react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";

const WHATSAPP_LINK =
  "https://wa.me/919999999999?text=Hi%20Waves%20Musical%2C%20I%20need%20a%20custom%20instrument%20request.";
const INSTAGRAM_LINK = "https://www.instagram.com/wavesmusical/";

const SocialContactButtons = () => {
  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col gap-3">
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noreferrer"
        aria-label="Contact on WhatsApp"
        className="h-12 w-12 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition-colors grid place-items-center"
      >
        <FaWhatsapp className="h-6 w-6" />
      </a>
      <a
        href={INSTAGRAM_LINK}
        target="_blank"
        rel="noreferrer"
        aria-label="Contact on Instagram"
        className="h-12 w-12 rounded-full bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-500 text-white shadow-lg hover:opacity-90 transition-opacity grid place-items-center"
      >
        <FaInstagram className="h-6 w-6" />
      </a>
    </div>
  );
};

export default SocialContactButtons;
