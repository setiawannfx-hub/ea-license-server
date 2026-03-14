const express = require("express");
const { Pool } = require("pg");

const app = express();

const pool = new Pool({
 connectionString: process.env.DATABASE_URL,
 ssl: { rejectUnauthorized: false }
});

// ===============================
// GENERATE LICENSE KEY
// ===============================
function generateKey()
{
 const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

 let key="SSFX-";

 for(let i=0;i<6;i++)
  key+=chars[Math.floor(Math.random()*chars.length)];

 return key;
}

// ===============================
// ROOT TEST
// ===============================
app.get("/",(req,res)=>{
 res.send("SSFX License Server Running");
});

// ===============================
// GENERATE LICENSE
// ===============================
app.get("/generate", async (req,res)=>{

 const product = req.query.product || "SSFX";
 const expiry = req.query.expiry || "2026-12-31";

 const key = generateKey();

 try{

  await pool.query(
   "INSERT INTO licenses(license_key,product,expiry,status) VALUES($1,$2,$3,'active')",
   [key,product,expiry]
  );

  res.json({
   status:"ok",
   license_key:key
  });

 }catch(e)
 {
  res.json({status:"error"});
 }

});

// ===============================
// CHECK LICENSE
// ===============================
app.get("/check", async (req,res)=>{

 const account = req.query.account;
 const key = req.query.key;
 const product = req.query.product;

 if(!account || !key)
  return res.json({status:"invalid"});

 try{

  const result = await pool.query(
   "SELECT * FROM licenses WHERE license_key=$1",
   [key]
  );

  if(result.rows.length===0)
   return res.json({status:"invalid"});

  const lic = result.rows[0];

  if(lic.status!="active")
   return res.json({status:"disabled"});

  if(lic.product!=product)
   return res.json({status:"invalid_product"});

  const expiry = new Date(lic.expiry);

  if(new Date()>expiry)
   return res.json({status:"expired"});

  // BIND ACCOUNT FIRST TIME
  if(!lic.account)
  {
   await pool.query(
    "UPDATE licenses SET account=$1 WHERE license_key=$2",
    [account,key]
   );
  }
  else
  {
   if(lic.account!=account)
    return res.json({status:"account_mismatch"});
  }

  res.json({
   status:"ok",
   expiry:lic.expiry
  });

 }
 catch(e)
 {
  res.json({status:"error"});
 }

});

const port = process.env.PORT || 3000;

app.listen(port,()=>{
 console.log("License server running");
});
