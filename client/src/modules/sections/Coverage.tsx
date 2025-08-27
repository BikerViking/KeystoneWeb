import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

export function Coverage(){
  const lineRef = useRef<SVGPathElement>(null)
  useEffect(()=>{
    const ctx = gsap.context(() => {
      if (!lineRef.current) return
      const mm = gsap.matchMedia()
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const length = lineRef.current?.getTotalLength() || 800
        gsap.set(lineRef.current, { strokeDasharray: length, strokeDashoffset: length })
        gsap.to(lineRef.current, {
          strokeDashoffset: 0,
          scrollTrigger: { trigger: '#coverage', start: 'top 70%', end: 'bottom top', scrub: true }
        })
      })
    })
    return () => ctx.revert()
  },[])
  return (
    <section id="coverage" className="min-h-[100svh] grid place-items-center px-4 text-center">
      <div className="max-w-3xl">
        <svg className="mx-auto opacity-80" viewBox="0 0 600 140" width="600" height="140" aria-hidden="true">
          <path ref={lineRef} d="M10,120 C120,30 240,110 330,50 420,10 520,110 590,30" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <p className="text-muted">Headquartered in <strong>Hellertown, Pennsylvania</strong>. Typical radius: Northampton, Lehigh, Bucks, and surrounding counties.</p>
        <div className="flex gap-8 justify-center mt-6 flex-wrap font-bold">
          <div>100% mobile</div>
          <div>7‑day availability</div>
          <div>5‑star service</div>
        </div>
      </div>
    </section>
  )
}
