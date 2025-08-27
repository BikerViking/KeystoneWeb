import React, { useState, useRef, useEffect } from 'react'

export function ChatWidget(){
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<{role:'user'|'ai', text:string}[]>([])
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  async function send(e: React.FormEvent){
    e.preventDefault()
    if(!input.trim()) return
    const text = input.trim()
    setMsgs(m => [...m, {role:'user', text}, {role:'ai', text:'Thinking…'}])
    setInput('')
    try{
      const res = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({message:text}) })
      const data = await res.json()
      setMsgs(m => m.slice(0,-1).concat({role:'ai', text: data.reply || 'Sorry, I had trouble responding.'}))
    }catch{
      setMsgs(m => m.slice(0,-1).concat({role:'ai', text:'Network error.'}))
    }
  }
  return (
    <div className="fixed right-5 bottom-5 z-50">
      <button onClick={()=>setOpen(v=>!v)} className="rounded-full px-4 py-2 bg-platinum text-black font-extrabold shadow-glass">{open?'Close':'Chat'}</button>
      {open && (
        <section className="mt-2 w-[360px] max-w-[92vw] h-[520px] grid grid-rows-[auto_1fr_auto_auto] gap-2 p-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur">
          <header className="font-extrabold">Keystone Support</header><p className="text-xs text-muted m-0">Demo mode: if you didn\'t set an OpenAI key, replies are simulated.</p>
          <div className="overflow-auto rounded border border-white/10 p-2 space-y-2 text-sm" aria-live="polite">
            {msgs.map((m,i)=>(<p key={i} className={m.role==='user'?'text-right':'text-left text-platinum'}>{m.text}</p>))}
          </div>
          <form onSubmit={send} className="flex gap-2">
            <input ref={inputRef} className="flex-1 rounded border border-white/15 bg-black/40 p-2" value={input} onChange={e=>setInput(e.target.value)} placeholder="Type your question…" required />
            <button className="bg-platinum text-black font-extrabold rounded-lg shadow-glass px-3">Send</button>
          </form>
          <p className="text-center text-muted text-xs m-0">AI assistant powered by OpenAI. Do not share sensitive info.</p>
        </section>
      )}
    </div>
  )
}
