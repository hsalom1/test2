// ---------------------------------------------------------------
// PostStore: 게시글/댓글 데이터 계층.
// 지금은 localStorage로 동작하지만, 백엔드 연동 시에는
// 이 안의 구현만 fetch() 호출로 바꾸면 되고 화면 렌더링 코드는
// 그대로 재사용할 수 있도록 인터페이스를 분리해둠.
// ---------------------------------------------------------------
const PostStore = (() => {
  const STORAGE_KEY = "jangan-board-posts";

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function save(posts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }

  function seedIfEmpty() {
    let posts = load();
    if (posts === null) {
      posts = [
        {
          id: crypto.randomUUID(),
          title: "장안구민회관 자유게시판에 오신 것을 환영합니다",
          author: "관리자",
          content: "회원 여러분과 소통하기 위한 공간입니다.\n편하게 안부를 남기거나 궁금한 점을 물어보세요!",
          createdAt: Date.now() - 1000 * 60 * 60 * 5,
          comments: [
            {
              id: crypto.randomUUID(),
              author: "이웃주민",
              content: "환영합니다! 자주 들를게요 :)",
              createdAt: Date.now() - 1000 * 60 * 60 * 3,
            },
          ],
        },
        {
          id: crypto.randomUUID(),
          title: "이번 주 프로그램 문의드려요",
          author: "김구민",
          content: "이번 주에 요가 프로그램이 있는지 궁금합니다. 아시는 분 계신가요?",
          createdAt: Date.now() - 1000 * 60 * 60 * 1,
          comments: [],
        },
      ];
      save(posts);
    }
    return posts;
  }

  return {
    getAll() {
      return seedIfEmpty().slice().sort((a, b) => b.createdAt - a.createdAt);
    },
    getById(id) {
      return seedIfEmpty().find((p) => p.id === id) || null;
    },
    create({ title, author, content }) {
      const posts = seedIfEmpty();
      const post = {
        id: crypto.randomUUID(),
        title,
        author,
        content,
        createdAt: Date.now(),
        comments: [],
      };
      posts.push(post);
      save(posts);
      return post;
    },
    remove(id) {
      const posts = seedIfEmpty().filter((p) => p.id !== id);
      save(posts);
    },
    addComment(postId, { author, content }) {
      const posts = seedIfEmpty();
      const post = posts.find((p) => p.id === postId);
      if (!post) return null;
      const comment = {
        id: crypto.randomUUID(),
        author,
        content,
        createdAt: Date.now(),
      };
      post.comments.push(comment);
      save(posts);
      return comment;
    },
  };
})();

// ---------------------------------------------------------------
// 마지막으로 사용한 닉네임 기억
// ---------------------------------------------------------------
const NICKNAME_KEY = "jangan-board-last-nickname";
function getLastNickname() {
  return localStorage.getItem(NICKNAME_KEY) || "";
}
function saveLastNickname(name) {
  localStorage.setItem(NICKNAME_KEY, name);
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

function renderPostList() {
  const posts = PostStore.getAll();
  const listEl = document.getElementById("post-list");
  const emptyEl = document.getElementById("empty-message");

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
        <span>댓글 ${post.comments.length}</span>
      </div>
    `;
    li.addEventListener("click", () => showBoardView("detail", { postId: post.id }));
    listEl.appendChild(li);
  });
}

// ---------------------------------------------------------------
// 상세 렌더링
// ---------------------------------------------------------------
function renderPostDetail(postId) {
  const post = PostStore.getById(postId);
  if (!post) {
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

document.getElementById("form-write").addEventListener("submit", (e) => {
  e.preventDefault();
  const author = document.getElementById("write-author").value.trim();
  const title = document.getElementById("write-title").value.trim();
  const content = document.getElementById("write-content").value.trim();
  if (!author || !title || !content) return;

  saveLastNickname(author);
  const post = PostStore.create({ author, title, content });
  document.getElementById("form-write").reset();
  showBoardView("detail", { postId: post.id });
});

// ---------------------------------------------------------------
// 이벤트: 상세 -> 목록, 삭제
// ---------------------------------------------------------------
document.getElementById("btn-back-to-list").addEventListener("click", () => {
  showBoardView("list");
});

document.getElementById("btn-delete-post").addEventListener("click", () => {
  if (!currentPostId) return;
  if (!confirm("이 글을 삭제할까요? 댓글도 함께 삭제됩니다.")) return;
  PostStore.remove(currentPostId);
  showBoardView("list");
});

// ---------------------------------------------------------------
// 이벤트: 댓글 작성
// ---------------------------------------------------------------
document.getElementById("form-comment").addEventListener("submit", (e) => {
  e.preventDefault();
  const author = document.getElementById("comment-author").value.trim();
  const content = document.getElementById("comment-content").value.trim();
  if (!author || !content || !currentPostId) return;

  saveLastNickname(author);
  PostStore.addComment(currentPostId, { author, content });
  document.getElementById("comment-content").value = "";
  renderPostDetail(currentPostId);
});

// ---------------------------------------------------------------
// 초기화
// ---------------------------------------------------------------
document.getElementById("comment-author").value = getLastNickname();
showPage("home");
