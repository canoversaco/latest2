import React, { useEffect, useState } from 'react'
import { API_BASE } from '../api'
import { useStore } from '../store'
export default function InboxView(){
  const { user } = useStore()
  const me = user?.username || 'kunde'
  const [msgs,setMsgs]=useState<any[]>([])
  async function load(){ try{ const r=await fetch(`${API_BASE}/inbox?user=${encodeURIComponent(me)}`).then(r=>r.json()); setMsgs(r.messages||[]) }catch{} }
  useEffect(()=>{ load(); const ev=new EventSource(`${API_BASE}/inbox/stream?user=${encodeURIComponent(me)}`); ev.onmessage=e=>{ try{ const d=JSON.parse(e.data); if(d?.type==='inbox') setMsgs(x=>[d.message,...x]) }catch{} }; return ()=>ev.close() },[me])
  return <div className="container p-4 space-y-3">
    <div className="text-xl font-bold">Postfach</div>
    {msgs.length===0 && <div className="text-slate-400">Keine Nachrichten.</div>}
    <div className="space-y-3">{msgs.map((m:any)=>
      <div key={m.id} className="card"><div className="text-xs opacity-60">{new Date(m.created_at||Date.now()).toLocaleString()}</div>
      <div className="text-lg font-bold">{m.title}</div><div className="mt-1 whitespace-pre-wrap">{m.body}</div></div>)}
    </div>
  </div>
}
