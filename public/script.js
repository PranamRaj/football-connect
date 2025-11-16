// State
let currentPage = 'home';
let isLoggedIn = false;
let loginType = 'player';
let registerType = 'player';

// Data
const recentMatches = [
    { id: 1, title: 'Local League Final', date: '2025-11-10', location: 'Mumbai FC Ground', teams: 'Mumbai Warriors vs Andheri United' },
    { id: 2, title: 'State Championship', date: '2025-11-12', location: 'Maharashtra Stadium', teams: 'Pune FC vs Nagpur Knights' },
    { id: 3, title: 'Community Cup', date: '2025-11-15', location: 'Bandra Sports Complex', teams: 'Bandra Strikers vs Colaba FC' }
];

const localClubs = [
    { id: 1, name: 'Mumbai Warriors FC', location: 'Andheri, Mumbai', distance: '2.5 km', members: 45, rating: 4.5 },
    { id: 2, name: 'Bandra United', location: 'Bandra, Mumbai', distance: '5.1 km', members: 38, rating: 4.3 },
    { id: 3, name: 'Colaba Sports Club', location: 'Colaba, Mumbai', distance: '7.8 km', members: 52, rating: 4.7 }
];

const nationalClubs = [
    { id: 4, name: 'Bengaluru FC Youth', location: 'Bengaluru, Karnataka', members: 120 },
    { id: 5, name: 'Delhi Dynamos Academy', location: 'Delhi', members: 95 },
    { id: 6, name: 'Kolkata Knights', location: 'Kolkata, West Bengal', members: 88 }
];




const socialPosts = [
    { id: 1, user: 'Rahul Sharma', avatar: '🎯', content: 'Just scored a hat-trick in today\'s match! 🔥⚽', likes: 45, comments: 12, time: '2 hours ago' },
    { id: 2, user: 'Priya Kumar', avatar: '⚡', content: 'Training session highlights from yesterday. Check out my new dribbling skills!', likes: 67, comments: 18, time: '5 hours ago' },
    { id: 3, user: 'Arjun Patel', avatar: '🏆', content: 'Looking for a midfielder to join our team for weekend matches. DM me!', likes: 23, comments: 8, time: '1 day ago' }
];

const skills = [
    { name: 'Dribbling', rating: 8.5 },
    { name: 'Passing', rating: 7.8 },
    { name: 'Shooting', rating: 7.2 },
    { name: 'Defense', rating: 6.9 },
    { name: 'Speed', rating: 8.0 }
];

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    renderMatches();
    renderLocalClubs();
    renderNationalClubs();
    loadNews("india");   // NEW
    renderSkills();
    renderSocialFeed();
});

// Page Navigation
function changePage(page) {
    currentPage = page;

    // Update active page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page + '-page').classList.add('active');

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });

    // 🔥 Load profile dynamically when switching to Profile page
    if (page === "profile") {
        loadPlayerProfile();
    }
}


// Modal Functions
function openLoginModal() {
    document.getElementById('loginModal').classList.add('active');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
}

function openRegisterModal() {
    closeLoginModal();
    document.getElementById('registerModal').classList.add('active');
    setRegisterType('player'); // Reset to player form
}

function closeRegisterModal() {
    document.getElementById('registerModal').classList.remove('active');
}

function backToLogin() {
    closeRegisterModal();
    openLoginModal();
}

function setRegisterType(type) {
    registerType = type;

    // Update button states
    const registerModal = document.getElementById('registerModal');
    registerModal.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        }
    });

    // Update modal title
    document.getElementById('registerModalTitle').textContent =
        type === 'player' ? 'Player Registration' : 'Club/Organization Registration';

    // Show/hide appropriate form
    const playerForm = document.getElementById('playerRegisterForm');
    const clubForm = document.getElementById('clubRegisterForm');

    if (type === 'player') {
        playerForm.style.display = 'block';
        clubForm.style.display = 'none';
    } else {
        playerForm.style.display = 'none';
        clubForm.style.display = 'block';
    }
}

async function handleRegister() {
    const type = registerType; // player or club

    if (type === "player") {
        const form = document.getElementById("playerRegisterForm");

        const selects = form.querySelectorAll("select");

        const playerData = {
            email: form.querySelector('input[placeholder="Email *"]').value,
            password: form.querySelector('input[placeholder="Create Password *"]').value,
            full_name: form.querySelector('input[placeholder="Full Name *"]').value,
            phone: form.querySelector('input[placeholder="Phone Number *"]').value,
            dob: form.querySelector('input[placeholder="Date of Birth *"]').value,
            gender: selects[0].value,

            city: form.querySelector('input[placeholder="City *"]').value,
            state: form.querySelector('input[placeholder="State *"]').value,
            locality: form.querySelector('input[placeholder="Locality (e.g., Andheri) *"]').value,

            position: selects[1].value,           // correct
            preferred_foot: selects[3].value,     // correct
            experience_level: selects[4].value,   // correct

            height: form.querySelector('input[placeholder="Height (cm)"]').value,
            weight: form.querySelector('input[placeholder="Weight (kg)"]').value,

            bio: form.querySelectorAll("textarea")[0].value
        };

        try {
            const res = await axios.post("/api/register/player", playerData);
            alert("Player registration successful!");
            localStorage.setItem("token", res.data.token);
            closeRegisterModal();
        } catch (err) {
            console.log(err.response?.data || err);
            alert("Player registration failed!");
        }
    }


    // ------------------------------
    // CLUB REGISTRATION
    // ------------------------------
    if (type === "club") {
        const form = document.getElementById("clubRegisterForm");
        const formData = new FormData();

        formData.append("clubName", form.querySelector('input[placeholder="Club/Organization Name *"]').value);
        formData.append("email", form.querySelector('input[placeholder="Official Email *"]').value);
        formData.append("city", form.querySelector('input[placeholder="City *"]').value);
        formData.append("state", form.querySelector('input[placeholder="State *"]').value);
        formData.append("pin", form.querySelector('input[placeholder="PIN Code *"]').value);
        formData.append("locality", form.querySelector('input[placeholder="Locality/Area *"]').value);
        formData.append("members", form.querySelector('input[placeholder="Current Members *"]').value);
        formData.append("description", form.querySelector('textarea').value);

        // File uploads
        const certificate = form.querySelectorAll(".file-input")[0].files[0];
        const photos = form.querySelectorAll(".file-input")[1].files;

        if (certificate) formData.append("certificate", certificate);
        for (let i = 0; i < photos.length; i++) {
            formData.append("groundPhotos", photos[i]);
        }

        try {
            const res = await axios.post("/api/register/club", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            alert("Club registration successful!");
            closeRegisterModal();
        } catch (err) {
            console.log(err);
            alert("Club registration failed!");
        }
    }


    localStorage.setItem("token", res.data.token);
    isLoggedIn = true;

    document.getElementById('authButtons').classList.add('hidden');
    document.getElementById('logoutButton').classList.remove('hidden');

}


function setLoginType(type) {
    loginType = type;

    // Update button states
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        }
    });

    // Update modal title
    document.getElementById('modalTitle').textContent =
        type === 'player' ? 'Player Login' : 'Club/Organization Login';

    // Show/hide locality field
    const localityField = document.getElementById('localityField');
    if (type === 'player') {
        localityField.style.display = 'block';
    } else {
        localityField.style.display = 'none';
    }
}

async function handleLogin() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const res = await axios.post("/api/login", { email, password });

        // Save token
        localStorage.setItem("token", res.data.token);

        // Update UI
        isLoggedIn = true;
        closeLoginModal();

        document.getElementById('authButtons').classList.add('hidden');
        document.getElementById('logoutButton').classList.remove('hidden');

        alert("Login successful!");

    } catch (err) {
        console.log(err.response?.data || err);
        alert("Login failed! Check email/password");
    }
}


function handleLogout() {
    isLoggedIn = false;

    // Toggle auth buttons
    document.getElementById('authButtons').classList.remove('hidden');
    document.getElementById('logoutButton').classList.add('hidden');
}

// Render Functions
function renderMatches() {
    const matchesList = document.getElementById('matchesList');
    matchesList.innerHTML = recentMatches.map(match => `
        <div class="match-item">
            <h3>${match.title}</h3>
            <p class="teams">${match.teams}</p>
            <div class="match-details">
                <span>📅 ${match.date}</span>
                <span>📍 ${match.location}</span>
            </div>
        </div>
    `).join('');
}

function renderLocalClubs() {
    const clubsList = document.getElementById('localClubsList');
    clubsList.innerHTML = localClubs.map(club => `
        <div class="club-card">
            <div class="club-header">
                <div class="club-info">
                    <h3>${club.name}</h3>
                    <p class="club-location">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        ${club.location}
                    </p>
                    <p class="club-distance">📍 ${club.distance} away</p>
                </div>
                <div class="club-rating">
                    <svg class="star" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    <span class="rating-value">${club.rating}</span>
                </div>
            </div>
            <p class="club-members">${club.members} members</p>
            <button class="btn btn-primary">Join Club</button>
        </div>
    `).join('');
}

function renderNationalClubs() {
    const clubsList = document.getElementById('nationalClubsList');
    clubsList.innerHTML = nationalClubs.map(club => `
        <div class="club-card">
            <h3>${club.name}</h3>
            <p class="club-location">${club.location}</p>
            <p class="club-members">${club.members} members</p>
            <button class="btn btn-outline">View Details</button>
        </div>
    `).join('');
}

// news
async function loadNews(type) {
    // Switch active tab
    document.getElementById("tabIndia").classList.remove("active");
    document.getElementById("tabWorld").classList.remove("active");

    if (type === "india") document.getElementById("tabIndia").classList.add("active");
    else document.getElementById("tabWorld").classList.add("active");

    try {
        const res = await fetch(`/api/news/${type}`);
        const news = await res.json();

        const container = document.getElementById("newsList");

        container.innerHTML = news.map(item => `
            <div class="news-card">
                <div>
                    <h3 class="news-card-title">${item.title}</h3>
                    <p class="news-card-desc">${item.description || ""}</p>
                </div>

                <div class="news-card-footer">
                    <span>${new Date(item.published).toLocaleDateString()}</span>
                    <a href="${item.url}" target="_blank" class="news-link">Read →</a>
                </div>
            </div>
        `).join("");

    } catch (err) {
        console.error("News error:", err);
        document.getElementById("newsList").innerHTML = `
            <div style="padding:20px;color:red;">
                Failed to load news. Check NEWS_API_KEY.
            </div>
        `;
    }
}




function renderSkills() {
    const skillsList = document.getElementById('skillsList');
    skillsList.innerHTML = skills.map(skill => `
        <div class="skill-item">
            <div class="skill-header">
                <span class="skill-name">${skill.name}</span>
                <span class="skill-rating">${skill.rating}/10</span>
            </div>
            <div class="skill-bar">
                <div class="skill-progress" style="width: ${skill.rating * 10}%"></div>
            </div>
        </div>
    `).join('');
}

function renderSocialFeed() {
    const socialFeed = document.getElementById('socialFeed');
    socialFeed.innerHTML = socialPosts.map(post => `
        <div class="post-card">
            <div class="post-header">
                <div class="user-avatar">${post.avatar}</div>
                <div class="post-content">
                    <div class="post-user-info">
                        <div class="post-user">
                            <h4>${post.user}</h4>
                            <p class="post-time">${post.time}</p>
                        </div>
                        <button class="post-action">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </button>
                    </div>
                    <p class="post-message">${post.content}</p>
                    <div class="post-actions">
                        <button class="post-action like-btn">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                            <span>${post.likes}</span>
                        </button>
                        <button class="post-action comment-btn">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                            <span>${post.comments}</span>
                        </button>
                        <button class="post-action share-btn">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                            Share
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Close modal when clicking outside
document.getElementById('loginModal').addEventListener('click', function (e) {
    if (e.target === this) {
        closeLoginModal();
    }
});


async function loadPlayerProfile() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await axios.get("/api/me/player", {
            headers: { Authorization: "Bearer " + token }
        });

        const p = res.data.profile;  // FIXED

        // Age
        let age = "---";
        if (p.dob) {
            const d = new Date(p.dob);
            age = new Date().getFullYear() - d.getFullYear();
        }

        // Profile fields
        document.getElementById("profileName").innerText = p.full_name;
        document.getElementById("profilePosition").innerText = `${p.position} • ${age} years`;
        document.getElementById("profileLocation").innerHTML =
            `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
            </svg> ${p.city}, ${p.state}`;

        document.getElementById("statMatches").innerText = p.stats.matches;
        document.getElementById("statClubs").innerText = p.stats.clubs;

        // Avatar
        document.querySelector(".profile-avatar").innerText =
            p.full_name[0].toUpperCase();

        // Skills
        const container = document.getElementById("skillsList");
        container.innerHTML = p.skills
            .map(s => `
                <div class="skill-item">
                    <div class="skill-header">
                        <span class="skill-name">${s.skill_name}</span>
                        <span class="skill-rating">${s.rating}/10</span>
                    </div>
                    <div class="skill-bar">
                        <div class="skill-progress" style="width:${s.rating * 10}%"></div>
                    </div>
                </div>
            `)
            .join("");

    } catch (err) {
        console.log("Profile load error:", err.response?.data || err);
    }
}

