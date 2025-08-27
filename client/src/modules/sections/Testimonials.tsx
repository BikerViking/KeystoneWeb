import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

const DATA: { quote: string; author: string }[] = [
  {
    quote:
      "On time, professional, and kind. Got our refinance done flawlessly.",
    author: "J. Ramirez",
  },
  {
    quote:
      "Showed up after hours at the hospital and handled everything smoothly.",
    author: "K. Patel",
  },
  {
    quote: "As a title office, we need perfection. They delivered.",
    author: "J. Li, Escrow Officer",
  },
  {
    quote: "Fast response, clear communication, zero errors.",
    author: "M. O’Connor",
  },
];

export function Testimonials() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [data, setData] = useState<{ quote: string; author: string }[]>(DATA);
  useEffect(() => {
    fetch("/api/cms/testimonials")
      .then((r) => r.json())
      .then((j) => setData(j.data || DATA));
  }, []);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    tlRef.current = gsap
      .timeline({
        repeat: -1,
        paused: paused,
        onRepeat: () => setI((prev) => (prev + 1) % Math.max(1, data.length)),
      })
      .to({}, { duration: 4 });
    return () => {
      tlRef.current?.kill();
    };
  }, [data]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    gsap.fromTo(
      el.querySelector(".card"),
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
    );
  }, [i]);

  useEffect(() => {
    if (tlRef.current) {
      if (paused) tlRef.current.pause();
      else tlRef.current.play();
    }
  }, [paused]);

  return (
    <section
      id="testimonials"
      className="min-h-[80svh] grid place-items-center px-4"
    >
      <div ref={wrapRef} className="w-full max-w-4xl">
        <div className="card rounded-2xl border border-white/10 bg-white/5 p-8 shadow-glass text-center relative">
          <button
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play testimonials" : "Pause testimonials"}
            className="absolute top-4 right-4 text-muted hover:text-fg"
          >
            {paused ? "▶" : "❚❚"}
          </button>
          <p className="text-2xl leading-snug max-w-3xl mx-auto">
            “{data[i]?.quote || "Loading…"}”
          </p>
          <p className="mt-4 text-muted">— {data[i]?.author || ""}</p>
          <div className="mt-6 flex gap-2 justify-center">
            {data.map((_, idx) => (
              <button
                key={idx}
                aria-label={"Go to slide " + (idx + 1)}
                onClick={() => {
                  setI(idx);
                  setPaused(true);
                }}
                className={`w-2.5 h-2.5 rounded-full ${i === idx ? "bg-platinum" : "bg-white/20"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
