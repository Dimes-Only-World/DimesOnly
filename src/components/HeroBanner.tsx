import React from "react";
import { motion } from "framer-motion";
import { normalizeRefParam } from "@/lib/utils";
import heroVector from "@/assets/one.png";
import placeholderLady from "@/assets/weo.png"; // replace locally with your own image

const HeroBanner: React.FC = () => {
  const phoneSrc =
    "https://dimesonlyworld.s3.us-east-2.amazonaws.com/9-16+1080+HOME+BANNER.webm";
  const desktopSrc =
    "https://dimesonlyworld.s3.us-east-2.amazonaws.com/16-9+1080+cinema+HOME+banner.webm";

  const handleClick = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = normalizeRefParam(urlParams.get("ref")) || "company";
    window.location.href = `/register?ref=${encodeURIComponent(ref)}`;
  };

  return (
    <div className="w-full">
      {/* === Video Background Section === */}
      <section
        className="relative w-full h-[100svh] overflow-hidden bg-black"
        style={{ height: "calc(var(--vh, 1vh) * 100)" }}
      >
        <style>
          {`
            @media only screen and (min-width: 744px) and (max-width: 1366px) {
              .hero-desktop-vid { display: block !important; }
              .hero-phone-vid { display: none !important; }
            }
            @media screen and (orientation: landscape) and (max-height: 480px) {
              .hero-phone-vid { object-fit: contain !important; background: #000 !important; }
            }
            @media screen and (max-width: 743px) and (orientation: landscape) {
              .hero-desktop-vid { display: block !important; }
              .hero-phone-vid { display: none !important; }
            }
          `}
        </style>

        {/* Desktop Video */}
        <video
          className="hidden lg:block hero-desktop-vid absolute inset-0 w-full h-full object-cover object-center"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src={desktopSrc} type="video/webm" />
        </video>

        {/* Phone Video */}
        <video
          className="block lg:hidden hero-phone-vid absolute inset-0 w-full h-full object-cover object-center"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src={phoneSrc} type="video/webm" />
        </video>
      </section>

      {/* === Separate Hero Section (between videos) === */}
      <section className="relative flex items-center justify-center py-20 px-6 sm:px-10 bg-black">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row items-center justify-between rounded-[2rem] p-10 md:p-14 lg:p-16 max-w-6xl w-full border border-gray-700 shadow-2xl"
        >
          {/* Left Section */}
          <div className="text-center md:text-left space-y-6 md:w-1/2">
            {/* Logo + Vector (after text) */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex items-center justify-center md:justify-start gap-4"
            >
              <h1 className="text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-700 text-transparent bg-clip-text drop-shadow-lg">
                DIMES
              </h1>
              <img
                src={heroVector}
                alt="Vector"
                className="w-10 sm:w-12 md:w-14"
              />
            </motion.div>

            {/* Texts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white">
                ONLY WORLD
              </h2>
              <p className="text-gray-300 text-lg sm:text-xl md:text-2xl mt-3 leading-relaxed">
                Welcome to the{" "}
                <span className="text-indigo-400 font-semibold">Ultimate</span>{" "}
                Experience
              </p>
            </motion.div>

            {/* Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              onClick={handleClick}
              className="mt-8 px-10 py-4 bg-indigo-600 text-white font-semibold text-lg rounded-full hover:bg-indigo-500 hover:scale-105 transition duration-300 shadow-md"
            >
              Get Started
            </motion.button>
          </div>

          {/* Right Section (Lady Image Placeholder) */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative mt-12 md:mt-0 md:w-1/2 flex justify-center"
          >
            <img
              src={placeholderLady}
              alt="Hero figure"
              className="w-[280px] sm:w-[340px] md:w-[420px] lg:w-[460px] object-contain rounded-[1.5rem] transition-transform duration-500 hover:scale-105"
              loading="lazy"
            />
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
};

export default HeroBanner;
