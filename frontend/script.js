
const API_BASE = "https://placement-portal-backend-irmz.onrender.com/api";

let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

document.addEventListener("DOMContentLoaded", () => {
    loadJobs();
    updateLoginStatus();
    setupRegisterForm();
    setupLoginForm();
    setupApplicationForm();
    setupMyApplications();
});

function updateLoginStatus() {
    const userNameElement = document.getElementById("userName");

    if (userNameElement && currentUser) {
        userNameElement.textContent =
            `Welcome, ${currentUser.name || currentUser.email}`;
    }
}

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.error || data.message || `Request failed: ${response.status}`
            );
        }

        return data;
    } catch (error) {
        console.error("API error:", error);
        throw error;
    }
}

async function loadJobs() {
    const jobsContainer = document.getElementById("jobsContainer");

    try {
        const data = await apiRequest("/jobs/");
        const jobs = Array.isArray(data) ? data : (data.jobs || []);

        if (!jobsContainer) {
            console.log("Jobs loaded:", jobs);
            return;
        }

        if (jobs.length === 0) {
            jobsContainer.innerHTML = "<p>No jobs available currently.</p>";
            return;
        }

        jobsContainer.innerHTML = jobs.map(job => `
            <div class="job-card">
                <h3>${escapeHTML(job.title || job.job_title || "Job")}</h3>
                <p><strong>Company:</strong> ${escapeHTML(job.company || "Not specified")}</p>
                <p><strong>Location:</strong> ${escapeHTML(job.location || "Not specified")}</p>
                <p><strong>Description:</strong> ${escapeHTML(job.description || "No description available")}</p>
                <button type="button" onclick="selectJob(${Number(job.id)})">
                    Apply Now
                </button>
            </div>
        `).join("");
    } catch (error) {
        if (jobsContainer) {
            jobsContainer.innerHTML =
                `<p>Unable to load jobs. ${escapeHTML(error.message)}</p>`;
        }
    }
}

function selectJob(jobId) {
    const jobInput = document.getElementById("jobId");

    if (jobInput) {
        jobInput.value = jobId;
    }

    const applicationForm = document.getElementById("applicationForm");

    if (applicationForm) {
        applicationForm.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

function setupRegisterForm() {
    const form = document.getElementById("registerForm");

    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const formData = new FormData(form);

        const payload = {
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
            phone: formData.get("phone"),
            branch: formData.get("branch"),
            graduation_year: formData.get("graduation_year")
        };

        try {
            const result = await apiRequest("/register/", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showMessage(
                "registerMessage",
                result.message || "Registration successful!",
                false
            );

            form.reset();
        } catch (error) {
            showMessage("registerMessage", error.message, true);
        }
    });
}

function setupLoginForm() {
    const form = document.getElementById("loginForm");

    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const formData = new FormData(form);

        const payload = {
            email: formData.get("email"),
            password: formData.get("password")
        };

        try {
            const result = await apiRequest("/login/", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            currentUser = result.user || {
                name: result.name || "",
                email: payload.email
            };

            localStorage.setItem(
                "currentUser",
                JSON.stringify(currentUser)
            );

            updateLoginStatus();

            showMessage(
                "loginMessage",
                result.message || "Login successful!",
                false
            );

            form.reset();
        } catch (error) {
            showMessage("loginMessage", error.message, true);
        }
    });
}

function setupApplicationForm() {
    const form = document.getElementById("applicationForm");

    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (!currentUser) {
            showMessage(
                "applicationMessage",
                "Please log in before applying.",
                true
            );
            return;
        }

        const formData = new FormData(form);

        const payload = {
            job_id: formData.get("job_id"),
            email: currentUser.email,
            name: currentUser.name || "",
            resume: formData.get("resume"),
            cover_letter: formData.get("cover_letter")
        };

        try {
            const result = await apiRequest("/apply/", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showMessage(
                "applicationMessage",
                result.message || "Application submitted successfully!",
                false
            );

            form.reset();
        } catch (error) {
            showMessage("applicationMessage", error.message, true);
        }
    });
}

function setupMyApplications() {
    const button = document.getElementById("myApplicationsButton");

    if (!button) return;

    button.addEventListener("click", loadMyApplications);
}

async function loadMyApplications() {
    const container = document.getElementById("myApplications");

    if (!currentUser) {
        showMessage(
            "applicationListMessage",
            "Please log in to view your applications.",
            true
        );
        return;
    }

    try {
        const data = await apiRequest(
            `/my-applications/?email=${encodeURIComponent(currentUser.email)}`
        );

        const applications = Array.isArray(data)
            ? data
            : (data.applications || []);

        if (!container) {
            console.log("My applications:", applications);
            return;
        }

        if (applications.length === 0) {
            container.innerHTML = "<p>You have not applied for any jobs yet.</p>";
            return;
        }

        container.innerHTML = applications.map(application => `
            <div class="application-card">
                <h3>${escapeHTML(application.job_title || application.title || "Job Application")}</h3>
                <p><strong>Company:</strong> ${escapeHTML(application.company || "Not specified")}</p>
                <p><strong>Status:</strong> ${escapeHTML(application.status || "Submitted")}</p>
            </div>
        `).join("");
    } catch (error) {
        if (container) {
            container.innerHTML =
                `<p>Unable to load applications. ${escapeHTML(error.message)}</p>`;
        }
    }
}

function showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);

    if (!element) {
        alert(message);
        return;
    }

    element.textContent = message;
    element.style.color = isError ? "red" : "green";
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

function logout() {
    localStorage.removeItem("currentUser");
    currentUser = null;
    updateLoginStatus();
    window.location.reload();
}
