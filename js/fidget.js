/* =====================================================
   FIDGET — 피젯 토이 사운드 믹서 (ASMR 힐링 패드)
   WebAudio로 딸깍/뾱/드르륵 효과음을 합성한다. (pygame 대응)
===================================================== */
(function(){
  "use strict";
  const TB = window.TB;
  const { $, $$, clamp, store, saveStore, ensureAudio, setupCanvas } = TB;

  const canvas = $("#fidgetCanvas");
  canvas.height = 420;
  const {ctx, dims, resize} = setupCanvas(canvas);
  TB.registerResizer(resize);

  /* ---------- 사운드 합성 ---------- */
  function tone({freq=800, type="square", dur=0.06, gain=0.09, slideTo=null}){
    const ac=ensureAudio(); const t=ac.currentTime;
    const o=ac.createOscillator(), g=ac.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,t);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(gain,t+0.006);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t+dur+0.02);
  }
  const SOUND = {
    switch(){ tone({freq:1700,type:"square",dur:0.03,gain:0.08}); setTimeout(()=>tone({freq:1300,type:"square",dur:0.03,gain:0.06}),35); }, // 딸깍
    pop(){ tone({freq:440,type:"sine",dur:0.11,gain:0.22,slideTo:150}); },   // 뾱
    stick(){ tone({freq:300,type:"sawtooth",dur:0.09,gain:0.10,slideTo:180}); },
    toggle(){ tone({freq:900,type:"triangle",dur:0.05,gain:0.09}); },
    button(){ tone({freq:600,type:"square",dur:0.05,gain:0.10,slideTo:400}); },
    dial(){ tone({freq:1200,type:"triangle",dur:0.03,gain:0.06}); },
    bearing(v){ tone({freq:200+Math.min(900,v*40),type:"sawtooth",dur:0.025,gain:0.05}); }, // 드르륵 한 틱
  };

  /* ---------- 카운터 (롤링 1분 + 연타모드) ---------- */
  const statEl=$("#fidgetStat"), comboEl=$("#fidgetCombo");
  let stamps=[];               // 최근 상호작용 timestamp
  let rushing=false, rushEnd=0, rushScore=0;
  let bestRush=(store.fidget && store.fidget.best) || 0;
  const bestEl=$("#fidgetBest"), rushInfo=$("#rushInfo"), rushBtn=$("#rushBtn");
  bestEl.textContent = bestRush ? ("최고 점수: "+bestRush) : "최고 점수: —";

  let comboTimer=0;
  function flash(text){ comboEl.textContent=text; comboEl.classList.add("show"); comboTimer=0.7; }

  function interact(n){
    n=n||1;
    const now=performance.now();
    for(let i=0;i<n;i++) stamps.push(now);
    if(rushing){ rushScore+=n; if(rushScore%10===0) flash(rushScore+"!"); }
  }
  function startRush(){
    ensureAudio();
    rushing=true; rushScore=0; rushEnd=performance.now()+10000;
    rushBtn.textContent="연타 중...";
    flash("마구 누르세요!");
  }
  function endRush(){
    rushing=false; rushBtn.textContent="마구 누르기 시작!";
    rushInfo.textContent="이번 점수: "+rushScore+"점!";
    if(rushScore>bestRush){ bestRush=rushScore; saveStore({fidget:{best:bestRush}}); bestEl.textContent="최고 점수: "+bestRush; flash("신기록 "+bestRush+"! 🎉"); }
  }
  rushBtn.addEventListener("click",()=>{ if(!rushing) startRush(); });

  /* ---------- 피젯 패드 ---------- */
  const PADS=[
    {label:"스위치", ic:"🎚️", s:"switch"},
    {label:"팝잇",   ic:"🫧", s:"pop"},
    {label:"조이스틱",ic:"🕹️", s:"stick"},
    {label:"토글",   ic:"🔘", s:"toggle"},
    {label:"버튼",   ic:"⏺️", s:"button"},
    {label:"다이얼", ic:"🎛️", s:"dial"},
  ];
  const padGrid=$("#padGrid");
  PADS.forEach(p=>{
    const b=document.createElement("button");
    b.className="pad"; b.innerHTML=`<span class="ic">${p.ic}</span>${p.label}`;
    const hit=()=>{ ensureAudio(); SOUND[p.s](); interact(1); b.classList.add("on"); setTimeout(()=>b.classList.remove("on"),90); };
    b.addEventListener("pointerdown", hit);
    padGrid.appendChild(b);
  });

  /* ---------- 팝잇 뽁뽁이 ---------- */
  const popit=$("#popit");
  for(let i=0;i<25;i++){
    const b=document.createElement("button"); b.className="bub";
    b.addEventListener("pointerdown",()=>{
      ensureAudio(); SOUND.pop(); interact(1);
      b.classList.toggle("popped");
    });
    popit.appendChild(b);
  }

  /* ---------- 스피너 (캔버스) ---------- */
  const sp={ angle:0, vel:0, dragging:false, lastA:0, lastT:0, rotAccum:0, tickAccum:0 };
  function center(){ return { cx:dims.w/2, cy:dims.h*0.5, R:Math.min(dims.w,dims.h)*0.34 }; }
  function angleOf(e){
    const rect=canvas.getBoundingClientRect();
    const {cx,cy}=center();
    return Math.atan2((e.clientY-rect.top)-cy, (e.clientX-rect.left)-cx);
  }
  canvas.addEventListener("pointerdown", e=>{
    ensureAudio(); canvas.setPointerCapture(e.pointerId);
    sp.dragging=true; sp.lastA=angleOf(e); sp.lastT=performance.now(); sp.vel=0;
  });
  canvas.addEventListener("pointermove", e=>{
    if(!sp.dragging) return;
    const a=angleOf(e), now=performance.now();
    let da=a-sp.lastA; while(da>Math.PI)da-=2*Math.PI; while(da<-Math.PI)da+=2*Math.PI;
    const dt=Math.max(0.001,(now-sp.lastT)/1000);
    sp.angle+=da; sp.vel=da/dt;
    sp.lastA=a; sp.lastT=now;
    spinSound(da);
  });
  function endDrag(){ sp.dragging=false; }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", e=>{ e.preventDefault(); ensureAudio(); sp.vel += (e.deltaY>0?1:-1)*6; }, {passive:false});

  function spinSound(da){
    sp.tickAccum += Math.abs(da);
    const step=0.5; // 라디안마다 틱
    while(sp.tickAccum>step){ sp.tickAccum-=step; SOUND.bearing(Math.abs(sp.vel)); }
  }

  function drawSpinner(){
    const {cx,cy,R}=center();
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(sp.angle);
    // 3개 로브
    for(let i=0;i<3;i++){
      const a=(Math.PI*2/3)*i;
      const lx=Math.cos(a)*R*0.62, ly=Math.sin(a)*R*0.62;
      ctx.beginPath(); ctx.arc(lx,ly,R*0.34,0,7);
      ctx.fillStyle= i===0?"#7c8cff": i===1?"#ff7ca8":"#3adba0"; ctx.fill();
      ctx.lineWidth=3; ctx.strokeStyle="rgba(0,0,0,.3)"; ctx.stroke();
      // 베어링
      ctx.beginPath(); ctx.arc(lx,ly,R*0.13,0,7); ctx.fillStyle="#12151d"; ctx.fill();
    }
    // 몸통
    ctx.beginPath(); ctx.arc(0,0,R*0.4,0,7); ctx.fillStyle="#1f2432"; ctx.fill();
    ctx.lineWidth=3; ctx.strokeStyle="rgba(0,0,0,.35)"; ctx.stroke();
    // 중앙 베어링
    ctx.beginPath(); ctx.arc(0,0,R*0.17,0,7); ctx.fillStyle="#c9ccd6"; ctx.fill();
    ctx.beginPath(); ctx.arc(0,0,R*0.08,0,7); ctx.fillStyle="#12151d"; ctx.fill();
    ctx.restore();
  }
  function draw(){
    ctx.clearRect(0,0,dims.w,dims.h);
    const grad=ctx.createLinearGradient(0,0,0,dims.h);
    grad.addColorStop(0,"#191d28"); grad.addColorStop(1,"#0e1017");
    ctx.fillStyle=grad; ctx.fillRect(0,0,dims.w,dims.h);
    drawSpinner();
    // 회전 속도 표시
    ctx.fillStyle="#6b7590"; ctx.font="12px sans-serif"; ctx.textAlign="center";
    ctx.fillText("RPM "+Math.round(Math.abs(sp.vel)/(2*Math.PI)*60), dims.w/2, dims.h-14);
    ctx.textAlign="left";
  }

  let last=performance.now();
  function loop(t){
    const dt=Math.min(0.033,(t-last)/1000); last=t;
    if(TB.currentTab==="fidget"){
      if(!sp.dragging){
        sp.angle += sp.vel*dt;
        // 회전 마찰
        sp.vel *= Math.max(0, 1 - 0.55*dt);
        if(Math.abs(sp.vel)<0.05) sp.vel=0;
        // 관성 회전 중 드르륵
        if(Math.abs(sp.vel)>0.2) spinSound(sp.vel*dt);
        // 한 바퀴마다 상호작용 1 카운트
        sp.rotAccum += Math.abs(sp.vel*dt);
        while(sp.rotAccum>Math.PI*2){ sp.rotAccum-=Math.PI*2; interact(1); }
      }
      // 롤링 1분 카운트
      const now=performance.now();
      stamps = stamps.filter(ts=> now-ts <= 60000);
      statEl.textContent = "1분 콤보: "+stamps.length + (rushing? "  ·  연타 "+rushScore : "");
      if(rushing && now>=rushEnd) endRush();
      if(comboTimer>0){ comboTimer-=dt; if(comboTimer<=0) comboEl.classList.remove("show"); }
      draw();
    }
    requestAnimationFrame(loop);
  }
  resize();
  requestAnimationFrame(loop);
})();
