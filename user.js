const USER_API_HOST = window.location.protocol === 'file:' ? '192.168.1.175' : window.location.hostname;
const USER_API_BASE = `http://${USER_API_HOST}:3000`;
const USER_HOME_PAGE = 'index.html';
const USER_PLACEHOLDER_COVER = 'logo.webp';

const headerName = document.getElementById('headerName');
const profileName = document.getElementById('profileName');
const logoutButton = document.getElementById('userLogoutBtn');
const followingCount = document.getElementById('followingCount');
const followingList = document.getElementById('userFollowingList');
const historyList = document.getElementById('userHistoryList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

function userEscapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getAuthData() {
    try {
        return JSON.parse(localStorage.getItem('userLogin'));
    } catch {
        localStorage.removeItem('userLogin');
        return null;
    }
}

function getCurrentUser() {
    const authData = getAuthData();
    return authData?.user || null;
}

function getAuthHeaders() {
    const authData = getAuthData();
    return {
        'Content-Type': 'application/json',
        ...(authData?.accessToken ? { Authorization: `Bearer ${authData.accessToken}` } : {})
    };
}

function setCurrentUserData(user) {
    const authData = getAuthData();
    if (!authData) return;
    localStorage.setItem('userLogin', JSON.stringify({ ...authData, user }));
}

function protectUserPage() {
    const user = getCurrentUser();
    if (!user) {
        alert('Vui long dang nhap!');
        window.location.href = USER_HOME_PAGE;
        return null;
    }
    return user;
}

function updateUserInfo(user) {
    if (headerName) headerName.textContent = user.username || 'User';
    if (profileName) profileName.textContent = user.username || 'User';
}

function renderFollowing(user) {
    const stories = Array.isArray(user.followedStories) ? user.followedStories : [];
    if (followingCount) followingCount.textContent = `${stories.length} series`;
    if (!followingList) return;

    if (!stories.length) {
        followingList.innerHTML = '<div class="col-12 text-muted">Ban chua follow truyen nao.</div>';
        return;
    }

    followingList.innerHTML = stories.map(story => `
        <div class="col">
            <article class="series-item h-100">
                <a href="${userEscapeHtml(story.url || '#')}" class="text-decoration-none">
                    <div class="thumbnail-box">
                        <span class="badge-status bg-danger">Following</span>
                        <img src="${userEscapeHtml(story.cover || USER_PLACEHOLDER_COVER)}"
                             alt="${userEscapeHtml(story.title)}"
                             onerror="this.src='${USER_PLACEHOLDER_COVER}'">
                    </div>
                    <div class="info-box">
                        <h3 class="comic-title text-dark">${userEscapeHtml(story.title)}</h3>
                        <p class="comic-genre text-muted small mb-0">${userEscapeHtml(story.author || '')}</p>
                    </div>
                </a>
            </article>
        </div>
    `).join('');
}

function renderHistory(user) {
    const history = Array.isArray(user.readingHistory) ? user.readingHistory : [];
    if (!historyList) return;

    if (!history.length) {
        historyList.innerHTML = '<div class="py-3 text-muted">Ban chua doc chuong nao.</div>';
        return;
    }

    historyList.innerHTML = history.map(item => `
        <a href="${userEscapeHtml(item.url || '#')}"
           class="list-group-item list-group-item-action d-flex justify-content-between align-items-start gap-3 px-0">
            <div>
                <div class="fw-semibold text-dark">${userEscapeHtml(item.storyTitle || 'Story')}</div>
                <div class="text-muted small">${userEscapeHtml(item.volumeTitle || '')} ${userEscapeHtml(item.chapterTitle || '')}</div>
            </div>
            <span class="text-muted small text-nowrap">${userEscapeHtml(item.readAt || '')}</span>
        </a>
    `).join('');
}

async function clearHistory(user) {
    const res = await fetch(`${USER_API_BASE}/users/${user.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ readingHistory: [] })
    });
    if (!res.ok) throw new Error('Cannot clear history');
    const updatedUser = await res.json();
    setCurrentUserData(updatedUser);
    renderHistory(updatedUser);
}

logoutButton?.addEventListener('click', () => {
    localStorage.removeItem('userLogin');
    window.location.href = USER_HOME_PAGE;
});

const currentUser = protectUserPage();
if (currentUser) {
    updateUserInfo(currentUser);
    renderFollowing(currentUser);
    renderHistory(currentUser);

    clearHistoryBtn?.addEventListener('click', async () => {
        if (!confirm('Clear reading history?')) return;
        try {
            await clearHistory(getCurrentUser());
        } catch {
            alert('Khong xoa duoc lich su doc!');
        }
    });
}
