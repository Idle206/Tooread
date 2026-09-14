const DASHBOARD_API_HOST = window.location.protocol === 'file:' ? '192.168.1.175' : window.location.hostname;
const DASHBOARD_API_BASE = `http://${DASHBOARD_API_HOST}:3000`;
const STORIES_API = `${DASHBOARD_API_BASE}/stories`;
const CHAPTERS_API = `${DASHBOARD_API_BASE}/chapters`;

const createBtn = document.getElementById("createSeriesBtn");
const createChapterBtn = document.getElementById("createChapterBtn");
const backToSeriesBtn = document.getElementById("backToSeriesBtn");
const formSection = document.getElementById("createFormSection");
const chapterFormSection = document.getElementById("chapterFormSection");
const tableSection = document.getElementById("novelTableSection");
const storySelect = document.getElementById("chapterStoryId");

let currentStories = [];
let currentChapters = [];

function dashboardEscapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showSection(section) {
    formSection?.classList.add("d-none");
    chapterFormSection?.classList.add("d-none");
    tableSection?.classList.add("d-none");
    section?.classList.remove("d-none");
}

createBtn?.addEventListener("click", () => {
    showSection(formSection);
});

createChapterBtn?.addEventListener("click", () => {
    fillStorySelect();
    showSection(chapterFormSection);
});

backToSeriesBtn?.addEventListener("click", () => {
    showSection(tableSection);
});

async function loadStories() {
    const [storiesRes, chaptersRes] = await Promise.all([
        fetch(STORIES_API),
        fetch(CHAPTERS_API)
    ]);

    currentStories = await storiesRes.json();
    currentChapters = await chaptersRes.json();

    renderTable(currentStories);
    fillStorySelect();
}

function getChapterCount(storyId) {
    return currentChapters.filter(chapter => String(chapter.storyId) === String(storyId)).length;
}

function renderTable(stories) {
    const tbody = document.getElementById("novelTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    stories.forEach(story => {
        const row = `
            <tr>
                <td>
                    <img src="${dashboardEscapeHtml(story.cover)}"
                         alt="${dashboardEscapeHtml(story.title)}"
                         onerror="this.src='logo.webp'"
                         style="width:50px;height:70px;object-fit:cover;border-radius:4px;">
                </td>

                <td class="fw-bold">
                    ${dashboardEscapeHtml(story.title)} <br>
                    <small class="text-muted">ID: ${story.id}</small>
                </td>

                <td>${dashboardEscapeHtml(story.author)}</td>

                <td>${dashboardEscapeHtml(story.genre)}</td>

                <td>${getChapterCount(story.id)}</td>

                <td class="text-end pe-3 text-nowrap">
                    <button class="btn btn-sm btn-outline-primary" onclick="openChapterForm(${story.id})">
                        Add chapter
                    </button>
                    <a class="btn btn-sm btn-outline-dark ms-1" href="chapters.html?id=${story.id}">
                        View
                    </a>
                    <button class="btn btn-sm btn-danger ms-1" onclick="deleteStory(${story.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function fillStorySelect(selectedId) {
    if (!storySelect) return;

    storySelect.innerHTML = currentStories.map(story => `
        <option value="${story.id}" ${String(story.id) === String(selectedId) ? "selected" : ""}>
            ${dashboardEscapeHtml(story.title)}
        </option>
    `).join("");
}

function openChapterForm(storyId) {
    fillStorySelect(storyId);
    showSection(chapterFormSection);
}

document.getElementById("addStoryForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newStory = {
        title: document.getElementById("formTitle").value.trim(),
        author: document.getElementById("formAuthor").value.trim(),
        genre: document.getElementById("formGenre").value.trim(),
        cover: document.getElementById("formCover").value.trim(),
        schedule: document.getElementById("formSchedule").value.trim() || "Updating",
        description: document.getElementById("formDescription").value.trim()
    };

    await fetch(STORIES_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStory)
    });

    e.target.reset();
    showSection(tableSection);
    loadStories();
});

document.getElementById("addChapterForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newChapter = {
        storyId: Number(document.getElementById("chapterStoryId").value),
        volumeTitle: document.getElementById("chapterVolumeTitle").value.trim(),
        chapterTitle: document.getElementById("chapterTitle").value.trim(),
        chapterNumber: Number(document.getElementById("chapterNumber").value),
        releaseDate: document.getElementById("chapterReleaseDate").value || new Date().toISOString().slice(0, 10),
        content: document.getElementById("chapterContent").value.trim()
    };

    await fetch(CHAPTERS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newChapter)
    });

    e.target.reset();
    fillStorySelect(newChapter.storyId);
    showSection(tableSection);
    loadStories();
});

async function deleteStory(id) {
    if (!confirm("Delete this story and its chapters?")) return;

    const relatedChapters = currentChapters.filter(chapter => String(chapter.storyId) === String(id));
    await Promise.all(relatedChapters.map(chapter => fetch(`${CHAPTERS_API}/${chapter.id}`, { method: "DELETE" })));
    await fetch(`${STORIES_API}/${id}`, { method: "DELETE" });

    loadStories();
}

loadStories();
