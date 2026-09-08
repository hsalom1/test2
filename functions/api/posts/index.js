export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.author, p.title, p.content, p.created_at AS createdAt,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS commentCount
     FROM posts p
     ORDER BY p.created_at DESC`
  ).all();
  return Response.json(results);
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.author || !body.title || !body.content) {
    return Response.json({ error: "author, title, content는 필수입니다." }, { status: 400 });
  }

  const post = {
    id: crypto.randomUUID(),
    author: String(body.author).slice(0, 20),
    title: String(body.title).slice(0, 60),
    content: String(body.content).slice(0, 4000),
    createdAt: Date.now(),
  };

  await env.DB.prepare(
    "INSERT INTO posts (id, author, title, content, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(post.id, post.author, post.title, post.content, post.createdAt)
    .run();

  return Response.json({ ...post, comments: [] }, { status: 201 });
}
