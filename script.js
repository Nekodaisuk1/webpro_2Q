let tasks = [];
let taskId = 0;
let lines = [];
let circleSettings = {};

function addTask() {
  const name = document.getElementById("taskName").value;
  const func = document.getElementById("taskFunction").value;
  const parentId = document.getElementById("parentSelect").value;

  if (!name || !func) return;

  const id = taskId++;
  tasks.push({ id, name, func, parentId: parentId || null });

  const option = document.createElement("option");
  option.value = id;
  option.textContent = name;
  document.getElementById("parentSelect").appendChild(option);

  render();
}

function getChildren(id) {
  return tasks.filter(t => t.parentId == id);
}

function getRoots() {
  return tasks.filter(t => t.parentId === null);
}

function positionElement(el, x, y) {
  el.style.left = x + "px";
  el.style.top = y + "px";
}

function drawLineBetween(fromEl, toEl) {
  lines.push(new LeaderLine(fromEl, toEl));
}

function clearLines() {
  lines.forEach(l => l.remove());
  lines = [];
}

function render() {
  const container = document.getElementById("taskContainer");
  container.innerHTML = "";
  clearLines();
  circleSettings = {};

  const centerX = 2500;
  const centerY = 2500;
  const radius = 300;
  const roots = getRoots();
  const angleStep = (2 * Math.PI) / roots.length;

  roots.forEach((task, i) => {
    const angle = i * angleStep;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    createTaskElement(task, x, y);
    layoutChildren(task, x, y, angle);
  });
}

function createTaskElement(task, x, y) {
  const container = document.getElementById("taskContainer");
  const div = document.createElement("div");
  div.className = "task";
  div.id = "task-" + task.id;
  div.innerHTML = `<h3>${task.name}</h3><p>機能: ${task.func}</p>`;
  container.appendChild(div);
  positionElement(div, x, y);
}

function layoutChildren(parent, parentX, parentY, baseAngle, depth = 1) {
  const children = getChildren(parent.id);
  if (children.length === 0) return;

  const defaultRadius = 120;
  const baseDistance = 300;
  const spreadFactor = 50;

  const distance = baseDistance + children.length * spreadFactor;
  const circleX = parentX + Math.cos(baseAngle) * distance;
  const circleY = parentY + Math.sin(baseAngle) * distance;

  const circleId = parent.id;
  if (!circleSettings[circleId]) {
    circleSettings[circleId] = { radius: defaultRadius };
  }

  createRadiusSlider(circleId, circleX, circleY);

  const r = circleSettings[circleId].radius;
  const angleStep = (2 * Math.PI) / children.length;

  children.forEach((child, i) => {
    const angle = i * angleStep;
    const childX = circleX + Math.cos(angle) * r;
    const childY = circleY + Math.sin(angle) * r;
    createTaskElement(child, childX, childY);

    const fromEl = document.getElementById("task-" + parent.id);
    const toEl = document.getElementById("task-" + child.id);
    drawLineBetween(fromEl, toEl);

    layoutChildren(child, childX, childY, angle, depth + 1);
  });
}

function createRadiusSlider(circleId, x, y) {
  const container = document.getElementById("taskContainer");
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = 50;
  slider.max = 300;
  slider.value = circleSettings[circleId].radius;
  slider.className = "radius-slider";

  positionElement(slider, x, y + 70);
  slider.oninput = () => {
    circleSettings[circleId].radius = parseInt(slider.value);
    render();
  };
  container.appendChild(slider);
}

window.addEventListener("resize", render);
