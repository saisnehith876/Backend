# URL Shortener API

A simple URL shortening service built with Express and MongoDB (Mongoose).

---

## Table of Contents

- [Getting Started](#getting-started)
- [Testing the API with curl](#testing-the-api-with-curl)
- [Request Flow (Big Picture)](#request-flow-big-picture)
- [File-by-File Breakdown](#file-by-file-breakdown)
- [Why This Structure?](#why-this-structure)
- [Checking Data Stored in MongoDB](#checking-data-stored-in-mongodb)
- [Common Issues](#common-issues)

---

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root (see [`.env` section](#env--configuration-not-code) below).
3. Start the server:
   ```bash
   npm run dev
   ```

You only run `npm run dev` **once per session** — not before every request. It stays running in the background (that terminal tab) and handles every request you send it, for as long as it's up. You'd only restart it if it crashes, or if nodemon doesn't auto-pick up a change (it usually does).

Think of it like this: `npm run dev` turns on a "URL shortening machine" that sits there waiting. Each `curl` command feeds it one URL and gets back a short one — the machine doesn't shut off between requests.

---

## Testing the API with curl

Open a **second terminal** (keep the server running in the first) and run:

```bash
curl -X POST http://localhost:8000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://your-actual-url-here.com"}'
```

Other useful endpoints:

```bash
# Get all shortened URLs
curl http://localhost:8000/api/urls

# Delete a shortened URL
curl -X DELETE http://localhost:8000/api/urls/<shortCode>

# Follow a short URL (redirects to the original long URL)
curl -L http://localhost:8000/<shortCode>
```

---

## Request Flow (Big Picture)

A request flows through the files in a specific order, like a pipeline:

```
curl request
    ↓
server.js       (starts everything)
    ↓
app.js          (the request enters here)
    ↓
url.routes.js   (decides WHICH controller function handles this URL)
    ↓
url.controller.js  (does the actual work — talks to the database)
    ↓
url.model.js    (defines what a "Url" document looks like in MongoDB)
    ↓
MongoDB
    ↓
response flows back out
    ↓
(if anything throws an error anywhere in this chain → errorHandler.js catches it)
```

---

## File-by-File Breakdown

### `.env` — configuration, not code

Things like your database URL, port number, and (later) secret keys change between your laptop, a teammate's laptop, and production. These are never hard-coded into `.js` files — partly for flexibility, partly to avoid accidentally committing secrets to GitHub (that's why `.env` is in `.gitignore`).

**Connects to:** `db.js` reads `MONGO_URI` from here. `server.js` reads `PORT`. `url.controller.js` reads `BASE_URL`.

Example `.env`:
```
PORT=8000
MONGO_URI=mongodb://127.0.0.1:27017/url-shortener
BASE_URL=http://localhost:8000
```

---

### `server.js` — the entry point / ignition switch

Its only job: load env variables → connect to the database → start listening for requests.

```js
require("dotenv").config();        // load .env FIRST, before anything needs it
const app = require("./app");       // import the configured Express app
const connectDB = require("./config/db");

connectDB().then(() => {
  app.listen(PORT, ...);            // only start accepting requests AFTER DB is ready
});
```

**Why separate from `app.js`?** `app.js` defines *what* your app does (routes, middleware); `server.js` defines *how it gets started*. Splitting them means you can test `app.js` (e.g. with Supertest) without actually starting a live server on a port. This is why almost every real Express project is structured this way.

---

### `app.js` — the app's configuration / assembly line

This is where global middleware (things that run on *every* request) is registered and routes are plugged in.

```js
app.use(express.json());     // without this, req.body would be undefined
app.use(morgan("dev"));      // logs every request to your terminal
app.use("/", urlRoutes);     // "for any request, check urlRoutes to see who handles it"
app.use(errorHandler);       // must be LAST — catches errors from anything above it
```

**Order matters.** Express processes middleware top-to-bottom. If `errorHandler` were placed before `urlRoutes`, it would never catch anything, because by the time an error happens further down, Express has already "passed" that line.

---

### `url.routes.js` — the traffic director

Separates *"which URL maps to which function"* from *"what that function actually does."* This file has zero logic — it's just a map.

```js
router.post("/api/shorten", shortenUrl);   // POST here → run shortenUrl()
router.get("/api/urls", getAllUrls);
router.delete("/api/urls/:code", deleteUrl);
router.get("/:code", redirectToLongUrl);   // catch-all, must be LAST
```

**Why does order matter here too?** `/:code` matches *any* path segment — including `/api/urls` if it were listed first. Express checks routes top-to-bottom and uses the first match, so specific routes must come before generic/catch-all ones.

**Connects to:** imports functions from `url.controller.js`, gets mounted into `app.js`.

---

### `url.controller.js` — the actual logic / the "brain"

This is where the real work happens — reading the request, validating input, talking to the database, shaping the response. Routes just *point* here; this is where the thinking happens.

```js
const shortenUrl = async (req, res, next) => {
  const { longUrl } = req.body;   // pulled from the JSON you sent via curl
  const shortCode = nanoid(7);
  const newUrl = await Url.create({ longUrl, shortCode });  // talks to MongoDB
  res.status(201).json({ ... });   // sends the response back to curl
};
```

**Why separate from routes?** If the app grows, the same logic might need to be reachable from multiple routes, or tested without spinning up the whole HTTP layer. Keeping logic out of the routing file makes both possible.

**Connects to:** imports `Url` from `url.model.js` to talk to MongoDB. Calls `next(err)` on failure, which hands off to `errorHandler.js`.

---

### `url.model.js` — the shape of your data

MongoDB itself doesn't enforce structure — you *could* save any random fields to any collection. Mongoose (the library) lets you define a **schema**, so your code (and the database) knows exactly what a "Url" document should look like, with types and constraints enforced automatically.

```js
const urlSchema = new mongoose.Schema({
  longUrl: { type: String, required: true },
  shortCode: { type: String, required: true, unique: true, index: true },
  clicks: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Url", urlSchema);
```

- `required: true` → Mongoose rejects a save if this field is missing
- `unique: true` → MongoDB enforces no two documents can share a `shortCode`
- `index: true` → makes lookups by `shortCode` fast (why the redirect endpoint stays quick even with thousands of URLs)
- `timestamps: true` → auto-adds `createdAt`/`updatedAt` — that's why those appear in the curl response without writing any code for them

**Connects to:** imported directly into `url.controller.js` — every `Url.create()`, `Url.findOne()`, etc. is a method Mongoose provides *because* of this schema.

---

### `config/db.js` — the database connector

Connecting to MongoDB is its own piece of setup logic, separate from "what does my app do." Isolating it here means `server.js` can just say "connect, then start" without knowing *how* the connection works.

```js
const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
};
```

**Connects to:** reads `MONGO_URI` from `.env`, called once by `server.js` on startup.

---

### `middleware/errorHandler.js` — the safety net

Without this, an unhandled error would either crash the server or leak a raw stack trace to whoever's calling the API (bad — security risk, and ugly UX). This file is the **one place** all errors funnel through, so responses stay consistent and clean.

```js
const errorHandler = (err, req, res, next) => {
  res.status(err.statusCode || 500).json({ message: err.message || "Something went wrong" });
};
```

**How it gets triggered:** every time `next(err)` is called inside `url.controller.js`, Express skips all normal middleware/routes and jumps straight to this function, because it has **4 parameters** (`err, req, res, next`) — the special signature Express uses to recognize "this is an error handler," not a normal middleware.

**Connects to:** registered last in `app.js`, so it's the final stop for any error from anywhere upstream.

---

## Why This Structure?

This is called **separation of concerns** — every file has exactly one job:

| File | Its one job |
|---|---|
| `server.js` | start the app |
| `app.js` | configure middleware + routes |
| `url.routes.js` | map URL → function |
| `url.controller.js` | business logic |
| `url.model.js` | define data shape |
| `db.js` | connect to database |
| `errorHandler.js` | handle failures consistently |

The payoff: when a future Auth Service adds `user.model.js` and `auth.controller.js`, they slot into this same pattern without touching what already exists. That's also what an interviewer means by "clean architecture" — it's not about being fancy, it's about each piece being replaceable/testable/understandable in isolation.

---

## Checking Data Stored in MongoDB

There are a few ways to look at what's actually being saved in your database.

### Option 1: MongoDB Shell (`mongosh`)

If you don't have it, install it:
```bash
brew install mongosh
```

Connect (adjust the URI to match your `.env`):
```bash
mongosh "mongodb://127.0.0.1:27017/url-shortener"
```

Once connected, useful commands:
```js
// List all collections in this database
show collections

// See all documents in the urls collection
db.urls.find().pretty()

// Find one specific document by shortCode
db.urls.findOne({ shortCode: "abc1234" })

// Count how many URLs are stored
db.urls.countDocuments()

// Delete a document manually (careful!)
db.urls.deleteOne({ shortCode: "abc1234" })

// Wipe the whole collection (careful!)
db.urls.deleteMany({})
```

### Option 2: MongoDB Compass (GUI)

If you prefer a visual tool instead of the shell:
1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect using the same `MONGO_URI` from your `.env`
3. Navigate to your database → `urls` collection to browse, filter, and edit documents visually

This is usually the easiest option if you're not comfortable with shell commands.

### Option 3: Through your own API

Since you already built a `GET /api/urls` route, you can just check the data through your own app:
```bash
curl http://localhost:8000/api/urls
```

This is the "app's own view" of the data — useful for confirming your controller and model are working correctly, though it only shows what your route chooses to return (Compass/mongosh show the raw documents).

### Option 4: VS Code extension

If you use VS Code, the **MongoDB for VS Code** extension lets you connect to your database and browse collections without leaving your editor.

---

## Common Issues

| Symptom | Likely Cause |
|---|---|
| `req.body` is `undefined` | Missing `app.use(express.json())` in `app.js`, or missing `Content-Type: application/json` header in curl |
| `MongooseServerSelectionError` | MongoDB isn't running locally, or `MONGO_URI` in `.env` is wrong |
| `/api/urls` matches the redirect route instead | `/:code` catch-all route is defined *before* specific routes in `url.routes.js` |
| Error responses show a raw stack trace | `errorHandler.js` isn't registered last in `app.js`, or isn't registered at all |
| `shortCode` collision error | `unique: true` in the schema caught a duplicate — very rare with `nanoid`, but possible |
