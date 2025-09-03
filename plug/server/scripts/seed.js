const fs = require('fs'), path = require('path'), bcrypt = require('bcrypt');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const usePg = !!process.env.PG_DSN;
(async () => {
  if (usePg) {
    const { Client } = require('pg'); const c=new Client({connectionString:process.env.PG_DSN}); await c.connect();
    const ddl = fs.readFileSync(path.resolve(__dirname,'schema.sql'),'utf8')
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g,'SERIAL PRIMARY KEY')
      .replace(/strftime\('%s','now'\)/g,'EXTRACT(EPOCH FROM NOW())');
    await c.query(ddl);
    const { rows:[{count}]} = await c.query('SELECT COUNT(*)::int AS count FROM users');
    if (!count){
      const add=async(u,p,r,d)=> (await c.query('INSERT INTO users (username,passhash,role,display_name) VALUES ($1,$2,$3,$4) RETURNING id',[u,bcrypt.hashSync(p,10),r,d])).rows[0].id;
      const admin=await add(process.env.SEED_ADMIN_USER||'admin',process.env.SEED_ADMIN_PASS||'plug1234','admin','Admin');
      const cour =await add(process.env.SEED_COURIER_USER||'courier1',process.env.SEED_COURIER_PASS||'plug1234','courier','Kurier');
      const cust =await add(process.env.SEED_CUSTOMER_USER||'customer1',process.env.SEED_CUSTOMER_PASS||'plug1234','customer','Kunde');
      await c.query('INSERT INTO wallets (user_id,balance_cents) VALUES ($1,0),($2,0),($3,500000) ON CONFLICT (user_id) DO NOTHING',[admin,cour,cust]);
      const cfg={pickup_address:"Kettwiger Str. 1, 45127 Essen, Germany", delivery_base_cents:299, delivery_per_km_cents:99, shipping_flat_cents:599, zones:[{name:"Zone A (0-5km)",km_max:5,per_km_cents:99},{name:"Zone B (5-10km)",km_max:10,per_km_cents:149}]};
      await c.query('INSERT INTO config (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value',['app',JSON.stringify(cfg)]);
      const cat1=(await c.query('INSERT INTO categories (name) VALUES ($1) RETURNING id',['Snacks'])).rows[0].id;
      const cat2=(await c.query('INSERT INTO categories (name) VALUES ($1) RETURNING id',['Getränke'])).rows[0].id;
      await c.query('INSERT INTO products (category_id,name,price_cents,image_url,variants_json,active) VALUES ($1,$2,$3,$4,$5,1)',[cat1,'Green (7€/g)',700,'/icons/green.png',JSON.stringify([{name:'3g',delta_cents:1400}])]);
      await c.query('INSERT INTO products (category_id,name,price_cents,image_url,variants_json,active) VALUES ($1,$2,$3,$4,$5,1)',[cat1,'White (80€/g)',8000,'/icons/white.png',JSON.stringify([])]);
      await c.query('INSERT INTO products (category_id,name,price_cents,image_url,variants_json,active) VALUES ($1,$2,$3,$4,$5,1)',[cat2,'Mate 0.5l',250,'/icons/mate.png',JSON.stringify([])]);
      try{ await c.query('UPDATE products SET is_new=1 WHERE name=$1',['Mate 0.5l']); }catch{}
      console.log('Seed (PG) ok');
    } else console.log('Seed (PG) übersprungen');
    await c.end(); return;
  }
  const Database=require('better-sqlite3'); const dbPath=process.env.SQLITE_DB||'./data/plug.db';
  fs.mkdirSync(path.dirname(dbPath),{recursive:true});
  const db=new Database(dbPath);
  db.exec(fs.readFileSync(path.resolve(__dirname,'schema.sql'),'utf8'));
  const { c }=db.prepare('SELECT COUNT(*) c FROM users').get();
  if(!c){
    const ins=db.prepare('INSERT INTO users (username,passhash,role,display_name) VALUES (?,?,?,?)'); const h=p=>bcrypt.hashSync(p,10);
    const admin=ins.run(process.env.SEED_ADMIN_USER||'admin',h(process.env.SEED_ADMIN_PASS||'plug1234'),'admin','Admin').lastInsertRowid;
    const cour =ins.run(process.env.SEED_COURIER_USER||'courier1',h(process.env.SEED_COURIER_PASS||'plug1234'),'courier','Kurier').lastInsertRowid;
    const cust =ins.run(process.env.SEED_CUSTOMER_USER||'customer1',h(process.env.SEED_CUSTOMER_PASS||'plug1234'),'customer','Kunde').lastInsertRowid;
    db.prepare('INSERT OR IGNORE INTO wallets (user_id,balance_cents) VALUES (?,0)').run(admin);
    db.prepare('INSERT OR IGNORE INTO wallets (user_id,balance_cents) VALUES (?,0)').run(cour);
    db.prepare('INSERT OR IGNORE INTO wallets (user_id,balance_cents) VALUES (?,500000)').run(cust);
    const cfg={pickup_address:"Kettwiger Str. 1, 45127 Essen, Germany", delivery_base_cents:299, delivery_per_km_cents:99, shipping_flat_cents:599, zones:[{name:"Zone A (0-5km)",km_max:5,per_km_cents:99},{name:"Zone B (5-10km)",km_max:10,per_km_cents:149}]};
    db.prepare('INSERT OR REPLACE INTO config (key,value) VALUES (?,?)').run('app',JSON.stringify(cfg));
    const cat1=db.prepare('INSERT INTO categories (name) VALUES (?)').run('Snacks').lastInsertRowid;
    const cat2=db.prepare('INSERT INTO categories (name) VALUES (?)').run('Getränke').lastInsertRowid;
    const insP=db.prepare('INSERT INTO products (category_id,name,price_cents,image_url,variants_json,active) VALUES (?,?,?,?,?,1)');
    insP.run(cat1,'Green (7€/g)',700,'/icons/green.png',JSON.stringify([{name:'3g',delta_cents:1400}]));
    insP.run(cat1,'White (80€/g)',8000,'/icons/white.png',JSON.stringify([]));
    insP.run(cat2,'Mate 0.5l',250,'/icons/mate.png',JSON.stringify([]));
    try{ db.prepare('ALTER TABLE products ADD COLUMN is_new INTEGER NOT NULL DEFAULT 0').run(); }catch{}
    db.prepare('UPDATE products SET is_new=1 WHERE name=?').run('Mate 0.5l');
    console.log('Seed (SQLite) ok');
  } else console.log('Seed (SQLite) übersprungen');
})();
