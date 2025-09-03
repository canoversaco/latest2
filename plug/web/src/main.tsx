import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import { API, wsConnect } from './api'
import { useStore } from './store'
import { motion, AnimatePresence } from 'framer-motion'
import TopBar from './components/TopBar'
import BottomTabs from './components/Tabs'
import Home from './views/Home'
import MenuView from './views/Menu'
import CartView from './views/Cart'
import OrdersView from './views/Orders'
import Profile from './views/Profile'
import { InboxOverlay, NotifOverlay } from './components/Overlays'

function useBoot(){
  const { user, setMenu, setWallet, setCounts } = useStore()
  useEffect(()=>{ API.req('/menu').then(setMenu) },[])
  useEffect(()=>{ if (user) API.req('/wallet/balance').then(d=>setWallet(d.balance_cents)) },[user])
  useEffect(()=>{ if (!user) return; Promise.all([API.req('/notifications'), API.req('/mail')]).then(([n,m])=>{
    const unread = n.list.filter((x:any)=>!x.read).length
    const mailUnread = m.messages.filter((x:any)=>x.to_id===user.id && !x.read).length
    setCounts(unread, mailUnread)
  }) },[user,setCounts])
  useEffect(()=>{ const ws=wsConnect(); if(!ws) return; ws.onmessage=async ev=>{ const m=JSON.parse(ev.data); if(m.type==='wallet'){ const d=await API.req('/wallet/balance'); setWallet(d.balance_cents) } if(m.type==='order:update'||m.type==='order:new'){ /* Orders-View lädt selbst */ } if(m.type==='mail'){ const [n,mx]=await Promise.all([API.req('/notifications'),API.req('/mail')]); const unread=n.list.filter((x:any)=>!x.read).length; const unreadMail=mx.messages.filter((x:any)=>x.to_id===user?.id && !x.read).length; setCounts(unread,unreadMail); } }; return ()=>ws.close() },[setWallet,setCounts,user])
}
function App(){
  const { activeTab } = useStore()
  useBoot()
  return (
    <div className="min-h-screen pb-20">
      <div className="absolute inset-0 -z-10 opacity-20 bg-grad"></div>
      <TopBar/>
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{opacity:0, y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
          {activeTab==='home' && <Home/>}
          {activeTab==='menu' && <MenuView/>}
          {activeTab==='cart' && <CartView/>}
          {activeTab==='orders' && <OrdersView/>}
          {activeTab==='profile' && <Profile/>}
        </motion.div>
      </AnimatePresence>
      <BottomTabs/>
      <InboxOverlay/><NotifOverlay/>
    </div>
  )
}
ReactDOM.createRoot(document.getElementById('root')!).render(<App/>)
