import React from 'react'

export function CTA(){
  return (
    <section id="cta" className="min-h-[80svh] grid place-items-center px-4">
      <div className="w-full max-w-3xl text-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8 shadow-glass">
        <h2 className="text-3xl font-extrabold">Schedule a Notary</h2>
        <p className="text-muted mt-2">Fast, professional, and detail‑obsessed. We come to you.</p>
        <div className="mt-5 flex gap-3 justify-center flex-wrap">
          <a className="bg-platinum text-black font-extrabold rounded-lg shadow-glass px-4 py-2" href="mailto:info@keystonenotarygroup.com?subject=Notary%20Request">Email</a>
          <a className="border border-white/15 rounded-lg px-4 py-2" href="tel:+12673099000">Call</a>
          <a className="border border-white/15 rounded-lg px-4 py-2" href="#contact">Contact Form</a>
          <a className="border border-white/15 rounded-lg px-4 py-2" href="#booking">Booking</a>
        </div>
      </div>
    </section>
  )
}
