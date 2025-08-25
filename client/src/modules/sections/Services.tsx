import React, { useEffect, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

export function Services(){
  const [items, setItems] = useState<{title:string, body:string}[]>([])
  useEffect(()=>{ fetch('/api/cms/services').then(r=>r.json()).then(j=> setItems(j.data || [])) },[])
  useEffect(()=>{
    const cards = gsap.utils.toArray<HTMLElement>('#services .card')
    cards.forEach((el, i)=>{
      gsap.fromTo(el, {y:30, opacity:0, clipPath:'inset(0 0 100% 0 round 16px)'}, {
        y:0, opacity:1, clipPath:'inset(0 0 0% 0 round 16px)',
        duration:0.9, ease:'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
      })
    })
  },[])
  const items = items.length ? items : [
    {title:'Loan Signings', body:'Purchase, refinance, HELOC, reverse—error‑free, lender‑friendly packages.'},
    {title:'General Notary Work', body:'POAs, affidavits, deeds, titles, I‑9s, and more—mobile to you.'},
    {title:'After‑Hours & Rush', body:'Evenings/weekends on request with punctual arrival windows.'},
    {title:'Business On‑Site', body:'Title, escrow, law offices, hospitals, senior communities—white‑glove service.'}
  ]
  return (
    <section id="services" className="min-h-[100svh] grid place-items-center px-4">
      <div className="max-w-6xl w-full grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((it, idx)=>(
          <article key={idx} className="card rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-bold mb-2">{it.title}</h2>
            <p className="text-muted">{it.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
