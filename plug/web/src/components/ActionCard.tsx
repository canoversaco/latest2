import React from 'react'
export default function ActionCard({title,desc,icon,onClick}:{title:string,desc?:string,icon?:React.ReactNode,onClick?:()=>void}){
  return (
    <button onClick={onClick} className="card text-left hover:bg-slate-50 transition relative">
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <div className="font-bold">{title}</div>
          {desc && <div className="text-xs text-slate-600">{desc}</div>}
        </div>
      </div>
    </button>
  )
}
