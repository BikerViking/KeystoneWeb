import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context((self) => {
      const mm = gsap.matchMedia(self);
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "+=120%",
            scrub: true,
          },
        });
        tl.to(".layer--back", { yPercent: -20 }, 0);
        tl.to(".layer--mid", { yPercent: -12 }, 0);
        tl.to(".layer--front", { yPercent: -6 }, 0);
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <section
      id="hero"
      ref={ref}
      className="relative min-h-[100svh] grid place-items-center overflow-hidden"
    >
      <div className="absolute inset-0 -z-10">
        <div className="layer--back absolute inset-0 blur-2xl opacity-60 bg-[radial-gradient(60vw_60vh_at_20%_20%,#C0C0C0_35%,transparent),radial-gradient(60vw_60vh_at_80%_60%,#E5E4E2_30%,transparent)]" />
        <div className="layer--mid absolute inset-0 blur-xl opacity-40 bg-[radial-gradient(60vw_60vh_at_40%_80%,#E5E4E2_25%,transparent)] mix-blend-screen" />
        <div className="layer--front absolute inset-0 opacity-30" />
      </div>
      <div className="text-center px-4">
        <h1 className="text-[clamp(40px,8vw,120px)] leading-[0.9] font-extrabold tracking-tight">
          Mobile. Certified. Insured. Precise.
        </h1>
        <p className="text-muted mt-4 max-w-2xl mx-auto">
          On‑site notarization and loan signings—Hellertown, PA and surrounding
          areas. NNA Certified & insured.
        </p>
        <div className="mt-6 flex gap-3 justify-center flex-wrap">
          <a
            className="bg-silver text-black font-extrabold rounded-lg shadow-glass px-4 py-2"
            href="#contact"
          >
            Book a Signing
          </a>
          <a
            className="border border-white/15 rounded-lg px-4 py-2"
            href="tel:+12673099000"
          >
            Call (267) 309‑9000
          </a>
        </div>
      </div>
    </section>
  );
}
