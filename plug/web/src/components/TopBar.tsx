import React from 'react'
import { Bell, Mail } from 'lucide-react'
import { useStore } from '../store'

export default function TopBar(){
  const { notifCount, mailCount, user, setUI, setActiveTab } = useStore()
  return (
    <div className="sticky top-0 z-50 p-3 bg-slate-900/90 backdrop-blur flex items-center justify-between border-b border-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-violet-500 flex items-center justify-center shadow-lg">
          <span className="text-slate-900 font-black">P</span>
        </div>
        <div style={{fontFamily:'Permanent Marker, system-ui'}} className="text-2xl text-white drop-shadow">
          Plug<span className="text-emerald-300">.</span>
        </div>
      </div>
      <div className="flex gap-3 items-center">
        <button className="relative btn" onClick={()=>setUI({showInbox:true})} title="Postfach">
          <Mail size={18}/>{mailCount>0 && <span className="badge">{mailCount}</span>}
        </button>
        <button className="relative btn" onClick={()=>setUI({showNotifs:true})} title="Benachrichtigungen">
          <Bell size={18}/>{notifCount>0 && <span className="badge">{notifCount}</span>}
        </button>
        <div className="text-xs px-2 py-1 rounded border border-slate-700 bg-slate-800">{user?.role||'Gast'}</div>
      </div>
    </div>
  )
}
