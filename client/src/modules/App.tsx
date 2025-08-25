import React, { useEffect } from 'react'
import { Hero } from './sections/Hero'
import { Services } from './sections/Services'
import { Credentials } from './sections/Credentials'
import { Coverage } from './sections/Coverage'
import { Testimonials } from './sections/Testimonials'
import { ServiceMap } from './sections/ServiceMap'
import { CTA } from './sections/CTA'
import { Contact } from './sections/Contact'
import { ChatWidget } from './widgets/ChatWidget'
import Lenis from 'lenis'

export default function App(){
  useEffect(()=>{
    const lenis = new Lenis({ smoothWheel: true })
    function raf(time: number){
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
    return ()=>{ (lenis as any).destroy?.() }
  },[])
  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur bg-black/30 border-b border-white/10">
        <nav className="max-w-6xl mx-auto flex items-center gap-2 px-4 py-3">
          <a href="#hero" className="font-bold tracking-wide">Keystone Notary Group</a>
          <ul className="ml-auto hidden md:flex gap-4 text-muted">
            <li><a className="hover:text-fg" href="#services">Services</a></li>
            <li><a className="hover:text-fg" href="#credentials">Credentials</a></li>
            <li><a className="hover:text-fg" href="#coverage">Coverage</a></li>
            <li><a className="hover:text-fg" href="#contact">Contact</a></li>
          </ul>
        </nav>
      </header>
      <main>
        <Hero/>
        <Services/>
        <Credentials/>
        <Coverage/>
        <Testimonials/>
        <ServiceMap/>
        <CTA/>
        <Contact/>
      </main>
      <footer className="max-w-6xl mx-auto px-4 py-10 text-muted flex items-center justify-between">
        <p>© {new Date().getFullYear()} Keystone Notary Group, LLC — Hellertown, PA</p>
        <a href="#hero" className="border border-white/10 rounded px-2 py-1">▲ Top</a>
      </footer>
      <ChatWidget/>
    </>
  )
}
