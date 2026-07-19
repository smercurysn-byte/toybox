/* =====================================================
   TASTING BAR — 위스키/커피 테이스팅 노트 & 바 캐비닛
===================================================== */
(function(){
  "use strict";
  const TB = window.TB;
  const { $, store, saveStore, ensureAudio, playClick, setupCanvas } = TB;

  const canvas = $("#barCanvas");
  canvas.height = 420;
  const {ctx, dims, resize} = setupCanvas(canvas);
  TB.registerResizer(resize);

  const AXES = ["단맛","스모키","과일향","바디감","피니시"];
  const sliders = [$("#tSweet"),$("#tSmoke"),$("#tFruit"),$("#tBody"),$("#tFinish")];
  const nameIn=$("#barName"), typeIn=$("#barType");
  const listEl=$("#barList"), countEl=$("#barCount"), statEl=$("#barStat"), titleEl=$("#barTitle"), comboEl=$("#barCombo");

  let drinks = (store.bar && store.bar.list) || [];
  let current = { name:"", type:"위스키", vals:[3,2,3,3,3] };   // 편집 중인 값

  function readSliders(){ current.vals = sliders.map(s=> parseInt(s.value)); }
  sliders.forEach(s=> s.addEventListener("input", readSliders));

  function persist(){ saveStore({bar:{list:drinks}}); }
  function esc(s){ return String(s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m])); }
  function render(){
    countEl.textContent=drinks.length; statEl.textContent="수집 "+drinks.length+"잔";
    listEl.innerHTML="";
    if(!drinks.length){ const e=document.createElement("p"); e.className="small"; e.textContent="아직 기록한 잔이 없어요."; listEl.appendChild(e); return; }
    drinks.forEach((d,i)=>{
      const row=document.createElement("div"); row.className="drink";
      row.innerHTML=`<span class="nm">${esc(d.name)}</span><span class="meta">${esc(d.type)}</span><span class="del" title="삭제">✕</span>`;
      row.addEventListener("click", e=>{ if(e.target.classList.contains("del")) return;
        current={name:d.name,type:d.type,vals:d.vals.slice()};
        nameIn.value=d.name; typeIn.value=d.type; sliders.forEach((s,k)=> s.value=d.vals[k]);
        titleEl.textContent="🥃 "+d.name;
      });
      row.querySelector(".del").addEventListener("click",()=>{ drinks.splice(i,1); persist(); render(); });
      listEl.appendChild(row);
    });
  }
  $("#barAdd").addEventListener("click",()=>{
    readSliders();
    const name=(nameIn.value||"").trim(); if(!name){ nameIn.focus(); return; }
    drinks.push({ name, type:typeIn.value, vals:current.vals.slice() });
    persist(); render(); playClick(680);
    titleEl.textContent="🥃 "+name+" 기록 완료";
    nameIn.value=""; nameIn.focus();
  });

  const SERVE=[
    "오늘 하루도 수고했어요. 이 한 잔 어떠세요?",
    "얼음 하나 넣어 천천히 음미해 보세요.",
    "잔을 데운 뒤 향부터 깊게 들이마셔 보세요.",
    "창밖을 보며 한 모금, 여유를 즐겨요.",
    "오늘 밤의 주인공은 바로 이 잔입니다.",
  ];
  let comboTimer=0;
  function showCombo(t){ comboEl.textContent=t; comboEl.classList.add("show"); comboTimer=2.2; }
  $("#barRecommend").addEventListener("click",()=>{
    if(!drinks.length){ showCombo("먼저 잔을 등록해 주세요!"); return; }
    ensureAudio(); playClick(600);
    const d=drinks[Math.floor(Math.random()*drinks.length)];
    current={name:d.name,type:d.type,vals:d.vals.slice()};
    nameIn.value=d.name; typeIn.value=d.type; sliders.forEach((s,k)=> s.value=d.vals[k]);
    titleEl.textContent="🥃 추천: "+d.name;
    showCombo("「"+d.name+"」 — "+SERVE[Math.floor(Math.random()*SERVE.length)]);
  });

  function draw(){
    ctx.clearRect(0,0,dims.w,dims.h);
    const g=ctx.createLinearGradient(0,0,0,dims.h); g.addColorStop(0,"#1c1712"); g.addColorStop(1,"#0e1017");
    ctx.fillStyle=g; ctx.fillRect(0,0,dims.w,dims.h);

    const cx=dims.w/2, cy=dims.h*0.55, R=Math.min(dims.w,dims.h)*0.32;
    // 격자
    ctx.strokeStyle="#2a3040"; ctx.fillStyle="#6b7590"; ctx.lineWidth=1;
    ctx.font="12px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    for(let ring=1; ring<=5; ring++){
      ctx.beginPath();
      for(let i=0;i<=5;i++){ const a=-Math.PI/2 + i*(Math.PI*2/5); const rr=R*ring/5; const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
      ctx.stroke();
    }
    for(let i=0;i<5;i++){
      const a=-Math.PI/2 + i*(Math.PI*2/5);
      ctx.strokeStyle="#2a3040"; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*R, cy+Math.sin(a)*R); ctx.stroke();
      ctx.fillStyle="#aeb6c8"; ctx.fillText(AXES[i], cx+Math.cos(a)*(R+18), cy+Math.sin(a)*(R+18));
    }
    // 값 폴리곤
    const vals=current.vals;
    ctx.beginPath();
    for(let i=0;i<5;i++){ const a=-Math.PI/2 + i*(Math.PI*2/5); const rr=R*vals[i]/5; const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
    ctx.closePath();
    ctx.fillStyle="rgba(255,158,80,.28)"; ctx.fill();
    ctx.strokeStyle="#ff9e50"; ctx.lineWidth=2; ctx.stroke();
    for(let i=0;i<5;i++){ const a=-Math.PI/2 + i*(Math.PI*2/5); const rr=R*vals[i]/5; ctx.beginPath(); ctx.arc(cx+Math.cos(a)*rr, cy+Math.sin(a)*rr,3,0,7); ctx.fillStyle="#ffd166"; ctx.fill(); }

    ctx.fillStyle="#c7cede"; ctx.font="600 15px sans-serif";
    ctx.fillText(current.name || "(이름 없음)", cx, cy-R-30);
    ctx.textAlign="left"; ctx.textBaseline="alphabetic";

    if(comboTimer>0){ comboTimer-=0.016; if(comboTimer<=0) comboEl.classList.remove("show"); }
  }

  function loop(){ if(TB.currentTab==="bar"){ readSliders(); draw(); } requestAnimationFrame(loop); }
  render(); resize(); requestAnimationFrame(loop);
})();
