import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ---------- Postgres Pool ---------- */
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432
});

pool.connect()
  .then(client => {
    return client.query("SELECT NOW()")
      .then(res => {
        console.log("✅ PostgreSQL connected:", res.rows[0]);
        client.release();
      })
      .catch(err => {
        client.release();
        console.error("❌ PostgreSQL TEST QUERY FAILED:", err.message);
      });
  })
  .catch(err => {
    console.error("❌ PostgreSQL CONNECTION FAILED:", err.message);
  });

console.log("Loaded ENV:", process.env.DB_HOST);




/* ---------- Multer (file uploads) ---------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

/* ---------- Helpers ---------- */
const signToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET || "devsecret", { expiresIn: "7d" });

const authMiddleware = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No token" });
  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

/* ---------- Routes ---------- */
/* Render index */
app.get("/", (req, res) => res.render("index"));

/* --------- AUTH / REGISTRATION --------- */

/* Player registration:
   Expects JSON body: { email, password, full_name, phone, dob, gender, city, state, locality, position, experience_level, preferred_foot, height, weight, bio }
*/
app.post("/api/register/player", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      email, password, full_name, phone, dob, gender, city, state, locality,
      position, experience_level, preferred_foot, height, weight, bio
    } = req.body;

    await client.query("BEGIN");

    const hashed = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      `INSERT INTO users(email, password, role) VALUES($1,$2,'player') RETURNING id, email, role`,
      [email, hashed]
    );
    const userId = userRes.rows[0].id;

    const playerRes = await client.query(
      `INSERT INTO players(user_id, full_name, phone, dob, gender, city, state, locality, position, experience_level, preferred_foot, height, weight, bio)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [userId, full_name, phone || null, dob || null, gender || null, city || null, state || null, locality || null, position || null, experience_level || null, preferred_foot || null, height || null, weight || null, bio || null]
    );

    await client.query("COMMIT");

    const token = signToken({ id: userId, role: "player" });

    res.json({ success: true, token, user: { id: userId, role: "player" }, playerId: playerRes.rows[0].id });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    if (err.code === "23505") return res.status(400).json({ error: "Email already exists" });
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* Club registration: multipart/form-data with files
   fields: clubName, email, password, contact_person, contact_phone, website, established_date, city, state, pin, locality, members, description
   files: certificate (1), groundPhotos (multiple)
*/
app.post("/api/register/club", upload.fields([{ name: "certificate", maxCount: 1 }, { name: "groundPhotos", maxCount: 10 }]), async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body;
    const files = req.files || {};

    const email = body.email;
    const password = body.password;
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    await client.query("BEGIN");

    const hashed = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      `INSERT INTO users(email, password, role) VALUES($1,$2,'club') RETURNING id`,
      [email, hashed]
    );
    const userId = userRes.rows[0].id;

    const certificate = files.certificate ? files.certificate[0].filename : null;
    const photos = files.groundPhotos ? files.groundPhotos.map(f => f.filename) : [];

    const clubRes = await client.query(
      `INSERT INTO clubs(user_id, name, contact_person, contact_phone, website, established_date, city, state, pin, locality, members, description, certificate, photos)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [
        userId,
        body.clubName || null,
        body.contact_person || null,
        body.contact_phone || null,
        body.website || null,
        body.established_date || null,
        body.city || null,
        body.state || null,
        body.pin || null,
        body.locality || null,
        body.members ? parseInt(body.members) : null,
        body.description || null,
        certificate,
        photos
      ]
    );

    await client.query("COMMIT");
    const token = signToken({ id: userId, role: "club" });
    res.json({ success: true, token, user: { id: userId, role: "club" }, clubId: clubRes.rows[0].id, uploaded: { certificate, photos } });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    if (err.code === "23505") return res.status(400).json({ error: "Email already exists" });
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* Login (player or club)
   body: { email, password }
   we return token & role info
*/
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userRes = await pool.query("SELECT id, email, password, role FROM users WHERE email=$1", [email]);
    if (userRes.rowCount === 0) return res.status(400).json({ error: "Invalid credentials" });
    const user = userRes.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    const token = signToken({ id: user.id, role: user.role });
    res.json({ success: true, token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});



/* -----------------------------------------------------------
   GET LOGGED-IN PLAYER PROFILE (via JWT)
   Route: GET /api/me/player
----------------------------------------------------------- */
app.get("/api/me/player", authMiddleware, async (req, res) => {
  try {
    // ensure logged in user is a player
    if (req.user.role !== "player")
      return res.status(403).json({ error: "Only players can access this endpoint" });

    // fetch player row
    const player = (
      await pool.query(
        `SELECT p.*, u.email 
         FROM players p 
         JOIN users u ON p.user_id = u.id 
         WHERE p.user_id = $1`,
        [req.user.id]
      )
    ).rows[0];

    if (!player)
      return res.status(404).json({ error: "Player profile not found" });

    // fetch player skills
    const skills = (
      await pool.query(
        "SELECT skill_name, rating FROM player_skills WHERE player_id = $1",
        [player.id]
      )
    ).rows;

    // fetch clubs the player has joined (active/pending)
    const clubs = (
      await pool.query(
        `SELECT c.id, c.name, c.city, c.state, cm.status, cm.joined_at
         FROM club_memberships cm
         JOIN clubs c ON cm.club_id = c.id
         WHERE cm.player_id = $1`,
        [player.id]
      )
    ).rows;

    // matches played count (if you track matches)
    const matchCountRes = await pool.query(
      `SELECT COUNT(*) FROM matches 
       WHERE team_a = $1 OR team_b = $1`,
      [player.full_name] // optional mapping
    );

    const matchCount = parseInt(matchCountRes.rows[0].count || 0);

    res.json({
      success: true,
      profile: {
        ...player,
        skills,
        clubs,
        stats: {
          matches: matchCount,
          clubs: clubs.length
        }
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});




/* ---------- PROFILE GETTERS ---------- */

/* Get player profile by player id */
app.get("/api/players/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const p = await pool.query("SELECT p.*, u.email FROM players p JOIN users u ON p.user_id = u.id WHERE p.id=$1", [id]);
    if (p.rowCount === 0) return res.status(404).json({ error: "Player not found" });

    const skills = (await pool.query("SELECT skill_name, rating FROM player_skills WHERE player_id=$1", [id])).rows;
    res.json({ ...p.rows[0], skills });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* Get club profile by club id */
app.get("/api/clubs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const c = await pool.query("SELECT c.*, u.email FROM clubs c JOIN users u ON c.user_id = u.id WHERE c.id=$1", [id]);
    if (c.rowCount === 0) return res.status(404).json({ error: "Club not found" });

    const members = (await pool.query(
      `SELECT cm.id, cm.status, cm.joined_at, p.id as player_id, p.full_name 
       FROM club_memberships cm
       JOIN players p ON cm.player_id = p.id
       WHERE cm.club_id = $1`, [id]
    )).rows;

    res.json({ ...c.rows[0], members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* List clubs (basic) */
app.get("/api/clubs", async (req, res) => {
  try {
    const list = (await pool.query("SELECT id, name, city, state, locality, members, photos FROM clubs ORDER BY created_at DESC LIMIT 100")).rows;
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* List matches */
app.get("/api/matches", async (req, res) => {
  try {
    const rows = (await pool.query("SELECT * FROM matches ORDER BY match_date DESC LIMIT 100")).rows;
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* Create match (auth required) */
app.post("/api/matches", authMiddleware, async (req, res) => {
  try {
    const { title, team_a, team_b, match_date, location } = req.body;
    const r = await pool.query(
      `INSERT INTO matches(title, team_a, team_b, match_date, location, created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
      [title, team_a, team_b, match_date || null, location || null, req.user.id]
    );
    res.json({ success: true, matchId: r.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* Join a club (player only) */
app.post("/api/clubs/:id/join", authMiddleware, async (req, res) => {
  try {
    // ensure user is player and has a players row
    if (req.user.role !== "player") return res.status(403).json({ error: "Only players can join clubs" });

    // find player id
    const playerRow = (await pool.query("SELECT id FROM players WHERE user_id=$1", [req.user.id]));
    if (playerRow.rowCount === 0) return res.status(400).json({ error: "Player profile not found" });
    const playerId = playerRow.rows[0].id;
    const clubId = parseInt(req.params.id);

    await pool.query(
      `INSERT INTO club_memberships(player_id, club_id, status) VALUES($1,$2,'pending') ON CONFLICT (player_id, club_id) DO NOTHING`,
      [playerId, clubId]
    );

    res.json({ success: true, message: "Join request sent (or already exists)" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});



/* ---------- FOOTBALL NEWS ---------- */
app.get("/api/news/:type", async (req, res) => {
  const type = req.params.type === "world" ? "world" : "india";
  const key = process.env.FOOTBALL_API_KEY; // <- changed from NEWS_API_KEY
  if (!key) {
    // return a simple fallback so frontend can still show something during dev
    return res.json([{
      title: "News API key not configured",
      description: "Set FOOTBALL_API_KEY in your .env to fetch live news.",
      url: "#",
      published: new Date().toISOString()
    }]);
  }

  try {
    const q = type === "india" ? "Indian+football" : "football";
    const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&apiKey=${key}`;
    const data = await fetch(url).then(r => r.json());
    if (!data || !data.articles) return res.status(502).json({ error: "Bad response from news provider" });

    res.json(data.articles.map(a => ({
      title: a.title,
      description: a.description,
      url: a.url,
      published: a.publishedAt
    })));
  } catch (err) {
    console.error("News fetch error:", err);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});




/* ---------- SOCIAL: posts / likes / comments ---------- */

/* List feed (latest posts) */
app.get("/api/social/posts", async (req, res) => {
  try {
    const posts = (await pool.query(
      `SELECT p.id, p.content, p.media, p.created_at, p.user_id, u.role, 
              CASE WHEN u.role='player' THEN pl.full_name ELSE c.name END as author_name
       FROM social_posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN players pl ON pl.user_id = u.id
       LEFT JOIN clubs c ON c.user_id = u.id
       ORDER BY p.created_at DESC LIMIT 100`
    )).rows;
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* Create post (auth, can include media upload) */
app.post("/api/social/posts", authMiddleware, upload.array("media", 6), async (req, res) => {
  try {
    const media = req.files ? req.files.map(f => f.filename) : [];
    const { content } = req.body;
    if (!content && media.length === 0) return res.status(400).json({ error: "content or media required" });

    const r = await pool.query(
      `INSERT INTO social_posts(user_id, content, media) VALUES($1,$2,$3) RETURNING id`,
      [req.user.id, content || null, media.length ? media : null]
    );
    res.json({ success: true, postId: r.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* Like a post */
app.post("/api/social/posts/:id/like", authMiddleware, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    await pool.query(
      `INSERT INTO social_likes(post_id, user_id) VALUES($1,$2) ON CONFLICT (post_id, user_id) DO NOTHING`,
      [postId, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* Comment on a post */
app.post("/api/social/posts/:id/comment", authMiddleware, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ error: "comment required" });

    const r = await pool.query(
      `INSERT INTO social_comments(post_id, user_id, comment) VALUES($1,$2,$3) RETURNING id`,
      [postId, req.user.id, comment]
    );
    res.json({ success: true, commentId: r.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* Get post details with counts */
app.get("/api/social/posts/:id", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = (await pool.query("SELECT * FROM social_posts WHERE id=$1", [postId])).rows[0];
    if (!post) return res.status(404).json({ error: "Not found" });

    const likes = (await pool.query("SELECT count(*) FROM social_likes WHERE post_id=$1", [postId])).rows[0].count;
    const comments = (await pool.query("SELECT id, comment, user_id, created_at FROM social_comments WHERE post_id=$1 ORDER BY created_at ASC", [postId])).rows;

    res.json({ post, likes: parseInt(likes, 10), comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* Add or update skill for player */
app.post("/api/players/:id/skills", authMiddleware, async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    // ensure the requester is the owner or admin
    const playerRow = (await pool.query("SELECT user_id FROM players WHERE id=$1", [playerId])).rows[0];
    if (!playerRow) return res.status(404).json({ error: "Player not found" });
    if (req.user.id !== playerRow.user_id && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    const { skill_name, rating } = req.body;
    if (!skill_name || (!rating && rating !== 0)) return res.status(400).json({ error: "skill_name and rating required" });

    await pool.query(
      `INSERT INTO player_skills(player_id, skill_name, rating) VALUES($1,$2,$3)
       ON CONFLICT (player_id, skill_name) DO UPDATE SET rating = EXCLUDED.rating`,
      [playerId, skill_name, rating]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------- Admin/simple helpers ---------- */

/* Simple search for players/clubs */
app.get("/api/search", async (req, res) => {
  const q = req.query.q || "";
  try {
    const players = (await pool.query("SELECT id, full_name, city FROM players WHERE full_name ILIKE $1 LIMIT 10", [`%${q}%`])).rows;
    const clubs = (await pool.query("SELECT id, name, city FROM clubs WHERE name ILIKE $1 LIMIT 10", [`%${q}%`])).rows;
    res.json({ players, clubs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------- Start ---------- */
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
