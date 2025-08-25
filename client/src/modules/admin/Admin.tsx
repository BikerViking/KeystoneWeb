import React, { useEffect, useState } from 'react'

export default function Admin(){
  const params = new URLSearchParams(location.search)
  const token = params.get('token')
  const [stage, setStage] = useState<'login'|'dash'>('login')
  const [email, setEmail] = useState('')

  useEffect(()=>{
    if (token){
      fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token }) })
        .then(r=> r.ok ? r.json() : Promise.reject())
        .then(()=> setStage('dash'))
        .catch(()=> alert('Invalid or expired link. Request a new one.'))
    }
  }, [])

  async function requestLink(e: React.FormEvent){
    e.preventDefault()
    const res = await fetch('/api/admin/request-magic-link', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) })
    if (res.ok) alert('Check your email for the magic link. In demo mode, check the server logs.')
  }

  if (stage === 'login'){
    return (
      <main className="min-h-[100svh] grid place-items-center px-4">
        <form onSubmit={requestLink} className="w-full max-w-md grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-extrabold">Admin Login</h1>
          <p className="text-muted text-sm">We’ll email you a magic link. No passwords to remember.</p>
          <input required type="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} className="rounded border border-white/15 bg-black/40 p-2"/>
          <button className="bg-platinum text-black font-extrabold rounded-lg shadow-glass px-4 py-2">Send Magic Link</button>
        </form>
      </main>
    )
  }

  return <Dashboard/>
}

function Dashboard(){
  const [data, setData] = useState<{testimonials:{quote:string, author:string}[], services:{title:string, body:string}[]}>({testimonials:[], services:[]})
  const [saving, setSaving] = useState(false)
  useEffect(()=>{ refresh() },[])
  async function refresh(){
    const r = await fetch('/api/admin/cms/export')
    if (r.ok){ const j = await r.json(); setData(j) }
  }
  function updateTestimonial(i:number, key:'quote'|'author', val:string){
    const t = [...data.testimonials]; t[i] = {...t[i], [key]: val}; setData({...data, testimonials: t})
  }
  function addTestimonial(){ setData({...data, testimonials: [...data.testimonials, {quote:'', author:''}]}) }
  function removeTestimonial(i:number){ setData({...data, testimonials: data.testimonials.filter((_,idx)=> idx!==i)}) }
  function updateService(i:number, key:'title'|'body', val:string){
    const s = [...data.services]; s[i] = {...s[i], [key]: val}; setData({...data, services: s})
  }
  function addService(){ setData({...data, services: [...data.services, {title:'', body:''}]}) }
  function removeService(i:number){ setData({...data, services: data.services.filter((_,idx)=> idx!==i)}) }
  async function save(){
    setSaving(true)
    await fetch('/api/admin/cms/import', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) })
    setSaving(false)
    alert('Saved')
  }
  return (
    <main className="min-h-[100svh] grid place-items-start px-4 py-10">
      <div className="max-w-5xl w-full grid gap-8">
        <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>

        <section className="grid gap-3">
          <h2 className="text-xl font-bold">Testimonials</h2>
          {data.testimonials.map((t, i)=>(
            <div key={i} className="grid md:grid-cols-2 gap-3 rounded border border-white/10 p-3">
              <input value={t.quote} onChange={e=>updateTestimonial(i,'quote',e.target.value)} placeholder="Quote" className="rounded border border-white/15 bg-black/40 p-2"/>
              <input value={t.author} onChange={e=>updateTestimonial(i,'author',e.target.value)} placeholder="Author" className="rounded border border-white/15 bg-black/40 p-2"/>
              <button onClick={()=>removeTestimonial(i)} className="border border-white/15 rounded px-3 py-1 w-max">Remove</button>
            </div>
          ))}
          <button onClick={addTestimonial} className="border border-white/15 rounded px-4 py-2 w-max">Add Testimonial</button>
        </section>

        <section className="grid gap-3">
          <h2 className="text-xl font-bold">Services</h2>
          {data.services.map((s, i)=>(
            <div key={i} className="grid md:grid-cols-2 gap-3 rounded border border-white/10 p-3">
              <input value={s.title} onChange={e=>updateService(i,'title',e.target.value)} placeholder="Title" className="rounded border border-white/15 bg-black/40 p-2"/>
              <textarea value={s.body} onChange={e=>updateService(i,'body',e.target.value)} placeholder="Description" rows={3} className="rounded border border-white/15 bg-black/40 p-2"/>
              <button onClick={()=>removeService(i)} className="border border-white/15 rounded px-3 py-1 w-max">Remove</button>
            </div>
          ))}
          <button onClick={addService} className="border border-white/15 rounded px-4 py-2 w-max">Add Service</button>
        </section>

        <div className="flex gap-3">
          <button onClick={save} className="bg-platinum text-black font-extrabold rounded-lg shadow-glass px-4 py-2">{saving?'Saving…':'Save All'}</button>
          <button onClick={refresh} className="border border-white/15 rounded px-4 py-2">Refresh</button>
        </div>
      </div>
    </main>
  )
}
