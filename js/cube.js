/* =====================================================
   CUBE — 루빅스 큐브 패턴 메이커 & 타이머
   3D 큐비(cubie) 모델로 회전을 정확히 처리하고 전개도(net)로 렌더한다.
===================================================== */
(function(){
  "use strict";
  const TB = window.TB;
  const { $, store, saveStore, ensureAudio, playClick, setupCanvas } = TB;

  const canvas = $("#cubeCanvas");
  canvas.height = 420;
  canvas.tabIndex = 0;
  const {ctx, dims, resize} = setupCanvas(canvas);
  TB.registerResizer(resize);

  /* ---------- 색상 ---------- */
  const COL = { U:"#f6f6f8", D:"#ffd500", F:"#00a651", B:"#0051ba", R:"#d0021b", L:"#ff7a00" };

  /* ---------- 3D 큐비 모델 ----------
     축: +x=R, -x=L, +y=U, -y=D, +z=F, -z=B  */
  let cubies = [];
  function solve(){
    cubies = [];
    for(let x=-1;x<=1;x++) for(let y=-1;y<=1;y++) for(let z=-1;z<=1;z++){
      const st = [];
      if(y=== 1) st.push({d:[0,1,0], c:COL.U});
      if(y===-1) st.push({d:[0,-1,0],c:COL.D});
      if(x=== 1) st.push({d:[1,0,0], c:COL.R});
      if(x===-1) st.push({d:[-1,0,0],c:COL.L});
      if(z=== 1) st.push({d:[0,0,1], c:COL.F});
      if(z===-1) st.push({d:[0,0,-1],c:COL.B});
      cubies.push({p:[x,y,z], st});
    }
  }
  solve();

  // 90도 회전 (s: +1 / -1)
  function rot(v, axis, s){
    const [x,y,z]=v;
    if(axis==="x") return s>0 ? [x,-z,y] : [x,z,-y];
    if(axis==="y") return s>0 ? [z,y,-x] : [-z,y,x];
    return s>0 ? [-y,x,z] : [y,-x,z]; // z
  }
  // 기본 6개 시계방향(면을 바깥에서 봤을 때) 정의
  const FACE_DEF = {
    U:{axis:"y", idx:1, val: 1, s: 1},
    D:{axis:"y", idx:1, val:-1, s:-1},
    R:{axis:"x", idx:0, val: 1, s: 1},
    L:{axis:"x", idx:0, val:-1, s:-1},
    F:{axis:"z", idx:2, val: 1, s: 1},
    B:{axis:"z", idx:2, val:-1, s:-1},
  };
  function turn(face, s){
    const d = FACE_DEF[face];
    cubies.forEach(cu=>{
      if(cu.p[d.idx] === d.val){
        cu.p = rot(cu.p, d.axis, s);
        cu.st.forEach(st=> st.d = rot(st.d, d.axis, s));
      }
    });
  }
  // 표기법 적용: "R", "R'", "R2"
  function applyMove(mv){
    const f = mv[0], suf = mv.slice(1);
    const base = FACE_DEF[f].s;
    if(suf==="2"){ turn(f, base); turn(f, base); }
    else if(suf==="'"){ turn(f, -base); }
    else { turn(f, base); }
  }
  function applySeq(seq){ seq.trim().split(/\s+/).filter(Boolean).forEach(applyMove); }

  function cubieAt(p){ return cubies.find(c=> c.p[0]===p[0]&&c.p[1]===p[1]&&c.p[2]===p[2]); }
  // 면 n의 3x3 색을 위(up)/오른(right) 방향으로 읽는다 (row-major)
  function faceColors(n, up, right){
    const out=[];
    for(let r=0;r<3;r++) for(let c=0;c<3;c++){
      const p=[ n[0]+up[0]*(1-r)+right[0]*(c-1),
                n[1]+up[1]*(1-r)+right[1]*(c-1),
                n[2]+up[2]*(1-r)+right[2]*(c-1) ];
      const cu=cubieAt(p);
      const st=cu.st.find(s=> s.d[0]===n[0]&&s.d[1]===n[1]&&s.d[2]===n[2]);
      out.push(st? st.c : "#111");
    }
    return out;
  }
  // 렌더용 면 방위
  const FACE_VIEW = {
    U:{n:[0,1,0],  up:[0,0,-1], right:[1,0,0]},
    L:{n:[-1,0,0], up:[0,1,0],  right:[0,0,1]},
    F:{n:[0,0,1],  up:[0,1,0],  right:[1,0,0]},
    R:{n:[1,0,0],  up:[0,1,0],  right:[0,0,-1]},
    B:{n:[0,0,-1], up:[0,1,0],  right:[-1,0,0]},
    D:{n:[0,-1,0], up:[0,0,1],  right:[1,0,0]},
  };
  // 전개도 배치 (열,행)  4x3 격자
  const NET = { U:[1,0], L:[0,1], F:[1,1], R:[2,1], B:[3,1], D:[1,2] };

  function isSolved(){
    return Object.values(FACE_VIEW).every(v=>{
      const cs = faceColors(v.n, v.up, v.right);
      return cs.every(c=> c===cs[0]);
    });
  }

  /* ---------- 렌더 ---------- */
  function rrect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }
  function draw(){
    ctx.clearRect(0,0,dims.w,dims.h);
    const grad = ctx.createLinearGradient(0,0,0,dims.h);
    grad.addColorStop(0,"#171b26"); grad.addColorStop(1,"#0e1017");
    ctx.fillStyle=grad; ctx.fillRect(0,0,dims.w,dims.h);

    const topPad = 58; // 타이머 라벨 공간
    const availH = dims.h - topPad - 16;
    const cell = Math.max(10, Math.min((dims.w-24)/12, availH/9));
    const netW = cell*12, netH = cell*9;
    const ox = (dims.w-netW)/2, oy = topPad + (availH-netH)/2;
    const gap = Math.max(1.5, cell*0.08);

    Object.keys(NET).forEach(face=>{
      const [fc,fr]=NET[face];
      const v=FACE_VIEW[face];
      const cs=faceColors(v.n,v.up,v.right);
      for(let r=0;r<3;r++) for(let c=0;c<3;c++){
        const x=ox+(fc*3+c)*cell+gap, y=oy+(fr*3+r)*cell+gap;
        ctx.fillStyle="#0c0e14"; rrect(ox+(fc*3+c)*cell, oy+(fr*3+r)*cell, cell, cell, 3); ctx.fill();
        ctx.fillStyle=cs[r*3+c]; rrect(x,y,cell-gap*2,cell-gap*2, Math.max(2,cell*0.14)); ctx.fill();
      }
    });
  }

  /* ---------- 스크램블 ---------- */
  const FACES=["U","D","L","R","F","B"], SUF=["","'","2"];
  const scrEl=$("#cubeScramble");
  function genScramble(){
    const seq=[]; let prev="";
    for(let i=0;i<20;i++){
      let f; do{ f=FACES[Math.floor(Math.random()*6)]; }while(f===prev);
      prev=f;
      seq.push(f+SUF[Math.floor(Math.random()*3)]);
    }
    const s=seq.join(" ");
    solve(); applySeq(s);
    scrEl.textContent="스크램블: "+s;
    return s;
  }

  /* ---------- 패턴 도감 ---------- */
  const PATTERNS = [
    {name:"체커보드 (Checkerboard)", alg:"U2 D2 F2 B2 L2 R2"},
    {name:"큐브 속 큐브 (Cube in Cube)", alg:"F L F U' R U F2 L2 U' L' B D' B' L2 U"},
    {name:"태극/6점 (6 Spot)", alg:"U D' R L' F B' U D'"},
    {name:"십자가 (Cross)", alg:"R2 L' D F2 R' D' R' L U' D R D B2 R' U D2"},
    {name:"네 점 (4 Spot)", alg:"F2 B2 U D' R2 L2 U D'"},
    {name:"세로 줄무늬 (Vertical Stripes)", alg:"F U F R L2 B D' R D2 L D' B R2 L F U F"},
    {name:"파이오니어 (Plus Minus)", alg:"U2 R2 L2 U2 R2 L2"},
  ];
  const patWrap=$("#cubePatterns");
  PATTERNS.forEach(p=>{
    const el=document.createElement("div");
    el.className="pat";
    el.innerHTML=`<div class="nm">${p.name}</div><div class="fx">${p.alg}</div>`;
    el.title="이 공식을 큐브에 적용";
    el.addEventListener("click",()=>{
      solve(); applySeq(p.alg);
      scrEl.textContent="패턴: "+p.name+"  ("+p.alg+")";
      playClick(600);
    });
    patWrap.appendChild(el);
  });

  /* ---------- 회전 버튼 ---------- */
  const movesWrap=$("#cubeMoves");
  ["U","U'","D","D'","L","L'","R","R'","F","F'","B","B'"].forEach(mv=>{
    const b=document.createElement("button");
    b.className="pill"; b.textContent=mv;
    b.addEventListener("click",()=>{ applyMove(mv); playClick(720); });
    movesWrap.appendChild(b);
  });
  $("#cubeReset").addEventListener("click",()=>{ solve(); scrEl.textContent="스크램블: —"; });
  $("#cubeScrambleBtn").addEventListener("click", ()=>{ genScramble(); playClick(500); });

  // 키보드 회전: U D L R F B (Shift=prime), 스페이스=타이머
  window.addEventListener("keydown", e=>{
    if(TB.currentTab!=="cube") return;
    if(e.ctrlKey||e.metaKey||e.altKey) return;
    if(e.code==="Space"){ e.preventDefault(); toggleTimer(); return; }
    const map={KeyU:"U",KeyD:"D",KeyL:"L",KeyR:"R",KeyF:"F",KeyB:"B"};
    if(map[e.code]){ e.preventDefault(); applyMove(map[e.code]+(e.shiftKey?"'":"")); playClick(720); }
  });

  /* ---------- 타이머 ---------- */
  const timerEl=$("#cubeTimer"), timerBtn=$("#cubeTimerBtn");
  const bestEl=$("#cubeBest"), recEl=$("#cubeRecords");
  let running=false, startT=0, shownMs=0;
  let records = (store.cube && store.cube.records) || [];

  function fmt(ms){ return (ms/1000).toFixed(2); }
  function renderRecords(){
    records.sort((a,b)=>a-b);
    if(records.length) bestEl.textContent="최고 기록: "+fmt(records[0])+"s";
    else bestEl.textContent="최고 기록: —";
    recEl.innerHTML="";
    records.slice(0,5).forEach((ms,i)=>{
      const row=document.createElement("div"); row.className="rec";
      row.innerHTML=`<span>#${i+1}</span><b>${fmt(ms)}s</b><span class="del" title="삭제">✕</span>`;
      row.querySelector(".del").addEventListener("click",()=>{
        const idx=records.indexOf(ms); if(idx>=0) records.splice(idx,1);
        saveStore({cube:{records}}); renderRecords();
      });
      recEl.appendChild(row);
    });
  }
  function toggleTimer(){
    ensureAudio(); playClick(880);
    if(!running){
      running=true; startT=performance.now();
      timerEl.classList.add("running"); timerBtn.textContent="기록 정지";
    } else {
      running=false;
      const ms=performance.now()-startT; shownMs=ms;
      timerEl.classList.remove("running"); timerBtn.textContent="기록 시작";
      records.push(Math.round(ms)); saveStore({cube:{records}}); renderRecords();
    }
  }
  timerBtn.addEventListener("click", toggleTimer);
  renderRecords();

  /* ---------- 루프 ---------- */
  function loop(){
    if(TB.currentTab==="cube"){
      if(running) shownMs=performance.now()-startT;
      timerEl.textContent=fmt(shownMs);
      draw();
    }
    requestAnimationFrame(loop);
  }
  // 최초 스크램블 하나 생성해 두면 보기 좋음
  genScramble();
  resize();
  requestAnimationFrame(loop);

  // 셀프테스트용으로 노출 (셀레늄 검증)
  window.__cube = { solve, applySeq, isSolved, faceColors, FACE_VIEW };
})();
