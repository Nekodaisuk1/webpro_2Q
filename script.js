/* ========= グローバル ========= */
let tasks = [];
let taskId = 0;
let lines = [];
let circleSettings = {};
let scale = 1;                       // ★ 現在ズーム倍率
const MIN_Z = 0.2, MAX_Z = 2.5, STEP = 0.1;

const container = document.getElementById("taskContainer");

/* ========= タスク追加 ========= */
function addTask(){
  const nameInput = document.getElementById("taskName");
  const funcInput = document.getElementById("taskFunction");
  const parentSel = document.getElementById("parentSelect");

  const name = nameInput.value.trim();
  const func = funcInput.value.trim();
  const parentId = parentSel.value || null;
  if(!name || !func) return;

  const id = taskId++;
  tasks.push({id,name,func,parentId});

  parentSel.insertAdjacentHTML("beforeend",
    `<option value="${id}">${name}</option>`);

  nameInput.value = ""; funcInput.value = "";

  render();           // 再描画
  renderTabs(id);     // 追加タブをアクティブ
  snapToTask(id);     // 新タスクへスナップ
}

/* ========= データヘルパ ========= */
const getChildren = id => tasks.filter(t => t.parentId == id);
const getRoots    = () => tasks.filter(t => t.parentId === null);

/* ========= 共通ユーティリティ ========= */
const pos = (el,x,y)=>{ el.style.left=`${x}px`; el.style.top=`${y}px`; };
function clearLines(){ lines.forEach(l=>l.remove()); lines=[]; }
function drawLineToCenter(from,cx,cy){
  const d=document.createElement("div");
  Object.assign(d.style,{position:"absolute",left:`${cx}px`,top:`${cy}px`,
                         width:0,height:0});
  container.appendChild(d);
  lines.push(new LeaderLine(from,d));
}

/* ========= タブバー ========= */
function renderTabs(activeId=null){
  const bar=document.getElementById("tabBar");
  bar.innerHTML="";
  tasks.forEach(t=>{
    const b=document.createElement("button");
    b.textContent=t.name;
    if(t.id===activeId) b.className="tab-active";
    b.onclick=()=>{ snapToTask(t.id); renderTabs(t.id); };
    bar.appendChild(b);
  });
}
function snapToTask(id){
  const el=document.getElementById("task-"+id);
  if(!el) return;
  const x=parseInt(el.style.left,10);
  const y=parseInt(el.style.top ,10);
  window.scrollTo({
    left:x-window.innerWidth /2,
    top :y-window.innerHeight/2,
    behavior:"smooth"
  });
}

/* ========= メイン描画 ========= */
function render(){
  container.innerHTML=""; clearLines(); circleSettings={};

  const centerX=2500, centerY=2500, rootR=300;
  const roots=getRoots(); if(!roots.length){ renderTabs(); return; }

  const step=(2*Math.PI)/roots.length;
  roots.forEach((root,i)=>{
    const ang = i*step;
    const x = centerX + Math.cos(ang)*rootR;
    const y = centerY + Math.sin(ang)*rootR;
    createTask(root,x,y);
    layoutChildren(root,x,y,ang);
  });
  renderTabs();
}

/* --- 個別要素生成 --- */
function createTask(t,x,y){
  container.insertAdjacentHTML(
    "beforeend",
    `<div class="task" id="task-${t.id}">
       <h3>${t.name}</h3><p>機能:${t.func}</p>
     </div>`
  );
  pos(document.getElementById("task-"+t.id),x,y);
}

function layoutChildren(parent,px,py,baseAng){
  const kids=getChildren(parent.id); if(!kids.length) return;

  const dist = 300 + kids.length*50;
  const cx   = px + Math.cos(baseAng)*dist;
  const cy   = py + Math.sin(baseAng)*dist;

  if(!circleSettings[parent.id]) circleSettings[parent.id]={radius:120};
  const r = circleSettings[parent.id].radius;

  drawCircle(cx,cy,r);
  drawLineToCenter(document.getElementById("task-"+parent.id),cx,cy);
  createSlider(parent.id,cx,cy+70);

  const step=(2*Math.PI)/kids.length;
  kids.forEach((kid,i)=>{
    const ang=i*step;
    const kx=cx+Math.cos(ang)*r;
    const ky=cy+Math.sin(ang)*r;
    createTask(kid,kx,ky);
    layoutChildren(kid,kx,ky,ang);
  });
}

function drawCircle(x,y,r){
  const c=document.createElement("div");
  c.className="circle-visual";
  c.style.width=c.style.height=r*2+"px";
  pos(c,x,y); container.appendChild(c);
}
function createSlider(pid,x,y){
  const s=document.createElement("input");
  s.type="range"; s.min=50; s.max=300;
  s.value=circleSettings[pid].radius; s.className="radius-slider";
  pos(s,x,y); container.appendChild(s);
  s.oninput=()=>{ circleSettings[pid].radius=+s.value; render(); };
}

/* ========= ズーム ========= */
function setZoom(z){
  scale=Math.min(MAX_Z,Math.max(MIN_Z,z));
  container.style.transform=`scale(${scale})`;
}
/* ボタン */
document.getElementById("zoomIn").onclick = ()=>setZoom(scale+STEP);
document.getElementById("zoomOut").onclick= ()=>setZoom(scale-STEP);
/* Ctrl(またはAlt)+ホイール */
window.addEventListener("wheel",e=>{
  if(e.ctrlKey||e.altKey){
    e.preventDefault();
    setZoom(scale + (e.deltaY>0? -STEP: STEP));
  }
},{passive:false});

/* ========= 初期化 ========= */
window.addEventListener("load",()=>{
  window.scrollTo(2000,2000);  // 中央スナップ
  render();
});
window.addEventListener("resize",render);
