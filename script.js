/* ========= グローバル ========= */
let tasks = [];
let circleSettings = {};
let scale = 1;
let lines = [];              // [{line,fromEl,anchorEl}]
let taskId = 0;
let currentView = "tree";    // "tree" | "detail"

/* ---- 永続データ読込 ---- */
(function loadAll(){
  try{
    const t  = JSON.parse(localStorage.getItem("devTasks")   || "[]");
    const c  = JSON.parse(localStorage.getItem("circleStore")|| "{}");
    const z  = +localStorage.getItem("zoom") || 1;
    const th = localStorage.getItem("theme");

    tasks = t.map(v=>({
      id: v.id,
      name: v.name,
      func: v.func,
      parentId: (v.parentId===null||v.parentId==="")?null:v.parentId,
      completed: !!v.completed,
      details: v.details || null
    }));
    circleSettings = c || {};
    scale = z;
    if(th==="dark") document.body.classList.add("dark");
    taskId = tasks.reduce((m,t)=>Math.max(m,t.id), -1) + 1;
  }catch(e){
    console.warn("load error",e);
  }
})();

/* ========= DOM refs ========= */
const container       = document.getElementById("taskContainer");
const themeBtn        = document.getElementById("themeToggle");
const viewSwitch      = document.getElementById("viewSwitch");
const treeView        = document.getElementById("treeView");
const detailView      = document.getElementById("detailView");
const detailTableWrap = document.getElementById("detailTableWrap");

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
  tasks.push({id,name,func,parentId,completed:false,details:null});

  parentSel.insertAdjacentHTML("beforeend",`<option value="${id}">${name}</option>`);
  nameInput.value = "";
  funcInput.value = "";

  saveAll();
  renderApp();
  snapToTask(id);
}

/* ========= データヘルパ ========= */
const getChildren = id => tasks.filter(t => t.parentId == id);
const getRoots    = () => tasks.filter(t => t.parentId === null);

/* ========= 共通ユーティリティ ========= */
const pos = (el,x,y)=>{ el.style.left=`${x}px`; el.style.top=`${y}px`; };

/* line管理 */
function clearLines(){
  lines.forEach(o=>o.line.remove());
  lines=[];
}
/* 親要素fromEl→(cx,cy) に不可視アンカーで接続 */
function drawLineToCenter(fromEl,cx,cy){
  const anchor=document.createElement("div");
  Object.assign(anchor.style,{
    position:"absolute",
    left:`${cx}px`,
    top:`${cy}px`,
    width:0,height:0
  });
  container.appendChild(anchor);
  const line=new LeaderLine(fromEl,anchor,{
    startPlug:"disc",
    endPlug:"arrow3",
    color:"rgba(0,0,0,.35)"
  });
  lines.push({line,fromEl,anchorEl:anchor});
}

/* ========= ビュー切り替え ========= */
viewSwitch.addEventListener("click",e=>{
  const btn=e.target.closest("button[data-view]");
  if(!btn) return;
  currentView=btn.dataset.view;
  [...viewSwitch.querySelectorAll("button")].forEach(b=>b.classList.toggle("active",b===btn));
  renderApp();
});

/* ========= アプリ全体再描画 ========= */
function renderApp(){
  if(currentView==="tree"){
    detailView.hidden=true;
    treeView.hidden=false;
    renderTree();
  }else{
    treeView.hidden=true;
    detailView.hidden=false;
    renderDetailTable();
  }
  renderTabs();         // タブ更新（ツリー時のみ表示）
  scheduleReposition(); // ライン再調整
}

/* ========= ツリーレンダリング ========= */
function renderTree(){
  container.innerHTML=""; clearLines();
  rebuildParentSelect();

  const centerX=2500, centerY=2500, rootR=300;
  const roots=getRoots();
  if(!roots.length) return;

  const step=(2*Math.PI)/roots.length;
  roots.forEach((root,i)=>{
    const ang=i*step;
    const x=centerX+Math.cos(ang)*rootR;
    const y=centerY+Math.sin(ang)*rootR;
    createTask(root,x,y);
    layoutChildren(root,x,y,ang);
  });
}

/* ========= 親セレクト再構築 ========= */
function rebuildParentSelect(){
  const sel=document.getElementById("parentSelect");
  const cur=sel.value;
  sel.innerHTML='<option value="">親なし（最上位）</option>';
  tasks.forEach(t=>{
    sel.insertAdjacentHTML("beforeend",`<option value="${t.id}">${t.name}</option>`);
  });
  if(cur && sel.querySelector(`option[value="${cur}"]`)) sel.value=cur;
}

/* ========= タスクDOM ========= */
function createTask(t,x,y){
  container.insertAdjacentHTML(
    "beforeend",
    `<div class="task${t.completed?' completed':''}" id="task-${t.id}">
       <h3>${t.name}</h3>
       <p>機能:${t.func}</p>
       <button type="button" class="detail-btn" data-id="${t.id}">📝詳細</button>
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
  pos(c,x,y); container.appendChild(c);
}
function createSlider(pid,x,y){
  const s=document.createElement("input");
  s.type="range"; s.min=50; s.max=300;
  s.value=circleSettings[pid].radius; s.className="radius-slider";
  pos(s,x,y); container.appendChild(s);
  s.oninput=()=>{
    circleSettings[pid].radius=+s.value;
    saveAll();
    renderApp(); // view維持
  };
}

/* ========= タブバー（ツリー向け） ========= */
function renderTabs(activeId=null){
  const bar=document.getElementById("tabBar");
  bar.innerHTML="";
  if(currentView!=="tree"){ bar.style.display="none"; return; }
  bar.style.display="";
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
  if(currentView!=="tree"){
    currentView="tree";
    [...viewSwitch.querySelectorAll("button")].forEach(b=>b.classList.toggle("active",b.dataset.view==="tree"));
    renderApp();
  }
  const el=document.getElementById("task-"+id);
  if(!el) return;
  const x=parseFloat(el.style.left)||0;
  const y=parseFloat(el.style.top)||0;
  window.scrollTo({
    left:x*scale - window.innerWidth/2,
    top :y*scale - window.innerHeight/2,
    behavior:"smooth"
  });
  scheduleReposition();
}

/* ========= 詳細一覧テーブル ========= */
function renderDetailTable(){
  detailTableWrap.innerHTML="";
  if(!tasks.length){
    detailTableWrap.innerHTML="<p>タスクがありません。</p>";
    return;
  }
  const rows=tasks.map(t=>{
    const status=t.completed?"完":"未";
    const parent=tasks.find(x=>x.id==t.parentId)?.name||"-";
    const d=t.details||{};
    const assignee=d.assignee||"";
    const est=d.estimate||"";
    const pri=d.priority||"";
    const link=d.link?`<a href="${d.link}" target="_blank" rel="noopener">link</a>`:"";
    const notes=d.notes?d.notes.replace(/\n/g," "):"";
    return `<tr data-id="${t.id}">
      <td>${status}</td>
      <td>${t.name}</td>
      <td>${parent}</td>
      <td>${t.func}</td>
      <td>${assignee}</td>
      <td>${est}</td>
      <td>${pri}</td>
      <td>${link}</td>
      <td>${notes}</td>
      <td><button type="button" class="detail-action-btn" data-id="${t.id}">編集</button></td>
    </tr>`;
  }).join("");
  detailTableWrap.innerHTML=`
    <table class="detail-table">
      <thead>
        <tr>
          <th>状</th><th>タスク</th><th>親</th><th>機能</th>
          <th>担当</th><th>見積h</th><th>優先</th><th>Link</th><th>メモ</th><th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  // 行クリック → スナップ（ツリーに切替）
  detailTableWrap.querySelectorAll("tbody tr").forEach(tr=>{
    tr.addEventListener("click",e=>{
      if(e.target.closest("button")) return; // 編集ボタンは除外
      const id=+tr.dataset.id;
      snapToTask(id);
    });
  });
  // 編集ボタン
  detailTableWrap.querySelectorAll(".detail-action-btn").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.stopPropagation();
      openDetailModal(+btn.dataset.id);
    });
  });
}

/* ========= 詳細モーダル ========= */
const detailModal      = document.getElementById("detailModal");
const detailForm       = document.getElementById("detailForm");
const detailTaskIdEl   = document.getElementById("detailTaskId");
const detailTitleEl    = document.getElementById("detailModalTitle");
const detailAssigneeEl = document.getElementById("detailAssignee");
const detailEstimateEl = document.getElementById("detailEstimate");
const detailPriorityEl = document.getElementById("detailPriority");
const detailLinkEl     = document.getElementById("detailLink");
const detailNotesEl    = document.getElementById("detailNotes");
const detailCancelBtn  = document.getElementById("detailCancel");

function openDetailModal(id){
  const t=tasks.find(x=>x.id===id); if(!t) return;
  detailTaskIdEl.value=id;
  detailTitleEl.textContent=`「${t.name}」詳細編集`;
  const d=t.details||{};
  detailAssigneeEl.value=d.assignee||"";
  detailEstimateEl.value=d.estimate||"";
  detailPriorityEl.value=d.priority||"";
  detailLinkEl.value=d.link||"";
  detailNotesEl.value=d.notes||"";
  detailModal.classList.remove("hidden");
}
function closeDetailModal(){
  detailModal.classList.add("hidden");
}
detailCancelBtn.onclick=closeDetailModal;

detailForm.addEventListener("submit",e=>{
  e.preventDefault();
  const id=+detailTaskIdEl.value;
  const t=tasks.find(x=>x.id===id); if(!t) return;
  t.details={
    assignee: detailAssigneeEl.value.trim(),
    estimate: detailEstimateEl.value.trim(),
    priority: detailPriorityEl.value,
    link:     detailLinkEl.value.trim(),
    notes:    detailNotesEl.value.trim()
  };
  saveAll();
  closeDetailModal();
  renderApp(); // 再描画（テーブル/ツリー更新）
});

/* ========= 完了トグル & 詳細ボタン (ツリー上) ========= */
container.addEventListener("click",e=>{
  const detailBtn=e.target.closest(".detail-btn");
  if(detailBtn){
    openDetailModal(+detailBtn.dataset.id);
    return;
  }
  const box=e.target.closest(".task");
  if(!box) return;
  const id=+box.id.split("-")[1];
  const t=tasks.find(x=>x.id===id);
  if(!t) return;
  t.completed=!t.completed;
  saveAll();
  renderApp();
});

/* ========= テーマ切替 ========= */
function updateThemeButton(){
  themeBtn.textContent = document.body.classList.contains("dark") ? "🌞" : "🌙";
}
themeBtn.onclick=()=>{
  document.body.classList.toggle("dark");
  updateThemeButton();
  saveAll();
};
updateThemeButton();

/* ========= ライン再調整 ========= */
function repositionLines(){
  lines.forEach(o=>o.line.position());
}
let _reposScheduled=false;
function scheduleReposition(){
  if(_reposScheduled) return;
  _reposScheduled=true;
  requestAnimationFrame(()=>{
    repositionLines();
    _reposScheduled=false;
  });
}
/* scroll / resize */
window.addEventListener("scroll", scheduleReposition, {passive:true});
window.addEventListener("resize", scheduleReposition);

/* ========= ズーム（中心維持） ========= */
const MIN_Z=0.2, MAX_Z=2.5, STEP=0.1;
function setZoom(z){
  const vw=window.innerWidth, vh=window.innerHeight;
  const worldCX=(window.scrollX + vw/2)/scale;
  const worldCY=(window.scrollY + vh/2)/scale;
  scale=Math.min(MAX_Z,Math.max(MIN_Z,z));
  container.style.transform=`scale(${scale})`;
  const newScrollX=worldCX*scale - vw/2;
  const newScrollY=worldCY*scale - vh/2;
  window.scrollTo(newScrollX,newScrollY);
  saveAll();
  scheduleReposition();
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
  setZoom(scale);
  window.scrollTo(2000*scale,2000*scale); // 中央付近
  renderApp();
});
