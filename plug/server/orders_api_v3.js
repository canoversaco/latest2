const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

function dbPath(){
  return process.env.SQLITE_PATH || process.env.DATABASE_PATH || process.env.DB_FILE || path.join(process.cwd(),'data','plug.db')
}
function initDB(){
  const DB = dbPath()
  fs.mkdirSync(path.dirname(DB), { recursive:true })
  const db = new Database(DB)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_username TEXT,
      type TEXT CHECK(type IN ('pickup','delivery','shipping')) NOT NULL,
      address TEXT,
      slot TEXT,
      notes TEXT,
      status TEXT DEFAULT 'wartet_bestätigung',
      pickup_location TEXT,
      courier_username TEXT,
      subtotal_cents INTEGER DEFAULT 0,
      delivery_fee_cents INTEGER DEFAULT 0,
      total_cents INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      name TEXT,
      price_cents INTEGER,
      qty INTEGER,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
  `)
  return db
}
const now = () => new Date().toISOString().slice(0,19).replace('T',' ')

function attach(app){
  const db = initDB()
  const insOrder = db.prepare(`INSERT INTO orders
    (user_username,type,address,slot,notes,status,pickup_location,courier_username,subtotal_cents,delivery_fee_cents,total_cents,created_at,updated_at)
    VALUES (@user_username,@type,@address,@slot,@notes,@status,@pickup_location,@courier_username,@subtotal_cents,@delivery_fee_cents,@total_cents,@created_at,@updated_at)`)
  const insItem  = db.prepare(`INSERT INTO order_items(order_id,product_id,name,price_cents,qty) VALUES (?,?,?,?,?)`)
  const byId     = db.prepare(`SELECT * FROM orders WHERE id=?`)
  const itemsBy  = db.prepare(`SELECT id,product_id,name,price_cents,qty FROM order_items WHERE order_id=?`)
  const listMine = db.prepare(`SELECT * FROM orders WHERE user_username=@u ORDER BY id DESC`)
  const listAll  = db.prepare(`SELECT * FROM orders ORDER BY id DESC`)
  const upd      = db.prepare(`UPDATE orders SET status=@status, updated_at=@t WHERE id=@id`)
  const updAcc   = db.prepare(`UPDATE orders SET status='angenommen', pickup_location=@loc, updated_at=@t WHERE id=@id`)
  const updCour  = db.prepare(`UPDATE orders SET courier_username=@c, updated_at=@t WHERE id=@id`)

  const full = (o) => o ? ({ ...o, items: itemsBy.all(o.id) }) : o

  // Ein Handler, viele Pfade
  const checkoutHandler = (req, res) => {
    try{
      const { user_username='kunde', type, address='', slot='', notes='', items=[], delivery_fee_cents=0 } = req.body || {}
      if(!['pickup','delivery','shipping'].includes(type)) return res.status(400).json({error:'Ungültige Lieferart'})
      if(!Array.isArray(items) || items.length===0) return res.status(400).json({error:'Warenkorb leer'})
      const subtotal = items.reduce((a,x)=> a+(x.price_cents||0)*(x.qty||1), 0)
      const total = subtotal + (delivery_fee_cents||0)
      const t = now()
      const status = (type==='pickup') ? 'wartet_bestätigung' : 'angenommen'
      const info = insOrder.run({
        user_username, type, address, slot, notes, status,
        pickup_location: null, courier_username: null,
        subtotal_cents: subtotal, delivery_fee_cents, total_cents: total,
        created_at: t, updated_at: t
      })
      const id = info.lastInsertRowid
      for(const it of items){ insItem.run(id, it.product_id||it.id||null, it.name, it.price_cents, it.qty||1) }
      res.json({ ok:true, order: full(byId.get(id)) })
    }catch(e){ console.error('[checkout]',e); res.status(500).json({error:'Checkout fehlgeschlagen'}) }
  }

  app.post(['/api/orders/checkout','/api/api/orders/checkout','/orders/checkout'], checkoutHandler)

  app.get('/api/orders', (req,res)=>{ try{
    const u = req.query.user_username || 'kunde'
    res.json({ orders: listMine.all({u}).map(full) })
  }catch(e){ console.error(e); res.status(500).json({error:'Fehler beim Laden'}) }})

  app.get('/api/admin/orders', (req,res)=>{ try{
    res.json({ orders: listAll.all().map(full) })
  }catch(e){ console.error(e); res.status(500).json({error:'Fehler beim Laden'}) }})

  app.post('/api/admin/orders/:id/accept', (req,res)=>{ try{
    const id = +req.params.id; const { pickup_location } = req.body||{}
    if(!pickup_location) return res.status(400).json({error:'Abholort erforderlich'})
    updAcc.run({ id, loc: pickup_location, t: now() })
    res.json({ ok:true, order: full(byId.get(id)) })
  }catch(e){ console.error(e); res.status(500).json({error:'Konnte Bestellung nicht annehmen'}) }})

  app.post('/api/admin/orders/:id/assign', (req,res)=>{ try{
    const id = +req.params.id; const { courier_username=null } = req.body||{}
    updCour.run({ id, c: courier_username, t: now() })
    res.json({ ok:true, order: full(byId.get(id)) })
  }catch(e){ console.error(e); res.status(500).json({error:'Zuweisung fehlgeschlagen'}) }})

  app.post('/api/admin/orders/:id/status', (req,res)=>{ try{
    const id = +req.params.id; const { status } = req.body||{}
    const allowed = ['in_zubereitung','unterwegs','bereit_zur_abholung','zugestellt','storniert']
    if(!allowed.includes(status)) return res.status(400).json({error:'Ungültiger Status'})
    upd.run({ id, status, t: now() })
    res.json({ ok:true, order: full(byId.get(id)) })
  }catch(e){ console.error(e); res.status(500).json({error:'Status-Update fehlgeschlagen'}) }})

  console.log('[orders_api_v3] aktiv – akzeptiert /api/orders/checkout, /api/api/orders/checkout und /orders/checkout')
}
module.exports = { attach }
