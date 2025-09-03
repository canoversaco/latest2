import React, { useEffect, useMemo, useState } from 'react'
import { API } from '../../api'
import { useStore } from '../../store'
import { motion } from 'framer-motion'

function currency(c:number){ return '€'+(c/100).toFixed(2) }

/** Konstanten EINMALIG */
const R_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26]
const ANG = 360 / R_ORDER.length
const SUITS = ['♠','♥','♦','♣']
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']
const suitColor = (s:string)=> (s==='♥'||s==='♦') ? '#F43F5E' : '#E2E8F0'

export default function Games(){
  const { wallet_cents, setWallet } = useStore()
  const [tab,setTab]=useState<'roulette'|'blackjack'|'lotto'|'mystery'>('roulette')
  useEffect(()=>{ API.req('/wallet/balance').then(d=>setWallet(d.balance_cents)) },[setWallet])

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap gap-2">
        {['roulette','blackjack','lotto','mystery'].map((k)=>(
          <button key={k} className={`btn ${tab===k?'btn-primary':''}`} onClick={()=>setTab(k as any)}>
            {k==='roulette'?'Roulette':k==='blackjack'?'Blackjack':k==='lotto'?'Lotto':'Mystery Boxen'}
          </button>
        ))}
        <div className="ml-auto text-sm opacity-80">Wallet: <b>{currency(wallet_cents)}</b></div>
      </div>
      {tab==='roulette' && <Roulette setWallet={setWallet}/>}
      {tab==='blackjack' && <Blackjack setWallet={setWallet}/>}
      {tab==='lotto' && <Lotto setWallet={setWallet}/>}
      {tab==='mystery' && <Mystery setWallet={setWallet}/>}
    </div>
  )
}

/* ===================== ROULETTE ===================== */
function Roulette({setWallet}:{setWallet:(n:number)=>void}){
  const [amount,setAmount]=useState(200)
  const [bet,setBet]=useState<{type:string, value:any}>({type:'color', value:'red'})
  const [busy,setBusy]=useState(false)
  const [spin,setSpin]=useState(0)
  const [ballRot,setBallRot]=useState(0)
  const [result,setResult]=useState<{number:number,color:string,evenOdd:string}|null>(null)

  const labels = useMemo(()=>R_ORDER.map((n,i)=>{
    const a=i*ANG
    const red = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])
    const color = (n===0)?'#2DD4BF': (red.has(n)?'#EF4444':'#22C55E')
    return <span key={n} className="roulette-number" style={{transform:`translate(-50%,-50%) rotate(${a}deg) translateY(-110px) rotate(${-a}deg)`, color}}>{n}</span>
  }),[])

  function targetRotationForNumber(num:number){
    const idx = R_ORDER.indexOf(num)
    const spins = 8
    const base = spins*360
    const jitter = Math.random()* (ANG*0.5) - (ANG*0.25)
    const rot = base + (360 - idx*ANG) + jitter
    const ball = -(base*1.15 + (360 - idx*ANG) + jitter*0.8)
    return {rot, ball}
  }

  async function play(){
    try{
      setBusy(true); setResult(null)
      setSpin(s=>s+360); setBallRot(b=>b-540)
      const r=await API.req('/games/roulette',{method:'POST',body:JSON.stringify({amount_cents:amount,bet})})
      const { rot, ball } = targetRotationForNumber(r.result.number)
      requestAnimationFrame(()=>{ setSpin(rot); setBallRot(ball) })
      setTimeout(()=>{ setResult(r.result); setWallet(r.balance_cents) }, 3100)
    }catch(e:any){
      alert(e.message||e)
    } finally {
      setTimeout(()=>setBusy(false), 3200)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-2">
        <input className="input" type="number" min={50} step={50} value={amount} onChange={e=>setAmount(parseInt(e.target.value||'0'))} placeholder="Betrag (Cent)"/>
        <select className="input" value={bet.type} onChange={e=>setBet({type:e.target.value, value: bet.value})}>
          <option value="color">Farbe</option>
          <option value="even_odd">Gerade/Ungerade</option>
          <option value="dozen">Dutzend</option>
          <option value="single">Einzelzahl</option>
        </select>
        {bet.type==='color' && <select className="input" value={bet.value} onChange={e=>setBet({type:'color',value:e.target.value})}><option value="red">Rot</option><option value="black">Schwarz</option></select>}
        {bet.type==='even_odd' && <select className="input" value={bet.value} onChange={e=>setBet({type:'even_odd',value:e.target.value})}><option value="even">Gerade</option><option value="odd">Ungerade</option></select>}
        {bet.type==='dozen' && <select className="input" value={bet.value} onChange={e=>setBet({type:'dozen',value:parseInt(e.target.value)})}><option value="1">1–12</option><option value="2">13–24</option><option value="3">25–36</option></select>}
        {bet.type==='single' && <input className="input" type="number" min={0} max={36} value={bet.value||0} onChange={e=>setBet({type:'single',value:parseInt(e.target.value)})} placeholder="0–36"/>}
      </div>

      <div className="roulette-wrap">
        <div className="roulette-pointer"></div>
        <div className="roulette-wheel" style={{ transform:`rotate(${spin}deg)` }}>
          <div className="roulette-label">{labels}</div>
        </div>
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: ballRot }}
          transition={{ duration: 3, ease: [0.17,0.84,0.44,1] }}
          style={{ transformOrigin:'50% 50%' }}
        >
          <div style={{
            position:'absolute', left:'50%', top:'50%',
            transform:'translate(-50%,-50%) translateY(-95px)',
            width:'10px', height:'10px', background:'#fff', borderRadius:'50%',
            boxShadow:'0 0 12px rgba(255,255,255,.9)'
          }} />
        </motion.div>
      </div>

      <div className="flex gap-2">
        <button className={`btn ${busy?'opacity-70 pointer-events-none':''} btn-primary`} onClick={play}>Drehen</button>
        {result && <div className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800">
          Zahl <b>{result.number}</b> • {result.color} • {result.evenOdd}
        </div>}
      </div>
    </div>
  )
}

/* ===================== BLACKJACK (Hit/Stand) ===================== */
type Card = { rank:string, suit:string }
const drawCard = ():Card => ({ rank: RANKS[Math.floor(Math.random()*RANKS.length)], suit: SUITS[Math.floor(Math.random()*SUITS.length)] })

function CardView({card,delay=0}:{card:Card,delay?:number}){
  return (
    <motion.div
      className="card3d"
      initial={{ y:-20, opacity:0, rotate:-5, scale:.9 }}
      animate={{ y:0, opacity:1, rotate:0, scale:1 }}
      transition={{ delay: delay/1000, duration:.25 }}
      style={{ perspective:'800px' }}
    >
      <div className="card-face card-front" style={{ borderRadius:'.5rem' }}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'14px', opacity:.8}}>{card.rank}</div>
          <div style={{fontSize:'20px', color:suitColor(card.suit)}}>{card.suit}</div>
        </div>
      </div>
      <div className="card-face card-back" style={{ borderRadius:'.5rem' }} />
    </motion.div>
  )
}

function Blackjack({setWallet}:{setWallet:(n:number)=>void}){
  const [amount,setAmount]=useState(200)
  const [hits,setHits]=useState(0)
  const [phase,setPhase]=useState<'idle'|'dealing'|'player'|'resolving'|'result'>('idle')
  const [pCards,setPCards]=useState<Card[]>([])
  const [dCards,setDCards]=useState<Card[]>([])
  const [result,setResult]=useState<any>(null)
  const [busy,setBusy]=useState(false)

  async function startRound(){
    setResult(null); setHits(0); setPCards([]); setDCards([]); setPhase('dealing'); setBusy(true)
    const seq=['p','d','p','d']
    for(let i=0;i<seq.length;i++){
      await new Promise(r=>setTimeout(r,120))
      if(seq[i]==='p') setPCards((a)=>[...a, drawCard()])
      else setDCards((a)=>[...a, drawCard()])
    }
    setBusy(false); setPhase('player')
  }

  function doHit(){
    if(phase!=='player' || hits>=3) return
    setHits(h=>h+1)
    setPCards(a=>[...a, drawCard()])
  }

  async function doStand(){
    if(phase!=='player') return
    setPhase('resolving'); setBusy(true)
    try{
      const r=await API.req('/games/blackjack',{method:'POST', body: JSON.stringify({ amount_cents:amount, hitSequence:hits }) })
      // Min. Visualisierung, echte Logik & Auszahlung kommen vom Server
      const toCards = (arr:any[]) => arr.map((_x:any)=> drawCard())
      const finalP = toCards(r.detail.player)
      const finalD = toCards(r.detail.dealer)
      for(let i=pCards.length;i<finalP.length;i++){
        await new Promise(r=>setTimeout(r,140)); setPCards(a=>[...a, finalP[i]])
      }
      for(let i=dCards.length;i<finalD.length;i++){
        await new Promise(r=>setTimeout(r,160)); setDCards(a=>[...a, finalD[i]])
      }
      setResult(r); setWallet(r.balance_cents); setPhase('result')
    }catch(e:any){
      alert(e.message||e)
    } finally { setBusy(false) }
  }

  function resetRound(){
    setResult(null); setHits(0); setPCards([]); setDCards([]); setPhase('idle')
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-2">
        <input className="input" type="number" min={50} step={50} value={amount} disabled={phase!=='idle'} onChange={e=>setAmount(parseInt(e.target.value||'0'))} placeholder="Betrag (Cent)"/>
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" disabled={phase!=='idle'} onClick={startRound}>Neue Runde</button>
          <button className="btn flex-1" disabled={phase!=='player'||hits>=3||busy} onClick={doHit}>Hit</button>
          <button className="btn flex-1" disabled={phase!=='player'||busy} onClick={doStand}>Stand</button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="opacity-80 mb-1">Dealer</div>
          <div className="flex gap-2 deck">
            {dCards.map((c,i)=><CardView key={i} card={c} delay={i*120}/>)}
          </div>
        </div>
        <div>
          <div className="opacity-80 mb-1">Spieler {hits>0 && <span className="text-xs text-slate-400 ml-2">(Hits: {hits})</span>}</div>
          <div className="flex gap-2 deck">
            {pCards.map((c,i)=><CardView key={i} card={c} delay={i*120}/>)}
          </div>
        </div>
      </div>

      {result && (
        <div className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800">
          Ergebnis: <b>{result.outcome}</b> — Auszahlung <b>{currency(result.payout_cents)}</b> — Kontostand: <b>{currency(result.balance_cents)}</b>
          <div className="mt-2"><button className="btn btn-primary" onClick={resetRound}>Nochmal spielen</button></div>
        </div>
      )}
    </div>
  )
}

/* ===================== LOTTO (mit Server-Fallback) ===================== */
function Lotto({setWallet}:{setWallet:(n:number)=>void}){
  const [amount,setAmount]=useState(100)
  const [busy,setBusy]=useState(false)
  const [res,setRes]=useState<any>(null)

  async function play(){
    setBusy(true); setRes(null)
    try{
      // Server-Endpunkt versuchen
      const r=await API.req('/games/lotto',{method:'POST',body:JSON.stringify({amount_cents:amount})})
      setRes(r); setWallet(r.balance_cents)
    }catch{
      // Demo-Fallback: Ziehung clientseitig
      const drawn = Array.from({length:6},()=>Math.floor(Math.random()*49)+1)
      const win = Math.random() < 0.1 // 10% Mini-Gewinn
      const payout = win ? amount*5 : 0
      setRes({ outcome: win?'win':'lose', drawn, payout_cents:payout, balance_cents:'(Demo)' })
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-2">
        <input className="input" type="number" min={50} step={50} value={amount} onChange={e=>setAmount(parseInt(e.target.value||'0'))} placeholder="Einsatz (Cent)"/>
        <button className={`btn btn-primary ${busy?'opacity-70 pointer-events-none':''}`} onClick={play}>Ziehen</button>
      </div>
      {res && <div className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800">
        Ziehung: <b>{res.drawn ? res.drawn.join(' · ') : '–'}</b> — Ergebnis: <b>{res.outcome}</b> — Auszahlung: <b>{res.payout_cents ? '€'+(res.payout_cents/100).toFixed(2) : '€0.00'}</b> {typeof res.balance_cents==='string' && <span className="text-xs opacity-70">(Demo)</span>}
      </div>}
    </div>
  )
}

/* ===================== MYSTERY BOXEN (mit Server-Fallback) ===================== */
function Mystery({setWallet}:{setWallet:(n:number)=>void}){
  const [amount,setAmount]=useState(150)
  const [busy,setBusy]=useState(false)
  const [res,setRes]=useState<any>(null)

  async function openBox(){
    setBusy(true); setRes(null)
    try{
      const r=await API.req('/games/mystery',{method:'POST',body:JSON.stringify({amount_cents:amount})})
      setRes(r); setWallet(r.balance_cents)
    }catch{
      // Demo-Fallback
      const prizes=['Extra Gutschein','Kleiner Rabatt','Freispiel','Niete','Großer Rabatt']
      const pick=prizes[Math.floor(Math.random()*prizes.length)]
      const payout = pick==='Großer Rabatt'? amount*3 : pick==='Kleiner Rabatt'? amount : 0
      setRes({ prize: pick, payout_cents: payout, balance_cents:'(Demo)' })
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-2">
        <input className="input" type="number" min={50} step={50} value={amount} onChange={e=>setAmount(parseInt(e.target.value||'0'))} placeholder="Einsatz (Cent)"/>
        <button className={`btn btn-primary ${busy?'opacity-70 pointer-events-none':''}`} onClick={openBox}>Box öffnen</button>
      </div>
      {res && <div className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800">
        Gewinn: <b>{res.prize || (res.outcome==='win'?'Gewinn':'Niete')}</b> — Auszahlung: <b>{res.payout_cents ? '€'+(res.payout_cents/100).toFixed(2) : '€0.00'}</b> {typeof res.balance_cents==='string' && <span className="text-xs opacity-70">(Demo)</span>}
      </div>}
    </div>
  )
}
