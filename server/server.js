"use strict";
/* Brambo auth API: Express + MongoDB (Mongoose) + bcryptjs + JWT.
   Endpoints: POST /api/signup, POST /api/login, GET /api/me, GET /api/health */
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/brambo";
const JWT_SECRET = process.env.JWT_SECRET || "brambo_default_dev_secret_key_12345";
const TOKEN_TTL = process.env.TOKEN_TTL || "7d";
const SALT_ROUNDS = 12;

/* ---------- model ---------- */
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  usernameLower: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema);

/* ---------- helpers ---------- */
const USERNAME_RE = /^[A-Za-z0-9_.]{3,20}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const isStr = v => typeof v === "string";
const publicUser = u => ({ id: String(u._id), username: u.username, email: u.email });
const sign = u => jwt.sign({ sub: String(u._id) }, JWT_SECRET, { expiresIn: TOKEN_TTL });
const DUMMY_HASH = bcrypt.hashSync("brambo-dummy-password", SALT_ROUNDS);
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

/* ---------- app ---------- */
const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

// Dynamic CORS configuration allowing localhost, local LAN IPs, and explicit CLIENT_ORIGIN values
const allowed = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map(s => s.trim())
  : null;

const devOriginRegex = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowed && allowed.includes(origin)) return cb(null, true);
      if (devOriginRegex.test(origin)) return cb(null, true);
      return cb(new Error(`CORS policy violation: Origin '${origin}' not allowed.`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

/* ---------- routes ---------- */
app.get("/api/health", (req, res) => res.json({ ok: true, status: "healthy" }));

app.post(
  "/api/signup",
  wrap(async (req, res) => {
    const { username, email, password } = req.body || {};
    if (![username, email, password].every(isStr)) {
      return res.status(400).json({ message: "Username, email and password are required." });
    }
    const name = username.trim(),
      mail = email.trim().toLowerCase();

    if (!USERNAME_RE.test(name)) {
      return res.status(400).json({ message: "Username must be 3-20 letters, numbers, dots or underscores." });
    }
    if (!EMAIL_RE.test(mail)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: "Password must be 8-72 characters." });
    }

    if (await User.exists({ usernameLower: name.toLowerCase() })) {
      return res.status(409).json({ message: "That username is taken." });
    }
    if (await User.exists({ email: mail })) {
      return res.status(409).json({ message: "An account with that email already exists." });
    }

    const user = await User.create({
      username: name,
      usernameLower: name.toLowerCase(),
      email: mail,
      passwordHash: await bcrypt.hash(password, SALT_ROUNDS)
    });

    res.status(201).json({ token: sign(user), user: publicUser(user) });
  })
);

app.post(
  "/api/login",
  wrap(async (req, res) => {
    const { identifier, password } = req.body || {};
    if (!isStr(identifier) || !isStr(password)) {
      return res.status(400).json({ message: "Enter your username or email and password." });
    }
    const id = identifier.trim().toLowerCase();
    const user = await User.findOne({ $or: [{ usernameLower: id }, { email: id }] });
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) {
      return res.status(401).json({ message: "Username, email or password is incorrect." });
    }
    res.json({ token: sign(user), user: publicUser(user) });
  })
);

app.get(
  "/api/me",
  wrap(async (req, res) => {
    const m = /^Bearer (.+)$/.exec(req.get("authorization") || "");
    let payload;
    try {
      payload = m && jwt.verify(m[1], JWT_SECRET);
    } catch {
      payload = null;
    }
    const user = payload && (await User.findById(payload.sub));
    if (!user) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }
    res.json({ user: publicUser(user) });
  })
);

app.use("/api", (req, res) => res.status(404).json({ message: "Not found." }));

/* ---------- error handler ---------- */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON." });
  }
  if (err && err.code === 11000) {
    return res.status(409).json({ message: "That username or email is already registered." });
  }
  console.error("Server Error:", err);
  res.status(500).json({ message: err.message || "Something went wrong on the server." });
});

/* ---------- start ---------- */
if (require.main === module) {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Brambo API running on http://localhost:${PORT} (MongoDB connected)`);
      });
    })
    .catch(e => {
      console.error("Could not connect to MongoDB:", e.message);
      if (MONGO_URI.includes("mongodb+srv")) {
        console.error("Note: If using MongoDB Atlas, check your IP Whitelist under Network Access.");
      }
      process.exit(1);
    });
}

module.exports = { app, User };
