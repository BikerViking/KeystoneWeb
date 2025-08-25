import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

export function Credentials(){
  const ref = useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const ctx = gsap.context(()=>{
      const panes = gsap.utils.toArray<HTMLElement>('.pane')
      panes.forEach((pane, i)=>{
        gsap.fromTo(pane, {y:(i-1)*60, opacity:.6, rotateX:8, z:0}, {
          y:0, z: i===1? 120 : (i===0? 40 : 0), opacity:1,
          scrollTrigger: { trigger: '#credentials', start: 'top 75%', end: 'bottom top', scrub: true }
        })
      })
    }, ref)
    return ()=> ctx.revert()
  },[])
  return (
    <section id="credentials" ref={ref} className="min-h-[100svh] grid place-items-center px-4">
      <div className="stack3d grid gap-6 w-full max-w-4xl perspective-[1200px]">
        <div className="pane rounded-2xl border border-white/15 bg-white/5 h-[22vh] grid place-items-center text-4xl font-extrabold">NNA<br/>Certified</div>
        <div className="pane rounded-2xl border border-white/15 bg-white/5 h-[22vh] grid place-items-center text-4xl font-extrabold">Insured</div>
        <div className="pane rounded-2xl border border-white/15 bg-white/5 h-[22vh] grid place-items-center text-4xl font-extrabold">Background‑Checked</div>
      </div>
      <figure className="mt-8 opacity-90">
        <img src="/assets/nna_badge.png" alt="NNA Certified Notary Signing Agent badge" className="h-24 w-auto mx-auto"/>
        <figcaption className="text-center text-muted mt-2">NNA Notary Signing Agent — 2025</figcaption>
      </figure>
    </section>
  )
}
