/* ========= グローバル状態 ========= */
let tasks          = [];  // すべてのタスク
let taskId         = 0;   // 連番 ID
let lines          = [];  // LeaderLine インスタンス
let circleSettings = {};  // { 親ID: { radius } }

/* ========= タスク追加 ========= */
function addTask () {
  const nameInput = document.getElementById("taskName");
  const funcInput = document.getElementById("taskFunction");
  const parentSel = document.getElementById("parentSelect");

  const name = nameInput.value.trim();
  const func = funcInput.value.trim();
  const parentId = parentSel.value || null;
  if (!name || !func) return;

  const id = taskId++;
  tasks.push({ id, name, func, parentId });

  // 親プルダウンに即追加
  parentSel.insertAdjacentHTML("beforeend",
    `<option value="${id}">${name}</option>`);

  // 入力欄リセット
  nameInput.value = "";
  funcInput.value = "";

  render();
  // 新タスクをタブ選択＆スナップ
  renderTabs(id);
  snapToTask(id);
}

/* ========= データヘルパ ========= */
const getChildren = id => tasks.filter(t => t.parentId == id);
const getRoots    = () => tasks.filter(t => t.parentId === null);

/* ========= 汎用描画ユーティリティ ========= */
const container = document.getElementById("taskContainer");
const pos = (el,x,y)=>{ el.style.left=`${x}px`; el.style.top=`${y}px`; };

function clearLines () { lines.forEach(l => l.remove()); lines = []; }

function drawLineToCenter (fromEl, cx, cy) {
  const dummy = document.createElement("div");
  Object.assign(dummy.style, {
    position: "absolute", left: `${cx}px`, top: `${cy}px`,
    width: 0, height: 0
  });
  container.appendChild(dummy);
  lines.push(new LeaderLine(fromEl, dummy));
}

/* ========= タブバー ========= */
function renderTabs (activeId = null) {
  const bar = document.getElementById("tabBar");
  bar.innerHTML = "";
  tasks.forEach(t => {
    const btn = document.createElement("button");
    btn.textContent = t.name;
    if (t.id === activeId) btn.className = "tab-active";
    btn.onclick = () => { snapToTask(t.id); renderTabs(t.id); };
    bar.appendChild(btn);
  });
}

function snapToTask (id) {
  const el = document.getElementById("task-" + id);
  if (!el) return;
  const x = parseInt(el.style.left, 10);
  const y = parseInt(el.style.top, 10);
  window.scrollTo({
    left: x - window.innerWidth  / 2,
    top : y - window.innerHeight / 2,
    behavior: "smooth"
  });
}

/* ========= メイン再描画 ========= */
function render () {
  container.innerHTML = "";
  clearLines();
  circleSettings = {};

  const centerX = 2500, centerY = 2500, rootR = 300;
  const roots   = getRoots();
  if (!roots.length) { renderTabs(); return; }

  const step = (2 * Math.PI) / roots.length;
  roots.forEach((root, i) => {
    const ang = i * step;
    const x = centerX + Math.cos(ang) * rootR;
    const y = centerY + Math.sin(ang) * rootR;
    createTaskElement(root, x, y);
    layoutChildren(root, x, y, ang);
  });

  renderTabs();  // 描画完了後タブ更新
}

/* --- タスク DOM 生成 --- */
function createTaskElement (t, x, y) {
  container.insertAdjacentHTML(
    "beforeend",
    `<div class="task" id="task-${t.id}">
       <h3>${t.name}</h3><p>機能:${t.func}</p>
     </div>`
  );
  pos(document.getElementById("task-" + t.id), x, y);
}

/* --- 子配置円 (再帰) --- */
function layoutChildren (parent, px, py, baseAng) {
  const kids = getChildren(parent.id);
  if (!kids.length) return;

  // 円の中心座標
  const dist = 300 + kids.length * 50;           // 親から離す距離
  const cx   = px + Math.cos(baseAng) * dist;
  const cy   = py + Math.sin(baseAng) * dist;

  // 円半径
  if (!circleSettings[parent.id]) circleSettings[parent.id] = { radius: 120 };
  const r = circleSettings[parent.id].radius;

  // 可視円
  drawCircle(cx, cy, r);

  // 親→円心の矢印 (1本)
  drawLineToCenter(document.getElementById("task-" + parent.id), cx, cy);

  // スライダー
  createSlider(parent.id, cx, cy + 70);

  // 子を円周に均等配置
  const step = (2 * Math.PI) / kids.length;
  kids.forEach((kid, i) => {
    const ang = i * step;
    const kx  = cx + Math.cos(ang) * r;
    const ky  = cy + Math.sin(ang) * r;
    createTaskElement(kid, kx, ky);
    layoutChildren(kid, kx, ky, ang);   // 再帰
  });
}

/* --- 円とスライダー --- */
function drawCircle (x, y, r) {
  const circle = document.createElement("div");
  circle.className = "circle-visual";
  circle.style.width = circle.style.height = r * 2 + "px";
  pos(circle, x, y);
  container.appendChild(circle);
}
function createSlider (pid, x, y) {
  const s = document.createElement("input");
  s.type = "range"; s.min = 50; s.max = 300;
  s.value = circleSettings[pid].radius; s.className = "radius-slider";
  pos(s, x, y);
  s.oninput = () => { circleSettings[pid].radius = +s.value; render(); };
  container.appendChild(s);
}

/* ========= 初期化 ========= */
window.addEventListener("load", () => {
  window.scrollTo(2000, 2000);  // 中央スナップ
  render();                     // 初回描画
});
window.addEventListener("resize", render);
