import React, { useState, useEffect } from 'react'

export function Contact(){
React.useEffect(()=>{
  (window as any).KS_uploadedLinks = [];
  (window as any).KS_uploading = false;
  (window as any).KS_uploadFiles = async function(files: File[]){
    if (!files.length) return;
    const statusEl = document.getElementById('ksUploadStatus');
    (window as any).KS_uploading = true;
    if (statusEl) statusEl.textContent = 'Uploading…';
    const fd = new FormData();
    for (const f of files) fd.append('files', f, f.name);
    // Use name field if present for folder naming
    const nameField = (document.querySelector('input[name="name"]') as HTMLInputElement)?.value || '';
    fd.append('name', nameField);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.upload.onprogress = (e)=>{ if (e.lengthComputable && statusEl) statusEl.textContent = 'Uploading ' + Math.round(e.loaded/e.total*100) + '%'; };
    xhr.onload = ()=>{
      try{
        const j = JSON.parse(xhr.responseText);
        if (j.ok){
          (window as any).KS_uploadedLinks = (j.items || []).map((it:any)=> it.webViewLink || it.path || it.id);
          if (statusEl) statusEl.textContent = 'Uploaded ' + (j.items?.length || 0) + ' file(s).';
        }else{
          if (statusEl) statusEl.textContent = 'Upload failed';
        }
      }catch{ if (statusEl) statusEl.textContent = 'Upload failed'; }
      (window as any).KS_uploading = false;
    };
    xhr.onerror = ()=>{ if (statusEl) statusEl.textContent = 'Upload failed'; (window as any).KS_uploading = false; };
    xhr.send(fd);
  }
},[])

React.useEffect(()=>{
  async function flush(){
    const outboxKey = 'ks_outbox';
    const box = JSON.parse(localStorage.getItem(outboxKey) || '[]');
    if (!box.length) return;
    for (const msg of box){
      try{ await fetch('/api/contact', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(msg) }); }catch{ /* keep */ }
    }
    localStorage.removeItem(outboxKey);
  }
  window.addEventListener('online', flush);
  return ()=> window.removeEventListener('online', flush);
},[])

const siteKey = import.meta.env.VITE_RECAPTCHA_SITEKEY as string | undefined
useEffect(()=>{
  if (!siteKey) return
  // dynamically inject reCAPTCHA v3 script
  const id = 'recaptcha-script'
  if (document.getElementById(id)) return
  const s = document.createElement('script')
  s.id = id
  s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
  s.async = true; s.defer = true
  document.head.appendChild(s)
},[])

  const [status, setStatus] = useState('')
  async function submit(e: React.FormEvent<HTMLFormElement>){
    const outboxKey = 'ks_outbox';
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload:any = Object.fromEntries(fd.entries())
    if ((window as any).KS_uploading){ setStatus('Please wait for document upload to finish…'); return; }
    if ((window as any).KS_uploadedLinks?.length){ payload.uploads = (window as any).KS_uploadedLinks }
    setStatus('Sending…')
    try{
      if (siteKey && (window as any).grecaptcha) {
        const token = await (window as any).grecaptcha.execute(siteKey, { action: 'contact' })
        payload.recaptcha = token
      }
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      })
      if(!res.ok) throw new Error(await res.text())
      setStatus('Message sent. We’ll get back shortly.')
      e.currentTarget.reset()
    }catch(err){
      // Offline-first: queue message
      const box = JSON.parse(localStorage.getItem(outboxKey) || '[]'); box.push(payload); localStorage.setItem(outboxKey, JSON.stringify(box));
      setStatus('Offline: saved your message. We\'ll send it when you\'re back online.');
      setStatus('Failed to send. Try email or phone.')
    }
  }
  return (
    <section id="contact" className="min-h-[100svh] grid place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-3xl grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-extrabold">Contact Keystone Notary Group</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="grid gap-1 font-semibold">Full name<input required name="name" className="rounded border border-white/15 bg-black/40 p-2" placeholder="Jane Doe"/></label>
          <label className="grid gap-1 font-semibold">Email<input required type="email" name="email" className="rounded border border-white/15 bg-black/40 p-2" placeholder="jane@example.com"/></label>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="grid gap-1 font-semibold">Phone<input name="phone" className="rounded border border-white/15 bg-black/40 p-2" placeholder="(267) 555‑0123"/></label>
          <label className="grid gap-1 font-semibold">Service<select name="service" className="rounded border border-white/15 bg-black/40 p-2">
            <option>Loan Signing</option><option>General Notarization</option><option>I‑9 Verification</option><option>Other</option>
          </select></label>
        </div>
        <label className="grid gap-1 font-semibold">Message<textarea required name="message" rows={5} className="rounded border border-white/15 bg-black/40 p-2" placeholder="Tell us what you need notarized…"/></label>
        <div className="grid md:grid-cols-3 gap-4">
          <label className="grid gap-1 font-semibold">Meeting address<input name="address" className="rounded border border-white/15 bg-black/40 p-2" placeholder="123 Main St, Hellertown, PA"/></label>
          <label className="grid gap-1 font-semibold">Preferred date<input type="date" name="preferredDate" className="rounded border border-white/15 bg-black/40 p-2"/></label>
          <label className="grid gap-1 font-semibold">Preferred time<input type="time" name="preferredTime" className="rounded border border-white/15 bg-black/40 p-2"/></label>
        </div>
        <div className="grid gap-2 rounded-xl border border-dashed border-white/15 p-4">
  <label className="font-semibold">Upload documents (optional)</label>
  <div onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{ e.preventDefault(); (window as any).KS_uploadFiles(Array.from(e.dataTransfer.files||[])) }} className="rounded border border-white/10 bg-black/30 p-6 text-center cursor-pointer" onClick={()=>document.getElementById('ksFiles')?.click()}>
    <p>Drop documents here or click to choose</p>
    <p className="text-xs text-muted">PDF, DOCX, JPG/PNG — up to 10 files</p>
    <input id="ksFiles" type="file" multiple className="hidden" onChange={(e)=> (window as any).KS_uploadFiles(Array.from(e.currentTarget.files||[])) } />
  </div>
  <div id="ksUploadStatus" className="text-sm text-muted">No files uploaded</div>
</div>

        <label className="flex items-center gap-2 text-sm"><input required type="checkbox" name="consent"/> I consent to contact and understand this form stores my info solely for service purposes.</label>
        <div className="flex items-center gap-3">
          <button className="bg-platinum text-black font-extrabold rounded-lg shadow-glass px-4 py-2" type="submit">Send Message</button>
          <span aria-live="polite" className="text-muted">{status}</span>
        </div>
        <div id="booking" className="pt-6 border-t border-white/10">
          <h3 className="font-bold mb-2">Booking</h3>
          <a className="border border-white/15 rounded-lg px-4 py-2 inline-block" href="https://calendly.com/keystonenotarygroup/appointment" target="_blank" rel="noopener">Open Booking</a>
        </div>
      <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      </form>
    </section>
  )
}
