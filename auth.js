const API_HOST = window.location.protocol === 'file:' ? '192.168.1.175' : window.location.hostname;
const API_BASE = `http://${API_HOST}:3000`;

const HOME_PAGE = 'index.html';
const DASHBOARD_PAGE = 'dashboardadmin1.html';
const USER_PAGE = 'user.html';

// --- CÁC PHẦN TỬ DOM MỚI CHO UI ---
const loginBtn = document.getElementById('loginBtn');
const userMenu = document.getElementById('userMenu');
const displayUsername = document.getElementById('displayUsername');
const logoutBtn = document.getElementById('logoutBtn');
const dashboardLink = document.getElementById('dashboardLink');

// --- CÁC PHẦN TỬ DOM CŨ ---
const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const linkToRegister = document.getElementById('linkToRegister');
const linkToLogin = document.getElementById('linkToLogin');
const registerForm = document.getElementById('modalRegisterForm');
const loginForm = document.getElementById('modalLoginForm');
const adminCreateUserForm = document.getElementById('adminCreateUserForm');
const usersTableBody = document.getElementById('usersTableBody');
const refreshUsersBtn = document.getElementById('refreshUsersBtn');
const followStoryBtn = document.querySelector('.js-follow-story');
const followedStoriesSection = document.getElementById('followedStoriesSection');
const followedStoriesList = document.getElementById('followedStoriesList');

// --- CÁC HÀM CƠ SỞ ---
function getAuthData() {
    try {
        return JSON.parse(localStorage.getItem('userLogin'));
    } catch (error) {
        localStorage.removeItem('userLogin');
        return null;
    }
}

function getCurrentUser() {
    const authData = getAuthData();
    return authData && authData.user ? authData.user : null;
}

function getUserRole(user) {
    return String(user?.role || 'user').toLowerCase();
}

function isAdmin(user) {
    return getUserRole(user) === 'admin';
}

function getAuthHeaders() {
    const authData = getAuthData();
    return {
        'Content-Type': 'application/json',
        ...(authData?.accessToken ? { Authorization: `Bearer ${authData.accessToken}` } : {})
    };
}

function getFollowedStories(user) {
    return Array.isArray(user?.followedStories) ? user.followedStories : [];
}

function isFollowingStory(user, storyId) {
    return getFollowedStories(user).some(story => String(story.id) === String(storyId));
}

function setCurrentUserData(user) {
    const authData = getAuthData();
    if (!authData) return;
    localStorage.setItem('userLogin', JSON.stringify({ ...authData, user }));
}

async function refreshCurrentUserData() {
    const currentUser = getCurrentUser();
    if (!currentUser?.id) return currentUser;

    try {
        const res = await fetch(`${API_BASE}/users/${currentUser.id}`, { headers: getAuthHeaders() });
        if (!res.ok) return currentUser;
        const freshUser = await res.json();
        setCurrentUserData(freshUser);
        return freshUser;
    } catch {
        return currentUser;
    }
}

// --- HÀM CẬP NHẬT GIAO DIỆN ---
function updateAuthUI() {
    const currentUser = getCurrentUser();
    
    if (loginBtn && userMenu) {
        if (currentUser) {
            loginBtn.classList.add('d-none');
            userMenu.classList.remove('d-none');
            if (displayUsername) {
                displayUsername.textContent = currentUser.username;
                displayUsername.classList.remove('text-primary', 'text-decoration-underline');
                displayUsername.classList.add('text-dark');
                displayUsername.style.cursor = isAdmin(currentUser) ? 'default' : 'pointer';
                displayUsername.title = isAdmin(currentUser) ? '' : 'Open profile';
            }
            if (dashboardLink) dashboardLink.classList.toggle('d-none', !isAdmin(currentUser));
        } else {
            loginBtn.classList.remove('d-none');
            userMenu.classList.add('d-none');
            if (dashboardLink) dashboardLink.classList.add('d-none');
        }
    } else {
        updateFallbackAuthHeader(currentUser);
    }
    updateFollowButton();
    renderFollowedStories();
}

function getFallbackAuthSlot() {
    const authButton = document.querySelector('header button[data-bs-target="#authModal"], header .btn-outline-danger');
    return authButton ? authButton.closest('li') || authButton.parentElement : null;
}

function updateFallbackAuthHeader(currentUser) {
    const slot = getFallbackAuthSlot();
    if (!slot || slot.dataset.authRendered === 'true') return;

    if (!currentUser) {
        slot.dataset.authRendered = 'true';
        return;
    }

    slot.dataset.authRendered = 'true';
    const targetPage = isAdmin(currentUser) ? DASHBOARD_PAGE : USER_PAGE;
    slot.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-link text-dark text-decoration-none fw-bold p-0 js-profile-link">
                ${escapeHtml(currentUser.username || 'User')}
            </button>
            ${isAdmin(currentUser) ? `<a href="${DASHBOARD_PAGE}" class="btn btn-outline-primary rounded-pill">Dashboard</a>` : ''}
            <button type="button" class="btn btn-danger rounded-pill js-fallback-logout">Log Out</button>
        </div>
    `;

    slot.querySelector('.js-profile-link')?.addEventListener('click', () => {
        window.location.href = targetPage;
    });
    slot.querySelector('.js-fallback-logout')?.addEventListener('click', () => {
        localStorage.removeItem('userLogin');
        window.location.href = HOME_PAGE;
    });
}

// Thêm sự kiện cho nút Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('userLogin');
        window.location.href = HOME_PAGE;
    });
}

if (displayUsername) {
    displayUsername.addEventListener('click', () => {
        const currentUser = getCurrentUser();
        if (currentUser && !isAdmin(currentUser)) {
            window.location.href = USER_PAGE;
        }
    });
}

// --- CÁC HÀM XỬ LÝ CHỨC NĂNG ---
function escapeHtml(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function getCurrentPageName() {
    return window.location.pathname.split('/').pop().toLowerCase() || HOME_PAGE;
}

function goToPage(page) {
    window.location.href = page;
}

function hideAuthModal() {
    const modalElement = document.getElementById('authModal');
    if (modalElement && typeof bootstrap !== 'undefined') {
        bootstrap.Modal.getInstance(modalElement)?.hide();
    }
}

function redirectAfterLogin(user) {
    if (isAdmin(user)) {
        alert('Đăng nhập thành công!');
        goToPage(DASHBOARD_PAGE);
    } else {
        alert('Đăng nhập thành công!');
        window.location.reload();
    }
}

function protectDashboard() {
    if (getCurrentPageName() !== DASHBOARD_PAGE) return;
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Vui lòng đăng nhập!');
        goToPage(HOME_PAGE);
    } else if (!isAdmin(currentUser)) {
        alert('Không có quyền truy cập!');
        goToPage(HOME_PAGE);
    }
}

// --- CÁC HÀM THIẾT LẬP ---
function setupFormSwitching() {
    linkToRegister?.addEventListener('click', (e) => { e.preventDefault(); loginSection?.classList.add('d-none'); registerSection?.classList.remove('d-none'); });
    linkToLogin?.addEventListener('click', (e) => { e.preventDefault(); registerSection?.classList.add('d-none'); loginSection?.classList.remove('d-none'); });
}

function setupRegister() {
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('modalRegName').value.trim();
        const email = document.getElementById('modalRegEmail').value.trim();
        const password = document.getElementById('modalRegPassword').value;
        try {
            const res = await fetch(`${API_BASE}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password, role: 'user' }) });
            if (res.ok) { alert('Đăng ký thành công!'); registerForm.reset(); linkToLogin.click(); }
            else alert('Lỗi đăng ký!');
        } catch { alert('Không kết nối được server!'); }
    });
}

function setupLogin() {
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('modalLoginEmail').value.trim();
        const password = document.getElementById('modalLoginPassword').value;
        try {
            const res = await fetch(`${API_BASE}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
            const data = await res.json();
            if (res.ok) { localStorage.setItem('userLogin', JSON.stringify(data)); hideAuthModal(); redirectAfterLogin(data.user); }
            else alert('Sai tài khoản hoặc mật khẩu!');
        } catch { alert('Không kết nối được server!'); }
    });
}

function getStoryFromButton(button) {
    return {
        id: button.dataset.storyId,
        title: button.dataset.storyTitle,
        author: button.dataset.storyAuthor,
        cover: button.dataset.storyCover,
        url: button.dataset.storyUrl
    };
}

function updateFollowButton() {
    if (!followStoryBtn) return;
    const currentUser = getCurrentUser();
    const story = getStoryFromButton(followStoryBtn);
    const following = currentUser && isFollowingStory(currentUser, story.id);
    followStoryBtn.textContent = following ? 'Following' : '+ Subscribe';
    if (following) {
        followStoryBtn.classList.add('btn-success');
        followStoryBtn.classList.remove('btn-light');
    } else {
        followStoryBtn.classList.add('btn-light');
        followStoryBtn.classList.remove('btn-success');
    }
}

function renderFollowedStories() {
    if (!followedStoriesSection || !followedStoriesList) return;
    const currentUser = getCurrentUser();
    const stories = getFollowedStories(currentUser);
    followedStoriesSection.classList.toggle('d-none', !currentUser || stories.length === 0);
    if (!currentUser || stories.length === 0) {
        followedStoriesList.innerHTML = '';
        return;
    }
    followedStoriesList.innerHTML = stories.map(story => `
        <div class="col">
            <article class="series-item h-100">
                <a href="${escapeHtml(story.url)}" class="text-decoration-none">
                    <div class="thumbnail-box">
                        <span class="badge-status bg-danger">Following</span>
                        <img src="${escapeHtml(story.cover)}" alt="${escapeHtml(story.title)}">
                    </div>
                    <div class="info-box">
                        <h3 class="comic-title text-dark">${escapeHtml(story.title)}</h3>
                        <p class="comic-genre text-muted small mb-0">${escapeHtml(story.author)}</p>
                    </div>
                </a>
            </article>
        </div>
    `).join('');
}

function setupStoryFollowing() {
    if (!followStoryBtn) return;
    if (followStoryBtn.dataset.followBound === 'true') return;
    followStoryBtn.dataset.followBound = 'true';
    updateFollowButton();
    followStoryBtn.addEventListener('click', async () => {
        if (followStoryBtn.dataset.followSaving === 'true') return;

        const currentUser = getCurrentUser();
        if (!currentUser) {
            alert('Vui lÃ²ng Ä‘Äƒng nháº­p Ä‘á»ƒ theo dÃµi truyá»‡n!');
            return;
        }

        const story = getStoryFromButton(followStoryBtn);
        if (!story.id) return;

        followStoryBtn.dataset.followSaving = 'true';
        followStoryBtn.disabled = true;

        const followedStories = getFollowedStories(currentUser);
        const nextStories = isFollowingStory(currentUser, story.id)
            ? followedStories.filter(item => String(item.id) !== String(story.id))
            : [...followedStories, story];

        try {
            const res = await fetch(`${API_BASE}/users/${currentUser.id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ followedStories: nextStories })
            });
            if (!res.ok) throw new Error('Cannot save followed stories');
            const updatedUser = await res.json();
            setCurrentUserData(updatedUser);
            updateFollowButton();
            renderFollowedStories();
        } catch {
            alert('KhÃ´ng lÆ°u Ä‘Æ°á»£c truyá»‡n Ä‘ang theo dÃµi!');
        }

        followStoryBtn.dataset.followSaving = 'false';
        followStoryBtn.disabled = false;
        updateFollowButton();
    });
}

// --- DASHBOARD MANAGEMENT ---
async function fetchUsers() {
    const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Cannot load');
    return res.json();
}

function renderUsers(users) {
    if (!usersTableBody) return;
    if (!users.length) { usersTableBody.innerHTML = '<tr><td colspan="5">No users.</td></tr>'; return; }
    const currentUser = getCurrentUser();
    usersTableBody.innerHTML = users.map(user => `
        <tr data-user-id="${user.id}">
            <td>${user.id}</td>
            <td>${escapeHtml(user.email)}</td>
            <td><input type="text" class="form-control form-control-sm js-username" value="${escapeHtml(user.username)}"></td>
            <td>
                <select class="form-select form-select-sm js-role">
                    <option value="user" ${getUserRole(user) === 'user' ? 'selected' : ''}>Client</option>
                    <option value="admin" ${getUserRole(user) === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </td>
            <td class="text-end">
                <button class="btn btn-sm btn-dark js-save-user">Save</button>
                <button class="btn btn-sm btn-outline-danger js-delete-user ms-2" ${String(currentUser?.id) === String(user.id) ? 'disabled title="Cannot delete your own account"' : ''}>Delete</button>
            </td>
        </tr>
    `).join('');
}

async function loadUsers() {
    try { const users = await fetchUsers(); renderUsers(users); } catch { usersTableBody.innerHTML = '<tr><td colspan="5">Lỗi tải dữ liệu.</td></tr>'; }
}

function setupDashboardManagement() {
    if (!usersTableBody) return;
    loadUsers();
    refreshUsersBtn?.addEventListener('click', loadUsers);
    usersTableBody.addEventListener('click', async (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const id = row.dataset.userId;

        if (e.target.classList.contains('js-delete-user')) {
            const email = row.children[1]?.textContent || `ID ${id}`;
            if (!confirm(`Delete account ${email}?`)) return;
            const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) {
                alert('Cannot delete this account!');
                return;
            }
            alert('Account deleted!');
            loadUsers();
            return;
        }

        if (!e.target.classList.contains('js-save-user')) return;
        const username = row.querySelector('.js-username').value;
        const role = row.querySelector('.js-role').value;
        await fetch(`${API_BASE}/users/${id}`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ username, role }) });
        alert('Đã cập nhật!');
        loadUsers();
    });
}

// --- KHỞI CHẠY ---
async function initAuth() {
    await refreshCurrentUserData();
    updateAuthUI();
    protectDashboard();
    setupFormSwitching();
    setupRegister();
    setupLogin();
    setupStoryFollowing();
    setupDashboardManagement();
}

initAuth();
