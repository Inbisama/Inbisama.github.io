// State management
let postsCatalog = [];
let activeTag = 'all';
let searchQuery = '';
let tocObserver = null;
let isCatalogLoaded = false;

// DOM Elements
const postsGrid = document.getElementById('posts-grid');
const tagsContainer = document.getElementById('tags-container');
const searchInput = document.getElementById('search-input');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const hljsThemeLink = document.getElementById('hljs-theme');
const logoLink = document.getElementById('logo-link');

const contentLayout = document.querySelector('.content-layout');
const heroBanner = document.getElementById('hero-banner');
const listTitle = document.getElementById('list-title');

// Reader DOM Elements
const postReader = document.getElementById('post-reader');
const btnCloseReader = document.getElementById('btn-close-reader');
const readerTitle = document.getElementById('reader-title');
const readerDate = document.getElementById('reader-date');
const readerTags = document.getElementById('reader-tags');
const readerCoverContainer = document.getElementById('reader-cover-container');
const readerCoverImg = document.getElementById('reader-cover-img');
const readerContent = document.getElementById('reader-content');

// Initial setup
window.addEventListener('DOMContentLoaded', () => {
  setupTheme();
  setupEventListeners();
  loadBlogData();
  handleRouting();
});

// Setup theme selection on start
function setupTheme() {
  document.body.className = 'light-theme';
  updateSyntaxHighlightTheme(false);
}

// Update HighlightJS stylesheet dynamically for light/dark modes
function updateSyntaxHighlightTheme(isDark) {
  if (isDark) {
    hljsThemeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css';
  } else {
    hljsThemeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css';
  }
}

// Toggle Theme
function toggleTheme() {
  const isDark = document.body.classList.contains('dark-theme');
  const newTheme = isDark ? 'light-theme' : 'dark-theme';
  
  document.body.className = newTheme;
  localStorage.setItem('blog_theme', newTheme);
  updateSyntaxHighlightTheme(newTheme === 'dark-theme');
}

// Setup Event Listeners
function setupEventListeners() {
  // Theme toggler is hidden and listener is disabled.
  
  // Search handling
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.toLowerCase().trim();
    renderFilteredPosts();
  });

  // Routing
  window.addEventListener('hashchange', handleRouting);
  
  // Close reader
  btnCloseReader.addEventListener('click', () => {
    window.location.hash = '';
  });

  // Logo link resets tags & search
  logoLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '';
    activeTag = 'all';
    searchQuery = '';
    searchInput.value = '';
    updateActiveTagUI();
    renderFilteredPosts();
  });
}

// Load posts/list.json dynamically
async function loadBlogData() {
  // Load blog title & description configuration first
  try {
    const configResponse = await fetch(`config.json?t=${Date.now()}`);
    if (configResponse.ok) {
      const config = await configResponse.json();
      if (config.blogTitle) {
        document.getElementById('blog-title').innerHTML = config.blogTitle;
      }
      if (config.blogDescription) {
        document.getElementById('blog-description').innerText = config.blogDescription;
      }
    }
  } catch (configError) {
    console.error('Error loading config.json:', configError);
  }

  try {
    const response = await fetch(`posts/list.json?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch catalog: ${response.status}`);
    }
    postsCatalog = await response.json();
    isCatalogLoaded = true;
    
    // Sort posts by date descending
    postsCatalog.sort((a, b) => new Date(b.date) - new Date(a.date));

    generateTagsList();
    renderFilteredPosts();
    
    // In case routing was waiting for data
    handleRouting();
  } catch (error) {
    console.error('Error loading blog metadata:', error);
    postsGrid.innerHTML = `
      <div class="loading-spinner">
        <i data-lucide="alert-circle" style="color: var(--code-text)"></i>
        포스트 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </div>
    `;
    lucide.createIcons();
  }
}

// Generate tags dynamically based on available posts
function generateTagsList() {
  const tagsSet = new Set();
  postsCatalog.forEach(post => {
    if (post.draft) return; // skip draft posts for tag aggregation
    if (post.tags) {
      post.tags.forEach(tag => tagsSet.add(tag));
    }
  });

  // Keep "All" and add new tags
  tagsContainer.innerHTML = `<button class="tag-badge active" data-tag="all">전체보기</button>`;

  tagsSet.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-badge';
    btn.dataset.tag = tag;
    btn.innerText = `#${tag}`;
    btn.addEventListener('click', () => {
      activeTag = tag;
      updateActiveTagUI();
      renderFilteredPosts();
    });
    tagsContainer.appendChild(btn);
  });

  // Add click to "All" button
  tagsContainer.querySelector('[data-tag="all"]').addEventListener('click', () => {
    activeTag = 'all';
    updateActiveTagUI();
    renderFilteredPosts();
  });
}

// Update the UI active state of tags
function updateActiveTagUI() {
  document.querySelectorAll('.tag-badge').forEach(btn => {
    const isMatched = btn.dataset.tag === activeTag;
    btn.classList.toggle('active', isMatched);
  });
}

// Render filtered cards list
function renderFilteredPosts() {
  // If catalog is not loaded yet, wait
  if (!isCatalogLoaded) return;

  const filtered = postsCatalog.filter(post => {
    if (post.draft) return false; // hide drafts from public listing
    
    const matchesTag = activeTag === 'all' || (post.tags && post.tags.includes(activeTag));
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery) ||
      post.excerpt.toLowerCase().includes(searchQuery) ||
      (post.tags && post.tags.some(t => t.toLowerCase().includes(searchQuery)));
    
    return matchesTag && matchesSearch;
  });

  // Update list section heading title
  if (activeTag !== 'all') {
    listTitle.innerText = `태그: #${activeTag} (${filtered.length}개)`;
  } else if (searchQuery) {
    listTitle.innerText = `검색 결과: "${searchQuery}" (${filtered.length}개)`;
  } else {
    listTitle.innerText = '최신 포스트';
  }

  if (filtered.length === 0) {
    const message = searchQuery || activeTag !== 'all'
      ? '검색 결과에 맞는 포스트가 없습니다.'
      : '아직 작성된 포스트가 없습니다.';
    postsGrid.innerHTML = `
      <div class="loading-spinner">
        ${message}
      </div>
    `;
    return;
  }

  postsGrid.innerHTML = '';
  filtered.forEach(post => {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.addEventListener('click', () => {
      window.location.hash = `#/post/${post.id}`;
    });

    // Cover image html if present
    const coverHtml = post.coverImage 
      ? `<img src="${post.coverImage}" alt="${post.title}" class="post-card-cover" onerror="this.style.display='none';">` 
      : '';

    // Date formatting
    const dateObj = new Date(post.date);
    const dateString = dateObj.toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });

    // Tags html
    const tagsHtml = post.tags 
      ? post.tags.map(t => `<span class="post-card-tag">#${escapeHTML(t)}</span>`).join('') 
      : '';

    card.innerHTML = `
      ${coverHtml}
      <div class="post-card-date"><i data-lucide="calendar"></i> ${dateString}</div>
      <h3 class="post-card-title">${escapeHTML(post.title)}</h3>
      <p class="post-card-excerpt">${escapeHTML(post.excerpt)}</p>
      <div class="post-card-tags">${tagsHtml}</div>
    `;

    postsGrid.appendChild(card);
  });
  
  lucide.createIcons();
}

// Router logic
function handleRouting() {
  const hash = window.location.hash;
  
  if (hash.startsWith('#/post/')) {
    const postId = hash.replace('#/post/', '');
    showPostReader(postId);
  } else {
    showListView();
  }
}

// Show specific post detail page
async function showPostReader(postId) {
  // Hide list view elements
  contentLayout.style.opacity = '0';
  setTimeout(() => {
    contentLayout.style.display = 'none';
    heroBanner.style.display = 'none';
    
    postReader.classList.remove('hidden');
    document.title = "로딩 중... | Inbisama.log";
    
    loadPostContent(postId);
  }, 200);
}

// Show list page listing
function showListView() {
  postReader.classList.add('hidden');
  
  if (tocObserver) {
    tocObserver.disconnect();
    tocObserver = null;
  }
  
  contentLayout.style.display = 'grid';
  heroBanner.style.display = 'block';
  setTimeout(() => {
    contentLayout.style.opacity = '1';
  }, 50);

  document.title = "Inbisama.log";
  
  // Re-run list filter check
  renderFilteredPosts();
}

// Load individual JSON post data
async function loadPostContent(postId) {
  readerTitle.innerText = "포스트를 불러오는 중...";
  readerDate.innerHTML = `<i data-lucide="loader" class="spin"></i> 로딩 중`;
  readerTags.innerHTML = '';
  readerCoverContainer.classList.add('hidden');
  readerContent.innerHTML = '<div class="loading-spinner"><i data-lucide="loader" class="spin"></i> 불러오는 중...</div>';
  
  // Clear any existing TOC list
  const tocList = document.getElementById('toc-list');
  if (tocList) {
    tocList.innerHTML = '<p class="empty-toc">목차가 없습니다.</p>';
  }
  
  lucide.createIcons();

  try {
    const response = await fetch(`posts/${postId}.json?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Failed to load post file: ${response.status}`);
    }
    const post = await response.json();

    // Prevent direct reading of draft posts in public page
    if (post.draft) {
      throw new Error('This post is a draft and cannot be viewed publicly.');
    }

    // Set page title
    document.title = `${post.title} | Inbisama.log`;

    // Render title and metadata
    readerTitle.innerText = post.title;
    
    const dateObj = new Date(post.date);
    const dateString = dateObj.toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    });
    readerDate.innerHTML = `<i data-lucide="calendar"></i> ${dateString}`;

    // Render tags
    if (post.tags && post.tags.length > 0) {
      readerTags.innerHTML = post.tags.map(t => `<span class="reader-tag">#${escapeHTML(t)}</span>`).join('');
    } else {
      readerTags.innerHTML = '';
    }

    // Render cover image
    if (post.coverImage) {
      readerCoverImg.src = post.coverImage;
      readerCoverContainer.classList.remove('hidden');
    } else {
      readerCoverContainer.classList.add('hidden');
    }

    // Parse Markdown body
    marked.setOptions({
      breaks: true,
      gfm: true
    });
    const parsedHtml = marked.parse(post.content);
    readerContent.innerHTML = DOMPurify.sanitize(parsedHtml);

    // Apply Code highlighting
    document.querySelectorAll('#reader-content pre code').forEach((block) => {
      hljs.highlightElement(block);
    });

    // Generate TOC
    generateTOC();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    console.error('Failed to load post details:', error);
    readerTitle.innerText = "포스트를 찾을 수 없습니다.";
    readerDate.innerHTML = `<i data-lucide="alert-circle" style="color: var(--code-text)"></i> 로드 오류`;
    readerContent.innerHTML = `
      <p style="text-align: center; padding: 40px 0; color: var(--text-muted);">
        포스트를 불러오는 도중 문제가 발생했습니다. 글이 아직 빌드 및 배포 중이거나, 삭제되었을 수 있습니다.
      </p>
    `;
  }
  lucide.createIcons();
}

// Escape HTML helper
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Generate Table of Contents (TOC)
function generateTOC() {
  const tocList = document.getElementById('toc-list');
  if (!tocList) return;

  if (tocObserver) {
    tocObserver.disconnect();
    tocObserver = null;
  }

  const headings = readerContent.querySelectorAll('h1, h2, h3');
  if (headings.length === 0) {
    tocList.innerHTML = '<p class="empty-toc">목차가 없습니다.</p>';
    return;
  }

  tocList.innerHTML = '';
  
  headings.forEach((heading, index) => {
    let id = heading.id;
    if (!id) {
      const cleanText = heading.textContent
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9가-힣-\s]/g, '')
        .replace(/\s+/g, '-');
      id = cleanText ? `heading-${cleanText}-${index}` : `heading-${index}`;
      heading.id = id;
    }

    const link = document.createElement('a');
    link.href = `#${id}`;
    link.className = `toc-item toc-${heading.tagName.toLowerCase()}`;
    link.innerText = heading.textContent;

    // Smooth scroll on click
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetElement = document.getElementById(id);
      if (targetElement) {
        const offset = 90;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = targetElement.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });

    tocList.appendChild(link);
  });

  // Intersection Observer for scroll spy active heading highlight
  let activeTocItem = null;
  const observerOptions = {
    root: null,
    rootMargin: '-100px 0px -70% 0px',
    threshold: 0
  };

  tocObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        const tocItem = tocList.querySelector(`a[href="#${id}"]`);
        if (tocItem) {
          if (activeTocItem) {
            activeTocItem.classList.remove('active');
          }
          tocItem.classList.add('active');
          activeTocItem = tocItem;
        }
      }
    });
  }, observerOptions);

  headings.forEach(heading => tocObserver.observe(heading));
}
