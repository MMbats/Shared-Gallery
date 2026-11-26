"use client";

import { useEffect, useState } from "react";

const slides = Array.from(
  { length: 19 },
  (_, index) => `/backgrounds/photo${index + 1}.jpg`
);

export default function WeddingSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrent((previous) => (previous + 1) % slides.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative isolate flex min-h-[680px] items-center overflow-hidden bg-[#203629] sm:min-h-[760px]">
      <div className="absolute inset-0">
        <img
          key={slides[current]}
          src={slides[current]}
          alt=""
          aria-hidden="true"
          className="hero-image slide-fade"
        />
      </div>

      <div className="hero-overlay" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-28 md:px-12">
        <div className="max-w-3xl fade-up">
          <p className="eyebrow mb-7 text-[#ead6ac]">
            A Love Story, A Family Affair
          </p>

          <h1 className="font-display text-6xl font-medium leading-[0.98] tracking-tight text-white sm:text-7xl md:text-8xl">
            Charles
            <br />
            <span className="italic text-[#e8d3a9]">&</span> Wanjiku
          </h1>

          <p className="mt-8 max-w-xl text-base leading-8 text-white/85 md:text-lg">
            Every photograph holds a beautiful memory.
            Share your moments and relive this special day together.
          </p>

          <div className="mt-8 flex items-center gap-4 text-sm font-medium tracking-wide text-white/90">
            <span className="text-[#e8d3a9]">✦</span>
            <span>Ruracio Ceremony</span>
            <span className="text-[#e8d3a9]">✦</span>
          </div>

          <a
            href="#upload"
            className="mt-10 inline-flex min-h-12 items-center justify-center rounded-full border border-[#e8d3a9] bg-[#e8d3a9] px-8 py-3 text-sm font-semibold text-[#26382c] transition hover:-translate-y-1 hover:bg-white"
          >
            Share your photographs <span className="ml-3">↗</span>
          </a>
        </div>
      </div>


    </section>
  );
}
