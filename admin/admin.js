// State management
let githubToken = sessionStorage.getItem('gh_blog_token') || localStorage.getItem('gh_blog_token') || '';
let githubRepo = localStorage.getItem('gh_blog_repo') || 'Inbisama/Inbisama.github.io';
let githubBranch = localStorage.getItem('gh_blog_branch') || 'main';

let configSHA = null;
let currentPostId = null;
let currentPostDate = null;
let currentPostSHA = null;
let postsList = [];
let postsListSHA = null;
let isSidebarCollapsed = false;

// DOM Elements
const authOverlay = document.getElementById('auth-overlay');
const inputToken = document.getElementById('input-token');
const inputRepo = document.getElementById('input-repo');
const inputBranch = document.getElementById('input-branch');
const btnSaveAuth = document.getElementById('btn-save-auth');
const btnCloseAuth = document.getElementById('btn-close-auth');
const checkRememberToken = document.getElementById('check-remember-token');
const inputBlogTitle = document.getElementById('input-blog-title');
const inputBlogDescription = document.getElementById('input-blog-description');

const postsListContainer = document.getElementById('posts-list');
const sidebarSearchInput = document.getElementById('sidebar-search-input');
const btnNewPost = document.getElementById('btn-new-post');
const btnShowSettings = document.getElementById('btn-show-settings');
const btnLogout = document.getElementById('btn-logout');

const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const postStatusBadge = document.getElementById('post-status-badge');
const themeToggle = document.getElementById('theme-toggle');
const btnModeSplit = document.getElementById('btn-mode-split');
const btnModeEdit = document.getElementById('btn-mode-edit');
const btnModePreview = document.getElementById('btn-mode-preview');
const btnDeletePost = document.getElementById('btn-delete-post');
const btnPublish = document.getElementById('btn-publish');

const postTitle = document.getElementById('post-title');
const postTags = document.getElementById('post-tags');
const postCover = document.getElementById('post-cover');
const postDraft = document.getElementById('post-draft');
const markdownInput = document.getElementById('markdown-input');
const markdownPreview = document.getElementById('markdown-preview');
const charCount = document.getElementById('char-count');
const workspace = document.getElementById('workspace');

const btnToolbarImage = document.getElementById('btn-toolbar-image');
const imageModalOverlay = document.getElementById('image-modal-overlay');
const btnCloseImageModal = document.getElementById('btn-close-image-modal');
const imageDropzone = document.getElementById('image-dropzone');
const modalImageFileInput = document.getElementById('modal-image-file-input');

const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  setupEventListeners();
  checkAuth();
  
  // Force light theme
  document.body.className = 'light-theme';
});

// Setup event listeners
function setupEventListeners() {
  // Auth Modal
  btnSaveAuth.addEventListener('click', saveAuthSettings);
  btnShowSettings.addEventListener('click', () => {
    inputToken.value = githubToken;
    inputRepo.value = githubRepo;
    inputBranch.value = githubBranch;
    authOverlay.classList.remove('hidden');
  });
  btnLogout.addEventListener('click', handleLogout);
  btnCloseAuth.addEventListener('click', () => {
    if (!githubToken) {
      // 토큰이 없으면 블로그 메인 페이지로 돌아갑니다.
      window.location.href = '../';
    } else {
      // 이미 토큰이 있는 상태(설정 변경 중)면 모달만 닫습니다.
      authOverlay.classList.add('hidden');
    }
  });

  // Theme Toggle disabled for white theme

  // Split View Modes
  btnModeSplit.addEventListener('click', () => switchWorkspaceMode('split'));
  btnModeEdit.addEventListener('click', () => switchWorkspaceMode('edit'));
  btnModePreview.addEventListener('click', () => switchWorkspaceMode('preview'));

  // Sidebar Toggle
  btnToggleSidebar.addEventListener('click', toggleSidebar);

  // Editor Actions
  btnNewPost.addEventListener('click', initNewPost);
  markdownInput.addEventListener('input', handleEditorInput);
  btnPublish.addEventListener('click', publishPost);
  btnDeletePost.addEventListener('click', deletePost);

  // Image Upload Toolbar modal toggles
  btnToolbarImage.addEventListener('click', () => {
    imageModalOverlay.classList.remove('hidden');
  });
  btnCloseImageModal.addEventListener('click', () => {
    imageModalOverlay.classList.add('hidden');
  });

  // Modal Dropzone interaction
  imageDropzone.addEventListener('click', () => {
    modalImageFileInput.click();
  });
  modalImageFileInput.addEventListener('change', handleImageUpload);

  // Modal Drag & Drop & paste uploader
  setupModalDragAndDrop();

  // Drag & Drop image files directly into textarea (Obsidian style)
  setupDragAndDrop();

  // Keyboard Shortcuts (Ctrl/Cmd + B, I, E)
  setupShortcuts();

  // Editor Toolbar Shortcuts
  document.getElementById('btn-tool-bold').addEventListener('click', handleBoldShortcut);
  document.getElementById('btn-tool-italic').addEventListener('click', handleItalicShortcut);
  document.getElementById('btn-tool-link').addEventListener('click', () => insertAtCursor('[', '](https://)'));
  document.getElementById('btn-tool-code').addEventListener('click', () => insertAtCursor('`', '`'));
  document.getElementById('btn-tool-quote').addEventListener('click', () => insertAtCursor('\n> ', '\n'));

  // Sidebar search
  sidebarSearchInput.addEventListener('input', filterPostsList);
}

// Authentication Check
async function checkAuth() {
  // Populate remember token checkbox based on localStorage presence
  checkRememberToken.checked = !!localStorage.getItem('gh_blog_token');
  
  if (!githubToken) {
    authOverlay.classList.remove('hidden');
  } else {
    authOverlay.classList.add('hidden');
    showLoader('인증 확인 및 데이터 불러오는 중...');
    const verified = await verifyGitHubCredentials();
    if (verified) {
      await loadPostsCatalog();
      await loadBlogConfig();
      initNewPost();
      checkAutosaveDraft(); // Check for unsaved recovery draft
      startAutosaveTimer(); // Start periodic local auto-saver
    } else {
      hideLoader();
      showToast('GitHub 인증에 실패했습니다. 토큰을 확인해 주세요.', 'error');
      authOverlay.classList.remove('hidden');
    }
    hideLoader();
  }
}

// Load blog config (title & description) from GitHub config.json
async function loadBlogConfig() {
  const configFile = await getGitHubFile('config.json');
  if (configFile) {
    try {
      configSHA = configFile.sha;
      const config = JSON.parse(configFile.content);
      inputBlogTitle.value = config.blogTitle || '';
      inputBlogDescription.value = config.blogDescription || '';
    } catch (e) {
      console.error('Parsing config.json failed:', e);
    }
  }
}

// Save blog config (title & description) to GitHub config.json
async function saveBlogConfig() {
  const updatedConfig = {
    blogTitle: inputBlogTitle.value.trim() || 'Inbisama.log',
    blogDescription: inputBlogDescription.value.trim() || ''
  };

  try {
    // Fetch latest config.json first to prevent SHA sync issues
    const configFile = await getGitHubFile('config.json');
    if (configFile) {
      configSHA = configFile.sha;
    }

    const configEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(updatedConfig, null, 2))));
    const commitConfigBody = {
      message: 'Update blog configuration',
      content: configEncoded,
      branch: githubBranch
    };
    if (configSHA) {
      commitConfigBody.sha = configSHA;
    }

    const resConfig = await requestGitHubAPI('config.json', 'PUT', commitConfigBody);
    const resConfigData = await resConfig.json();
    configSHA = resConfigData.content.sha;
    showToast('블로그 대제목/설정이 저장되었습니다. 반영까지 1~2분이 걸립니다.', 'success');
  } catch (err) {
    console.error('Failed to save config.json:', err);
    showToast('블로그 설정 저장 중 오류가 발생했습니다.', 'error');
  }
}

// Save authentication settings
async function saveAuthSettings() {
  const token = inputToken.value.trim();
  const repo = inputRepo.value.trim();
  const branch = inputBranch.value.trim();

  if (!token || !repo || !branch) {
    showToast('모든 항목을 올바르게 입력해 주세요.', 'error');
    return;
  }

  showLoader('인증 정보 검증 중...');
  
  // Temporarily set credentials for testing
  githubToken = token;
  githubRepo = repo;
  githubBranch = branch;

  const verified = await verifyGitHubCredentials();
  
  if (verified) {
    // Save token according to remember preference
    const remember = checkRememberToken.checked;
    if (remember) {
      localStorage.setItem('gh_blog_token', token);
      sessionStorage.removeItem('gh_blog_token');
    } else {
      sessionStorage.setItem('gh_blog_token', token);
      localStorage.removeItem('gh_blog_token');
    }
    githubToken = token;
    localStorage.setItem('gh_blog_repo', repo);
    localStorage.setItem('gh_blog_branch', branch);
    
    // Save/Commit the config.json changes to GitHub
    await saveBlogConfig();
    
    authOverlay.classList.add('hidden');
    showToast('GitHub 연결에 성공했습니다!', 'success');
    
    await loadPostsCatalog();
    initNewPost();
  } else {
    showToast('인증에 실패했습니다. 토큰 권한 및 저장소 명을 확인하세요.', 'error');
    // Revert token state
    githubToken = sessionStorage.getItem('gh_blog_token') || localStorage.getItem('gh_blog_token') || '';
  }
  
  hideLoader();
}

// Logout
function handleLogout() {
  if (confirm('인증 정보를 브라우저에서 삭제하고 로그아웃 하시겠습니까?')) {
    localStorage.removeItem('gh_blog_token');
    sessionStorage.removeItem('gh_blog_token');
    githubToken = '';
    authOverlay.classList.remove('hidden');
    showToast('로그아웃 되었습니다.', 'success');
  }
}

// Verify credentials via GitHub API
async function verifyGitHubCredentials() {
  try {
    const res = await fetch(`https://api.github.com/repos/${githubRepo}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return res.status === 200;
  } catch (err) {
    console.error('API Verification error:', err);
    return false;
  }
}

// API helper
async function requestGitHubAPI(path, method = 'GET', body = null) {
  const url = `https://api.github.com/repos/${githubRepo}/contents/${path}`;
  const headers = {
    'Authorization': `token ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  const config = {
    method,
    headers
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    if (!response.ok && response.status !== 404) {
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }
    return response;
  } catch (error) {
    console.error('API Request failed:', error);
    showToast(`GitHub 연결 오류: ${error.message}`, 'error');
    throw error;
  }
}

// Fetch file details (content, sha) from GitHub
async function getGitHubFile(path) {
  try {
    const response = await requestGitHubAPI(`${path}?ref=${githubBranch}`, 'GET');
    if (response.status === 404) {
      return null;
    }
    const data = await response.json();
    // Decode base64 content
    const decodedContent = decodeURIComponent(atob(data.content.replace(/\s/g, '')).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    return {
      sha: data.sha,
      content: decodedContent
    };
  } catch (error) {
    console.error(`Failed to get file ${path}:`, error);
    return null;
  }
}

// Fetch and render the posts list
async function loadPostsCatalog() {
  postsListContainer.innerHTML = `<div class="loading-spinner"><i data-lucide="loader" class="spin"></i> 불러오는 중...</div>`;
  lucide.createIcons();

  const fileData = await getGitHubFile('posts/list.json');
  if (fileData) {
    try {
      postsList = JSON.parse(fileData.content);
      postsListSHA = fileData.sha;
      renderPostsList();
    } catch (e) {
      console.error('Parsing posts/list.json failed:', e);
      postsList = [];
      renderPostsList();
    }
  } else {
    postsList = [];
    postsListSHA = null;
    postsListContainer.innerHTML = `<div class="loading-spinner">등록된 포스트가 없습니다.</div>`;
  }
}

// Render posts items to the sidebar
function renderPostsList(posts = postsList) {
  if (posts.length === 0) {
    postsListContainer.innerHTML = `<div class="loading-spinner">포스트가 없습니다.</div>`;
    return;
  }

  postsListContainer.innerHTML = '';
  posts.forEach(post => {
    const item = document.createElement('div');
    item.className = `post-item ${currentPostId === post.id ? 'active' : ''}`;
    item.dataset.id = post.id;
    
    // Format Date
    const dateObj = new Date(post.date);
    const dateString = dateObj.toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });

    const isDraft = post.draft === true;
    const draftBadge = isDraft ? `<span class="badge" style="background: var(--tag-bg); color: var(--text-muted); font-size: 0.68rem; padding: 2px 6px; margin-left: auto; border: 1px solid var(--border-color); font-weight: 500;">임시</span>` : '';

    item.innerHTML = `
      <div class="post-item-title" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${escapeHTML(post.title)}</span>
        ${draftBadge}
      </div>
      <div class="post-item-date">${dateString}</div>
    `;

    item.addEventListener('click', () => loadPostToEditor(post.id));
    postsListContainer.appendChild(item);
  });
}

// Filter the sidebar posts list
function filterPostsList() {
  const query = sidebarSearchInput.value.toLowerCase().trim();
  if (!query) {
    renderPostsList(postsList);
    return;
  }

  const filtered = postsList.filter(post => 
    post.title.toLowerCase().includes(query) || 
    (post.tags && post.tags.some(t => t.toLowerCase().includes(query)))
  );
  renderPostsList(filtered);
}

// Load a single post content from GitHub into the editor
async function loadPostToEditor(postId) {
  showLoader('포스트를 불러오는 중...');
  try {
    const fileData = await getGitHubFile(`posts/${postId}.json`);
    if (fileData) {
      const post = JSON.parse(fileData.content);
      
      currentPostId = post.id;
      currentPostDate = post.date;
      currentPostSHA = fileData.sha;

      postTitle.value = post.title;
      postTags.value = post.tags ? post.tags.join(', ') : '';
      postCover.value = post.coverImage || '';
      postDraft.checked = !!post.draft;
      markdownInput.value = post.content || '';

      updatePreview();
      updateCharCount();
      renderAttachedImages();

      postStatusBadge.innerText = '글 수정 중';
      btnDeletePost.classList.remove('hidden');

      // Highlight active item in sidebar
      document.querySelectorAll('.post-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === postId);
      });
      
      showToast('불러오기 완료!', 'success');
    } else {
      showToast('해당 글을 찾을 수 없습니다.', 'error');
    }
  } catch (error) {
    console.error('Error loading post:', error);
    showToast('글을 불러오는 도중 오류가 발생했습니다.', 'error');
  }
  hideLoader();
}

// Initialize workspace for a new post
function initNewPost() {
  currentPostId = null;
  currentPostDate = null;
  currentPostSHA = null;

  postTitle.value = '';
  postTags.value = '';
  postCover.value = '';
  postDraft.checked = false;
  markdownInput.value = '';

  updatePreview();
  updateCharCount();
  renderAttachedImages();

  postStatusBadge.innerText = '새로운 글 작성 중';
  btnDeletePost.classList.add('hidden');

  // De-select sidebar items
  document.querySelectorAll('.post-item').forEach(item => {
    item.classList.remove('active');
  });
}

// Real-time markdown parser and preview updates
function handleEditorInput() {
  updatePreview();
  updateCharCount();
  renderAttachedImages();
}

function updatePreview() {
  let markdownText = markdownInput.value;
  // Rewrite assets/images/ to ../assets/images/ so they resolve correctly inside the /admin/ editor preview
  markdownText = markdownText.replace(/(!\[.*?\]\()assets\/images\//g, '$1../assets/images/');
  markdownText = markdownText.replace(/(src=")(assets\/images\/)/g, '$1../$2');

  // Options for marked
  marked.setOptions({
    breaks: true,
    gfm: true
  });
  
  const rawHtml = marked.parse(markdownText);
  // Sanitize to prevent XSS
  const cleanHtml = DOMPurify.sanitize(rawHtml);
  
  markdownPreview.innerHTML = cleanHtml || '<p style="color: var(--text-muted);">여기에 작성한 글이 실시간으로 렌더링됩니다.</p>';
}

function updateCharCount() {
  const text = markdownInput.value;
  const noSpaceLength = text.replace(/\s/g, '').length;
  const withSpaceLength = text.length;
  charCount.innerText = `공백 제외: ${noSpaceLength}자 (공백 포함: ${withSpaceLength}자)`;
}

// Publish post: Saves current work to GitHub API
async function publishPost() {
  const title = postTitle.value.trim();
  const content = markdownInput.value;

  if (!title) {
    showToast('제목을 입력해 주세요.', 'error');
    postTitle.focus();
    return;
  }
  if (!content) {
    showToast('본문을 작성해 주세요.', 'error');
    markdownInput.focus();
    return;
  }

  showLoader('GitHub에 글 올리는 중...');

  // Set ID and Date
  const isNew = !currentPostId;
  const postId = currentPostId || `post-${Date.now()}`;
  const postDate = currentPostDate || new Date().toISOString();

  // Excerpt generation
  const plainText = content.replace(/[#*`>_\-[\]()]/g, '').trim();
  const excerpt = plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');

  // Parse Tags
  const tagsArray = postTags.value.split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  const coverImage = postCover.value.trim();

  const isDraft = postDraft.checked;

  // 1. Prepare post structure
  const postData = {
    id: postId,
    title,
    tags: tagsArray,
    coverImage,
    excerpt,
    content,
    draft: isDraft,
    date: postDate
  };

  try {
    // 2. Fetch fresh catalog info from GitHub to ensure no sync errors
    const listFile = await getGitHubFile('posts/list.json');
    let freshList = [];
    if (listFile) {
      freshList = JSON.parse(listFile.content);
      postsListSHA = listFile.sha;
    }

    // 3. Update the catalog metadata list
    const postMetadata = {
      id: postId,
      title,
      tags: tagsArray,
      coverImage,
      excerpt,
      draft: isDraft,
      date: postDate
    };

    const index = freshList.findIndex(p => p.id === postId);
    if (index > -1) {
      freshList[index] = postMetadata;
    } else {
      freshList.unshift(postMetadata);
    }

    // 4. If modifying, check for SHA. If new, get SHA if it exists somehow
    let targetSHA = currentPostSHA;
    if (!targetSHA && !isNew) {
      const fileMeta = await getGitHubFile(`posts/${postId}.json`);
      if (fileMeta) targetSHA = fileMeta.sha;
    }

    // 5. Commit individual JSON file
    const postEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(postData, null, 2))));
    const commitPostBody = {
      message: `Publish post: ${title}`,
      content: postEncoded,
      branch: githubBranch
    };
    if (targetSHA) {
      commitPostBody.sha = targetSHA;
    }

    const commitPostRes = await requestGitHubAPI(`posts/${postId}.json`, 'PUT', commitPostBody);
    const commitPostResData = await commitPostRes.json();
    currentPostSHA = commitPostResData.content.sha;

    // 6. Commit updated catalog list
    const listEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(freshList, null, 2))));
    const commitListBody = {
      message: `Update posts list: ${title}`,
      content: listEncoded,
      branch: githubBranch
    };
    if (postsListSHA) {
      commitListBody.sha = postsListSHA;
    }

    await requestGitHubAPI('posts/list.json', 'PUT', commitListBody);

    // 7. Refresh state
    currentPostId = postId;
    currentPostDate = postDate;
    
    localStorage.removeItem('autosave_draft'); // Clear auto-save draft on successful publish
    showToast(isNew ? '새 글이 발행되었습니다!' : '글이 성공적으로 수정되었습니다!', 'success');
    showToast('사이트에 반영되기까지 약 1~2분이 소요됩니다.', 'success');

    postStatusBadge.innerText = '글 수정 중';
    btnDeletePost.classList.remove('hidden');

    await loadPostsCatalog();
  } catch (error) {
    console.error('Failed to publish post:', error);
    showToast('포스트 업로드 중 오류가 발생했습니다.', 'error');
  }
  hideLoader();
}

// Delete post from GitHub Repository
async function deletePost() {
  if (!currentPostId) return;
  if (!confirm(`"${postTitle.value}" 글을 정말로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

  showLoader('GitHub에서 글 삭제하는 중...');
  try {
    // 1. Fetch fresh list.json to avoid SHA conflict
    const listFile = await getGitHubFile('posts/list.json');
    let freshList = [];
    if (listFile) {
      freshList = JSON.parse(listFile.content);
      postsListSHA = listFile.sha;
    }

    // 2. Remove from list
    freshList = freshList.filter(p => p.id !== currentPostId);

    // 3. Find current post file SHA if not available
    let targetSHA = currentPostSHA;
    if (!targetSHA) {
      const fileMeta = await getGitHubFile(`posts/${currentPostId}.json`);
      if (fileMeta) targetSHA = fileMeta.sha;
    }

    if (targetSHA) {
      // 4. Delete the JSON post file
      const deleteBody = {
        message: `Delete post ID: ${currentPostId}`,
        sha: targetSHA,
        branch: githubBranch
      };
      await requestGitHubAPI(`posts/${currentPostId}.json`, 'DELETE', deleteBody);
    }

    // 5. Commit updated list.json
    const listEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(freshList, null, 2))));
    const commitListBody = {
      message: `Delete post index: ${currentPostId}`,
      content: listEncoded,
      branch: githubBranch
    };
    if (postsListSHA) {
      commitListBody.sha = postsListSHA;
    }
    await requestGitHubAPI('posts/list.json', 'PUT', commitListBody);

    localStorage.removeItem('autosave_draft'); // Clear auto-save draft on successful delete
    showToast('글이 정상적으로 삭제되었습니다.', 'success');
    initNewPost();
    await loadPostsCatalog();
  } catch (err) {
    console.error('Delete post error:', err);
    showToast('글 삭제 중 오류가 발생했습니다.', 'error');
  }
  hideLoader();
}

// Handle image uploads and encode to base64, then upload via GitHub API
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (file) {
    uploadImageFile(file);
  }
  e.target.value = ''; // Reset input
}

// core image upload function (handles both drop and button upload)
async function uploadImageFile(file) {
  if (!file) return;

  // Validate file is image
  if (!file.type.startsWith('image/')) {
    showToast('이미지 파일만 선택해 주세요.', 'error');
    return;
  }

  showLoader('사진 업로드 중...');

  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = async () => {
    const base64Data = reader.result.split(',')[1];
    
    // Create safe clean filename
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const imagePath = `assets/images/img-${Date.now()}-${cleanName}`;

    try {
      const commitBody = {
        message: `Upload image: ${file.name}`,
        content: base64Data,
        branch: githubBranch
      };

      const res = await requestGitHubAPI(imagePath, 'PUT', commitBody);
      
      if (res.status === 200 || res.status === 201) {
        // Image path absolute to repo base for public site
        const imgMarkdown = `\n![${file.name}](${imagePath})\n`;
        
        // Insert into editor at cursor position
        insertTextIntoTextarea(imgMarkdown);
        showToast('사진이 업로드되었습니다.', 'success');
        imageModalOverlay.classList.add('hidden'); // close modal if open
        renderAttachedImages(); // refresh attachments list
      } else {
        showToast('사진 업로드 실패', 'error');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      showToast('사진 업로드 중 오류가 발생했습니다.', 'error');
    }
    hideLoader();
  };

  reader.onerror = (error) => {
    console.error('FileReader error:', error);
    showToast('파일을 읽어오는 중 에러 발생', 'error');
    hideLoader();
  };
}

// Drag & Drop Setup (Obsidian style)
function setupDragAndDrop() {
  markdownInput.addEventListener('dragover', (e) => {
    e.preventDefault();
    markdownInput.classList.add('dragover');
  });

  markdownInput.addEventListener('dragleave', () => {
    markdownInput.classList.remove('dragover');
  });

  markdownInput.addEventListener('drop', (e) => {
    e.preventDefault();
    markdownInput.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        uploadImageFile(file);
      } else {
        showToast('이미지 파일만 드래그해서 넣을 수 있습니다.', 'error');
      }
    }
  });

  // Handle clipboard paste (screenshots) directly inside textarea
  markdownInput.addEventListener('paste', (e) => {
    const items = (e.clipboardData || window.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          // Pasted screenshots often have name "image.png"
          // We can rename it or let our timestamp filename handle it: e.g. img-123456789-image.png
          uploadImageFile(file);
        }
        break;
      }
    }
  });
}

// Register shortcut keys (Cmd/Ctrl + B, I, E)
function setupShortcuts() {
  // Global listener for Cmd/Ctrl + E (Toggle preview)
  window.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      togglePreviewMode();
    }
  });

  // Editor-specific listener for B and I
  markdownInput.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      handleBoldShortcut();
    } else if (modifier && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      handleItalicShortcut();
    }
  });
}

// Bold Shortcut Logic (**here**)
function handleBoldShortcut() {
  const start = markdownInput.selectionStart;
  const end = markdownInput.selectionEnd;
  const text = markdownInput.value;
  const selected = text.substring(start, end);

  const before = text.substring(0, start);
  const after = text.substring(end);

  if (selected.length === 0) {
    markdownInput.value = before + '****' + after;
    markdownInput.focus();
    // Position cursor in the middle of bold markers
    markdownInput.selectionStart = markdownInput.selectionEnd = start + 2;
  } else {
    markdownInput.value = before + '**' + selected + '**' + after;
    markdownInput.focus();
    markdownInput.selectionStart = start + 2;
    markdownInput.selectionEnd = end + 2;
  }
  updatePreview();
  updateCharCount();
  renderAttachedImages();
}

// Italic Shortcut Logic (*here*)
function handleItalicShortcut() {
  const start = markdownInput.selectionStart;
  const end = markdownInput.selectionEnd;
  const text = markdownInput.value;
  const selected = text.substring(start, end);

  const before = text.substring(0, start);
  const after = text.substring(end);

  if (selected.length === 0) {
    markdownInput.value = before + '**' + after;
    markdownInput.focus();
    // Position cursor in the middle of italic marker
    markdownInput.selectionStart = markdownInput.selectionEnd = start + 1;
  } else {
    markdownInput.value = before + '*' + selected + '*' + after;
    markdownInput.focus();
    markdownInput.selectionStart = start + 1;
    markdownInput.selectionEnd = end + 1;
  }
  updatePreview();
  updateCharCount();
  renderAttachedImages();
}

// Toggle preview mode layout (Cmd+E)
function togglePreviewMode() {
  const isPreview = workspace.classList.contains('mode-preview');
  if (isPreview) {
    switchWorkspaceMode('split');
  } else {
    switchWorkspaceMode('preview');
  }
}

// Move image block up or down (sliding paragraph positions)
function moveImageBlock(imageSrc, direction) {
  let text = markdownInput.value;
  
  // Split content by paragraphs/blocks
  let blocks = text.split(/\n\n+/);
  
  // Find which block contains this image path
  let blockIndex = blocks.findIndex(b => b.includes(imageSrc));
  if (blockIndex === -1) return;

  let targetIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
  if (targetIndex < 0 || targetIndex >= blocks.length) {
    showToast(direction === 'up' ? '이미 가장 위에 위치해 있습니다.' : '이미 가장 아래에 위치해 있습니다.', 'info');
    return;
  }

  // Swap blocks in array
  const temp = blocks[blockIndex];
  blocks[blockIndex] = blocks[targetIndex];
  blocks[targetIndex] = temp;

  markdownInput.value = blocks.join('\n\n');
  
  updatePreview();
  updateCharCount();
  renderAttachedImages();
  showToast('이미지 단락의 위치가 조정되었습니다.', 'success');
}

// Wrap image block with alignment tags
function alignImageBlock(imageSrc, align) {
  let text = markdownInput.value;
  const escapedSrc = imageSrc.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  
  // Matches either existing <div align="...">...![...](imageSrc)...</div> OR just ![...](imageSrc)
  const regexStr = '(?:<div align="[a-z]+">\\s*)?(!\\[.*?\\]\\(' + escapedSrc + '\\))(?:\\s*<\\/div>)?';
  const regex = new RegExp(regexStr, 'g');

  if (align === 'center') {
    text = text.replace(regex, `<div align="center">$1</div>`);
  } else if (align === 'left') {
    text = text.replace(regex, `<div align="left">$1</div>`);
  } else if (align === 'right') {
    text = text.replace(regex, `<div align="right">$1</div>`);
  } else {
    text = text.replace(regex, '$1');
  }

  markdownInput.value = text;
  
  updatePreview();
  updateCharCount();
  renderAttachedImages();
  showToast('정렬 상태가 변경되었습니다.', 'success');
}

// Delete image tag from markdown body
function deleteImageFromContent(imageSrc) {
  if (!confirm('본문에서 이 이미지를 삭제하시겠습니까?')) return;

  let text = markdownInput.value;
  const escapedSrc = imageSrc.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regexStr = '(?:<div align="[a-z]+">\\s*)?(!\\[.*?\\]\\(' + escapedSrc + '\\))(?:\\s*<\\/div>)?';
  const regex = new RegExp(regexStr, 'g');

  markdownInput.value = text.replace(regex, '');
  
  updatePreview();
  updateCharCount();
  renderAttachedImages();
  showToast('본문에서 이미지가 제거되었습니다.', 'success');
}

// Parse markdown to find all images and render manager thumbnail list
function renderAttachedImages() {
  const text = markdownInput.value;
  const listContainer = document.getElementById('attached-images-list');
  if (!listContainer) return;

  // Find images matching ![alt](url)
  const regex = /!\[(.*?)\]\((.*?)\)/g;
  let match;
  const images = [];

  while ((match = regex.exec(text)) !== null) {
    const alt = match[1];
    const src = match[2];
    if (!images.some(img => img.src === src)) {
      images.push({ alt, src });
    }
  }

  if (images.length === 0) {
    listContainer.innerHTML = '<p class="empty-text">본문에 삽입된 이미지가 없습니다.</p>';
    return;
  }

  listContainer.innerHTML = '';
  images.forEach(img => {
    const card = document.createElement('div');
    card.className = 'attached-image-card';
    
    // safe name display
    const displayName = img.alt || img.src.split('/').pop() || 'image';

    card.innerHTML = `
      <img src="${img.src.startsWith('assets/') ? '../' + img.src : img.src}" alt="${img.alt}" onerror="this.src='../assets/images/.gitkeep';">
      <div class="attached-image-info" title="${img.alt}">${escapeHTML(displayName)}</div>
      <div class="attached-image-controls">
        <button class="btn-move-up" title="위로 한 블록 이동"><i data-lucide="arrow-up"></i></button>
        <button class="btn-move-down" title="아래로 한 블록 이동"><i data-lucide="arrow-down"></i></button>
        <button class="btn-align-left" title="왼쪽 정렬"><i data-lucide="align-left"></i></button>
        <button class="btn-align-center" title="가운데 정렬"><i data-lucide="align-center"></i></button>
        <button class="btn-align-right" title="오른쪽 정렬"><i data-lucide="align-right"></i></button>
        <button class="btn-delete-img danger" title="본문에서 제거"><i data-lucide="trash-2"></i></button>
      </div>
    `;

    // Add listeners
    card.querySelector('.btn-move-up').addEventListener('click', () => moveImageBlock(img.src, 'up'));
    card.querySelector('.btn-move-down').addEventListener('click', () => moveImageBlock(img.src, 'down'));
    card.querySelector('.btn-align-left').addEventListener('click', () => alignImageBlock(img.src, 'left'));
    card.querySelector('.btn-align-center').addEventListener('click', () => alignImageBlock(img.src, 'center'));
    card.querySelector('.btn-align-right').addEventListener('click', () => alignImageBlock(img.src, 'right'));
    card.querySelector('.btn-delete-img').addEventListener('click', () => deleteImageFromContent(img.src));

    listContainer.appendChild(card);
  });

  lucide.createIcons();
}

// Insert Text helper
function insertTextIntoTextarea(text) {
  const start = markdownInput.selectionStart;
  const end = markdownInput.selectionEnd;
  const currentVal = markdownInput.value;
  
  markdownInput.value = currentVal.substring(0, start) + text + currentVal.substring(end);
  
  // Reposition cursor after the inserted text
  markdownInput.focus();
  markdownInput.selectionStart = markdownInput.selectionEnd = start + text.length;
  
  updatePreview();
  updateCharCount();
}

// Toolbar shortcut helper
function insertAtCursor(before, after) {
  const start = markdownInput.selectionStart;
  const end = markdownInput.selectionEnd;
  const selectedText = markdownInput.value.substring(start, end);
  
  const insertText = before + (selectedText || '') + after;
  
  insertTextIntoTextarea(insertText);
}

// Toggle themes (Dark <-> Light)
function toggleTheme() {
  const body = document.body;
  if (body.classList.contains('dark-theme')) {
    body.classList.replace('dark-theme', 'light-theme');
    localStorage.setItem('admin_theme', 'light-theme');
  } else {
    body.classList.replace('light-theme', 'dark-theme');
    localStorage.setItem('admin_theme', 'dark-theme');
  }
}

// Switch pane view modes
function switchWorkspaceMode(mode) {
  workspace.className = `workspace mode-${mode}`;
  
  // Update button states
  btnModeSplit.classList.toggle('active', mode === 'split');
  btnModeEdit.classList.toggle('active', mode === 'edit');
  btnModePreview.classList.toggle('active', mode === 'preview');
}

// Toggle sidebar visibility
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  isSidebarCollapsed = !isSidebarCollapsed;
  sidebar.classList.toggle('collapsed', isSidebarCollapsed);
}

// Show/Hide progress loaders
function showLoader(text = '로딩 중...') {
  loadingText.innerText = text;
  loadingOverlay.classList.remove('hidden');
}

function hideLoader() {
  loadingOverlay.classList.add('hidden');
}

// Custom Toast Alert popup
let toastTimeout;
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.classList.remove('hidden', 'success', 'error');
  
  if (type === 'success') toast.classList.add('success');
  if (type === 'error') toast.classList.add('error');

  // styling toast background colors based on type
  if (type === 'success') {
    toast.style.borderLeft = '4px solid var(--success-color)';
  } else if (type === 'error') {
    toast.style.borderLeft = '4px solid var(--danger-color)';
  } else {
    toast.style.borderLeft = '4px solid var(--accent-color)';
  }

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// HTML Entity escaper to prevent injection
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

// Modal Drag and drop & global uploader paste handlers
function setupModalDragAndDrop() {
  imageDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageDropzone.classList.add('dragover');
  });

  imageDropzone.addEventListener('dragleave', () => {
    imageDropzone.classList.remove('dragover');
  });

  imageDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    imageDropzone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        uploadImageFile(file);
      } else {
        showToast('이미지 파일만 넣을 수 있습니다.', 'error');
      }
    }
  });

  // Paste screenshot globally if the upload modal is open
  window.addEventListener('paste', (e) => {
    const isModalOpen = !imageModalOverlay.classList.contains('hidden');
    if (isModalOpen) {
      const items = (e.clipboardData || window.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            uploadImageFile(file);
          }
          break;
        }
      }
    }
  });
}

// Local Auto-save Logic (Obsidian Style)
let autosaveInterval = null;

function checkAutosaveDraft() {
  const saved = localStorage.getItem('autosave_draft');
  if (!saved) return;

  try {
    const draft = JSON.parse(saved);
    if (!draft.title && !draft.content) return; // ignore blank autosave state

    if (confirm('작성 중이던 임시 저장된 글이 있습니다. 복구하시겠습니까?')) {
      currentPostId = draft.postId || null;
      postTitle.value = draft.title || '';
      postTags.value = draft.tags || '';
      postCover.value = draft.coverImage || '';
      postDraft.checked = !!draft.draft;
      markdownInput.value = draft.content || '';

      updatePreview();
      updateCharCount();
      renderAttachedImages();

      postStatusBadge.innerText = currentPostId ? '글 수정 중 (복구됨)' : '새로운 글 작성 중 (복구됨)';
      if (currentPostId) {
        btnDeletePost.classList.remove('hidden');
      }
      showToast('임시 저장 데이터가 복구되었습니다.', 'success');
    } else {
      localStorage.removeItem('autosave_draft'); // discard if user clicked cancel
    }
  } catch (e) {
    console.error('Failed to parse autosave_draft:', e);
    localStorage.removeItem('autosave_draft');
  }
}

function startAutosaveTimer() {
  if (autosaveInterval) clearInterval(autosaveInterval);

  autosaveInterval = setInterval(() => {
    const title = postTitle.value.trim();
    const content = markdownInput.value;

    if (!title && !content) return; // ignore completely blank content

    const draftData = {
      postId: currentPostId,
      title,
      tags: postTags.value.trim(),
      coverImage: postCover.value.trim(),
      draft: postDraft.checked,
      content,
      timestamp: Date.now()
    };

    localStorage.setItem('autosave_draft', JSON.stringify(draftData));
  }, 10000); // 10 seconds
}
