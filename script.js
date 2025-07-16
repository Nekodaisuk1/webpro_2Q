/* === データ === */
let tasks = [];          // 全タスク
let taskId = 0;          // 連番 ID
let lines = [];          // LeaderLine インスタンス
let circleSettings = {}; // 親 id → { radius }

/* === 追加/取得ヘルパ === */
function addTask(){
  const name = taskName.value.trim();
  const func = taskFunction.value.trim();
  const parentId = parentSelect.value || null;
  if(!name||!func) return;
  const id = taskId++;
  tasks.push({id,name,func,parentId});
  parentSelect.insertAdjacentHTML("beforeend",
    `<option value="${id}">${name}</option>`);
  render();
}
const getChildren=id=>tasks.filter(t=>t.parentId==id);
const getRoots   =()=>tasks.filter(t=>t.parentId===null);

/* === 座標/描画ユーティリティ === */
const container = document.getElementById("taskContainer");
function position(el,x,y){ el.style.left=`${x}px`; el.style.top=`${y}px`; }
function clearLines(){ lines.forEach(l=>l.remove()); lines=[]; }
function drawLineToCenter(fromEl,cx,cy){
  const dummy=document.createElement("div");
  Object.assign(dummy.style,{
    position:"absolute",left:`${cx}px`,top:`${cy}px`,
    width:0,height:0
  });
  container.appendChild(dummy);
  lines.push(new LeaderLine(fromEl,dummy));
}

/* === タブバー === */
function renderTabs(activeId=null){
  const bar=document.getElementById("tabBar");
  bar.innerHTML="";
  tasks.forEach(t=>{
    const btn=document.createElement("button");
    btn.textContent=t.name;
    if(t.id===activeId) btn.className="tab-active";
    btn.onclick=()=>{ snapToTask(t.id); renderTabs(t.id); };
    bar.appendChild(btn);
  });
}
function snapToTask(id){
  const el=document.getElementById("task-"+id);
  if(!el) return;
  const x=parseInt(el.style.left), y=parseInt(el.style.top);
  window.scrollTo({left:x-window.innerWidth/2,
                   top :y-window.innerHeight/2, behavior:"smooth"});
}

/* === メイン再描画 === */
function render(){
  container.innerHTML=""; clearLines(); circleSettings={};

  const centerX=2500, centerY=2500, rootR=300;
  const roots=getRoots(); if(!roots.length) return;
  const rootStep=(2*Math.PI)/roots.length;

  roots.forEach((root,i)=>{
    const ang=i*rootStep, x=centerX+Math.cos(ang)*rootR,
          y=centerY+Math.sin(ang)*rootR;
    createTaskElement(root,x,y);
    layoutChildren(root,x,y,ang);
  });

  renderTabs();                 // タブ再生成
}

/* --- タスクDOM生成 --- */
function createTaskElement(t,x,y){
  container.insertAdjacentHTML("beforeend",
    `<div class="task" id="task-${t.id}">
       <h3>${t.name}</h3><p>機能:${t.func}</p>
     </div>`);
  position(document.getElementById("task-"+t.id),x,y);
}

/* --- 子円レイアウト（再帰） --- */
function layoutChildren(parent,px,py,baseAng){
  const kids=getChildren(parent.id); if(!kids.length) return;

  // 円心を親から離す距離
  const dist = 300 + kids.length*50;
  const cx   = px + Math.cos(baseAng)*dist;
  const cy   = py + Math.sin(baseAng)*dist;

  // 円半径（スライダー値保持）
  if(!circleSettings[parent.id]) circleSettings[parent.id]={radius:120};
  const r = circleSettings[parent.id].radius;

  // 可視円
  drawCircle(cx,cy,r);
  // 親→円心へ 1 本だけ矢印
  drawLineToCenter(document.getElementById("task-"+parent.id),cx,cy);
  // 半径調整スライダー
  createSlider(parent.id,cx,cy+70);

  // 子を円周に配置
  const step=(2*Math.PI)/kids.length;
  kids.forEach((kid,i)=>{
    const ang=i*step, kx=cx+Math.cos(ang)*r, ky=cy+Math.sin(ang)*r;
    createTaskElement(kid,kx,ky);
    layoutChildren(kid,kx,ky,ang);
  });
}

/* --- 円可視化 --- */
function drawCircle(x,y,r){
  const el=document.createElement("div");
  el.className="circle-visual";
  el.style.width=el.style.height=r*2+"px";
  position(el,x,y); container.appendChild(el);
}

/* --- スライダー --- */
function createSlider(pid,x,y){
  const s=document.createElement("input");
  s.type="range"; s.min=50; s.max=300;
  s.value=circleSettings[pid].radius; s.className="radius-slider";
  position(s,x,y); container.appendChild(s);
  s.oninput=()=>{ circleSettings[pid].radius=parseInt(s.value); render(); };
}

/* === 初期化 === */
window.addEventListener("load",()=>{
  window.scrollTo(2000,2000);  // 中央スナップ
  renderTabs();                // 空でもタブバーを表示
});
window.addEventListener("resize",()=>render());
