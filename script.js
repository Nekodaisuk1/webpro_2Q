/* ========= グローバル ========= */
/* 永続化データ読込（なければデフォルト） */
let tasks = [];
let circleSettings = {};
let scale = 1;
let lines = [];
let taskId = 0;

/* 事前ロード */
(function loadAll(){
  try{
    const t = JSON.parse(localStorage.getItem("devTasks") || "[]");
    const c = JSON.parse(localStorage.getItem("circleStore") || "{}");
    const z = +localStorage.getItem("zoom") || 1;
    const th = localStorage.getItem("theme");
    tasks = t.map(v=>({
      id: v.id,
      name: v.name,
      func: v.func,
      parentId: (v.parentId===null||v.parentId==="")?null:v.parentId,
      completed: !!v.completed
    }));
    circleSettings = c || {};
    scale = z;
    if(th==="dark") document.body.classList.add("dark");
    taskId = tasks.reduce((m,t)=>Math.max(m,t.id), -1) + 1;
  }catch(e){
    console.warn("load error",e);
  }
})();

const container = document.getElementById("taskContainer");

/* ========= 保存 ========= */
function saveAll(){
  localStorage.setItem("devTasks",JSON.stringify(tasks));
  localStorage.setItem("circleStore",JSON.stringify(circleSettings));
  localStorage.setItem("zoom",scale);
  localStorage.setItem("theme",document.body.classList.contains("dark")?"dark":"light");
}

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
  tasks.push({id,name,func,parentId,completed:false});

  parentSel.insertAdjacentHTML("beforeend",`<option value="${id}">${name}</option>`);
  nameInput.value = "";
  funcInput.value = "";

  saveAll();
  render();           // 再描画
  renderTabs(id);     // タブアクティブ
  snapToTask(id);     // スクロール
}

/* ========= データヘルパ ========= */
const getChildren = id => tasks.filter(t => t.parentId == id);
const getRoots    = () => tasks.filter(t => t.parentId === null);

/* ========= 共通ユーティリティ ========= */
const pos = (el,x,y)=>{ el.style.left=`${x}px`; el.style.top=`${y}px`; };
function clearLines(){ lines.forEach(l=>l.remove()); lines=[]; }
function drawLineToCenter(from,cx,cy){
  const d=document.createElement("div");
  Object.assign(d.style,{position:"absolute",left:`${cx}px`,top:`${cy}px`,width:0,height:0});
  container.appendChild(d);
  const line=new LeaderLine(from,d);
  lines.push(line);
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

/* ========= スナップ ========= */
function snapToTask(id){
  const el=document.getElementById("task-"+id);
  if(!el) return;
  const x=parseFloat(el.style.left)||0;
  const y=parseFloat(el.style.top)||0;
  window.scrollTo({
    left:x*scale - window.innerWidth/2,
    top: y*scale - window.innerHeight/2,
    behavior:"smooth"
  });
}

/* ========= メイン描画 ========= */
function render(){
  container.innerHTML=""; clearLines();

  rebuildParentSelect(); // 再構築

  const centerX=2500, centerY=2500, rootR=300;
  const roots=getRoots();
  if(!roots.length){ renderTabs(); return; }

  const step=(2*Math.PI)/roots.length;
  roots.forEach((root,i)=>{
    const ang=i*step;
    const x=centerX+Math.cos(ang)*rootR;
    const y=centerY+Math.sin(ang)*rootR;
    createTask(root,x,y);
    layoutChildren(root,x,y,ang);
  });
  renderTabs();
}

/* ========= 親セレクト再構築 ========= */
function rebuildParentSelect(){
  const sel=document.getElementById("parentSelect");
  const cur=sel.value;
  sel.innerHTML='<option value=\"\">親なし（最上位）</option>';
  tasks.forEach(t=>{
    sel.insertAdjacentHTML("beforeend",`<option value=\"${t.id}\">${t.name}</option>`);
  });
  if(cur && sel.querySelector(`option[value=\"${cur}\"]`)) sel.value=cur;
}

/* ========= タスクDOM ========= */
function createTask(t,x,y){
  container.insertAdjacentHTML(
    "beforeend",
    `<div class="task${t.completed?' completed':''}" id="task-${t.id}">
      <h3>${t.name}</h3><p>機能:${t.func}</p>
    </div>`
  );
  pos(document.getElementById("task-"+t.id),x,y);
}

/* ========= 子円レイアウト（再帰） ========= */
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

/* ========= 円とスライダー ========= */
function drawCircle(x,y,r){
  const c=document.createElement("div");
  c.className="circle-visual";
  c.style.width=c.style.height=r*2+"px";
  pos(c,x,y);
  container.appendChild(c);
}
function createSlider(pid,x,y){
  const s=document.createElement("input");
  s.type="range"; s.min=50; s.max=300;
  s.value=circleSettings[pid].radius; s.className="radius-slider";
  pos(s,x,y);
  s.oninput=()=>{
    circleSettings[pid].radius=+s.value;
    saveAll();
    render();
  };
  container.appendChild(s);
}

/* ========= 完了トグル（タスククリック） ========= */
container.addEventListener("click",e=>{
  const box=e.target.closest(".task");
  if(!box) return;
  const id=+box.id.split("-")[1];
  const t=tasks.find(x=>x.id===id);
  if(!t) return;
  t.completed=!t.completed;
  saveAll();
  render();
});

/* ========= テーマ切替 ========= */
const themeBtn = document.getElementById("themeToggle");
function updateThemeButton(){
  themeBtn.textContent = document.body.classList.contains("dark") ? "🌞" : "🌙";
}
themeBtn.onclick=()=>{
  document.body.classList.toggle("dark");
  updateThemeButton();
  saveAll();
};
updateThemeButton();

/* ========= ズーム ========= */
const MIN_Z=0.2, MAX_Z=2.5, STEP=0.1;
function setZoom(z){
  /* ズーム前中心のキャンバス座標を保持 */
  const vw=window.innerWidth, vh=window.innerHeight;
  const worldCX=(window.scrollX + vw/2)/scale;
  const worldCY=(window.scrollY + vh/2)/scale;

  scale=Math.min(MAX_Z,Math.max(MIN_Z,z));
  container.style.transform=`scale(${scale})`;

  /* 補正スクロールで中心維持 */
  const newScrollX=worldCX*scale - vw/2;
  const newScrollY=worldCY*scale - vh/2;
  window.scrollTo(newScrollX,newScrollY);

  /* 線再配置 */
  lines.forEach(l=>l.position());
  saveAll();
}
document.getElementById("zoomIn").onclick = ()=>setZoom(scale+STEP);
document.getElementById("zoomOut").onclick= ()=>setZoom(scale-STEP);
window.addEventListener("wheel",e=>{
  if(e.ctrlKey||e.altKey){
    e.preventDefault();
    setZoom(scale + (e.deltaY>0?-STEP:STEP));
  }
},{passive:false});

/* ========= 初期化 ========= */
window.addEventListener("load",()=>{
  setZoom(scale);                 // 永続倍率反映
  // 中央スナップ（root円近辺）
  window.scrollTo(2000*scale,2000*scale);
  render();
  renderTabs();
});
window.addEventListener("resize",render);
