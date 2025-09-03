import React from 'react'
import { Home, ShoppingCart, List, ClipboardList, User } from 'lucide-react'
import { useStore } from '../store'
export default function BottomTabs(){
  const { activeTab, setActiveTab, cartCount } = useStore()
  const tabs=[['home',<Home key="h"/>, 'Start'],['menu',<List key="m"/>, 'Menü'],['cart',<ShoppingCart key="c"/>, 'Warenkorb'],['orders',<ClipboardList key="o"/>, 'Bestellungen'],['profile',<User key="p"/>, 'Profil']]
  return (
    <div className="bottom-nav">
      <div className="wrap">
        {tabs.map(([k,icon,label])=>{
          const active=activeTab===k
          return (
            <button key={k as string} className={`tab ${active?'active':''}`} onClick={()=>setActiveTab(k as string)}>
              <div className="relative">
                {icon as any}
                {(k==='cart' && cartCount>0) && <span className="badge">{cartCount}</span>}
              </div>
              <div className="mt-1">{label as string}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
