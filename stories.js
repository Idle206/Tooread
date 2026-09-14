const STORY_API_HOST = window.location.protocol === 'file:' ? '192.168.1.175' : window.location.hostname;
const STORY_API_BASE = `http://${STORY_API_HOST}:3000`;
const STORY_PLACEHOLDER_COVER = 'logo.webp';

function storyEscapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

async function fetchStories() {
    const res = await fetch(`${STORY_API_BASE}/stories`);
    if (!res.ok) throw new Error('Cannot load stories');
    return res.json();
}

async function fetchStory(id) {
    const res = await fetch(`${STORY_API_BASE}/stories/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Cannot load story');
    return res.json();
}

async function fetchStoryChapters(storyId) {
    const res = await fetch(`${STORY_API_BASE}/chapters?storyId=${encodeURIComponent(storyId)}`);
    if (!res.ok) throw new Error('Cannot load chapters');
    return res.json();
}

async function fetchChapter(chapterId) {
    const res = await fetch(`${STORY_API_BASE}/chapters/${encodeURIComponent(chapterId)}`);
    if (!res.ok) throw new Error('Cannot load chapter');
    return res.json();
}

async function fetchAllChapters() {
    const res = await fetch(`${STORY_API_BASE}/chapters`);
    if (!res.ok) throw new Error('Cannot load chapters');
    return res.json();
}

function getStoryUrl(story) {
    return `chapters.html?id=${encodeURIComponent(story.id)}`;
}

function getReaderUrl(chapter) {
    return `reader.html?storyId=${encodeURIComponent(chapter.storyId)}&chapterId=${encodeURIComponent(chapter.id)}&v=reader-fix-20260603`;
}

function getNumberFromText(value) {
    const match = String(value || '').match(/\d+/);
    return match ? Number(match[0]) : 0;
}

function normalizeGenre(value) {
    return String(value || '')
        .toLowerCase()
        .replaceAll('&', 'and')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function storyMatchesGenre(story, selectedGenre) {
    const selected = normalizeGenre(selectedGenre);
    if (!selected || selected === 'all') return true;

    return String(story.genre || '')
        .split(/[,/|]+/)
        .map(normalizeGenre)
        .some(genre => genre === selected);
}

function storyHasChapters(story, chapters) {
    return chapters.some(chapter => String(chapter.storyId) === String(story.id));
}

function getRandomStories(stories, limit = 5) {
    return [...stories]
        .sort(() => Math.random() - 0.5)
        .slice(0, limit);
}

function renderStoryCards(container, stories) {
    if (!container) return;

    if (!stories.length) {
        container.innerHTML = '<div class="col-12 text-muted">Chua co truyen nao.</div>';
        return;
    }

    container.innerHTML = stories.map(story => {
        const title = storyEscapeHtml(story.title);
        const author = storyEscapeHtml(story.author || 'Unknown author');
        const genre = storyEscapeHtml(story.genre || 'Updating');
        const cover = storyEscapeHtml(story.cover || STORY_PLACEHOLDER_COVER);
        const url = storyEscapeHtml(getStoryUrl(story));

        return `
            <div class="col">
                <article class="series-item h-100">
                    <a href="${url}" class="text-decoration-none">
                        <div class="thumbnail-box">
                            <span class="badge-status bg-success">New Series</span>
                            <img src="${cover}" alt="${title}" onerror="this.src='${STORY_PLACEHOLDER_COVER}'">
                        </div>
                    </a>
                    <div class="info-box">
                        <h3 class="comic-title">
                            <a href="${url}" class="text-decoration-none text-dark hover-title">${title}</a>
                        </h3>
                        <p class="comic-genre text-muted small mb-0">${genre} / ${author}</p>
                    </div>
                </article>
            </div>
        `;
    }).join('');
}

async function loadStoryLists() {
    const homeGrid = document.querySelector('.trending-section .row');
    const comingSoonGrid = document.querySelector('.comingsoon-section .row');
    const categoryGrid = document.querySelector('main .row.row-cols-2, main .row.row-cols-sm-3');
    const targetGrid = document.body.contains(homeGrid) ? homeGrid : categoryGrid;
    if (!targetGrid) return;

    try {
        if (homeGrid) {
            await loadHomeStorySections(homeGrid, comingSoonGrid);
        } else if (categoryGrid) {
            const stories = await fetchStories();
            setupCategoryFilters(stories, categoryGrid);
        }
    } catch {
        targetGrid.innerHTML = '<div class="col-12 text-danger">Khong tai duoc danh sach truyen.</div>';
        if (comingSoonGrid) comingSoonGrid.innerHTML = '<div class="col-12 text-danger">Khong tai duoc danh sach truyen.</div>';
    }
}

async function loadHomeStorySections(homeGrid, comingSoonGrid) {
    const originalsGrid = document.querySelector('.Originals-section .row');
    const translatedGrid = document.querySelector('.Translated-section .row');
    const [stories, chapters] = await Promise.all([
        fetchStories(),
        fetchAllChapters()
    ]);

    const publishedStories = stories.filter(story => storyHasChapters(story, chapters));
    const comingSoonStories = stories.filter(story => !storyHasChapters(story, chapters));

    renderStoryCards(homeGrid, publishedStories);
    if (comingSoonGrid) renderStoryCards(comingSoonGrid, comingSoonStories);
    if (originalsGrid) renderStoryCards(originalsGrid, getRandomStories(stories, 5));
    if (translatedGrid) renderStoryCards(translatedGrid, getRandomStories(stories, 5));
}

function getCategoryLinks() {
    return Array.from(document.querySelectorAll('main nav .nav-link'));
}

function getGenreFromLink(link) {
    return link.dataset.genre || link.textContent.trim();
}

function setActiveCategory(activeLink) {
    getCategoryLinks().forEach(link => {
        const active = link === activeLink;
        link.classList.toggle('active-tab', active);
        link.classList.toggle('text-white', active);
        link.classList.toggle('text-dark', !active);
    });
}

function renderStoriesByGenre(stories, grid, genre) {
    const filteredStories = stories.filter(story => storyMatchesGenre(story, genre));
    renderStoryCards(grid, filteredStories);

    if (!filteredStories.length) {
        grid.innerHTML = `<div class="col-12 text-muted">Khong co truyen thuoc the loai ${storyEscapeHtml(genre)}.</div>`;
    }
}

function ensureGenreLinks(stories) {
    const list = document.querySelector('main nav .nav');
    if (!list || list.dataset.genreLinksReady === 'true') return;

    const existingGenres = new Set(getCategoryLinks().map(link => normalizeGenre(getGenreFromLink(link))));
    if (!existingGenres.has('all')) {
        list.insertAdjacentHTML('afterbegin', '<li class="nav-item"><a class="nav-link text-dark" href="#" data-genre="all">ALL</a></li>');
        existingGenres.add('all');
    }

    stories
        .flatMap(story => String(story.genre || '').split(/[,/|]+/))
        .map(genre => genre.trim())
        .filter(Boolean)
        .forEach(genre => {
            const key = normalizeGenre(genre);
            if (existingGenres.has(key)) return;
            existingGenres.add(key);
            list.insertAdjacentHTML('beforeend', `<li class="nav-item"><a class="nav-link text-dark" href="#" data-genre="${storyEscapeHtml(genre)}">${storyEscapeHtml(genre.toUpperCase())}</a></li>`);
        });

    list.dataset.genreLinksReady = 'true';
}

function setupCategoryFilters(stories, grid) {
    ensureGenreLinks(stories);
    renderStoryCards(grid, stories);

    getCategoryLinks().forEach(link => {
        if (link.dataset.categoryBound === 'true') return;
        link.dataset.categoryBound = 'true';
        link.addEventListener('click', event => {
            event.preventDefault();
            const genre = getGenreFromLink(link);
            setActiveCategory(link);
            renderStoriesByGenre(stories, grid, genre);
        });
    });

    const allLink = getCategoryLinks().find(link => normalizeGenre(getGenreFromLink(link)) === 'all');
    if (allLink) setActiveCategory(allLink);
}

function updateStoryDetail(story) {
    const banner = document.querySelector('.story-banner');
    const genre = document.querySelector('.story-banner .text-info');
    const title = document.querySelector('.story-banner h1');
    const author = document.querySelector('.story-banner .text-white-50');
    const followButton = document.querySelector('.js-follow-story');
    const schedule = document.querySelector('.sticky-top .text-danger');
    const description = document.querySelector('.sticky-top p.text-secondary');

    if (banner && story.cover) {
        banner.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url('${story.cover}')`;
    }
    if (genre) genre.textContent = story.genre || 'Updating';
    if (title) title.textContent = story.title || 'Untitled';
    if (author) author.textContent = `By ${story.author || 'Unknown author'}`;
    if (schedule) schedule.textContent = story.schedule || 'Updating';
    if (description) {
        description.textContent = story.description || 'No description yet.';
        description.style.visibility = 'visible';
    }
    document.title = `${story.title || 'Story'} - TooRead`;

    if (followButton) {
        followButton.dataset.storyId = String(story.id);
        followButton.dataset.storyTitle = story.title || '';
        followButton.dataset.storyAuthor = story.author || '';
        followButton.dataset.storyCover = story.cover || STORY_PLACEHOLDER_COVER;
        followButton.dataset.storyUrl = getStoryUrl(story);
        if (typeof updateFollowButton === 'function') updateFollowButton();
    }
}

function renderChapterList(storyId, chapters) {
    const list = document.querySelector('.chapter-list');
    const firstChapterLink = document.querySelector('.btn-first-ep');
    if (!list) return;

    const sortedChapters = [...chapters].sort((a, b) => {
        const volumeCompare = getNumberFromText(b.volumeTitle) - getNumberFromText(a.volumeTitle);
        if (volumeCompare !== 0) return volumeCompare;
        return Number(b.chapterNumber || 0) - Number(a.chapterNumber || 0);
    });

    if (!sortedChapters.length) {
        list.innerHTML = '<div class="py-3 text-muted">Chua co chuong nao.</div>';
        if (firstChapterLink) firstChapterLink.href = '#';
        return;
    }

    list.innerHTML = sortedChapters.map(chapter => `
        <div class="py-3 border-bottom chapter-item ps-2">
            <a href="${storyEscapeHtml(getReaderUrl(chapter))}"
               class="text-decoration-none text-dark fw-semibold d-block chapter-title">
                ${storyEscapeHtml(chapter.volumeTitle || 'Volume')} - ${storyEscapeHtml(chapter.chapterTitle || `Chapter ${chapter.chapterNumber || ''}`)}
            </a>
            <div class="text-muted text-xs mt-1">${storyEscapeHtml(chapter.releaseDate || '')}</div>
        </div>
    `).join('');

    const firstChapter = [...chapters].sort((a, b) => {
        const volumeCompare = getNumberFromText(a.volumeTitle) - getNumberFromText(b.volumeTitle);
        if (volumeCompare !== 0) return volumeCompare;
        return Number(a.chapterNumber || 0) - Number(b.chapterNumber || 0);
    })[0];
    if (firstChapterLink && firstChapter) firstChapterLink.href = getReaderUrl(firstChapter);
}

async function loadStoryDetail() {
    if (!document.querySelector('.story-banner')) return;

    const storyId = new URLSearchParams(window.location.search).get('id') || '1';
    try {
        const [story, chapters] = await Promise.all([
            fetchStory(storyId),
            fetchStoryChapters(storyId)
        ]);
        updateStoryDetail(story);
        renderChapterList(storyId, chapters);
    } catch {
        const title = document.querySelector('.story-banner h1');
        if (title) title.textContent = 'Khong tim thay truyen';
    }
}

function renderReaderContent(chapter, story) {
    const title = document.querySelector('main header h1');
    const subtitle = document.querySelector('main header h2');
    const article = document.querySelector('main article');
    if (!title || !subtitle || !article) return;

    title.textContent = chapter.volumeTitle || story?.title || 'Volume';
    subtitle.textContent = chapter.chapterTitle || `Chapter ${chapter.chapterNumber || ''}`;
    document.title = `${chapter.chapterTitle || 'Chapter'} - ${story?.title || 'TooRead'}`;

    const paragraphs = String(chapter.content || '')
        .split(/\n+/)
        .map(line => line.trim())
        .filter(Boolean);

    article.innerHTML = paragraphs.length
        ? paragraphs.map(line => `<p class="mb-4">${storyEscapeHtml(line)}</p>`).join('')
        : '<p class="mb-4 text-muted">Chua co noi dung chuong.</p>';
}

function renderReaderMessage(titleText, subtitleText, bodyText) {
    const title = document.querySelector('main header h1');
    const subtitle = document.querySelector('main header h2');
    const article = document.querySelector('main article');
    if (title) title.textContent = titleText;
    if (subtitle) subtitle.textContent = subtitleText;
    if (article) article.innerHTML = `<p class="mb-4 text-muted">${storyEscapeHtml(bodyText)}</p>`;
}

function getStoryAuthData() {
    try {
        return JSON.parse(localStorage.getItem('userLogin'));
    } catch {
        localStorage.removeItem('userLogin');
        return null;
    }
}

function setStoryAuthUser(user) {
    const authData = getStoryAuthData();
    if (!authData) return;
    localStorage.setItem('userLogin', JSON.stringify({ ...authData, user }));
}

async function saveReadingHistory(chapter, story) {
    const authData = getStoryAuthData();
    const user = authData?.user;
    if (!user || !chapter?.id) return;

    const currentHistory = Array.isArray(user.readingHistory) ? user.readingHistory : [];
    const historyItem = {
        storyId: String(chapter.storyId || story?.id || ''),
        chapterId: String(chapter.id),
        storyTitle: story?.title || 'Story',
        volumeTitle: chapter.volumeTitle || '',
        chapterTitle: chapter.chapterTitle || `Chapter ${chapter.chapterNumber || ''}`,
        url: getReaderUrl(chapter),
        readAt: new Date().toLocaleDateString('vi-VN')
    };

    const nextHistory = [
        historyItem,
        ...currentHistory.filter(item => String(item.chapterId) !== String(chapter.id))
    ].slice(0, 20);

    try {
        const res = await fetch(`${STORY_API_BASE}/users/${user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(authData.accessToken ? { Authorization: `Bearer ${authData.accessToken}` } : {})
            },
            body: JSON.stringify({ readingHistory: nextHistory })
        });
        if (!res.ok) throw new Error('Cannot save reading history');
        const updatedUser = await res.json();
        setStoryAuthUser(updatedUser);
    } catch {
        // Reading should keep working even if history cannot be saved.
    }
}

async function loadReaderPage() {
    if (!document.querySelector('main article') || document.querySelector('.story-banner')) return;

    const params = new URLSearchParams(window.location.search);
    const storyId = params.get('storyId');
    const chapterId = params.get('chapterId');
    if (!storyId || !chapterId) {
        renderReaderMessage('Khong tim thay chuong', 'Thieu thong tin chuong', 'Vui long chon chuong tu danh sach chuong cua truyen.');
        return;
    }

    try {
        const [story, chapters] = await Promise.all([
            fetchStory(storyId),
            fetchStoryChapters(storyId)
        ]);
        const chapter = chapters.find(item => String(item.id) === String(chapterId));
        if (!chapter) throw new Error('Chapter does not belong to this story');
        renderReaderContent(chapter, story);
        saveReadingHistory(chapter, story);
    } catch {
        renderReaderMessage('Khong tim thay chuong', 'Chuong khong ton tai', 'Chuong nay khong ton tai hoac khong thuoc truyen hien tai.');
    }
}

loadStoryLists();
loadStoryDetail();
loadReaderPage();
