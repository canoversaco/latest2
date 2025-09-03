import React, { useEffect, useState } from 'react'
import { API } from '../api'
import { useStore } from '../store'

function currency(c:number){ return '€'+(c/100).toFixed(2) }

export default function Menu(){
  const { addToCart } = useStore()
  const [data,setData] = useState<{categories:any[]}>({categories:[]})
  const [q,setQ] = useState('')
  useEffect(()=>{ API.req('/menu').then(setData).catch(()=>setData({categories:[]})) },[])
  const cats = data.categories||[]
  const filtered = cats.map((c:any)=>({
    ...c,
    products: (c.products||[]).filter((p:any)=> p.name.toLowerCase().includes(q.toLowerCase()))
  })).filter((c:any)=>c.products.length>0 || q==='')

  return (
    <div className="container p-4 space-y-4">
      <div className="card">
        <input className="input" placeholder="Suche im Menü…" value={q} onChange={e=>setQ(e.target.value)}/>
      </div>
      {filtered.map((c:any)=>(
        <div key={c.id} className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xl font-bold">{c.name}</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {c.products.map((p:any)=>(
              <div key={p.id} className="relative rounded-xl border border-slate-700 p-3 bg-slate-900/60">
                {p.is_new ? <span className="badge-new">NEU!</span> : null}
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm opacity-80 mb-2">{currency(p.price_cents)}</div>
                <button className="btn btn-primary w-full" onClick={()=>addToCart({id:p.id,name:p.name,price_cents:p.price_cents,qty:1})}>In den Warenkorb</button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {cats.length===0 && <div className="card">Noch keine Produkte vorhanden.</div>}
    </div>
  )
}
