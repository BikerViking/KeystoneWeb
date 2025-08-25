import React, { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

const DATA: {quote:string, author:string}[] = []
  {quote: 'On time, professional, and kind. Got our refinance done flawlessly.', author: 'J. Ramirez'},
  {quote: 'Showed up after hours at the hospital and handled everything smoothly.', author: 'K. Patel'},
  {quote: 'As a title office, we need perfection. They delivered.', author: 'J. Li, Escrow Officer'},
  {quote: 'Fast response, clear communication, zero errors.', author: 'M. O’Connor'},
]

export function Testimonials(){
  const [i, setI] = useState(0)
  const [data, setData] = useState<{quote:string, author:string}[]>([])
  useEffect(()=>{ fetch('/api/cms/testimonials').then(r=>r.json()).then(j=> setData(j.data || [])) },[])
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const el = wrapRef.current; if(!el) return
    const tl = gsap.timeline({ repeat: -1 })
    tl.to({}, { duration: 4 })
      .add(()=> setI(prev => (prev + 1) % Math.max(1, data.length)))
    return ()=> tl.kill()
  },[data])

  useEffect(()=>{
    const el = wrapRef.current; if(!el) return
    gsap.fromTo(el.querySelector('.card'), { y: 20, opacity: 0 }, { y:0, opacity:1, duration:.6, ease:'power3.out' })
  }, [i])

  return (
    <section id="testimonials" className="min-h-[80svh] grid place-items-center px-4">
      <div ref={wrapRef} className="w-full max-w-4xl">
        <div className="card rounded-2xl border border-white/10 bg-white/5 p-8 shadow-glass text-center">
          <p className="text-2xl leading-snug max-w-3xl mx-auto">“{(data[i]?.quote || 'Loading…')}”</p>
          <p className="mt-4 text-muted">— {(data[i]?.author || '')}</p>
          <div className="mt-6 flex gap-2 justify-center">
            {data.map((_, idx)=>(
              <button key={idx} aria-label={'Go to slide ' + (idx+1)} onClick={()=>setI(idx)} className={`w-2.5 h-2.5 rounded-full ${i===idx?'bg-platinum':'bg-white/20'}`}/>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
