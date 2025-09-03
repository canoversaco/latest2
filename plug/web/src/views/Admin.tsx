import React, { useEffect, useState } from 'react'
import { API } from '../api'

export default function Admin(){
  return (
    <div className="container p-4 space-y-6">
      <CategoriesAdmin/>
      <ProductsAdmin/>
    </div>
  )
}

function CategoriesAdmin(){
  const [list,setList]=useState<any[]>([])
  const [name,setName]=useState(''), [position,setPosition]=useState(0), [active,setActive]=useState(true)
  const load=()=>API.req('/admin/categories').then((d:any)=>setList(d.categories||[]))
  useEffect(()=>{ load() },[])
  return (
    <div className="card">
      <div className="text-lg font-bold mb-3">Kategorien</div>
      <div className="grid sm:grid-cols-4 gap-2 mb-3">
        <input className="input" placeholder="Name" value={name} onChange={e=>setName(e.target.value)}/>
        <input className="input" type="number" placeholder="Position" value={position} onChange={e=>setPosition(parseInt(e.target.value||'0'))}/>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> aktiv</label>
        <button className="btn btn-primary" onClick={async()=>{ await API.req('/admin/categories',{method:'POST',body:JSON.stringify({name,position,active})}); setName(''); setPosition(0); setActive(true); load() }}>Anlegen</button>
      </div>
      <div className="space-y-2">
        {list.map(c=>(
          <div key={c.id} className="flex items-center gap-2 border border-slate-700 rounded-xl p-2">
            <div className="font-semibold flex-1">{c.name} <span className="text-xs opacity-60">pos {c.position} • {c.active?'aktiv':'inaktiv'}</span></div>
            <button className="btn" onClick={async()=>{ await API.req(`/admin/categories/${c.id}`,{method:'PUT',body:JSON.stringify({name:c.name,position:c.position,active:!c.active})}); load() }}>{c.active?'Deaktivieren':'Aktivieren'}</button>
            <button className="btn" onClick={async()=>{ await API.req(`/admin/categories/${c.id}`,{method:'PUT',body:JSON.stringify({name:c.name+' ✓',position:c.position,active:c.active})}); load() }}>Umbenennen +✓</button>
            <button className="btn" onClick={async()=>{ await API.req(`/admin/categories/${c.id}`,{method:'DELETE'}); load() }}>Löschen</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductsAdmin(){
  const [cats,setCats]=useState<any[]>([])
  const [prods,setProds]=useState<any[]>([])
  const [form,setForm]=useState<any>({category_id:'', name:'', price_cents:0, is_new:false, active:true})
  const loadCats=()=>API.req('/admin/categories').then((d:any)=>setCats(d.categories||[]))
  const loadProds=()=>API.req('/admin/products').then((d:any)=>setProds(d.products||[]))
  useEffect(()=>{ loadCats(); loadProds() },[])
  const save=async()=>{ await API.req('/admin/products',{method:'POST',body:JSON.stringify(form)}); setForm({category_id:'',name:'',price_cents:0,is_new:false,active:true}); loadProds() }
  return (
    <div className="card">
      <div className="text-lg font-bold mb-3">Produkte</div>
      <div className="grid sm:grid-cols-6 gap-2 mb-3">
        <select className="input" value={form.category_id} onChange={e=>setForm({...form, category_id:parseInt(e.target.value)})}>
          <option value="">Kategorie wählen…</option>
          {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
        <input className="input" type="number" placeholder="Preis (Cent)" value={form.price_cents} onChange={e=>setForm({...form, price_cents:parseInt(e.target.value||'0')})}/>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_new} onChange={e=>setForm({...form, is_new:e.target.checked})}/> NEU</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form, active:e.target.checked})}/> aktiv</label>
        <button className="btn btn-primary" onClick={save}>Speichern</button>
      </div>
      <div className="space-y-2">
        {prods.map(p=>(
          <div key={p.id} className="flex items-center gap-2 border border-slate-700 rounded-xl p-2">
            <div className="flex-1">
              <div className="font-semibold">{p.name} {p.is_new ? <span className="badge-new">NEU!</span>:null}</div>
              <div className="text-xs opacity-60">#{p.id} • cat {p.category_id} • {p.active?'aktiv':'inaktiv'} • {(p.price_cents/100).toFixed(2)}€</div>
            </div>
            <button className="btn" onClick={async()=>{ await API.req(`/admin/products/${p.id}`,{method:'PUT',body:JSON.stringify({...p, active:!p.active})}); loadProds() }}>{p.active?'Deaktivieren':'Aktivieren'}</button>
            <button className="btn" onClick={async()=>{ await API.req(`/admin/products/${p.id}`,{method:'PUT',body:JSON.stringify({...p, is_new:!p.is_new})}); loadProds() }}>{p.is_new?'NEU aus':'NEU an'}</button>
            <button className="btn" onClick={async()=>{ await API.req(`/admin/products/${p.id}`,{method:'DELETE'}); loadProds() }}>Löschen</button>
          </div>
        ))}
      </div>
    </div>
  )
}
