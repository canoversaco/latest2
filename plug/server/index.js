const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const path = require('path')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { init, now } = require('./db')

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const BOOTSTRAP_TOKEN = process.env.BOOTSTRAP_TOKEN || 'plug-setup'
const PREFERRED_DB = '/root/latest2/plug/data/plug.db'
const FALLBACK_DB  = path.join(process.cwd(),'data','plug.db')

const app = express()
app.use(cors({origin:true,credentials:true}))
app.use(bodyParser.json({limit:'2mb', type:['application/json','text/plain']}))
app.use(bodyParser.urlencoded({extended:true}))
app.use(cookieParser())

let DB

// ---- Health & Routes
app.get(['/health','/api/health'], (req,res)=>res.json({ok:true, ts:Date.now(), dbKind: DB?.kind||'init', dbTarget: DB?.dbPath||DB?.dir||'n/a'}))
app.get('/api/routes',(req,res)=>{
  const routes=[]
  app._router.stack.forEach(m=>{
    if(m.route) routes.push({path:m.route.path, methods:Object.keys(m.route.methods)})
    else if(m.name==='router' && m.handle.stack){ m.handle.stack.forEach(h=>{ if(h.route) routes.push({path:h.route.path, methods:Object.keys(h.route.methods)}) }) }
  })
  res.json({routes})
})

// ---- Admin Diagnose
app.get('/api/admin/db-info', async (req,res)=>{
  try{
    const users = await (DB.listUsers ? DB.listUsers() : (async()=>{
      const names=['admin','kunde','courier']; const out=[]
      for(const n of names){ const u = await DB.getUserByUsername(n); if(u) out.push({username:u.username, role:u.role, password_hash_len: String(u.password_hash||'').length}) }
      return out
    })())
    res.json({ ok:true, kind: DB?.kind||'unknown', target: DB?.dbPath||DB?.dir, users })
  }catch(e){ res.status(500).json({ ok:false, error: String(e&&e.message||e) }) }
})

app.get('/api/admin/user/:username', async (req,res)=>{
  try{
    const u = await DB.getUserByUsername(req.params.username)
    if(!u) return res.status(404).json({error:'not_found'})
    res.json({username:u.username, role:u.role, password_hash_len: String(u.password_hash||'').length})
  }catch(e){ res.status(500).json({error:String(e&&e.message||e)}) }
})

// ---- Admin Reset
app.post('/api/admin/reset-user', async (req,res)=>{
  try{
    const b = typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{})
    if(b.token !== BOOTSTRAP_TOKEN) return res.status(403).json({error:'Token ungültig'})
    const {username, role='customer', password} = b
    if(!username || !password) return res.status(400).json({error:'username & password erforderlich'})
    const hash = bcrypt.hashSync(password, 8)
    const found = await DB.getUserByUsername(username)
    if(!found){
      await DB.createUser({username, role, password_hash:hash})
      return res.json({ok:true, action:'created', username})
    }else{
      if(!DB.updateUserPassword) throw new Error('updateUserPassword nicht implementiert')
      await DB.updateUserPassword(username, hash)
      return res.json({ok:true, action:'updated', username})
    }
  }catch(e){ console.error('[reset-user]',e); res.status(500).json({error:'reset-user fehlgeschlagen', detail: String(e&&e.message||e)}) }
})

// ---- Admin Bootstrap
app.post('/api/admin/bootstrap', async (req,res)=>{
  try{
    const b = typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{})
    if(b.token !== BOOTSTRAP_TOKEN) return res.status(403).json({error:'Token ungültig'})
    const defs = b.users || [
      {username:'admin',   role:'admin',    password:'admin123'},
      {username:'kunde',   role:'customer', password:'kunde123'},
      {username:'courier', role:'courier',  password:'courier123'}
    ]
    const result=[]
    for(const u of defs){
      try{
        const found = await DB.getUserByUsername(u.username)
        const hash = bcrypt.hashSync(u.password, 8)
        if(!found){ await DB.createUser({username:u.username, role:u.role, password_hash:hash}); result.push({username:u.username, action:'created'}) }
        else { await DB.updateUserPassword(u.username, hash); result.push({username:u.username, action:'updated'}) }
      }catch(ei){ result.push({username:u.username, action:'error', error:String(ei&&ei.message||ei)}) }
    }
    res.json({ok:true, result})
  }catch(e){ console.error('[bootstrap]',e); res.status(500).json({error:'Bootstrap fehlgeschlagen', detail:String(e&&e.message||e)}) }
})

// ---- Auth
function tokenFor(u){ return jwt.sign({sub:u.username, role:u.role}, JWT_SECRET, {expiresIn:'7d'}) }
app.post(['/api/login','/api/auth/login','/login','/auth/login'], async (req,res)=>{
  try{
    const b = typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{})
    const {username='',password=''} = b
    const u = await DB.getUserByUsername(username)
    if(!u) return res.status(401).json({error:'Unbekannter Benutzer'})
    if(typeof u.password_hash !== 'string' || u.password_hash.length < 4){
      return res.status(409).json({error:'Account benötigt Reset', action:'reset_required'})
    }
    const ok = bcrypt.compareSync(password, u.password_hash)
    if(!ok) return res.status(401).json({error:'Falsches Passwort'})
    const tok = tokenFor(u)
    res.cookie('plug_token', tok, {httpOnly:true,sameSite:'lax'})
    res.json({ok:true, user:{username:u.username, role:u.role}})
  }catch(e){ console.error('[login]',e); res.status(500).json({error:'Login fehlgeschlagen', detail:String(e&&e.message||e)}) }
})

// ---- Checkout
app.post(['/checkout','/orders/checkout','/api/orders/checkout','/api/api/orders/checkout','/api/auth/orders/checkout'], async (req,res)=>{
  try{
    const b = typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{})
    const items = Array.isArray(b.items)? b.items : []
    if(items.length===0) return res.status(400).json({error:'Warenkorb leer'})
    const sanitizeInt = (v)=> Number.isFinite(+v) ? Math.max(0, Math.trunc(+v)) : 0
    const user = b.user_username || b.user || 'kunde'
    const type = ['pickup','delivery','shipping'].includes(b.type)? b.type : 'delivery'
    const delivery_fee_cents = sanitizeInt(b.delivery_fee_cents)
    const subtotal = items.reduce((a,x)=> a + sanitizeInt(x.price_cents)*sanitizeInt(x.qty||1), 0)
    const total = subtotal + delivery_fee_cents
    const status = (type==='pickup') ? 'wartet_bestätigung' : 'angenommen'
    const ts = now()
    const orderId = await DB.insertOrder({
      user_username:user, type, address:b.address||'', slot:b.slot||'', notes:b.notes||'',
      status, subtotal_cents:subtotal, delivery_fee_cents, total_cents:total,
      created_at:ts, updated_at:ts
    })
    for(const it of items){
      await DB.insertOrderItem({
        order_id:orderId,
        product_id: it.product_id || it.id || null,
        name: String(it.name||'Artikel'),
        price_cents: sanitizeInt(it.price_cents),
        qty: sanitizeInt(it.qty||1)
      })
    }
    const order = await DB.getOrderById(orderId)
    res.json({ok:true, order})
  }catch(e){ console.error('[checkout]',e); res.status(500).json({error:'Checkout fehlgeschlagen', detail:String(e&&e.message||e)}) }
})

// ---- Static
try{ app.use(express.static(path.join(__dirname,'..','web','dist'))) }catch{}

// ---- Start (Port 3572)
;(async()=>{
  DB = await init(PREFERRED_DB, FALLBACK_DB)
  const PORT = 3572
  app.listen(PORT, ()=>console.log(`🚀 Plug läuft auf Port ${PORT} | DB=${DB.kind} → ${DB.dbPath||DB.dir}`))
})()
