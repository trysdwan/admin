let currentPost = null;
let allComments = [];
let commenterName = localStorage.getItem('commenterName') || '';
let currentPostId = null;

function showToastMessage(msg, isError = false) {
    const toastEl = document.getElementById('liveToast');
    const span = document.getElementById('toastMsg');
    span.innerText = msg;
    toastEl.style.background = isError ? '#d32f2f' : '#1f1f1f';
    toastEl.style.opacity = '1';
    setTimeout(() => { toastEl.style.opacity = '0'; }, 2500);
}

// Get the current page URL with post ID
function getCurrentPageUrl(postId) {
    const baseUrl = window.location.href.split('?')[0];
    return `${baseUrl}?id=${postId}`;
}

// Update browser URL without reloading the page
function updateBrowserUrl(postId) {
    const newUrl = getCurrentPageUrl(postId);
    window.history.pushState({ postId: postId }, '', newUrl);
    console.log('URL updated to:', newUrl);
}

// Extract post ID from URL parameters (ONLY source)
function getPostIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlId = urlParams.get('id');
    if (urlId && !isNaN(parseInt(urlId))) {
        return urlId;
    }
    return null;
}

// Navigate to category with URL parameter (no localStorage)
function navigateToCategory(category) {
    window.location.href = `category.html?category=${encodeURIComponent(category)}`;
}

// Navigate to author profile with URL parameter (no sessionStorage)
function navigateToAuthor(authorName, authorDesignation) {
    let url = `profile.html?author=${encodeURIComponent(authorName)}`;
    if (authorDesignation && authorDesignation.trim()) {
        url += `&designation=${encodeURIComponent(authorDesignation)}`;
    }
    window.location.href = url;
}

// Social Share Functions
function shareOnFacebook(url, title) {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

function shareOnTwitter(url, title) {
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

function shareOnWhatsApp(url, title) {
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

function shareOnLinkedIn(url, title) {
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

function shareOnPinterest(url, title, imageUrl) {
    const shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(title)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

function copyToClipboard(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToastMessage('📋 Blog URL copied to clipboard!');
        const shareModal = document.getElementById('shareModal');
        if (shareModal) shareModal.classList.remove('active');
    }).catch(() => {
        showToastMessage('Failed to copy URL', true);
    });
}

function closeShareModal() {
    const shareModal = document.getElementById('shareModal');
    if (shareModal) shareModal.classList.remove('active');
}

// Create Share Modal dynamically
function createShareModal() {
    if (document.getElementById('shareModal')) return;
    
    const modalHtml = `
        <div id="shareModal" class="share-modal">
            <div class="share-modal-content">
                <div class="share-modal-header">
                    <h5><i class="bi bi-share-fill"></i> Share this post</h5>
                    <button class="share-modal-close" onclick="closeShareModal()">&times;</button>
                </div>
                <div class="share-modal-body">
                    <div class="share-options">
                        <button class="share-option facebook" onclick="shareOnFacebook(window.currentShareUrl, window.currentShareTitle)">
                            <i class="bi bi-facebook"></i> Facebook
                        </button>
                        <button class="share-option twitter" onclick="shareOnTwitter(window.currentShareUrl, window.currentShareTitle)">
                            <i class="bi bi-twitter-x"></i> Twitter
                        </button>
                        <button class="share-option whatsapp" onclick="shareOnWhatsApp(window.currentShareUrl, window.currentShareTitle)">
                            <i class="bi bi-whatsapp"></i> WhatsApp
                        </button>
                        <button class="share-option linkedin" onclick="shareOnLinkedIn(window.currentShareUrl, window.currentShareTitle)">
                            <i class="bi bi-linkedin"></i> LinkedIn
                        </button>
                        <button class="share-option pinterest" onclick="shareOnPinterest(window.currentShareUrl, window.currentShareTitle, window.currentShareImage)">
                            <i class="bi bi-pinterest"></i> Pinterest
                        </button>
                        <button class="share-option copy" onclick="copyToClipboard(window.currentShareUrl)">
                            <i class="bi bi-link-45deg"></i> Copy Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openShareModal(url, title, imageUrl) {
    createShareModal();
    window.currentShareUrl = url;
    window.currentShareTitle = title;
    window.currentShareImage = imageUrl;
    const shareModal = document.getElementById('shareModal');
    if (shareModal) shareModal.classList.add('active');
}

// Submit like to Apps Script
async function submitLike(postId) {
    try {
        const formData = new FormData();
        formData.append('action', 'like');
        formData.append('postId', postId);
        
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if(result.success) {
            showToastMessage('❤️ You liked this post!');
            return result.newLikes;
        } else {
            throw new Error(result.error);
        }
    } catch(error) {
        console.error('Like error:', error);
        showToastMessage('Failed to submit like. Please try again.', true);
        return null;
    }
}

// Submit comment to Apps Script
async function submitComment(postId, userName, commentText) {
    try {
        const formData = new FormData();
        formData.append('action', 'comment');
        formData.append('postId', postId);
        formData.append('userName', userName);
        formData.append('commentText', commentText);
        
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if(result.success) {
            showToastMessage('💬 Comment posted!');
            return { success: true, timestamp: result.timestamp };
        } else {
            throw new Error(result.error);
        }
    } catch(error) {
        console.error('Comment error:', error);
        showToastMessage('Failed to post comment. Please try again.', true);
        return { success: false };
    }
}

async function loadHeaderConfig() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/configure!A:F?key=${CONFIG.API_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();
        const rows = data.values || [];
        let blogTitle = "Blog Studio", logoUrl = "";
        let menuItems = [];
        for(let i=1; i<rows.length; i++) {
            let row = rows[i];
            let item = row[0]?.trim(), configVal = row[1]?.trim(), menu = row[2]?.trim(), sub = row[3]?.trim(), linkItem = row[4]?.trim(), link = row[5]?.trim();
            if(item === "Blog Title" && configVal) blogTitle = configVal;
            if(item === "Blog logo(url)" && configVal) logoUrl = configVal;
            if(menu && menu !== "Menu") {
                let existing = menuItems.find(m => m.name === menu);
                if(!existing) {
                    existing = { name: menu, subItems: [] };
                    menuItems.push(existing);
                }
                if(sub && sub !== "Sub Menu" && linkItem && link) {
                    existing.subItems.push({ label: sub, url: link });
                } else if (linkItem && link && (!sub || sub === "Sub Menu")) {
                    existing.subItems.push({ label: linkItem, url: link });
                }
            }
        }
        renderHeader(blogTitle, logoUrl, menuItems);
    } catch(e) { renderHeader("Blog Studio", "", []); }
}

function renderHeader(title, logoUrl, menus) {
    let logoHtml = logoUrl ? `<img src="${logoUrl}" height="35" alt="logo">` : `<i class="bi bi-journal-bookmark-fill fs-3" style="color:#1a73e8"></i>`;
    let navHtml = `<nav class="navbar navbar-expand-lg bg-white border-bottom sticky-top px-3 px-md-5 py-2 shadow-sm">
        <div class="container-fluid">
            <a class="navbar-brand fw-bold" href="./index.html">${logoHtml} ${title}</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#blogNavbar">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="blogNavbar">
                <ul class="navbar-nav ms-auto mb-2 mb-lg-0 gap-2">`;
    menus.forEach(menu => {
        if(menu.subItems.length) {
            navHtml += `<li class="nav-item dropdown"><a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">${menu.name}</a><ul class="dropdown-menu">`;
            menu.subItems.forEach(sub => { navHtml += `<li><a class="dropdown-item" href="${sub.url}">${sub.label}</a></li>`; });
            navHtml += `</ul></li>`;
        } else {
            navHtml += `<li class="nav-item"><a class="nav-link" href="#">${menu.name}</a></li>`;
        }
    });
    navHtml += `</ul></div></div></nav>`;
    document.getElementById('main-header').innerHTML = navHtml;
}

async function fetchPostData(postId) {
    const blogUrl = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/blog%20data!A:I?key=${CONFIG.API_KEY}`;
    const commentsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Comments%20data!A:D?key=${CONFIG.API_KEY}`;
    const [blogRes, commRes] = await Promise.all([fetch(blogUrl), fetch(commentsUrl)]);
    const blogJson = await blogRes.json();
    const commJson = await commRes.json();
    const rows = blogJson.values || [];
    if(rows.length < 2) throw new Error("No posts found");
    
    let foundPost = null;
    for(let i=1; i<rows.length; i++) {
        let row = rows[i];
        if(String(row[0]).trim() === String(postId).trim()) {
            foundPost = {
                id: row[0], category: row[1] || "General", tags: row[2] || "",
                author: row[3] || "Anonymous", publishedTime: row[4] || "",
                title: row[5] || "Untitled", content: row[6] || "",
                likeCount: parseInt(row[7]) || 0, shareCount: parseInt(row[8]) || 0
            };
            break;
        }
    }
    if(!foundPost) throw new Error(`Post ID ${postId} not found`);
    
    const commentRows = commJson.values || [];
    let comments = [];
    for(let i=1; i<commentRows.length; i++) {
        let r = commentRows[i];
        if(String(r[0]).trim() === String(postId).trim()) {
            comments.push({ user: r[1] || "Anonymous", date: r[2] || "", text: r[3] || "" });
        }
    }
    return { post: foundPost, comments };
}

// Fetch complete author profile from profiles sheet (including image)
async function fetchAuthorProfile(authorName) {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/profiles!A:D?key=${CONFIG.API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        const rows = data.values || [];
        for(let i=1; i<rows.length; i++) {
            if(rows[i][0] && rows[i][0].trim().toLowerCase() === authorName.toLowerCase()) {
                return {
                    name: rows[i][0],
                    designation: rows[i][1] || '',
                    about: rows[i][2] || '',
                    imageUrl: rows[i][3] || null
                };
            }
        }
        return {
            name: authorName,
            designation: '',
            about: '',
            imageUrl: null
        };
    } catch(error) {
        console.error('Error fetching author profile:', error);
        return {
            name: authorName,
            designation: '',
            about: '',
            imageUrl: null
        };
    }
}

// Extract first image URL from HTML content
function extractFirstImage(html) {
    if (!html) return null;
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : null;
}

// Remove the first image from HTML content to avoid duplication
function removeFirstImageFromContent(html) {
    if (!html) return html;
    return html.replace(/<img[^>]+>/i, '');
}

async function renderPostPage(post, comments) {
    allComments = comments;
    document.getElementById("loadingSpinner").style.display = "none";
    document.getElementById("postContentWrapper").style.display = "block";
    document.title = `${post.title} | Blog Studio`;
    
    // Update browser URL with post ID
    updateBrowserUrl(post.id);
    
    const avatarLetter = (post.author.charAt(0) || 'A').toUpperCase();
    const featuredImg = extractFirstImage(post.content);
    
    // Fetch complete author profile (including image)
    const authorProfile = await fetchAuthorProfile(post.author);
    
    // Remove the first image from content to avoid duplication
    let contentWithoutFirstImage = post.content;
    if (featuredImg) {
        contentWithoutFirstImage = removeFirstImageFromContent(post.content);
    }
    
    // Generate author avatar HTML (image if available, otherwise initials)
    let authorAvatarHtml = '';
    if (authorProfile.imageUrl) {
        authorAvatarHtml = `<img src="${authorProfile.imageUrl}" class="author-avatar-img author-link" 
                            data-author="${escapeHtml(post.author)}" 
                            data-designation="${escapeHtml(authorProfile.designation)}"
                            alt="${escapeHtml(post.author)}"
                            onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'avatar d-inline-flex author-link\' data-author=\'${escapeHtml(post.author)}\' data-designation=\'${escapeHtml(authorProfile.designation)}\'>${avatarLetter}</div>';">`;
    } else {
        authorAvatarHtml = `<div class="avatar d-inline-flex author-link" 
                             data-author="${escapeHtml(post.author)}" 
                             data-designation="${escapeHtml(authorProfile.designation)}">
                             ${avatarLetter}
                           </div>`;
    }
    
    // Get full page URL for sharing
    const shareUrl = getCurrentPageUrl(post.id);
    
    // Start building content
    let contentHtml = `<div class="blog-header">
        <div class="text-muted small mb-2">
            <span class="category-link" data-category="${escapeHtml(post.category)}">
                <i class="bi bi-folder"></i> ${escapeHtml(post.category)}
            </span>
        </div>
        <h1 class="blog-title">${escapeHtml(post.title)}</h1>
        <div class="blog-meta">
            <div class="d-flex align-items-center gap-2">
                ${authorAvatarHtml}
                <div>
                    <div class="author-link fw-bold" data-author="${escapeHtml(post.author)}" data-designation="${escapeHtml(authorProfile.designation)}">
                        ${escapeHtml(post.author)}
                    </div>
                    ${authorProfile.designation ? `<div class="small text-muted">${escapeHtml(authorProfile.designation)}</div>` : ''}
                </div>
            </div>
            <span><i class="bi bi-calendar3"></i> ${escapeHtml(post.publishedTime)}</span>
            <span><i class="bi bi-tag"></i> ${escapeHtml(post.tags) || 'general'}</span>
        </div>
    </div>`;
    
    // Show featured image - full width across screen
    if(featuredImg) {
        contentHtml += `<div class="post-featured-img-container">
            <img src="${featuredImg}" class="post-featured-img-full" alt="Featured image for ${escapeHtml(post.title)}">
        </div>`;
    }
    
    // Add content and action bar
    contentHtml += `<div class="blog-content-wrapper">
        <div class="blog-content">${contentWithoutFirstImage}</div>
    </div>
    <div class="action-bar">
        <button id="likeButton" class="action-btn like-btn"><i class="bi bi-hand-thumbs-up"></i> <span id="likeCountSpan">${post.likeCount}</span> likes</button>
        <button id="shareButton" class="action-btn share-btn"><i class="bi bi-share-fill"></i> Share</button>
        <span><i class="bi bi-chat-dots"></i> ${comments.length} comments</span>
    </div>`;
    
    document.getElementById("postContentWrapper").innerHTML = contentHtml;
    renderCommentsSection();
    
    // Add event listeners for category link - using URL parameter
    document.querySelector('.category-link')?.addEventListener('click', (e) => {
        const category = e.currentTarget.getAttribute('data-category');
        navigateToCategory(category);
    });
    
    // Add event listeners for all author link elements - using URL parameter
    document.querySelectorAll('.author-link').forEach(el => {
        el.addEventListener('click', (e) => {
            const authorName = el.getAttribute('data-author');
            const authorDesignation = el.getAttribute('data-designation');
            navigateToAuthor(authorName, authorDesignation);
        });
    });
    
    document.getElementById("likeButton").addEventListener("click", async () => {
        const newCount = await submitLike(post.id);
        if(newCount !== null) {
            document.getElementById("likeCountSpan").innerText = newCount;
        }
    });
    
    // Updated share button to open social share modal
    document.getElementById("shareButton").addEventListener("click", () => {
        openShareModal(shareUrl, post.title, featuredImg);
    });
}

function renderCommentsSection() {
    const wrapper = document.getElementById("postContentWrapper");
    let existingDiv = document.getElementById("commentsArea");
    if(existingDiv) existingDiv.remove();
    
    const commentsDiv = document.createElement("div");
    commentsDiv.id = "commentsArea";
    commentsDiv.className = "comment-section";
    
    let commentsHtml = `<h5 class="fw-bold mb-3"><i class="bi bi-chat-left-text"></i> Comments (${allComments.length})</h5>`;
    if(allComments.length === 0) commentsHtml += `<p class="text-muted">Be the first to comment.</p>`;
    allComments.forEach(c => {
        commentsHtml += `<div class="comment-card"><div><span class="comment-user">${escapeHtml(c.user)}</span> <span class="comment-date">${escapeHtml(c.date)}</span></div><p class="mt-2 mb-0">${escapeHtml(c.text)}</p></div>`;
    });
    commentsHtml += `<div class="new-comment-form mt-4"><label class="fw-semibold">Add a comment</label>
        <textarea id="commentTextInput" class="form-control my-2" rows="2" placeholder="Write your thoughts..."></textarea>
        <div><button id="submitCommentBtn" class="btn btn-primary rounded-pill px-4 mt-2"><i class="bi bi-send"></i> Post comment</button></div></div>`;
    
    commentsDiv.innerHTML = commentsHtml;
    wrapper.appendChild(commentsDiv);
    
    document.getElementById("submitCommentBtn").addEventListener("click", async () => {
        let commentText = document.getElementById("commentTextInput").value.trim();
        if(!commentText) { showToastMessage("Please write a comment", true); return; }
        
        let userName = commenterName;
        if(!userName) {
            userName = prompt("Enter your name:");
            if(!userName) return;
            localStorage.setItem('commenterName', userName);
            commenterName = userName;
        }
        
        const result = await submitComment(currentPost.id, userName, commentText);
        if(result.success) {
            allComments.push({ user: userName, date: result.timestamp || new Date().toLocaleString(), text: commentText });
            renderCommentsSection();
            document.getElementById("commentTextInput").value = "";
        }
    });
}

function escapeHtml(str) { 
    if(!str) return ''; 
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m] || m)); 
}

async function initPostPage() {
    await loadHeaderConfig();
    
    // ONLY get post ID from URL parameters (no localStorage fallback)
    let postId = getPostIdFromUrl();
    
    if(!postId) {
        document.getElementById("loadingSpinner").innerHTML = `<div class="error-box alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill"></i><br>
            <strong>No post ID found!</strong><br>
            Please use a valid post URL like:<br>
            <code>post.html?id=1</code>
        </div>`;
        return;
    }
    
    // Store the current post ID for later use
    currentPostId = postId;
    
    try {
        const { post, comments } = await fetchPostData(postId);
        currentPost = post;
        renderPostPage(post, comments);
    } catch(err) {
        console.error('Init error:', err);
        document.getElementById("loadingSpinner").innerHTML = `<div class="error-box alert alert-danger">
            <strong>Error loading post:</strong><br>
            ${err.message}<br>
            <a href="./index.html">← Back to Home</a>
        </div>`;
    }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', function(event) {
    const postId = getPostIdFromUrl();
    if (postId && postId !== currentPostId) {
        window.location.reload();
    }
});

// Make share functions globally accessible
window.shareOnFacebook = shareOnFacebook;
window.shareOnTwitter = shareOnTwitter;
window.shareOnWhatsApp = shareOnWhatsApp;
window.shareOnLinkedIn = shareOnLinkedIn;
window.shareOnPinterest = shareOnPinterest;
window.copyToClipboard = copyToClipboard;
window.closeShareModal = closeShareModal;

initPostPage();
