import React, { useRef, useState } from 'react'

export function UploadPage(){
  const [status, setStatus] = useState('Drop files or click to choose.')
  const [name, setName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function send(files: File[]){
    if (!files.length){ return }
    setStatus('Uploading…')
    const fd = new FormData()
    for (const f of files) fd.append('files', f, f.name)
    fd.append('name', name || 'Unknown')
    const res = await fetch('/api/upload', { method:'POST', body: fd })
    const j = await res.json()
    if (j.ok){
      setStatus(j.target === 'drive' ? 'Uploaded to Google Drive.' : 'Saved locally (demo mode).')
    }else{
      setStatus('Upload failed.')
    }
  }

  function onDrop(e: React.DragEvent){
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files || [])
    send(files as File[])
  }

  return (
    <main className="min-h-[100svh] grid place-items-center px-4">
      <div className="w-full max-w-2xl grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <h1 className="text-2xl font-extrabold">Upload Loan Documents</h1>
        <input className="rounded border border-white/15 bg-black/40 p-2" placeholder="Client/Signer name (for folder)" value={name} onChange={e=>setName(e.target.value)}/>
        <div
          onDragOver={e=>e.preventDefault()}
          onDrop={onDrop}
          className="rounded-xl border border-dashed border-white/15 p-10 cursor-pointer"
          onClick={()=>fileRef.current?.click()}
        >
          <p>{status}</p>
          <p className="text-muted text-sm">PDFs preferred. Up to 10 files.</p>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={e=> send(Array.from(e.currentTarget.files || []))}/>
        </div>
        <p className="text-muted text-xs">Files upload to your Google Drive when configured; otherwise they save on the server in demo mode.</p>
      </div>
    </main>
  )
}
