import React, { useMemo, useState } from 'react'
import { useStore } from '../store'
import { API } from '../api'

const money=(c:number)=>'€'+(c/100).toFixed(2)

export default function CartView(){
  const { cart, setCart, user, setActiveTab, config } = useStore()
  const [type,setType]=useState<'pickup'|'delivery'|'shipping'>('delivery')
  const [address,setAddress]=useState('')
  const [slot,setSlot]=useState('')
  const [notes,setNotes]=useState('')
  const [busy,setBusy]=useState(false)

  const subtotal = useMemo(()=> cart.reduce((a:any,x:any)=>a+x.price_cents*x.qty,0),[cart])
  const deliveryFee = useMemo(()=> type==='delivery' ? (config?.delivery_base_cents||300) : 0, [type, config])
  const total = subtotal + deliveryFee

  async function checkout(){
    if(cart.length===0) return
    setBusy(true)
    try{
      const payload = {
        user_username: user?.username || 'kunde',
        type, address, slot, notes,
        items: cart.map((i:any)=>({ product_id:i.id, name:i.name, price_cents:i.price_cents, qty:i.qty })),
        delivery_fee_cents: deliveryFee
      }
      const r = await API.req('orders/checkout',{ method:'POST', body: JSON.stringify(payload) })
      if(!r?.order?.id) throw new Error('Antwort ungültig')
      setCart([])
      setActiveTab('orders')
    }catch(e:any){ alert(e.message||'Checkout fehlgeschlagen') }
    finally{ setBusy(false) }
  }

  return (
    <div className="container p-4 space-y-4">
      <div className="card">
        <div className="text-xl font-bold mb-3">Warenkorb</div>
        {cart.length===0 ? <div className="text-slate-400">Dein Warenkorb ist leer.</div> :
        <>
          <div className="space-y-2">
            {cart.map((i:any)=>(
              <div key={i.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold">{i.name}</div>
                  <div className="text-xs opacity-70">{i.qty} × {money(i.price_cents)}</div>
                </div>
                <div className="font-bold">{money(i.price_cents*i.qty)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-2 text-sm mt-2">
            <div className="flex justify-between"><span>Zwischensumme</span><b>{money(subtotal)}</b></div>
            {type==='delivery' && <div className="flex justify-between"><span>Liefergebühr</span><b>{money(deliveryFee)}</b></div>}
            <div className="flex justify-between text-lg mt-1"><span>Gesamt</span><b>{money(total)}</b></div>
          </div>
        </>}
      </div>

      <div className="card">
        <div className="text-lg font-bold mb-2">Lieferart</div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={()=>setType('pickup')}   className={`btn ${type==='pickup'?'btn-primary':''}`}>Abholen</button>
          <button onClick={()=>setType('delivery')} className={`btn ${type==='delivery'?'btn-primary':''}`}>Liefern</button>
          <button onClick={()=>setType('shipping')} className={`btn ${type==='shipping'?'btn-primary':''}`}>Versand</button>
        </div>

        {type!=='pickup' && (
          <div className="grid sm:grid-cols-2 gap-2 mt-3">
            <input className="input" placeholder="Adresse" value={address} onChange={e=>setAddress(e.target.value)}/>
            <input className="input" placeholder="Zeitslot (optional)" value={slot} onChange={e=>setSlot(e.target.value)}/>
          </div>
        )}
        {type==='pickup' && (
          <div className="mt-3 text-sm text-amber-300">
            Nach dem Bestellen wartet deine Bestellung auf Annahme durch den Plug. Der Abholort wird dir dann mitgeteilt.
          </div>
        )}
        <textarea className="input mt-3" placeholder="Hinweise (optional)" value={notes} onChange={e=>setNotes(e.target.value)} />

        <div className="mt-3">
          <button disabled={busy||cart.length===0} className="btn btn-primary" onClick={checkout}>Bestellung abschließen</button>
        </div>
      </div>
    </div>
  )
}
