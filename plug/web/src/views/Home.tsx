import React, { useMemo } from 'react'
import { useStore } from '../store'
import { Coins, ShoppingBag, ClipboardList, UserCog, Bell, Route, ShoppingCart, Gamepad2, CreditCard } from 'lucide-react'
import { motion } from 'framer-motion'

function currency(c:number){ return '€'+(c/100).toFixed(2) }

export default function Home(){
  const { wallet_cents, user, setActiveTab, cart, menu } = useStore()
  const newest = useMemo(()=> menu.products.filter((p:any)=>p.is_new==1).slice(0,5),[menu])

  return (
    <div className="container p-4 space-y-4">
      {/* Hero */}
      <div className="card overflow-hidden relative border-0" style={{
        background:'radial-gradient(1200px 300px at 10% -10%, rgba(16,185,129,.25), transparent 60%), radial-gradient(1200px 300px at 90% 120%, rgba(99,102,241,.25), transparent 60%), linear-gradient(135deg, #0b1220 0%, #0b0f17 60%)'
      }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-extrabold tracking-tight" style={{fontFamily:'Permanent Marker, system-ui'}}>Plug<span className="text-emerald-300">.</span></div>
            <div className="text-slate-300 mt-1">Bestellen • Live-Tracking • Wallet • Spiele</div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
              <div className="inline-flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,.8)]"></div>
                <div className="text-xl">Guthaben: <b>{currency(wallet_cents)}</b></div>
              </div>
              <button className="btn btn-primary w-max" onClick={()=>setActiveTab('profile')}>
                <CreditCard size={16}/> Aufladen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Neuheiten Spotlight */}
      {newest.length>0 && (
        <div className="card neon-gold">
          <div className="flex items-center justify-between">
            <div className="text-xl font-extrabold text-amber-300/90">NEU eingetroffen!</div>
            <div className="text-xs text-amber-200">wird automatisch hervorgehoben</div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {newest.map((p:any)=>(
              <motion.button key={p.id} onClick={()=>setActiveTab('menu')}
                className="relative overflow-hidden rounded-xl border border-amber-400/30 bg-slate-900/60 p-4 text-left hover:bg-slate-900/80"
                initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}
              >
                <span className="badge-new">NEU!</span>
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl border border-amber-300/40 bg-gradient-to-br from-amber-300/20 to-transparent"></div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-amber-200">{p.name}</div>
                    <div className="text-slate-300">€{(p.price_cents/100).toFixed(2)}</div>
                    <div className="text-xs text-amber-300/90 mt-1">Tippe zum Bestellen</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Aktionen – neu angeordnet: Menü, Spiele, Warenkorb, Bestellungen, Profil, Admin/Kurier */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Menü: leichtes Blinken + NEU! */}
        <Action title="Menü" icon={<ShoppingBag/>} color="from-emerald-500/30 to-emerald-400/10" onClick={()=>setActiveTab('menu')} badge="NEU!" blink />

        {/* Spiele: kein Blinken, aber Neon-Rahmen */}
        <Action title="Spiele" icon={<Gamepad2/>} color="from-amber-500/30 to-amber-400/10" onClick={()=>setActiveTab('orders') /* oder eig. Games-Hub-Tab, falls vorhanden */} badge="NEU!" highlight />

        <Action title="Warenkorb" icon={<ShoppingCart/>} color="from-cyan-500/30 to-cyan-400/10" onClick={()=>setActiveTab('cart')}/>
        <Action title="Bestellungen" icon={<ClipboardList/>} color="from-violet-500/30 to-violet-400/10" onClick={()=>setActiveTab('orders')}/>
        <Action title="Profil & Wallet" icon={<Coins/>} color="from-amber-500/30 to-amber-400/10" onClick={()=>setActiveTab('profile')}/>
        <Action title="Push aktivieren" icon={<Bell/>} color="from-teal-500/30 to-teal-400/10" onClick={()=>setActiveTab('profile')}/>
        {user?.role==='admin' && <Action title="Admin" icon={<UserCog/>} color="from-pink-500/30 to-pink-400/10" onClick={()=>setActiveTab('profile')}/>}
        {user?.role==='courier' && <Action title="Kurier" icon={<Route/>} color="from-blue-500/30 to-blue-400/10" onClick={()=>setActiveTab('orders')}/>}
      </div>

      {/* Warenkorb Hinweis */}
      {cart?.length>0 && <div className="card border-emerald-700/60">
        <div className="font-semibold">Weiter einkaufen?</div>
        <div className="text-slate-400">Du hast Artikel im Warenkorb.</div>
        <div className="mt-2 flex gap-2">
          <button className="btn btn-primary" onClick={()=>setActiveTab('cart')}>Zur Kasse</button>
          <button className="btn" onClick={()=>setActiveTab('menu')}>Mehr Produkte</button>
        </div>
      </div>}
    </div>
  )
}

function Action({title, icon, color, onClick, badge, highlight, blink}:{title:string, icon:React.ReactNode, color:string, onClick:()=>void, badge?:string, highlight?:boolean, blink?:boolean}){
  return (
    <motion.button onClick={onClick}
      className={`card text-left relative border-0 bg-gradient-to-br ${color} ${highlight?'neon-gold':''} ${blink?'blink-soft':''}`}
      whileHover={{ scale:1.02 }} whileTap={{ scale:.98 }}
    >
      {badge && <span className="badge-new">{badge}</span>}
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <div className="font-bold">{title}</div>
          <div className="text-xs text-slate-400">Tippen</div>
        </div>
      </div>
    </motion.button>
  )
}
