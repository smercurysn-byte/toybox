/* =====================================================
   CARS — 다이캐스트 미니카 가상 차고지 & 랜덤 트랙 추천기
===================================================== */
(function(){
  "use strict";
  const TB = window.TB;
  const { $, clamp, store, saveStore, ensureAudio, playClick, setupCanvas } = TB;

  const canvas = $("#carsCanvas");
  canvas.height = 420;
  const {ctx, dims, resize} = setupCanvas(canvas);
  TB.registerResizer(resize);

  /* ---------- 차고지(garage) 데이터 ---------- */
  let cars = (store.cars && store.cars.list) || [];
  const listEl=$("#carList"), countEl=$("#carCount"), statEl=$("#carsStat");
  const nameIn=$("#carName"), brandIn=$("#carBrand"), colorIn=$("#carColor"), speedIn=$("#carSpeed");

  function persistCars(){ saveStore({cars:{list:cars}}); }
  function renderCars(){
    countEl.textContent=cars.length;
    statEl.textContent="차량 "+cars.length+"대";
    listEl.innerHTML="";
    if(!cars.length){
      const e=document.createElement("p"); e.className="small"; e.textContent="아직 등록된 미니카가 없어요.";
      listEl.appendChild(e); return;
    }
    cars.forEach((c,i)=>{
      const row=document.createElement("div"); row.className="car";
      row.innerHTML=`<span class="dot" style="background:${c.color}"></span>`+
        `<span class="nm">${escapeHtml(c.name)}</span>`+
        `<span class="meta">${escapeHtml(c.brand)} · ${c.speed}km/h</span>`+
        `<span class="del" title="삭제">✕</span>`;
      row.querySelector(".del").addEventListener("click",()=>{ cars.splice(i,1); persistCars(); renderCars(); });
      listEl.appendChild(row);
    });
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"]/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m])); }

  $("#carAdd").addEventListener("click",()=>{
    const name=(nameIn.value||"").trim();
    if(!name){ nameIn.focus(); return; }
    cars.push({ name, brand:brandIn.value, color:colorIn.value, speed:clamp(parseInt(speedIn.value)||0,0,999) });
    persistCars(); renderCars();
    nameIn.value=""; nameIn.focus();
    playClick(760);
  });
  nameIn.addEventListener("keydown", e=>{ if(e.key==="Enter") $("#carAdd").click(); });
  renderCars();

  /* ---------- 랜덤 트랙 ---------- */
  const PARTS = [
    {key:"straight", label:"직선 코스"},
    {key:"loop",     label:"360도 회전 루프"},
    {key:"curve",    label:"90도 급커브"},
    {key:"jump",     label:"점프대"},
    {key:"lane",     label:"차선 변경 구역"},
  ];
  let track = null;         // {parts:[...], poly:[[x,y]...], len, cum:[...]}
  const trackNameEl=$("#carsTrackName");

  function seg(type, w){
    const pts=[]; const push=(x,y)=>pts.push([x,y]);
    if(type==="straight"){ push(0,0); push(w,0); }
    else if(type==="curve"){ const A=Math.min(w*0.16,52); for(let i=0;i<=24;i++){ const t=i/24; push(w*t, -Math.sin(t*Math.PI)*A); } }
    else if(type==="lane"){ const A=Math.min(w*0.10,34); for(let i=0;i<=24;i++){ const t=i/24; push(w*t, -Math.sin(t*Math.PI*2)*A); } }
    else if(type==="loop"){
      const R=Math.min(w*0.17,64), cx=w*0.5, cy=-R;
      push(0,0); push(w*0.30,0);
      for(let i=0;i<=44;i++){ const th=Math.PI/2 + (i/44)*Math.PI*2; push(cx+R*Math.cos(th), cy+R*Math.sin(th)); }
      push(w*0.70,0); push(w,0);
    }
    else if(type==="jump"){
      const lip=-Math.min(w*0.16,56), rampX=w*0.30, landX=w*0.72, A=Math.abs(lip)*0.7;
      push(0,0); push(rampX, lip);
      for(let i=0;i<=20;i++){ const t=i/20; push(rampX+(landX-rampX)*t, lip*(1-t) - A*4*t*(1-t)); }
      push(w,0);
    }
    return pts;
  }

  function buildTrack(){
    const n=4+Math.floor(Math.random()*3); // 4~6 부품 (+출발/도착)
    const parts=[]; let prev="";
    for(let i=0;i<n;i++){
      let p; do{ p=PARTS[Math.floor(Math.random()*PARTS.length)]; }while(p.key===prev && Math.random()<0.7);
      prev=p.key; parts.push(p);
    }
    // 폴리라인 구성
    const margin=46;
    const availW=Math.max(200, dims.w-margin*2);
    const segW=availW/parts.length;
    const poly=[]; let ox=margin;
    parts.forEach(p=>{
      const pts=seg(p.key, segW);
      pts.forEach(([x,y])=> poly.push([ox+x, y]));
      ox+=segW;
    });
    // 누적 길이
    const cum=[0]; let len=0;
    for(let i=1;i<poly.length;i++){
      len += Math.hypot(poly[i][0]-poly[i-1][0], poly[i][1]-poly[i-1][1]);
      cum.push(len);
    }
    track={ parts, poly, len, cum };
    trackNameEl.textContent = "출발 ➔ " + parts.map(p=>p.label).join(" ➔ ") + " ➔ 도착";
    carPos=0;
  }
  $("#trackBtn").addEventListener("click",()=>{ ensureAudio(); buildTrack(); playClick(520); });

  /* ---------- 주행 애니메이션 ---------- */
  let carPos=0; // arc-length param
  function pointAt(s){
    if(!track) return null;
    s = ((s % track.len)+track.len) % track.len;
    const cum=track.cum, poly=track.poly;
    // 이분 탐색
    let lo=0, hi=cum.length-1;
    while(lo<hi){ const mid=(lo+hi)>>1; if(cum[mid]<s) lo=mid+1; else hi=mid; }
    const i=Math.max(1,lo);
    const seg0=poly[i-1], seg1=poly[i];
    const segLen=cum[i]-cum[i-1] || 1;
    const t=(s-cum[i-1])/segLen;
    const x=seg0[0]+(seg1[0]-seg0[0])*t, y=seg0[1]+(seg1[1]-seg0[1])*t;
    const ang=Math.atan2(seg1[1]-seg0[1], seg1[0]-seg0[0]);
    return {x,y,ang};
  }

  function draw(){
    ctx.clearRect(0,0,dims.w,dims.h);
    const grad=ctx.createLinearGradient(0,0,0,dims.h);
    grad.addColorStop(0,"#141a24"); grad.addColorStop(1,"#0e1017");
    ctx.fillStyle=grad; ctx.fillRect(0,0,dims.w,dims.h);

    const baseY=dims.h*0.66;

    if(!track){
      ctx.fillStyle="#6b7590"; ctx.font="15px sans-serif"; ctx.textAlign="center";
      ctx.fillText("오른쪽 [🎲 랜덤 트랙 설계] 버튼을 눌러보세요", dims.w/2, dims.h/2);
      ctx.textAlign="left";
      return;
    }

    // 트랙
    ctx.lineWidth=Math.max(7, dims.w*0.014);
    ctx.lineJoin="round"; ctx.lineCap="round";
    ctx.strokeStyle="#3a4257";
    ctx.beginPath();
    track.poly.forEach(([x,y],i)=>{ const py=baseY+y; i?ctx.lineTo(x,py):ctx.moveTo(x,py); });
    ctx.stroke();
    // 중앙 점선
    ctx.lineWidth=2; ctx.strokeStyle="#ffd16688"; ctx.setLineDash([10,12]);
    ctx.beginPath();
    track.poly.forEach(([x,y],i)=>{ const py=baseY+y; i?ctx.lineTo(x,py):ctx.moveTo(x,py); });
    ctx.stroke(); ctx.setLineDash([]);

    // 출발/도착 깃발
    flag(track.poly[0][0], baseY+track.poly[0][1], "#3adba0", "출발");
    const last=track.poly[track.poly.length-1];
    flag(last[0], baseY+last[1], "#ff7ca8", "도착");

    // 차
    const p=pointAt(carPos);
    if(p){
      const col=(cars[0] && cars[0].color) || "#3a86ff";
      ctx.save();
      ctx.translate(p.x, baseY+p.y);
      ctx.rotate(p.ang);
      const w=Math.max(26,dims.w*0.05), h=w*0.5;
      ctx.fillStyle="#0c0e14"; ctx.beginPath(); ctx.arc(-w*0.28,h*0.55,h*0.32,0,7); ctx.arc(w*0.28,h*0.55,h*0.32,0,7); ctx.fill();
      ctx.fillStyle=col;
      rr(-w/2,-h/2,w,h,6); ctx.fill();
      ctx.fillStyle="rgba(255,255,255,.75)"; rr(-w*0.1,-h*0.42,w*0.5,h*0.4,3); ctx.fill();
      ctx.restore();
    }
  }
  function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function flag(x,y,color,label){
    ctx.strokeStyle="#8892a8"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y-40); ctx.stroke();
    ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(x,y-40); ctx.lineTo(x+22,y-34); ctx.lineTo(x,y-28); ctx.fill();
    ctx.fillStyle="#c7cede"; ctx.font="11px sans-serif"; ctx.textAlign="center"; ctx.fillText(label,x,y+16); ctx.textAlign="left";
  }

  let last=performance.now();
  function loop(t){
    const dt=Math.min(0.033,(t-last)/1000); last=t;
    if(TB.currentTab==="cars"){
      if(track){
        const spd=(cars[0]? cars[0].speed:300);
        carPos += (60 + spd*0.6)*dt; // 최고속도가 빠른 차일수록 빠르게 주행
      }
      draw();
    }
    requestAnimationFrame(loop);
  }
  resize();
  requestAnimationFrame(loop);
})();
