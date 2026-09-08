export async function onRequestPost({ request, env, params }) {
  const post = await env.DB.prepare("SELECT id FROM posts WHERE id = ?").bind(params.id).first();
  if (!post) {
    return Response.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.author || !body.content) {
    return Response.json({ error: "author, content는 필수입니다." }, { status: 400 });
  }

  const comment = {
    id: crypto.randomUUID(),
    author: String(body.author).slice(0, 20),
    content: String(body.content).slice(0, 200),
    createdAt: Date.now(),
  };

  await env.DB.prepare(
    "INSERT INTO comments (id, post_id, author, content, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(comment.id, params.id, comment.author, comment.content, comment.createdAt)
    .run();

  return Response.json(comment, { status: 201 });
}
