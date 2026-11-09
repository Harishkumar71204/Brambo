"use strict";
/* Dev helper: creates the accounts listed in ../users.json (passwords are hashed). Run: npm run seed */
require("dotenv").config();
const fs = require("fs"), path = require("path"), mongoose = require("mongoose"), bcrypt = require("bcryptjs");
const { User } = require("./server");

(async () => {
  const list = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "users.json"), "utf8")).users || [];
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/brambo");
  for (const s of list) {
    const lower = s.username.toLowerCase();
    if (await User.exists({ usernameLower: lower })) { console.log("exists :", s.username); continue; }
    await User.create({ username: s.username, usernameLower: lower, email: s.email.toLowerCase(), passwordHash: await bcrypt.hash(s.password, 12) });
    console.log("created:", s.username);
  }
  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
