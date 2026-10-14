
const API_BASE = "https://placement-portal-backend-irmz.onrender.com/api";

let allJobs = [];
let currentStudent = JSON.parse(localStorage.getItem("placementStudent") || "null");
let interviewIndex = 0;

const interviewQuestions = [
    "Tell me about yourself and your technical skills.",
    "Explain one project you have completed.",
    "What is the difference between HTML, CSS, and JavaScript?",
    "How would you solve a problem you have never faced before?",
    "Why should we select you for this position?"
];

const roadmaps = {
    web: [
        "Learn HTML and create webpage structures.",
        "Learn CSS and make responsive websites.",
        "Learn JavaScript and DOM manipulation.",
        "Build projects using React.",
        "Learn Git, GitHub, and deployment.",
        "Create a portfolio and apply for internships."
    ],
    python: [
        "Learn Python variables, conditions, and loops.",
        "Practice functions, lists, dictionaries, and OOP.",
        "Learn file handling and exception handling.",
        "Practice SQL and database connections.",
        "Build Python projects.",
        "Practice coding questions and apply for jobs."
    ],
    java: [
        "Learn Java syntax, variables, and control statements.",
        "Practice arrays, strings, and methods.",
        "Learn object-oriented programming.",
        "Study collections and exception handling.",
        "Practice DSA and build Java projects.",
        "Prepare for interviews and apply for jobs."
    ],
    data: [
        "Learn Python fundamentals.",
        "Practice NumPy and Pandas.",
        "Learn data cleaning and visualization.",
        "Study SQL and statistics.",
        "Build data analysis projects.",
        "Create a portfolio and apply for internships."
    ]
};

// GET ELEMENT
function getElement(id) {
    return document.getElementById(id);
}

// SHOW MESSAGE
function showToast(message) {
    const toast = getElement("toast");

    if (toast) {
        toast.textContent = message;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    } else {
        alert(message);
    }
}

// API REQUEST
async function apiRequest(endpoint, options = {}) {
    const response = await fetch(API_BASE + endpoint, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const text = await response.text();
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        throw new Error("The server returned an invalid response.");
    }

    if (!response.ok) {
        throw new Error(
            data.error || data.message || "Request failed."
        );
    }

    return data;
}

// SAVE LOGIN DETAILS
function updateStudentUI() {
    const loggedIn = Boolean(
        currentStudent &&
        currentStudent.name &&
        currentStudent.email
    );

    const navLogin = getElement("nav-login");
    const navLogout = getElement("nav-logout");
    const logoutButton = getElement("logout-button");
    const studentInfo = getElement("student-info");
    const accountStatus = getElement("account-status");

    if (navLogin) {
        navLogin.style.display = loggedIn ? "none" : "";
    }

    if (navLogout) {
        navLogout.hidden = !loggedIn;
    }

    if (logoutButton) {
        logoutButton.hidden = !loggedIn;
    }

    if (studentInfo) {
        studentInfo.textContent = loggedIn
            ? `${currentStudent.name} (${currentStudent.email})`
            : "Not signed in";
    }

    if (accountStatus) {
        accountStatus.textContent = loggedIn
            ? "You are signed in."
            : "Please sign in to apply for jobs.";
    }
}

function saveStudent(student) {
    currentStudent = {
        name: student.name,
        email: student.email
    };

    localStorage.setItem(
        "placementStudent",
        JSON.stringify(currentStudent)
    );

    updateStudentUI();
}

function logout() {
    currentStudent = null;
    localStorage.removeItem("placementStudent");

    updateStudentUI();
    showToast("You have signed out.");

    const loginPanel = getElement("login-panel");
    const registerPanel = getElement("register-panel");

    if (loginPanel) loginPanel.hidden = false;
    if (registerPanel) registerPanel.hidden = true;
}

// SHOW REGISTER AND LOGIN PANELS
function showRegister() {
    const loginPanel = getElement("login-panel");
    const registerPanel = getElement("register-panel");

    if (loginPanel) loginPanel.hidden = true;
    if (registerPanel) registerPanel.hidden = false;
}

function showLogin() {
    const loginPanel = getElement("login-panel");
    const registerPanel = getElement("register-panel");

    if (loginPanel) loginPanel.hidden = false;
    if (registerPanel) registerPanel.hidden = true;
}

// REGISTRATION
async function handleRegister(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const message = getElement("register-message");
    const submitButton = form.querySelector(
        'button[type="submit"], input[type="submit"]'
    );

    const formData = new FormData(form);

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!name || !email || !password) {
        if (message) message.textContent = "Please fill in all fields.";
        return;
    }

    if (password.length < 6) {
        if (message) {
            message.textContent =
                "Password must be at least 6 characters.";
        }
        return;
    }

    if (submitButton) submitButton.disabled = true;
    if (message) message.textContent = "Creating your account...";

    try {
        const data = await apiRequest("/register/", {
            method: "POST",
            body: JSON.stringify({ name, email, password })
        });

        if (message) message.textContent = data.message;
        form.reset();
        showLogin();
        showToast(data.message || "Registration successful.");
    } catch (error) {
        if (message) message.textContent = error.message;
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

// LOGIN
async function handleLogin(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const message = getElement("login-message");
    const submitButton = form.querySelector(
        'button[type="submit"], input[type="submit"]'
    );

    const formData = new FormData(form);

    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
        if (message) {
            message.textContent = "Enter your email and password.";
        }
        return;
    }

    if (submitButton) submitButton.disabled = true;
    if (message) message.textContent = "Signing in...";

    try {
        const data = await apiRequest("/login/", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        saveStudent(data);

        if (message) message.textContent = data.message;
        form.reset();
        showToast("Login successful.");

        loadJobs();
    } catch (error) {
        if (message) message.textContent = error.message;
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

// LOAD JOBS
async function loadJobs() {
    const jobsContainer = getElement("jobs-list");
    const count = getElement("job-count");

    if (count) count.textContent = "Loading jobs...";

    try {
        const data = await apiRequest("/jobs/");

        if (!Array.isArray(data)) {
            throw new Error("Unexpected jobs response.");
        }

        allJobs = data;
        populateCategories();
        renderJobs(allJobs);
    } catch (error) {
        if (count) count.textContent = "Unable to load jobs.";

        if (jobsContainer) {
            jobsContainer.innerHTML = `
                <p class="error-message">
                    ${escapeHTML(error.message)}
                    <button type="button" id="retry-jobs">
                        Try Again
                    </button>
                </p>
            `;

            getElement("retry-jobs").addEventListener(
                "click",
                loadJobs
            );
        }
    }
}

// PREVENT HTML INJECTION
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// CATEGORY OPTIONS
function populateCategories() {
    const select = getElement("category-filter");
    if (!select) return;

    const previousValue = select.value;

    const categories = [
        ...new Set(
            allJobs
                .map(job => String(job.category || "").trim())
                .filter(Boolean)
        )
    ];

    select.innerHTML =
        '<option value="">All Categories</option>';

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });

    if (categories.includes(previousValue)) {
        select.value = previousValue;
    }
}

// DISPLAY JOBS
function renderJobs(jobs) {
    const container = getElement("jobs-list");
    const count = getElement("job-count");
    const emptyMessage = getElement("empty-message");

    if (!container) return;

    if (count) {
        count.textContent = `${jobs.length} job${jobs.length === 1 ? "" : "s"} found`;
    }

    if (emptyMessage) {
        emptyMessage.hidden = jobs.length !== 0;
    }

    if (jobs.length === 0) {
        container.innerHTML = "";
        return;
    }

    
container.innerHTML = jobs.map(job => `
    <article class="job-card">
        <h3>${escapeHTML(job.title)}</h3>
        <p><strong>Company:</strong> ${escapeHTML(job.company)}</p>
        <p><strong>Category:</strong> ${escapeHTML(job.category || "General")}</p>
        <p><strong>Location:</strong> ${escapeHTML(job.location || "Not specified")}</p>
        <p><strong>Salary:</strong> ${escapeHTML(job.salary || "Not specified")}</p>
        <p><strong>Job Type:</strong> ${escapeHTML(job.job_type || "Not specified")}</p>
        <button
            type="button"
            class="apply-job-button"
            data-job-id="${escapeHTML(job.id)}"
        >
            Apply Now
        </button>
    </article>
`).join("");

    container.querySelectorAll(".apply-job-button").forEach(button => {
        button.addEventListener("click", () => {
            applyForJob(button.dataset.jobId);
        });
    });
}

// SEARCH AND FILTER JOBS
function searchJobs() {
    const searchInput = getElement("search-input");
    const categoryFilter = getElement("category-filter");

    const searchText = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const category = categoryFilter
        ? categoryFilter.value.toLowerCase()
        : "";

    const filteredJobs = allJobs.filter(job => {
        const searchableText = [
            job.title,
            job.company,
            job.category,
            job.location,
            job.job_type
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchText);

        const matchesCategory = !category ||
            String(job.category || "").toLowerCase() === category;

        return matchesSearch && matchesCategory;
    });

    renderJobs(filteredJobs);
}

// APPLY FOR JOB
async function applyForJob(jobId) {
    if (!currentStudent) {
        showToast("Please sign in before applying.");

        const loginSection = getElement("login");
        if (loginSection) loginSection.scrollIntoView({
            behavior: "smooth"
        });

        showLogin();
        return;
    }

    const job = allJobs.find(item => String(item.id) === String(jobId));

    if (!job) {
        showToast("Job not found.");
        return;
    }

    const confirmed = confirm(
        `Apply for ${job.title} at ${job.company}?`
    );

    if (!confirmed) return;

    try {
        const data = await apiRequest("/apply/", {
            method: "POST",
            body: JSON.stringify({
                student_name: currentStudent.name,
                student_email: currentStudent.email,
                job_id: job.id
            })
        });

        showToast(data.message || "Application submitted.");
        loadMyApplications();
    } catch (error) {
        showToast(error.message);
    }
}

// VIEW MY APPLICATIONS
async function loadMyApplications() {
    const list = getElement("applications-list");
    const message = getElement("applications-message");

    if (!currentStudent) {
        if (message) message.textContent = "Please sign in first.";
        if (list) list.innerHTML = "";
        return;
    }

    if (message) message.textContent = "Loading your applications...";
    if (list) list.innerHTML = "";

    try {
        const data = await apiRequest(
            "/my-applications/?email=" +
            encodeURIComponent(currentStudent.email)
        );

        if (!Array.isArray(data)) {
            throw new Error("Unexpected applications response.");
        }

        if (data.length === 0) {
            if (message) {
                message.textContent = "You have not applied for any jobs yet.";
            }
            return;
        }

        if (message) {
            message.textContent = `${data.length} application(s) found.`;
        }

        if (list) {
            list.innerHTML = data.map(application => `
                <article class="application-card">
                    <h3>${escapeHTML(application.job_title)}</h3>
                    <p><strong>Company:</strong> ${escapeHTML(application.company)}</p>
                    <p><strong>Location:</strong> ${escapeHTML(application.location || "Not specified")}</p>
                    <p><strong>Status:</strong> ${escapeHTML(application.status)}</p>
                    <p><strong>Applied:</strong> ${escapeHTML(
                        formatDate(application.applied_at)
                    )}</p>
                </article>
            `).join("");
        }
    } catch (error) {
        if (message) message.textContent = error.message;
    }
}

function formatDate(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleDateString();
}

// MATCH JOBS USING SKILLS
function matchJobs() {
    const input = getElement("student-skills");
    const results = getElement("job-match-results");

    if (!results) return;

    const skills = input
        ? input.value.toLowerCase().split(",")
            .map(skill => skill.trim())
            .filter(Boolean)
        : [];

    if (skills.length === 0) {
        results.textContent =
            "Enter your skills separated by commas. Example: Python, SQL, JavaScript.";
        return;
    }

    const matches = allJobs.map(job => {
        const text = [
            job.title,
            job.company,
            job.category,
            job.job_type
        ].join(" ").toLowerCase();

        const matchedSkills = skills.filter(skill =>
            text.includes(skill)
        );

        return {
            job,
            matchedSkills
        };
    }).filter(item => item.matchedSkills.length > 0)
      .sort((a, b) =>
          b.matchedSkills.length - a.matchedSkills.length
      );

    if (matches.length === 0) {
        results.textContent =
            "No matching jobs found. Try different skills or check back later.";
        return;
    }

    results.innerHTML = `
        <h3>Matching Jobs</h3>
        ${matches.map(item => `
            <article class="job-match-card">
                <strong>${escapeHTML(item.job.title)}</strong>
                <p>${escapeHTML(item.job.company)}</p>
                <p>Matched skills: ${escapeHTML(
                    item.matchedSkills.join(", ")
                )}</p>
                <button type="button" class="match-apply-button"
                    data-job-id="${escapeHTML(item.job.id)}">
                    Apply Now
                </button>
            </article>
        `).join("")}
    `;

    results.querySelectorAll(".match-apply-button").forEach(button => {
        button.addEventListener("click", () => {
            applyForJob(button.dataset.jobId);
        });
    });
}

// CAREER ROADMAP
function showRoadmap() {
    const choice = getElement("career-choice");
    const results = getElement("roadmap-results");

    if (!choice || !results) return;

    const roadmap = roadmaps[choice.value];

    if (!roadmap) {
        results.textContent = "Please select a career path.";
        return;
    }

    results.innerHTML = `
        <h3>Your Career Roadmap</h3>
        <ol>
            ${roadmap.map(step =>
                `<li>${escapeHTML(step)}</li>`
            ).join("")}
        </ol>
    `;
}

// INTERVIEW PRACTICE
function nextInterviewQuestion() {
    const question = getElement("interview-question");
    const answer = getElement("interview-answer");
    const feedback = getElement("interview-feedback");

    if (!question) return;

    question.textContent =
        interviewQuestions[interviewIndex % interviewQuestions.length];

    interviewIndex++;

    if (answer) answer.value = "";
    if (feedback) feedback.textContent = "";
}

function checkInterviewAnswer() {
    const answer = getElement("interview-answer");
    const feedback = getElement("interview-feedback");

    if (!answer || !feedback) return;

    const text = answer.value.trim();

    if (!text) {
        feedback.textContent =
            "Please write your answer before reviewing it.";
        return;
    }

    if (text.length < 30) {
        feedback.textContent =
            "Try adding more details, examples, and explaining your skills clearly.";
    } else {
        feedback.textContent =
            "Good start! Review your answer for clarity, specific examples, and relevant skills. This is a basic self-review, not an AI evaluation.";
    }
}

// LEARNING PROGRESS
function updateProgress() {
    const container = getElement("progress-skills");
    const bar = getElement("progress-bar");
    const text = getElement("progress-text");

    if (!container) return;

    const checkboxes = container.querySelectorAll(
        'input[type="checkbox"]'
    );

    const total = checkboxes.length;
    const completed = [...checkboxes].filter(box => box.checked).length;

    const percentage = total
        ? Math.round((completed / total) * 100)
        : 0;

    if (bar) {
        bar.style.width = `${percentage}%`;
        bar.setAttribute("aria-valuenow", String(percentage));
    }

    if (text) {
        text.textContent =
            `${completed} of ${total} skills completed (${percentage}%)`;
    }

    const progress = [...checkboxes].map((box, index) => ({
        index,
        checked: box.checked
    }));

    localStorage.setItem(
        "placementProgress",
        JSON.stringify(progress)
    );
}

function restoreProgress() {
    const container = getElement("progress-skills");
    if (!container) return;

    try {
        const saved = JSON.parse(
            localStorage.getItem("placementProgress") || "[]"
        );

        const checkboxes = container.querySelectorAll(
            'input[type="checkbox"]'
        );

        saved.forEach(item => {
            if (checkboxes[item.index]) {
                checkboxes[item.index].checked = Boolean(item.checked);
            }
        });
    } catch {
        // Ignore invalid saved progress.
    }

    updateProgress();
}

// CONNECT ALL BUTTONS AND FORMS
document.addEventListener("DOMContentLoaded", () => {
    updateStudentUI();
    restoreProgress();

    const registerForm = getElement("register-form");
    const loginForm = getElement("login-form");

    if (registerForm) {
        registerForm.addEventListener("submit", handleRegister);
    }

    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    const showRegisterButton = getElement("show-register");
    const showLoginButton = getElement("show-login");

    if (showRegisterButton) {
        showRegisterButton.addEventListener("click", showRegister);
    }

    if (showLoginButton) {
        showLoginButton.addEventListener("click", showLogin);
    }

    const navLogout = getElement("nav-logout");
    const logoutButton = getElement("logout-button");

    if (navLogout) {
        navLogout.addEventListener("click", logout);
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    const searchButton = getElement("search-button");
    const searchInput = getElement("search-input");
    const categoryFilter = getElement("category-filter");

    if (searchButton) {
        searchButton.addEventListener("click", searchJobs);
    }

    if (searchInput) {
        searchInput.addEventListener("input", searchJobs);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener("change", searchJobs);
    }

    const applicationsButton = getElement("view-applications");

    if (applicationsButton) {
        applicationsButton.addEventListener(
            "click",
            loadMyApplications
        );
    }

    const matchButton = getElement("match-jobs-button");

    if (matchButton) {
        matchButton.addEventListener("click", matchJobs);
    }

    const roadmapButton = getElement("roadmap-button");

    if (roadmapButton) {
        roadmapButton.addEventListener("click", showRoadmap);
    }

    const questionButton = getElement("interview-question-button");

    if (questionButton) {
        questionButton.addEventListener(
            "click",
            nextInterviewQuestion
        );
    }

    const answerButton = getElement("check-answer-button");

    if (answerButton) {
        answerButton.addEventListener(
            "click",
            checkInterviewAnswer
        );
    }

    const progressContainer = getElement("progress-skills");

    if (progressContainer) {
        progressContainer.addEventListener("change", event => {
            if (event.target.matches('input[type="checkbox"]')) {
                updateProgress();
            }
        });
    }

    loadJobs();
});
