import { create } from 'zustand'
type Role = 'admin'|'courier'|'customer'
type User = { id:number, role:Role, username:string, display_name?:string } | null
type Item = { product_id:number, name:string, price_cents:number, qty:number, variant_delta_cents?:number }
const persistedCart = (()=>{ try{ return JSON.parse(localStorage.getItem('cart')||'[]') }catch{ return [] } })()
export const useStore = create<any>((set,get)=>({
  user: JSON.parse(localStorage.getItem('user')||'null') as User,
  activeTab: 'home',
  setActiveTab: (t:string)=>set({activeTab:t}),
  menu: { categories:[], products:[] },
  cart: persistedCart as Item[],
  cartCount: (persistedCart as Item[]).reduce((a,i)=>a+(i.qty||1),0),
  addToCart:(i:Item)=>{ const cur=[...get().cart]; const idx=cur.findIndex(x=>x.product_id===i.product_id && x.variant_delta_cents===i.variant_delta_cents); if(idx>=0){ cur[idx].qty=(cur[idx].qty||1)+ (i.qty||1) } else { cur.push({...i, qty:i.qty||1}) } localStorage.setItem('cart', JSON.stringify(cur)); set({cart:cur, cartCount: cur.reduce((a:any,x:any)=>a+(x.qty||1),0)}) },
  incQty:(idx:number)=>{ const cur=[...get().cart]; cur[idx].qty=(cur[idx].qty||1)+1; localStorage.setItem('cart', JSON.stringify(cur)); set({cart:cur, cartCount: cur.reduce((a:any,x:any)=>a+(x.qty||1),0)}) },
  decQty:(idx:number)=>{ const cur=[...get().cart]; cur[idx].qty=Math.max(1,(cur[idx].qty||1)-1); localStorage.setItem('cart', JSON.stringify(cur)); set({cart:cur, cartCount: cur.reduce((a:any,x:any)=>a+(x.qty||1),0)}) },
  removeFromCart:(idx:number)=>{ const cur=get().cart.filter((_:any,i:number)=>i!==idx); localStorage.setItem('cart', JSON.stringify(cur)); set({cart:cur, cartCount: cur.reduce((a:any,x:any)=>a+(x.qty||1),0)}) },
  clearCart:()=>{ localStorage.setItem('cart','[]'); set({cart:[], cartCount:0}) },
  notifCount: 0, mailCount: 0, wallet_cents: 0,
  orders: [] as any[],
  courier: { online:false, lat:null, lon:null },
  config: null as any,
  ui: { showInbox:false, showNotifs:false, adminTab:'uebersicht' },
  setUser:(u:User)=>set({user:u}),
  setMenu:(m:any)=>set({menu:m}),
  setCounts:(n:number,m:number)=>set({notifCount:n,mailCount:m}),
  setWallet:(c:number)=>set({wallet_cents:c}),
  setOrders:(o:any)=>set({orders:o}),
  setConfig:(c:any)=>set({config:c}),
  setCourier:(c:any)=>set({courier:{...get().courier,...c}}),
  setUI:(u:any)=>set({ui:{...get().ui,...u}})
}))
