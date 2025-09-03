import React, { useEffect, useState } from 'react'
import { API } from '../api'
import { useStore } from '../store'

function money(c:number){ return '€'+(c/100).toFixed(2) }

export default function OrdersView(){
  const { user } = useStore()
  const [orders,setOrders]=useState<any[]>([])
  const [loading,setLoading]=useState(true)

  async function load(){ 
    setLoading(true)
    try{
      const r = await API.req('/api/orders?user_username='+(user?.username||'kunde'))
      setOrders(r.orders||[])
    }catch(e){ console.error(e) } finally { setLoading(false) }
  }
  useEffect(()=>{ load(); const t=setInterval(load, 4000); return ()=>clearInterval(t) },[])

  return (
    <div className="container p-4 space-y-3">
      <div className="text-xl font-bold">Deine Bestellungen</div>
      {loading && <div className="text-slate-400">Lade…</div>}
      {!loading && orders.length===0 && <div className="text-slate-400">Keine Bestellungen vorhanden.</div>}
      <div className="space-y-3">
        {orders.map((o:any)=>(
          <div key={o.id} className="card">
            <div className="flex justify-between items-center">
              <div className="font-semibold">#{o.id} • {o.type==='pickup'?'Abholen':o.type==='delivery'?'Lieferung':'Versand'}</div>
              <div className="text-sm px-2 py-1 rounded border border-slate-700 bg-slate-800">{o.status}</div>
            </div>
            <div className="text-sm opacity-80 mt-1">Gesamt: <b>{money(o.total_cents)}</b></div>
            {o.pickup_location && <div className="text-sm mt-1 text-emerald-300">Abholort: <b>{o.pickup_location}</b></div>}
            <div className="mt-2 text-sm">
              {o.items?.map((it:any)=> <div key={it.id}>{it.qty}× {it.name} — {money(it.price_cents*it.qty)}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
