const express = require("express");
const { Pool } = require("pg");

const app = express();

const pool = new Pool({
 connectionString: process.env.DATABASE_URL,
 ssl: { rejectUnauthorized: false }
});

app.get("/", (req,res)=>{
 res.send("License Server Running");
});

app.get("/check", async (req,res)=>{

 const account = req.query.account;

 if(!account)
  return res.json({status:"error",message:"no account"});

 try{

  const result = await pool.query(
   "SELECT * FROM licenses WHERE account=$1",
   [account]
  );

  if(result.rows.length===0)
   return res.json({status:"invalid"});

  const lic = result.rows[0];

  if(lic.status!="active")
   return res.json({status:"disabled"});

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
app.listen(port, ()=> console.log("server running"));
