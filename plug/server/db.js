const fs = require('fs'); const path = require('path')

const now = () => new Date().toISOString().slice(0,19).replace('T',' ')
const ensureDir = p => fs.mkdirSync(p, {recursive:true})

const USERS_COLUMNS = [
  ['id','INTEGER'],['username','TEXT'],['role','TEXT'],['password_hash','TEXT'],['created_at','TEXT']
]
const ORDERS_COLUMNS = [
  ['id','INTEGER'],['user_username','TEXT'],['type','TEXT'],['address','TEXT'],['slot','TEXT'],['notes','TEXT'],
  ['status','TEXT'],['pickup_location','TEXT'],['courier_username','TEXT'],['subtotal_cents','INTEGER'],
  ['delivery_fee_cents','INTEGER'],['total_cents','INTEGER'],['created_at','TEXT'],['updated_at','TEXT']
]
const ITEMS_COLUMNS = [
  ['id','INTEGER'],['order_id','INTEGER'],['product_id','INTEGER'],['name','TEXT'],['price_cents','INTEGER'],['qty','INTEGER']
]
const CATS_COLUMNS = [
  ['id','INTEGER'],['name','TEXT'],['position','INTEGER'],['active','INTEGER']
]
const PRODS_COLUMNS = [
  ['id','INTEGER'],['category_id','INTEGER'],['name','TEXT'],['price_cents','INTEGER'],['is_new','INTEGER'],
  ['image_url','TEXT'],['variants_json','TEXT'],['active','INTEGER']
]

const missingCols = (haveNames, want)=> {
  const have = new Set(haveNames.map(String))
  return want.filter(([n])=>!have.has(n))
}

/* ========================== better-sqlite3 ========================== */
function implBetterSqlite3(dbPath){
  const Database = require('better-sqlite3')
  ensureDir(path.dirname(dbPath))
  const db = new Database(dbPath); db.pragma('journal_mode = WAL')

  function migrate(){
    db.exec(`
      CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        role TEXT,
        password_hash TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS orders(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_username TEXT,
        type TEXT,
        address TEXT,
        slot TEXT,
        notes TEXT,
        status TEXT,
        pickup_location TEXT,
        courier_username TEXT,
        subtotal_cents INTEGER,
        delivery_fee_cents INTEGER,
        total_cents INTEGER,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS order_items(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        name TEXT,
        price_cents INTEGER,
        qty INTEGER
      );
      CREATE TABLE IF NOT EXISTS categories(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        position INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS products(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        name TEXT,
        price_cents INTEGER,
        is_new INTEGER DEFAULT 0,
        image_url TEXT,
        variants_json TEXT,
        active INTEGER DEFAULT 1
      );
    `)
    const colnames = (t)=> db.prepare(`PRAGMA table_info(${t})`).all().map(r=>r.name)
    const addCols = (t, wanted)=>{
      const miss = missingCols(colnames(t), wanted)
      for(const [name,type] of miss){
        let def = 'NULL'
        if(name==='created_at' || name==='updated_at') def = `'${now()}'`
        else if(name.endsWith('_cents') || name==='qty' || name==='position' || name==='active' || name==='is_new') def = 0
        else if(name==='status') def = `'wartet_bestätigung'`
        db.exec(`ALTER TABLE ${t} ADD COLUMN ${name} ${type} DEFAULT ${def};`)
      }
    }
    addCols('users', USERS_COLUMNS)
    addCols('orders', ORDERS_COLUMNS)
    addCols('order_items', ITEMS_COLUMNS)
    addCols('categories', CATS_COLUMNS)
    addCols('products', PRODS_COLUMNS)
    // Seed falls leer
    const catCount = db.prepare('SELECT COUNT(*) c FROM categories').get().c
    if(catCount===0){
      const insC = db.prepare('INSERT INTO categories(name,position,active) VALUES (?,?,1)')
      const c1 = insC.run('Snacks',1).lastInsertRowid
      const c2 = insC.run('Getränke',2).lastInsertRowid
      const c3 = insC.run('Zubehör',3).lastInsertRowid
      const insP = db.prepare('INSERT INTO products(category_id,name,price_cents,is_new,image_url,variants_json,active) VALUES (?,?,?,?,?,?,1)')
      insP.run(c1,'Chips Paprika',299,1,'','[]')
      insP.run(c1,'Schokolade Zartbitter',249,0,'','[]')
      insP.run(c2,'Cola 0.5L',199,1,'','[]')
      insP.run(c2,'Wasser 0.5L',129,0,'','[]')
      insP.run(c3,'Feuerzeug',149,0,'','[]')
    }
  }
  migrate()

  const q = {
    getUser: db.prepare('SELECT * FROM users WHERE username=?'),
    insUser: db.prepare('INSERT INTO users(username,role,password_hash,created_at) VALUES (?,?,?,?)'),
    updPass: db.prepare('UPDATE users SET password_hash=? WHERE username=?'),
    cntUsers: db.prepare('SELECT COUNT(*) c FROM users'),

    // Menu
    listCats: db.prepare('SELECT id,name,position,active FROM categories ORDER BY position ASC, id ASC'),
    listProdsByCat: db.prepare('SELECT id,category_id,name,price_cents,is_new,image_url,variants_json,active FROM products WHERE category_id=? AND active=1 ORDER BY id DESC'),
    listProdsAll: db.prepare('SELECT id,category_id,name,price_cents,is_new,image_url,variants_json,active FROM products ORDER BY id DESC'),
    insCat: db.prepare('INSERT INTO categories(name,position,active) VALUES (?,?,?)'),
    updCat: db.prepare('UPDATE categories SET name=?, position=?, active=? WHERE id=?'),
    delCat: db.prepare('DELETE FROM categories WHERE id=?'),
    insProd: db.prepare('INSERT INTO products(category_id,name,price_cents,is_new,image_url,variants_json,active) VALUES (?,?,?,?,?,?,?)'),
    updProd: db.prepare('UPDATE products SET category_id=?, name=?, price_cents=?, is_new=?, image_url=?, variants_json=?, active=? WHERE id=?'),
    delProd: db.prepare('DELETE FROM products WHERE id=?'),

    insOrder: db.prepare(`INSERT INTO orders(user_username,type,address,slot,notes,status,pickup_location,courier_username,subtotal_cents,delivery_fee_cents,total_cents,created_at,updated_at)
                          VALUES (@user_username,@type,@address,@slot,@notes,@status,@pickup_location,@courier_username,@subtotal_cents,@delivery_fee_cents,@total_cents,@created_at,@updated_at)`),
    insItem: db.prepare('INSERT INTO order_items(order_id,product_id,name,price_cents,qty) VALUES (?,?,?,?,?)'),
    byId:    db.prepare('SELECT * FROM orders WHERE id=?'),
    itemsBy: db.prepare('SELECT id,product_id,name,price_cents,qty FROM order_items WHERE order_id=?'),
    listAll: db.prepare('SELECT * FROM orders ORDER BY id DESC'),
    listByU: db.prepare('SELECT * FROM orders WHERE user_username=? ORDER BY id DESC'),
    listUsers: db.prepare('SELECT username, role, LENGTH(IFNULL(password_hash,"")) AS password_hash_len FROM users ORDER BY username')
  }
  const full = o => o ? ({...o, items: q.itemsBy.all(o.id)}) : o

  return {
    kind:'better-sqlite3', dbPath, db,
    async init(){ return true },

    // Users
    async getUserByUsername(u){ return q.getUser.get(u) },
    async createUser(u){ q.insUser.run(u.username,u.role,u.password_hash, now()); return true },
    async updateUserPassword(username, hash){ q.updPass.run(hash, username); return true },
    async countUsers(){ return q.cntUsers.get().c },
    async listUsers(){ return q.listUsers.all() },

    // Menu
    async listMenu(){
      const cats = q.listCats.all().filter(c=>c.active===1 || c.active===true)
      return cats.map(c=>({ ...c, products: q.listProdsByCat.all(c.id).map(p=>({...p, variants_json: safeParse(p.variants_json)})) }))
    },
    async adminListCategories(){ return q.listCats.all() },
    async adminListProducts(){ return q.listProdsAll.all().map(p=>({...p, variants_json: safeParse(p.variants_json)})) },
    async adminCreateCategory({name,position=0,active=1}){ const id=q.insCat.run(name,position,active?1:0).lastInsertRowid; return {id} },
    async adminUpdateCategory(id,{name,position=0,active=1}){ q.updCat.run(name,position,active?1:0,id); return true },
    async adminDeleteCategory(id){ q.delCat.run(id); return true },
    async adminCreateProduct(p){ const id=q.insProd.run(p.category_id,p.name,p.price_cents,p.is_new?1:0,p.image_url||'',JSON.stringify(p.variants_json||[]),p.active?1:0).lastInsertRowid; return {id} },
    async adminUpdateProduct(id,p){ q.updProd.run(p.category_id,p.name,p.price_cents,p.is_new?1:0,p.image_url||'',JSON.stringify(p.variants_json||[]),p.active?1:0,id); return true },
    async adminDeleteProduct(id){ q.delProd.run(id); return true },

    // Orders
    async insertOrder(o){ return q.insOrder.run(o).lastInsertRowid },
    async insertOrderItem(i){ q.insItem.run(i.order_id,i.product_id||null,i.name,i.price_cents,i.qty||1) },
    async getOrderById(id){ return full(q.byId.get(id)) },
    async listOrdersAll(){ return q.listAll.all().map(full) },
    async listOrdersByUser(u){ return q.listByU.all(u).map(full) }
  }
}

/* ============================ sql.js (WASM) ============================ */
async function implSqlJs(dbPath){
  const initSqlJs = require('sql.js'); const SQL = await initSqlJs()
  ensureDir(path.dirname(dbPath))
  let db
  try{ db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database() }
  catch{ db = new SQL.Database() }

  const save = ()=> fs.writeFileSync(dbPath, Buffer.from(db.export()))
  const run = (sql, params=[])=>{ const st=db.prepare(sql); st.bind(params); st.step(); st.free(); }
  const one = (sql, params=[])=>{ const st=db.prepare(sql); st.bind(params); const r=st.step()?st.getAsObject():null; st.free(); return r }
  const all = (sql, params=[])=>{ const st=db.prepare(sql); st.bind(params); const a=[]; while(st.step()) a.push(st.getAsObject()); st.free(); return a }
  const safeParse = (s)=>{ try{ return JSON.parse(s||'[]') }catch{ return [] } }

  function migrate(){
    run(`CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      role TEXT, password_hash TEXT, created_at TEXT
    )`)
    run(`CREATE TABLE IF NOT EXISTS orders(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_username TEXT, type TEXT, address TEXT, slot TEXT, notes TEXT, status TEXT,
      pickup_location TEXT, courier_username TEXT,
      subtotal_cents INTEGER, delivery_fee_cents INTEGER, total_cents INTEGER,
      created_at TEXT, updated_at TEXT
    )`)
    run(`CREATE TABLE IF NOT EXISTS order_items(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER, product_id INTEGER, name TEXT, price_cents INTEGER, qty INTEGER
    )`)
    run(`CREATE TABLE IF NOT EXISTS categories(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE, position INTEGER DEFAULT 0, active INTEGER DEFAULT 1
    )`)
    run(`CREATE TABLE IF NOT EXISTS products(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER, name TEXT, price_cents INTEGER, is_new INTEGER DEFAULT 0,
      image_url TEXT, variants_json TEXT, active INTEGER DEFAULT 1
    )`)
    // fehlende Spalten ergänzen
    const colnames = (t)=> all(`PRAGMA table_info(${t})`,[]).map(r=>r.name)
    const addCols = (t,wanted)=>{
      const have = colnames(t); const miss = missingCols(have, wanted)
      for(const [name,type] of miss){
        let def = null
        if(name==='created_at' || name==='updated_at') def = now()
        else if(name.endsWith('_cents')||name==='qty'||name==='position'||name==='active'||name==='is_new') def = 0
        else if(name==='status') def = 'wartet_bestätigung'
        if(def===null) run(`ALTER TABLE ${t} ADD COLUMN ${name} ${type}`)
        else if(typeof def==='number') run(`ALTER TABLE ${t} ADD COLUMN ${name} ${type} DEFAULT ${def}`)
        else run(`ALTER TABLE ${t} ADD COLUMN ${name} ${type} DEFAULT '${def}'`)
      }
    }
    addCols('users', USERS_COLUMNS)
    addCols('orders', ORDERS_COLUMNS)
    addCols('order_items', ITEMS_COLUMNS)
    addCols('categories', CATS_COLUMNS)
    addCols('products', PRODS_COLUMNS)

    // Seed (nur wenn keine Kategorien existieren)
    const r = one('SELECT COUNT(*) c FROM categories',[])||{c:0}
    if((r.c||0)===0){
      run('INSERT INTO categories(name,position,active) VALUES (?,?,1)', ['Snacks',1])
      run('INSERT INTO categories(name,position,active) VALUES (?,?,1)', ['Getränke',2])
      run('INSERT INTO categories(name,position,active) VALUES (?,?,1)', ['Zubehör',3])
      const c1 = one('SELECT id FROM categories WHERE name=?',['Snacks']).id
      const c2 = one('SELECT id FROM categories WHERE name=?',['Getränke']).id
      const c3 = one('SELECT id FROM categories WHERE name=?',['Zubehör']).id
      run('INSERT INTO products(category_id,name,price_cents,is_new,image_url,variants_json,active) VALUES (?,?,?,?,?,?,1)', [c1,'Chips Paprika',299,1,'','[]'])
      run('INSERT INTO products(category_id,name,price_cents,is_new,image_url,variants_json,active) VALUES (?,?,?,?,?,?,1)', [c1,'Schokolade Zartbitter',249,0,'','[]'])
      run('INSERT INTO products(category_id,name,price_cents,is_new,image_url,variants_json,active) VALUES (?,?,?,?,?,?,1)', [c2,'Cola 0.5L',199,1,'','[]'])
      run('INSERT INTO products(category_id,name,price_cents,is_new,image_url,variants_json,active) VALUES (?,?,?,?,?,?,1)', [c2,'Wasser 0.5L',129,0,'','[]'])
      run('INSERT INTO products(category_id,name,price_cents,is_new,image_url,variants_json,active) VALUES (?,?,?,?,?,?,1)', [c3,'Feuerzeug',149,0,'','[]'])
    }
    save()
  }
  migrate()

  return {
    kind:'sql.js', dbPath,
    async init(){ return true },

    // Users
    async getUserByUsername(u){ return one('SELECT * FROM users WHERE username=?',[u]) },
    async createUser(u){
      try{ run('INSERT INTO users(username,role,password_hash,created_at) VALUES (?,?,?,?)',[u.username,u.role,u.password_hash, now()]) }
      catch{ run('UPDATE users SET password_hash=?, role=? WHERE username=?',[u.password_hash,u.role,u.username]) }
      save(); return true
    },
    async updateUserPassword(username, hash){ run('UPDATE users SET password_hash=? WHERE username=?',[hash,username]); save(); return true },
    async countUsers(){ const r = one('SELECT COUNT(*) c FROM users',[])||{c:0}; return r.c },
    async listUsers(){ return all('SELECT username, role, LENGTH(IFNULL(password_hash,"")) AS password_hash_len FROM users ORDER BY username',[]) },

    // Menu
    async listMenu(){
      const cats = all('SELECT id,name,position,active FROM categories ORDER BY position ASC, id ASC',[])
      const out=[]; for(const c of cats){
        if(!(c.active===1||c.active===true)) continue
        const prods = all('SELECT id,category_id,name,price_cents,is_new,image_url,variants_json,active FROM products WHERE category_id=? AND active=1 ORDER BY id DESC',[c.id])
          .map(p=>({...p, variants_json: safeParse(p.variants_json)}))
        out.push({...c, products:prods})
      }
      return out
    },
    async adminListCategories(){ return all('SELECT id,name,position,active FROM categories ORDER BY position ASC, id ASC',[]) },
    async adminListProducts(){ return all('SELECT id,category_id,name,price_cents,is_new,image_url,variants_json,active FROM products ORDER BY id DESC',[]).map(p=>({...p,variants_json:safeParse(p.variants_json)})) },
    async adminCreateCategory({name,position=0,active=1}){ run('INSERT INTO categories(name,position,active) VALUES (?,?,?)',[name,position,active?1:0]); save(); const r=one('SELECT id FROM categories WHERE name=?',[name]); return {id:r?.id} },
    async adminUpdateCategory(id,{name,position=0,active=1}){ run('UPDATE categories SET name=?, position=?, active=? WHERE id=?',[name,position,active?1:0,id]); save(); return true },
    async adminDeleteCategory(id){ run('DELETE FROM categories WHERE id=?',[id]); save(); return true },
    async adminCreateProduct(p){ run('INSERT INTO products(category_id,name,price_cents,is_new,image_url,variants_json,active) VALUES (?,?,?,?,?,?,?)',[p.category_id,p.name,p.price_cents,p.is_new?1:0,p.image_url||'',JSON.stringify(p.variants_json||[]),p.active?1:0]); save(); const r=one('SELECT id FROM products WHERE name=? ORDER BY id DESC LIMIT 1',[p.name]); return {id:r?.id} },
    async adminUpdateProduct(id,p){ run('UPDATE products SET category_id=?, name=?, price_cents=?, is_new=?, image_url=?, variants_json=?, active=? WHERE id=?',[p.category_id,p.name,p.price_cents,p.is_new?1:0,p.image_url||'',JSON.stringify(p.variants_json||[]),p.active?1:0,id]); save(); return true },
    async adminDeleteProduct(id){ run('DELETE FROM products WHERE id=?',[id]); save(); return true },

    // Orders
    async insertOrder(o){ run(`INSERT INTO orders(user_username,type,address,slot,notes,status,pickup_location,courier_username,subtotal_cents,delivery_fee_cents,total_cents,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [o.user_username,o.type,o.address,o.slot,o.notes,o.status,null,null,o.subtotal_cents,o.delivery_fee_cents,o.total_cents,o.created_at,o.updated_at]); const r=one('SELECT last_insert_rowid() id',[]); save(); return r?r.id:null },
    async insertOrderItem(i){ run('INSERT INTO order_items(order_id,product_id,name,price_cents,qty) VALUES (?,?,?,?,?)',[i.order_id,i.product_id||null,i.name,i.price_cents,i.qty||1]); save(); },
    async getOrderById(id){ const o=one('SELECT * FROM orders WHERE id=?',[id]); if(!o) return null; o.items=all('SELECT id,product_id,name,price_cents,qty FROM order_items WHERE order_id=?',[id]); return o },
    async listOrdersAll(){ const list=all('SELECT * FROM orders ORDER BY id DESC',[]); return list.map(o=>{o.items=all('SELECT id,product_id,name,price_cents,qty FROM order_items WHERE order_id=?',[o.id]); return o}) },
    async listOrdersByUser(u){ const list=all('SELECT * FROM orders WHERE user_username=? ORDER BY id DESC',[u]); return list.map(o=>{o.items=all('SELECT id,product_id,name,price_cents,qty FROM order_items WHERE order_id=?',[o.id]); return o}) }
  }
}

/* ============================ JSON-Fallback ============================ */
function implJson(dir){
  ensureDir(dir); const usersFile=path.join(dir,'users.json'); const ordersDir=path.join(dir,'orders'); ensureDir(ordersDir)
  const read=(f,def)=> fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')||'null')||def:def
  const write=(f,obj)=> fs.writeFileSync(f, JSON.stringify(obj,null,2))
  return {
    kind:'json', dir,
    async init(){ if(!fs.existsSync(usersFile)) write(usersFile,[]); return true },
    async getUserByUsername(u){ return read(usersFile,[]).find(x=>x.username===u)||null },
    async createUser(u){ const arr=read(usersFile,[]); arr.push({...u,created_at:now()}); write(usersFile,arr); return true },
    async updateUserPassword(username, hash){ const arr=read(usersFile,[]); const i=arr.findIndex(x=>x.username===username); if(i>=0){ arr[i].password_hash=hash; write(usersFile,arr) } return true },
    async countUsers(){ return read(usersFile,[]).length },
    async listUsers(){ return read(usersFile,[]).map(u=>({username:u.username, role:u.role, password_hash_len: (u.password_hash||'').length})) },

    async listMenu(){ const catsDir=path.join(dir,'cats'); const prodsDir=path.join(dir,'prods'); ensureDir(catsDir); ensureDir(prodsDir);
      const cats = fs.readdirSync(catsDir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(catsDir,f),'utf8')))
      return cats.sort((a,b)=>(a.position||0)-(b.position||0)).filter(c=>c.active!==0).map(c=>({...c,products:[]})) },
    async adminListCategories(){ return [] }, async adminListProducts(){ return [] },
    async adminCreateCategory(){ return {id:Date.now()} }, async adminUpdateCategory(){ return true }, async adminDeleteCategory(){ return true },
    async adminCreateProduct(){ return {id:Date.now()} }, async adminUpdateProduct(){ return true }, async adminDeleteProduct(){ return true },

    async insertOrder(o){ const id=Date.now(); const file=path.join(ordersDir,id+'.json'); fs.writeFileSync(file, JSON.stringify({...o,id},null,2)); return id },
    async insertOrderItem(){}, async getOrderById(id){ const f=path.join(ordersDir,id+'.json'); return fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):null },
    async listOrdersAll(){ return fs.readdirSync(ordersDir).filter(f=>f.endsWith('.json')).sort().reverse().map(f=>JSON.parse(fs.readFileSync(path.join(ordersDir,f),'utf8'))) },
    async listOrdersByUser(u){ return (await this.listOrdersAll()).filter(o=>o.user_username===u) }
  }
}

/* ============================== Factory ============================== */
function safeParse(s){ try{ return JSON.parse(s||'[]') }catch{ return [] } }
async function initDB(preferred, fallback){
  const pref = preferred || path.join(process.cwd(),'data','plug.db')
  try { return implBetterSqlite3(pref) } catch(e1){
    console.warn('[db] better-sqlite3 nicht verfügbar:', e1?.message)
    try { return await implSqlJs(pref) } catch(e2){
      console.warn('[db] sql.js nicht verfügbar:', e2?.message)
      return implJson(path.join(process.cwd(),'data','jsondb'))
    }
  }
}
module.exports = { init: initDB, now }
