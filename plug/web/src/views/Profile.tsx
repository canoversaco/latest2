import React, { Suspense, useEffect, useState } from 'react'
import { useStore } from '../store'
import { API, login } from '../api'
import { Send, Coins, Bell, Sun, Moon, Gamepad2, Settings } from 'lucide-react'
const AdminPanel = React.lazy(() => import('../admin/AdminPanel'))
const Games = React.lazy(() => import('./games/Games'))

function currency(c:number){ return '€'+(c/100).toFixed(2) }

export default function Profile(){
  const { user, setUser, wallet_cents, setWallet, setConfig } = useStore()
  const [u,setU]=useState(user?.username||''); const [p,setP]=useState('')
  const [dark,setDark]=useState(document.documentElement.classList.contains('dark'))
  const [tab,setTab]=useState<'konto'|'wallet'|'push'|'spiele'|'admin'>('konto')
  const [addr,setAddr]=useState(''); const [credit,setCredit]=useState('')

  useEffect(()=>{ user && API.req('/wallet/balance').then(d=>setWallet(d.balance_cents)); API.req('/config').then(d=>setConfig(d.config)) },[user])
  async function onLogin(){ const me=await login(u,p); setUser(me); location.reload() }
  async function topup(){ await API.req('/wallet/topup',{method:'POST',body:JSON.stringify({amount_cents:2000})}); const d=await API.req('/wallet/balance'); setWallet(d.balance_cents) }
  async function pushSub(){
    const r=await API.req('/push/publicKey'); const key=r.key;
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:(b64=>{const p='='.repeat((4-b64.length%4)%4),_=(b64+p).replace(/-/g,'+').replace(/_/g,'/');const d=atob(_);return Uint8Array.from([...d].map(c=>c.charCodeAt(0)));})(key)
    });
    await API.req('/push/subscribe',{method:'POST',body:JSON.stringify(sub)});
    alert('Push aktiviert');
  }
  async function newAddress(){ const r=await API.req('/wallet/newAddress',{method:'POST'}); setAddr(r.address) }
  async function simulateCredit(){
    if(!addr||!credit) return;
    await API.req('/admin/wallet/creditByAddress',{method:'POST',body:JSON.stringify({address:addr,amount_cents:parseInt(credit)})});
    const d=await API.req('/wallet/balance'); setWallet(d.balance_cents)
  }

  function toggleTheme(){ const d=!dark; setDark(d); document.documentElement.classList.toggle('dark',d) }

  if(!user) return (
    <div className="container p-4 space-y-3">
      <div className="card space-y-2">
        <div className="font-bold">Login (Admin legt Accounts an)</div>
        <input className="input" placeholder="Benutzername" value={u} onChange={e=>setU(e.target.value)}/>
        <input className="input" placeholder="Passwort" type="password" value={p} onChange={e=>setP(e.target.value)}/>
        <button className="btn btn-primary w-full" onClick={onLogin}><Send className="inline mr-1"/> Login</button>
        <div className="text-xs text-slate-600">Demo: admin / courier1 / customer1 — Passwort: plug1234</div>
      </div>
    </div>
  )

  return (
    <div className="container p-4 space-y-3">
      <div className="card flex items-center justify-between">
        <div><div className="font-bold">{user?.display_name||user?.username}</div><div className="text-slate-600 text-sm">Wallet: {currency(wallet_cents)}</div></div>
        <button onClick={toggleTheme} className="btn">{dark?<Sun/>:<Moon/>}</button>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-2">
          <button className={`btn ${tab==='konto'?'btn-primary':''}`} onClick={()=>setTab('konto')}>Konto</button>
          <button className={`btn ${tab==='wallet'?'btn-primary':''}`} onClick={()=>setTab('wallet')}>Wallet</button>
          <button className={`btn ${tab==='push'?'btn-primary':''}`} onClick={()=>setTab('push')}>Push</button>
          <button className={`btn ${tab==='spiele'?'btn-primary':''}`} onClick={()=>setTab('spiele')}><Gamepad2 className="inline mr-1"/>Spiele</button>
          {user.role==='admin' && <button className={`btn ${tab==='admin'?'btn-primary':''}`} onClick={()=>setTab('admin')}><Settings className="inline mr-1"/>Admin</button>}
        </div>

        {tab==='konto' && <div className="mt-3 space-y-2 text-sm">
          <div>Benutzername: <b>{user.username}</b></div>
          <div>Rolle: <b>{user.role}</b></div>
        </div>}

        {tab==='wallet' && <div className="mt-3 space-y-2">
          <div className="text-sm text-slate-600">Kontostand: <b>{currency(wallet_cents)}</b></div>
          <button className="btn btn-primary" onClick={topup}><Coins className="inline mr-1"/> +€20</button>
          <div className="mt-3 space-y-2">
            <button className="btn" onClick={newAddress}>Neue BTC-Einzahlungsadresse</button>
            {addr && <div className="text-xs text-slate-600 mt-1">Adresse: {addr}</div>}
            {addr && (
              <div className="grid grid-cols-3 gap-2">
                <input className="input col-span-2" placeholder="Betrag in Cent" value={credit} onChange={e=>setCredit(e.target.value)}/>
                <button className="btn btn-primary" onClick={simulateCredit}>Simulieren</button>
              </div>
            )}
          </div>
        </div>}

        {tab==='push' && <div className="mt-3"><button className="btn btn-primary" onClick={pushSub}><Bell className="inline mr-1"/> Push aktivieren</button></div>}

        {tab==='spiele' && (
          <div className="mt-4">
            <Suspense fallback={<div className="text-slate-600">Lade Spiele…</div>}>
              <Games/>
            </Suspense>
          </div>
        )}

        {user.role==='admin' && tab==='admin' && (
          <div className="mt-4">
            <Suspense fallback={<div className="text-slate-600">Lade Admin…</div>}>
              <AdminPanel/>
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
}
