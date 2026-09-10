const state = {
  courses: [],
  section: "all",
  completed: new Set(JSON.parse(localStorage.getItem("course-plan-progress") || "[]"))
};

const sectionCopy = {
  all: "The complete runway",
  Sophia: "Finish Sophia first",
  "Study.com": "Then clear Study.com",
  WGU: "Finish at WGU"
};

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field); field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(value => value.length)) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift();
  return rows.map((values, index) => Object.fromEntries(headers.map((header, column) => [header, values[column] || ""]))).map((course, index) => ({
    ...course,
    id: `${index + 1}-${course["WGU Courses"]}`,
    order: index + 1,
    section: course.Platform.includes("sophia.org") ? "Sophia" : course.Platform.includes("study.com") ? "Study.com" : "WGU"
  }));
}

function renderMarkdownLinks(value) {
  if (!value) return '<span class="empty">—</span>';
  const fragment = document.createDocumentFragment();
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let cursor = 0, match;
  while ((match = pattern.exec(value))) {
    fragment.append(document.createTextNode(value.slice(cursor, match.index)));
    const link = document.createElement("a");
    link.textContent = match[1];
    link.href = match[2];
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    fragment.append(link);
    cursor = pattern.lastIndex;
  }
  fragment.append(document.createTextNode(value.slice(cursor)));
  const holder = document.createElement("span");
  holder.append(fragment);
  return holder.innerHTML;
}

function saveProgress() {
  localStorage.setItem("course-plan-progress", JSON.stringify([...state.completed]));
}

function render() {
  const body = document.querySelector("#course-body");
  const visible = state.section === "all" ? state.courses : state.courses.filter(course => course.section === state.section);
  body.innerHTML = visible.map(course => {
    const done = state.completed.has(course.id);
    return `<tr class="${done ? "completed" : ""}">
      <td data-label="Done"><label class="check"><input type="checkbox" data-id="${escapeHtml(course.id)}" ${done ? "checked" : ""}><span></span></label></td>
      <td data-label="Order"><span class="order">${String(course.order).padStart(2, "0")}</span></td>
      <td data-label="WGU Courses"><strong>${escapeHtml(course["WGU Courses"])}</strong><span class="mobile-section">${course.section}</span></td>
      <td data-label="Units"><span class="unit">${escapeHtml(course.Units)}</span></td>
      <td data-label="Platform"><span class="badge ${course.section.toLowerCase().replace(".", "")}">${course.section}</span><div class="course-link">${renderMarkdownLinks(course.Platform === "WGU" ? "" : course.Platform)}</div></td>
      <td data-label="OSSU"><div class="course-link ossu">${renderMarkdownLinks(course.OSSU)}</div></td>
    </tr>`;
  }).join("");
  document.querySelector("#view-title").textContent = sectionCopy[state.section];
  updateProgress();
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function updateProgress() {
  const completedCourses = state.courses.filter(course => state.completed.has(course.id));
  const completedUnits = completedCourses.reduce((sum, course) => sum + Number(course.Units), 0);
  const totalUnits = state.courses.reduce((sum, course) => sum + Number(course.Units), 0);
  document.querySelector("#progress-count").textContent = `${completedCourses.length} / ${state.courses.length}`;
  document.querySelector("#unit-count").textContent = `${completedUnits} of ${totalUnits} units complete`;
  document.querySelector("#progress-bar").style.width = `${state.courses.length ? completedCourses.length / state.courses.length * 100 : 0}%`;
}

document.addEventListener("change", event => {
  if (!event.target.matches("input[data-id]")) return;
  event.target.checked ? state.completed.add(event.target.dataset.id) : state.completed.delete(event.target.dataset.id);
  saveProgress(); render();
});

document.querySelector(".section-nav").addEventListener("click", event => {
  const button = event.target.closest("button[data-section]");
  if (!button) return;
  state.section = button.dataset.section;
  document.querySelectorAll(".nav-pill").forEach(item => item.classList.toggle("active", item === button));
  render();
});

document.querySelector("#reset-progress").addEventListener("click", () => {
  if (!state.completed.size || !confirm("Clear all completed courses?")) return;
  state.completed.clear(); saveProgress(); render();
});

fetch("course_plan.csv")
  .then(response => { if (!response.ok) throw new Error(`Could not load course_plan.csv (${response.status})`); return response.text(); })
  .then(text => { state.courses = parseCsv(text); render(); })
  .catch(error => {
    const element = document.querySelector("#error");
    element.hidden = false;
    element.textContent = `${error.message}. Start the app through the local server instead of opening index.html directly.`;
  });
