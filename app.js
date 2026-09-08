// ---------------------------------------------------------------
// PostStore: 게시글/댓글 데이터 계층.
// server/server.js의 REST API(/api/posts...)를 호출한다.
// 화면 렌더링 코드는 이 인터페이스만 사용하므로, API 경로가
// 바뀌어도 이 모듈 안쪽만 고치면 된다.
// ---------------------------------------------------------------
const PostStore = (() => {
  const API_BASE = "/api/posts";

  async function request(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `요청이 실패했습니다 (${res.status})`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  return {
    getAll() {
      return request(API_BASE);
    },
    getById(id) {
      return request(`${API_BASE}/${id}`);
    },
    create({ title, author, content }) {
      return request(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author, content }),
      });
    },
    remove(id) {
      return request(`${API_BASE}/${id}`, { method: "DELETE" });
    },
    addComment(postId, { author, content }) {
      return request(`${API_BASE}/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, content }),
      });
    },
  };
})();

// ---------------------------------------------------------------
// 마지막으로 사용한 닉네임 기억 (닉네임 자체는 서버가 아닌
// 브라우저 로컬 편의 기능이라 localStorage 그대로 사용)
// ---------------------------------------------------------------
const NICKNAME_KEY = "jangan-board-last-nickname";
function getLastNickname() {
  return localStorage.getItem(NICKNAME_KEY) || "";
}
function saveLastNickname(name) {
  localStorage.setItem(NICKNAME_KEY, name);
}

function showError(message) {
  alert(message);
}

// ---------------------------------------------------------------
// 화면 전환
// ---------------------------------------------------------------
const pages = {
  home: document.getElementById("page-home"),
  board: document.getElementById("page-board"),
};
const navLinks = document.querySelectorAll(".nav-link");

function showPage(name) {
  Object.entries(pages).forEach(([key, el]) => {
    el.classList.toggle("active", key === name);
  });
  navLinks.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.nav === name);
  });
  if (name === "board") {
    showBoardView("list");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-nav]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    showPage(el.dataset.nav);
  });
});

// ---------------------------------------------------------------
// 게시판 내부 뷰 전환 (목록 / 글쓰기 / 상세)
// ---------------------------------------------------------------
const boardViews = {
  list: document.getElementById("view-list"),
  write: document.getElementById("view-write"),
  detail: document.getElementById("view-detail"),
};

let currentPostId = null;

function showBoardView(name, options = {}) {
  Object.entries(boardViews).forEach(([key, el]) => {
    el.hidden = key !== name;
  });
  if (name === "list") {
    renderPostList();
  } else if (name === "detail") {
    currentPostId = options.postId;
    renderPostDetail(currentPostId);
  } else if (name === "write") {
    document.getElementById("write-author").value = getLastNickname();
  }
}

// ---------------------------------------------------------------
// 목록 렌더링
// ---------------------------------------------------------------
function formatDate(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function renderPostList() {
  const listEl = document.getElementById("post-list");
  const emptyEl = document.getElementById("empty-message");

  let posts;
  try {
    posts = await PostStore.getAll();
  } catch (err) {
    showError("게시글 목록을 불러오지 못했습니다. 서버가 실행 중인지 확인해주세요.");
    return;
  }

  listEl.innerHTML = "";
  emptyEl.hidden = posts.length > 0;

  posts.forEach((post) => {
    const li = document.createElement("li");
    li.className = "post-item";
    li.innerHTML = `
      <div class="post-item-title">${escapeHtml(post.title)}</div>
      <div class="post-item-meta">
        <span>${escapeHtml(post.author)}</span>
        <span>${formatDate(post.createdAt)}</span>
        <span>댓글 ${post.commentCount}</span>
      </div>
    `;
    li.addEventListener("click", () => showBoardView("detail", { postId: post.id }));
    listEl.appendChild(li);
  });
}

// ---------------------------------------------------------------
// 상세 렌더링
// ---------------------------------------------------------------
async function renderPostDetail(postId) {
  let post;
  try {
    post = await PostStore.getById(postId);
  } catch (err) {
    showError("게시글을 불러오지 못했습니다.");
    showBoardView("list");
    return;
  }

  document.getElementById("detail-title").textContent = post.title;
  document.getElementById("detail-author").textContent = post.author;
  document.getElementById("detail-date").textContent = formatDate(post.createdAt);
  document.getElementById("detail-content").textContent = post.content;

  const commentListEl = document.getElementById("comment-list");
  commentListEl.innerHTML = "";
  post.comments.forEach((c) => {
    const li = document.createElement("li");
    li.className = "comment-item";
    li.innerHTML = `
      <div class="comment-item-meta">
        <strong>${escapeHtml(c.author)}</strong>
        <span>${formatDate(c.createdAt)}</span>
      </div>
      <div>${escapeHtml(c.content)}</div>
    `;
    commentListEl.appendChild(li);
  });
  document.getElementById("comment-count").textContent = post.comments.length;
  document.getElementById("comment-author").value = getLastNickname();
}

// ---------------------------------------------------------------
// 이벤트: 목록 -> 글쓰기
// ---------------------------------------------------------------
document.getElementById("btn-write").addEventListener("click", () => {
  showBoardView("write");
});

document.getElementById("btn-cancel-write").addEventListener("click", () => {
  showBoardView("list");
});

document.getElementById("form-write").addEventListener("submit", async (e) => {
  e.preventDefault();
  const author = document.getElementById("write-author").value.trim();
  const title = document.getElementById("write-title").value.trim();
  const content = document.getElementById("write-content").value.trim();
  if (!author || !title || !content) return;

  try {
    saveLastNickname(author);
    const post = await PostStore.create({ author, title, content });
    document.getElementById("form-write").reset();
    showBoardView("detail", { postId: post.id });
  } catch (err) {
    showError("글 등록에 실패했습니다. 서버가 실행 중인지 확인해주세요.");
  }
});

// ---------------------------------------------------------------
// 이벤트: 상세 -> 목록, 삭제
// ---------------------------------------------------------------
document.getElementById("btn-back-to-list").addEventListener("click", () => {
  showBoardView("list");
});

document.getElementById("btn-delete-post").addEventListener("click", async () => {
  if (!currentPostId) return;
  if (!confirm("이 글을 삭제할까요? 댓글도 함께 삭제됩니다.")) return;
  try {
    await PostStore.remove(currentPostId);
    showBoardView("list");
  } catch (err) {
    showError("삭제에 실패했습니다.");
  }
});

// ---------------------------------------------------------------
// 이벤트: 댓글 작성
// ---------------------------------------------------------------
document.getElementById("form-comment").addEventListener("submit", async (e) => {
  e.preventDefault();
  const author = document.getElementById("comment-author").value.trim();
  const content = document.getElementById("comment-content").value.trim();
  if (!author || !content || !currentPostId) return;

  try {
    saveLastNickname(author);
    await PostStore.addComment(currentPostId, { author, content });
    document.getElementById("comment-content").value = "";
    renderPostDetail(currentPostId);
  } catch (err) {
    showError("댓글 등록에 실패했습니다.");
  }
});

// ---------------------------------------------------------------
// 초기화
// ---------------------------------------------------------------
document.getElementById("comment-author").value = getLastNickname();
showPage("home");
