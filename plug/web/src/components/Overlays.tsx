import React, { useEffect, useState } from 'react'
import { useStore } from '../store'
import { API } from '../api'
export function InboxOverlay(){ const { ui, setUI, user } = useStore(); const [messages,setMessages]=useState<any[]>([])
  useEffect(()=>{ if(ui.showInbox && user) API.req('/mail').then(d=>setMessages(d.messages)) },[ui.showInbox,user])
  if(!ui.showInbox) return null
  return <div className="fixed inset-0 z-50 bg-black/40 p-4" onClick={()=>setUI({showInbox:false})}>
    <div className="card max-w-lg mx-auto h-[80vh] overflow-auto bg-white" onClick={e=>e.stopPropagation()}>
      <div className="text-xl font-bold mb-2">Postfach</div>
      <div className="space-y-2">{messages.map((m:any)=><div key={m.id} className="p-2 rounded border border-base-line bg-white"><div className="text-xs text-slate-600">von #{m.from_id} an #{m.to_id} • {new Date(m.created_at*1000).toLocaleString()}</div><div>{m.body}</div></div>)}</div>
    </div>
  </div>
}
export function NotifOverlay(){ const { ui, setUI, user } = useStore(); const [list,setList]=useState<any[]>([])
  useEffect(()=>{ if(ui.showNotifs && user) API.req('/notifications').then(d=>setList(d.list)) },[ui.showNotifs,user])
  if(!ui.showNotifs) return null
  return <div className="fixed inset-0 z-50 bg-black/40 p-4" onClick={()=>setUI({showNotifs:false})}>
    <div className="card max-w-lg mx-auto h-[80vh] overflow-auto bg-white" onClick={e=>e.stopPropagation()}>
      <div className="text-xl font-bold mb-2">Benachrichtigungen</div>
      <div className="space-y-2">{list.map((n:any)=><div key={n.id} className="p-2 rounded border border-base-line bg-white"><div className="text-xs text-slate-600">{new Date(n.created_at*1000).toLocaleString()}</div><div className="font-semibold">{n.title}</div><div className="text-sm">{n.body}</div></div>)}</div>
    </div>
  </div>
}
