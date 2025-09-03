import React, { useEffect, useRef, useState } from 'react'
import { API_BASE } from '../api'
import { useStore } from '../store'
async function importKey(base64:string){ const raw=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)); return await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']) }
async function encrypt(key:CryptoKey,text:string){ const enc=new TextEncoder().encode(text); const iv=crypto.getRandomValues(new Uint8Array(12)); const buf=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc); return {iv:btoa(String.fromCharCode(...iv)),ciphertext:btoa(String.fromCharCode(...new Uint8Array(buf)))} }
async function decrypt(key:CryptoKey,ivB64:string,ctB64:string){ try{ const iv=Uint8Array.from(atob(ivB64),c=>c.charCodeAt(0)), ct=Uint8Array.from(atob(ctB64),c=>c.charCodeAt(0)); const buf=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ct); return new TextDecoder().decode(buf)}catch{return '🔒 (nicht entschlüsselbar)'} }
export default function OrderChat({order}:{order:any}){ const { user }=useStore(); const [key,setKey]=useState<CryptoKey|null>(null); const [msgs,setMsgs]=useState<any[]>([]); const [text,setText]=useState(''); const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{(async()=>{ const me=user?.username||'kunde'; const r=await fetch(`${API_BASE}/orders/${order.id}/chat/key?user=${encodeURIComponent(me)}`).then(r=>r.json()).catch(()=>({})); if((r as any).key_base64) setKey(await importKey((r as any).key_base64)); const m=await fetch(`${API_BASE}/orders/${order.id}/chat`).then(r=>r.json()).catch(()=>({messages:[]})); setMsgs((m as any).messages||[]); ref.current?.scrollIntoView(); const ev=new EventSource(`${API_BASE}/orders/${order.id}/chat/stream`); ev.onmessage=e=>{ try{ const d=JSON.parse(e.data); if(d?.type==='message') setMsgs(x=>[...x,d.message]) }catch{} }; return ()=>ev.close() })() },[order?.id])
  async function send(){ if(!key||!text.trim())return; const {iv,ciphertext}=await encrypt(key,text.trim()); await fetch(`${API_BASE}/orders/${order.id}/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sender:user?.username||'kunde',iv,ciphertext})}); setText('') }
  return <div className="card"><div className="font-bold mb-2">Privatchat</div>
    <div className="h-64 overflow-auto rounded-lg border border-slate-800 p-2 bg-slate-900/60">
      {msgs.map((m,i)=><Bubble key={i} me={user?.username||'kunde'} m={m} keyObj={key}/>)}
      <div ref={ref}></div>
    </div>
    <div className="mt-2 flex gap-2"><input className="input" placeholder="Nachricht…" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send()}}/><button className="btn btn-primary" onClick={send}>Senden</button></div>
  </div>
}
function Bubble({me,m,keyObj}:{me:string,m:any,keyObj:CryptoKey|null}){ const [plain,setPlain]=useState('…'); useEffect(()=>{(async()=>{ if(keyObj) setPlain(await decrypt(keyObj,m.iv,m.ciphertext)) })()},[keyObj,m]); const mine=m.sender===me
  return <div className={`flex ${mine?'justify-end':'justify-start'} mb-1`}><div className={`px-3 py-2 rounded-2xl border ${mine?'bg-emerald-500/10 border-emerald-400/30':'bg-slate-800/80 border-slate-700'}`}><div className="text-[11px] opacity-60">{m.sender}</div><div>{plain}</div><div className="text-[10px] opacity-50 mt-1">{new Date(m.created_at||Date.now()).toLocaleString()}</div></div></div>
}
