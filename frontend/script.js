
const API_BASE = "http://127.0.0.1:8000/api";

let currentStudent = {
    name: sessionStorage.getItem("studentName") || "",
    email: sessionStorage.getItem("studentEmail") || ""
};

const $ = (id) => document.getElementById(id);

function showMessage(id, message) {
    const element = $(id);
    if (element) element.textContent = message;
}

async function readResponse(response) {
    const text = await response.text();
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        throw new Error("Invalid server response. Check Django server.");
    }

    if (!response.ok) {
        throw new Error(data.error || data.message || "Request failed.");
    }

    return data;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// UPDATE LOGIN AND LOGOUT BUTTONS
function updateStudentUI() {
    const signedIn = Boolean(currentStudent.email);

    if ($("student-info")) {
        $("student-info").textContent = signedIn
            ? `Signed in as ${currentStudent.name || currentStudent.email}`
            : "Not signed in";
    }

    showMessage(
        "account-status",
        signedIn
            ? "You are signed in."
            : "Please sign in to manage your applications."
    );

    if ($("logout-button")) {
        $("logout-button").hidden = !signedIn;
    }

    // Top navigation buttons
    if ($("nav-login")) {
        $("nav-login").hidden = signedIn;
    }

    if ($("nav-logout")) {
        $("nav-logout").hidden = !signedIn;
    }
}

// LOAD JOBS
async function loadJobs() {
    const container = $("jobs-list");
    if (!container) return;

    container.innerHTML = "<p>Loading jobs...</p>";

    try {
        const response = await fetch(`${API_BASE}/jobs/`);
        const jobs = await readResponse(response);

        container.innerHTML = "";

        if (!Array.isArray(jobs) || jobs.length === 0) {
            container.innerHTML = "<p>No jobs available.</p>";
            showMessage("job-count", "0 jobs");
            return;
        }

        showMessage("job-count", `${jobs.length} jobs available`);

        const categories = new Set();

        jobs.forEach(job => {
            if (job.category) categories.add(job.category);

            const card = document.createElement("article");
            card.className = "job-card";

            card.innerHTML = `
                <h3>${escapeHTML(job.title)}</h3>
                <p><strong>Company:</strong> ${escapeHTML(job.company)}</p>
                <p><strong>Category:</strong> ${escapeHTML(job.category)}</p>
                <p><strong>Location:</strong> ${escapeHTML(job.location)}</p>
                <p><strong>Salary:</strong> ${escapeHTML(job.salary)}</p>
                <p><strong>Job type:</strong> ${escapeHTML(job.job_type)}</p>
                <button type="button" class="primary-button apply-button">
                    Apply Now
                </button>
            `;

            card.querySelector(".apply-button").addEventListener("click", () => {
                applyForJob(job);
            });

            container.appendChild(card);
        });

        const filter = $("category-filter");

        if (filter) {
            const selected = filter.value;
            filter.innerHTML = '<option value="">All Categories</option>';

            [...categories].sort().forEach(category => {
                const option = document.createElement("option");
                option.value = category;
                option.textContent = category;
                filter.appendChild(option);
            });

            filter.value = selected;
        }

        filterJobs();
    } catch (error) {
        container.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
        showMessage("job-count", "Could not load jobs");
    }
}

// SEARCH AND FILTER JOBS
function filterJobs() {
    const search = ($("search-input")?.value || "").toLowerCase().trim();
    const category = $("category-filter")?.value || "";
    let visibleCount = 0;

    document.querySelectorAll("#jobs-list .job-card").forEach(card => {
        const matchesSearch = card.textContent.toLowerCase().includes(search);
        const matchesCategory = !category || card.textContent.includes(category);
        const visible = matchesSearch && matchesCategory;

        card.hidden = !visible;
        if (visible) visibleCount++;
    });

    if ($("empty-message")) {
        $("empty-message").hidden = visibleCount !== 0;
    }

    if (search || category) {
        showMessage("job-count", `${visibleCount} matching jobs`);
    }
}

// APPLY FOR A JOB
async function applyForJob(job) {
    if (!currentStudent.email) {
        showMessage("login-message", "Please sign in before applying.");
        $("login")?.scrollIntoView({ behavior: "smooth" });
        return;
    }

    if (!confirm(`Apply for ${job.title} at ${job.company}?`)) return;

    try {
        const response = await fetch(`${API_BASE}/apply/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                student_name: currentStudent.name,
                student_email: currentStudent.email,
                job_id: job.id
            })
        });

        const data = await readResponse(response);

        alert(data.message || "Application submitted successfully!");
        await loadMyApplications();
    } catch (error) {
        alert(error.message);
    }
}

// MY APPLICATIONS
async function loadMyApplications() {
    const container = $("applications-list");
    if (!container) return;

    if (!currentStudent.email) {
        container.innerHTML = "";
        showMessage("applications-message", "Please sign in first.");
        $("login")?.scrollIntoView({ behavior: "smooth" });
        return;
    }

    container.innerHTML = "<p>Loading applications...</p>";
    showMessage("applications-message", "");

    try {
        const url = `${API_BASE}/my-applications/?email=${encodeURIComponent(currentStudent.email)}`;
        const response = await fetch(url);
        const applications = await readResponse(response);

        if (!Array.isArray(applications) || applications.length === 0) {
            container.innerHTML = "<p>You have not applied for any jobs yet.</p>";
            showMessage("applications-message", "No applications found.");
            return;
        }

        const table = document.createElement("table");
        table.className = "applications-table";

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Job Title</th>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Applied Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector("tbody");

        applications.forEach(application => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${escapeHTML(application.job_title)}</td>
                <td>${escapeHTML(application.company)}</td>
                <td>${escapeHTML(application.location)}</td>
                <td>${escapeHTML(formatDate(application.applied_at))}</td>
                <td>
                    <span class="application-status">
                        ${escapeHTML(application.status)}
                    </span>
                </td>
            `;

            tbody.appendChild(row);
        });

        container.replaceChildren(table);

        showMessage(
            "applications-message",
            `${applications.length} application(s) found.`
        );
    } catch (error) {
        container.innerHTML = "";
        showMessage("applications-message", error.message);
    }
}

// REGISTER STUDENT
async function registerStudent(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const student = {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim().toLowerCase(),
        password: String(formData.get("password") || "")
    };

    try {
        const response = await fetch(`${API_BASE}/register/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(student)
        });

        const data = await readResponse(response);

        showMessage(
            "register-message",
            data.message || "Registration successful. Please sign in."
        );

        form.reset();

        const loginEmail = $("login-form")?.querySelector('[name="email"]');

        if (loginEmail) {
            loginEmail.value = student.email;
        }

        if ($("register-panel")) $("register-panel").hidden = true;
        if ($("login-panel")) $("login-panel").hidden = false;
    } catch (error) {
        showMessage("register-message", error.message);
    }
}

// LOGIN STUDENT
async function loginStudent(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    try {
        const response = await fetch(`${API_BASE}/login/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await readResponse(response);

        currentStudent.name = data.name || data.student_name || "";
        currentStudent.email = data.email || email;

        sessionStorage.setItem("studentName", currentStudent.name);
        sessionStorage.setItem("studentEmail", currentStudent.email);

        updateStudentUI();
        showMessage("login-message", "Login successful!");

        form.reset();

        await loadMyApplications();
    } catch (error) {
        showMessage("login-message", error.message);
    }
}

// LOGOUT STUDENT
function logoutStudent() {
    sessionStorage.removeItem("studentName");
    sessionStorage.removeItem("studentEmail");

    currentStudent = {
        name: "",
        email: ""
    };

    updateStudentUI();

    if ($("applications-list")) {
        $("applications-list").innerHTML = "";
    }

    showMessage("applications-message", "You have logged out.");
    showMessage("login-message", "You have logged out.");

    if ($("login-panel")) $("login-panel").hidden = false;
    if ($("register-panel")) $("register-panel").hidden = true;
}

// SMART JOB MATCH
async function findMatchingJobs() {
    const skillsInput = $("student-skills");
    const results = $("job-match-results");

    if (!skillsInput || !results) return;

    const skills = skillsInput.value
        .toLowerCase()
        .split(",")
        .map(skill => skill.trim())
        .filter(Boolean);

    results.replaceChildren();

    if (skills.length === 0) {
        results.textContent = "Enter skills such as Python, HTML, or SQL.";
        return;
    }

    results.textContent = "Searching for matching jobs...";

    try {
        const response = await fetch(`${API_BASE}/jobs/`);
        const jobs = await readResponse(response);

        if (!Array.isArray(jobs)) {
            throw new Error("Unexpected jobs data from the server.");
        }

        const matches = jobs.filter(job => {
            const jobText = [
                job.title,
                job.company,
                job.category,
                job.description,
                job.location,
                job.job_type,
                job.skills
            ].flat().filter(Boolean).join(" ").toLowerCase();

            return skills.some(skill => jobText.includes(skill));
        });

        results.replaceChildren();

        const heading = document.createElement("h4");
        heading.textContent = "Matching Jobs";
        results.appendChild(heading);

        if (matches.length === 0) {
            const message = document.createElement("p");
            message.textContent =
                "No matching jobs found. Try Python, Java, HTML, or SQL.";
            results.appendChild(message);
            return;
        }

        matches.forEach(job => {
            const card = document.createElement("div");
            card.className = "career-match-item";

            const title = document.createElement("h4");
            title.textContent = job.title || "Job opportunity";

            const company = document.createElement("p");
            company.textContent = job.company || "Company details unavailable";

            const applyButton = document.createElement("button");
            applyButton.type = "button";
            applyButton.className = "primary-button";
            applyButton.textContent = "Apply Now";
            applyButton.addEventListener("click", () => applyForJob(job));

            card.append(title, company, applyButton);
            results.appendChild(card);
        });
    } catch (error) {
        results.textContent =
            "Unable to load jobs. Check that your Django backend is running.";
        console.error("Job matching error:", error);
    }
}

// CAREER ROADMAP
function showCareerRoadmap() {
    const choice = $("career-choice");
    const results = $("roadmap-results");

    if (!choice || !results) return;

    const roadmaps = {
        web: [
            "Learn HTML",
            "Learn CSS",
            "Learn JavaScript",
            "Build projects",
            "Learn React"
        ],
        python: [
            "Learn Python basics",
            "Practice functions and OOP",
            "Learn Django",
            "Connect a database",
            "Build projects"
        ],
        java: [
            "Learn Java basics",
            "Practice OOP",
            "Learn collections",
            "Learn JDBC and Spring Boot",
            "Build projects"
        ],
        data: [
            "Learn Excel",
            "Learn SQL",
            "Learn Python",
            "Practice data analysis",
            "Learn Power BI"
        ]
    };

    results.replaceChildren();

    const heading = document.createElement("h4");
    heading.textContent = "Your Career Roadmap";
    results.appendChild(heading);

    const list = document.createElement("ol");

    (roadmaps[choice.value] || []).forEach(step => {
        const item = document.createElement("li");
        item.textContent = step;
        list.appendChild(item);
    });

    results.appendChild(list);
}

// INTERVIEW PRACTICE
function setupInterviewPractice() {
    const questions = [
        "Tell me about yourself.",
        "What are your strengths?",
        "Why should we hire you?",
        "Describe a project you have worked on.",
        "Where do you see yourself in five years?"
    ];

    $("interview-question-button")?.addEventListener("click", () => {
        const question = questions[
            Math.floor(Math.random() * questions.length)
        ];

        showMessage("interview-question", question);
        showMessage("interview-feedback", "");
    });

    $("check-answer-button")?.addEventListener("click", () => {
        const answer = $("interview-answer")?.value.trim() || "";

        if (answer.length < 20) {
            showMessage(
                "interview-feedback",
                "Please write a more detailed answer (at least 20 characters)."
            );
        } else {
            showMessage(
                "interview-feedback",
                "Answer saved for practice! Keep it clear, relevant, and supported with examples."
            );
        }
    });
}

// PROGRESS TRACKER
function setupProgressTracker() {
    const area = $("progress-skills");
    const progressBar = $("progress-bar");
    const progressText = $("progress-text");

    if (!area || !progressBar || !progressText) return;

    const checkboxes = area.querySelectorAll('input[type="checkbox"]');
    const storageKey = "careerConnectProgress";

    try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || "[]");

        checkboxes.forEach(checkbox => {
            checkbox.checked = saved.includes(checkbox.value);
        });
    } catch {
        sessionStorage.removeItem(storageKey);
    }

    function updateProgress() {
        const checked = [...checkboxes].filter(item => item.checked);
        const percentage = checkboxes.length
            ? Math.round((checked.length / checkboxes.length) * 100)
            : 0;

        progressBar.style.width = percentage + "%";
        progressText.textContent =
            `${percentage}% completed (${checked.length} of ${checkboxes.length} skills)`;

        sessionStorage.setItem(
            storageKey,
            JSON.stringify(checked.map(item => item.value))
        );
    }

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("change", updateProgress);
    });

    updateProgress();
}

// INITIALIZE ALL BUTTONS
document.addEventListener("DOMContentLoaded", () => {
    updateStudentUI();
    loadJobs();

    $("login-form")?.addEventListener("submit", loginStudent);
    $("register-form")?.addEventListener("submit", registerStudent);

    $("search-input")?.addEventListener("input", filterJobs);
    $("category-filter")?.addEventListener("change", filterJobs);
    $("search-button")?.addEventListener("click", filterJobs);

    $("view-applications")?.addEventListener("click", loadMyApplications);

    // Both logout buttons use the same logout function
    $("logout-button")?.addEventListener("click", logoutStudent);
    $("nav-logout")?.addEventListener("click", logoutStudent);

    $("nav-login")?.addEventListener("click", () => {
        $("login")?.scrollIntoView({ behavior: "smooth" });
    });

    $("show-register")?.addEventListener("click", () => {
        if ($("login-panel")) $("login-panel").hidden = true;
        if ($("register-panel")) $("register-panel").hidden = false;
    });

    $("show-login")?.addEventListener("click", () => {
        if ($("register-panel")) $("register-panel").hidden = true;
        if ($("login-panel")) $("login-panel").hidden = false;
    });

    $("match-jobs-button")?.addEventListener("click", findMatchingJobs);
    $("roadmap-button")?.addEventListener("click", showCareerRoadmap);

    setupInterviewPractice();
    setupProgressTracker();
});
