const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "board.db");
const PUBLIC_DIR = path.join(__dirname, "..");

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    author TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

function getComments(postId) {
  return db
    .prepare("SELECT id, author, content, created_at AS createdAt FROM comments WHERE post_id = ? ORDER BY created_at ASC")
    .all(postId);
}

function getCommentCount(postId) {
  return db.prepare("SELECT COUNT(*) AS count FROM comments WHERE post_id = ?").get(postId).count;
}

const app = express();
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// 목록 조회
app.get("/api/posts", (req, res) => {
  const posts = db.prepare("SELECT id, author, title, content, created_at AS createdAt FROM posts ORDER BY created_at DESC").all();
  res.json(posts.map((post) => ({ ...post, commentCount: getCommentCount(post.id) })));
});

// 상세 조회
app.get("/api/posts/:id", (req, res) => {
  const post = db
    .prepare("SELECT id, author, title, content, created_at AS createdAt FROM posts WHERE id = ?")
    .get(req.params.id);
  if (!post) return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
  res.json({ ...post, comments: getComments(post.id) });
});

// 글 작성
app.post("/api/posts", (req, res) => {
  const { author, title, content } = req.body || {};
  if (!author || !title || !content) {
    return res.status(400).json({ error: "author, title, content는 필수입니다." });
  }
  const post = {
    id: crypto.randomUUID(),
    author: String(author).slice(0, 20),
    title: String(title).slice(0, 60),
    content: String(content).slice(0, 4000),
    createdAt: Date.now(),
  };
  db.prepare("INSERT INTO posts (id, author, title, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
    post.id,
    post.author,
    post.title,
    post.content,
    post.createdAt
  );
  res.status(201).json({ ...post, comments: [] });
});

// 글 삭제
app.delete("/api/posts/:id", (req, res) => {
  db.prepare("DELETE FROM comments WHERE post_id = ?").run(req.params.id);
  db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

// 댓글 작성
app.post("/api/posts/:id/comments", (req, res) => {
  const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });

  const { author, content } = req.body || {};
  if (!author || !content) {
    return res.status(400).json({ error: "author, content는 필수입니다." });
  }
  const comment = {
    id: crypto.randomUUID(),
    author: String(author).slice(0, 20),
    content: String(content).slice(0, 200),
    createdAt: Date.now(),
  };
  db.prepare("INSERT INTO comments (id, post_id, author, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
    comment.id,
    req.params.id,
    comment.author,
    comment.content,
    comment.createdAt
  );
  res.status(201).json(comment);
});

app.listen(PORT, () => {
  console.log(`장안구민회관 서버 실행 중: http://localhost:${PORT}`);
});
