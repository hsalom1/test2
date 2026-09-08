export async function onRequestGet({ env, params }) {
  const post = await env.DB.prepare(
    "SELECT id, author, title, content, created_at AS createdAt FROM posts WHERE id = ?"
  )
    .bind(params.id)
    .first();

  if (!post) {
    return Response.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
  }

  const { results: comments } = await env.DB.prepare(
    "SELECT id, author, content, created_at AS createdAt FROM comments WHERE post_id = ? ORDER BY created_at ASC"
  )
    .bind(params.id)
    .all();

  return Response.json({ ...post, comments });
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare("DELETE FROM comments WHERE post_id = ?").bind(params.id).run();
  await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(params.id).run();
  return new Response(null, { status: 204 });
}
