// ======================
// DOM Elements
// ======================
const columns = {
    todo: document.querySelector("#todo"),
    progress: document.querySelector("#progress"),
    done: document.querySelector("#done")
};

const modal = document.querySelector("#task-modal");
const modalBg = modal.querySelector(".bg");
const modalTitle = document.querySelector("#modal-title");
const saveTaskBtn = document.querySelector("#save-task-btn");

const titleInput = document.querySelector("#task-title-input");
const descInput = document.querySelector("#task-desc-input");
const priorityInput = document.querySelector("#task-priority");
const dueDateInput = document.querySelector("#task-due-date");

const openModalBtn = document.querySelector("#toggle-modal");
const searchInput = document.querySelector("#search-input");
const clearBoardBtn = document.querySelector("#clear-board");
const themeToggleBtn = document.querySelector("#theme-toggle");

const progressFill = document.querySelector("#progress-fill");
const progressLabel = document.querySelector("#progress-label");

// Task element currently being edited. null = modal is in "add" mode.
let currentTask = null;
let draggedTask = null;

// ======================
// Helpers (shared by create + edit, so logic only lives in one place)
// ======================
function formatDueDate(time) {
    if (!time) return "No Due Date";
    return new Date(time).toLocaleString([], {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
}

function isOverdue(time) {
    return Boolean(time) && new Date(time) < new Date();
}

function setPriorityBadge(task, priority) {
    const badge = task.querySelector(".priority-badge");
    badge.textContent = priority.charAt(0).toUpperCase() + priority.slice(1);
    badge.className = `priority-badge priority-${priority}`;
    task.dataset.priority = priority;
}

// Writes title/desc/priority/due-date onto a task element — used by both create and edit.
function applyTaskData(task, { title, desc, priority, time }) {
    task.querySelector("h2").textContent = title;
    task.querySelector("p").textContent = desc;
    task.querySelector(".due-date").textContent = `Due: ${formatDueDate(time)}`;
    setPriorityBadge(task, priority || "medium");
    task.dataset.time = time || "";
    task.classList.toggle("overdue", isOverdue(time));
}

// ======================
// Task Creation
// ======================
function createTask(data, column) {
    const task = document.createElement("div");
    task.className = "task";
    task.draggable = true;

    task.innerHTML = `
        <div class="task-header">
            <h2></h2>
            <span class="priority-badge"></span>
        </div>
        <p></p>
        <p class="due-date"></p>
        <div class="task-btn-container">
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
        </div>
    `;

    applyTaskData(task, data);
    column.appendChild(task);
    addTaskEvents(task);
    return task;
}

function addTaskEvents(task) {
    task.addEventListener("dragstart", () => { draggedTask = task; });
    task.addEventListener("dragend", () => { draggedTask = null; });

    task.querySelector(".delete-btn").addEventListener("click", () => {
        task.remove();
        updateTaskCount();
        saveTasks();
    });

    task.querySelector(".edit-btn").addEventListener("click", () => {
        openTaskModal(task);
    });
}

// ======================
// Drag & Drop
// ======================
function initializeColumn(column) {
    column.addEventListener("dragenter", (e) => { e.preventDefault(); column.classList.add("hover-over"); });
    column.addEventListener("dragover", (e) => e.preventDefault());
    column.addEventListener("dragleave", () => column.classList.remove("hover-over"));
    column.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!draggedTask) return;
        column.appendChild(draggedTask);
        column.classList.remove("hover-over");
        updateTaskCount();
        saveTasks();
    });
}
Object.values(columns).forEach(initializeColumn);

// ======================
// Task Count & Progress
// ======================
function updateTaskCount() {
    Object.values(columns).forEach((column) => {
        column.querySelector(".right").textContent = column.querySelectorAll(".task").length;
    });
    updateProgress();
}

function updateProgress() {
    const totalTasks = Object.values(columns).reduce((sum, c) => sum + c.querySelectorAll(".task").length, 0);
    const doneTasks = columns.done.querySelectorAll(".task").length;
    const percentage = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

    progressFill.style.width = `${percentage}%`;
    progressLabel.textContent = `${percentage}% complete`;
}

// ======================
// Local Storage - Tasks
// ======================
function saveTasks() {
    const data = {};
    Object.entries(columns).forEach(([columnName, column]) => {
        data[columnName] = [...column.querySelectorAll(".task")].map((task) => ({
            title: task.querySelector("h2").textContent,
            desc: task.querySelector("p").textContent,
            priority: task.dataset.priority || "medium",
            time: task.dataset.time
        }));
    });
    localStorage.setItem("tasks", JSON.stringify(data));
}

function loadTasks() {
    const savedTasks = JSON.parse(localStorage.getItem("tasks"));
    if (!savedTasks) return;

    Object.entries(savedTasks).forEach(([columnName, tasks]) => {
        tasks.forEach((task) => createTask(task, columns[columnName]));
    });
    updateTaskCount();
}

// ======================
// Modal (shared: Add + Edit)
// ======================
function resetForm() {
    titleInput.value = "";
    descInput.value = "";
    priorityInput.value = "medium";
    dueDateInput.value = "";
}

// Opens the modal. Pass a task element to edit it, or call with no args to add a new one.
function openTaskModal(task = null) {
    currentTask = task;

    if (task) {
        modalTitle.textContent = "Edit Task";
        saveTaskBtn.textContent = "Save Changes";
        titleInput.value = task.querySelector("h2").textContent;
        descInput.value = task.querySelector("p").textContent;
        priorityInput.value = task.dataset.priority || "medium";
        dueDateInput.value = task.dataset.time || "";
    } else {
        modalTitle.textContent = "Add Task";
        saveTaskBtn.textContent = "Add Task";
        resetForm();
    }

    modal.classList.add("active");
}

function closeTaskModal() {
    currentTask = null;
    resetForm();
    modal.classList.remove("active");
}

// Single handler for both creating and editing a task.
function saveTask() {
    const title = titleInput.value.trim();
    if (!title) {
        alert("Task title is required");
        return;
    }

    const data = { title, desc: descInput.value.trim(), priority: priorityInput.value, time: dueDateInput.value };

    if (currentTask) {
        applyTaskData(currentTask, data);
    } else {
        createTask(data, columns.todo);
    }

    updateTaskCount();
    saveTasks();
    closeTaskModal();
}

openModalBtn.addEventListener("click", () => openTaskModal());
modalBg.addEventListener("click", closeTaskModal);
saveTaskBtn.addEventListener("click", saveTask);

// ======================
// Search
// ======================
searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    Object.values(columns).forEach((column) => {
        column.querySelectorAll(".task").forEach((task) => {
            const title = task.querySelector("h2").textContent.toLowerCase();
            const desc = task.querySelector("p").textContent.toLowerCase();
            task.style.display = (!query || title.includes(query) || desc.includes(query)) ? "" : "none";
        });
    });
});

// ======================
// Clear Board
// ======================
clearBoardBtn.addEventListener("click", () => {
    const hasTasks = Object.values(columns).some((c) => c.querySelectorAll(".task").length > 0);
    if (!hasTasks) return;
    if (!confirm("This will delete all tasks from every column. Continue?")) return;

    Object.values(columns).forEach((column) => {
        column.querySelectorAll(".task").forEach((task) => task.remove());
    });
    updateTaskCount();
    saveTasks();
});

// ======================
// Theme Toggle
// ======================
function applyTheme(theme) {
    if (theme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
        themeToggleBtn.textContent = "Dark";
    } else {
        document.documentElement.removeAttribute("data-theme");
        themeToggleBtn.textContent = "Light";
    }
}

themeToggleBtn.addEventListener("click", () => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    const newTheme = isLight ? "dark" : "light";
    applyTheme(newTheme);
    localStorage.setItem("theme", newTheme);
});

// ======================
// Init
// ======================
applyTheme(localStorage.getItem("theme") || "dark");
loadTasks();