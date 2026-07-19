/* =====================================================
   JIGSAW PUZZLE — 명화 직소 퍼즐 & 백색소음 라운지
===================================================== */
(function(){
  "use strict";
  const TB = window.TB;
  const { $, clamp, ensureAudio, playClick, setupCanvas } = TB;

  const canvas = $("#puzzleCanvas");
  canvas.height = 420;
  const {ctx, dims, resize} = setupCanvas(canvas);
  TB.registerResizer(resize);

  /* ---------- 명화 (절차적 생성) ---------- */
  const ART = [
    {name:"별이 빛나는 밤", paint:starry},
    {name:"해바라기", paint:sunflowers},
    {name:"수련 연못", paint:waterlily},
    {name:"붉은 노을", paint:sunset},
  ];
  const artSel=$("#puzzleArt");
  ART.forEach((a,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=a.name; artSel.appendChild(o); });

  const src=document.createElement("canvas"); src.width=src.height=540; const sctx=src.getContext("2d");
  function starry(c,W,H){
    const g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,"#0b1e4d"); g.addColorStop(1,"#123a6b");
    c.fillStyle=g; c.fillRect(0,0,W,H);
    for(let i=0;i<6;i++){ const x=Math.random()*W,y=Math.random()*H*0.7,r=20+Math.random()*40;
      const rg=c.createRadialGradient(x,y,2,x,y,r); rg.addColorStop(0,"rgba(255,225,120,.9)"); rg.addColorStop(1,"rgba(255,225,120,0)");
      c.fillStyle=rg; c.beginPath(); c.arc(x,y,r,0,7); c.fill(); }
    c.strokeStyle="rgba(120,170,230,.5)"; c.lineWidth=6;
    for(let k=0;k<10;k++){ c.beginPath(); const y=H*0.2+k*22; for(let x=0;x<=W;x+=20){ c.lineTo(x, y+Math.sin(x/40+k)*14); } c.stroke(); }
    c.fillStyle="#ffd34d"; c.beginPath(); c.arc(W*0.78,H*0.2,34,0,7); c.fill();
    c.fillStyle="#1b3a2b"; c.beginPath(); c.moveTo(W*0.12,H); c.quadraticCurveTo(W*0.18,H*0.4,W*0.24,H); c.fill();
  }
  function sunflowers(c,W,H){
    c.fillStyle="#caa14a"; c.fillRect(0,0,W,H);
    for(let i=0;i<9;i++){ const x=(i%3+0.5)*W/3+(Math.random()*20-10), y=(Math.floor(i/3)+0.5)*H/3+(Math.random()*20-10), r=44;
      c.fillStyle="#e0a020"; for(let p=0;p<12;p++){ const a=p*Math.PI/6; c.beginPath(); c.ellipse(x+Math.cos(a)*r*0.7,y+Math.sin(a)*r*0.7,r*0.5,r*0.22,a,0,7); c.fill(); }
      c.fillStyle="#6b4a12"; c.beginPath(); c.arc(x,y,r*0.42,0,7); c.fill(); }
  }
  function waterlily(c,W,H){
    const g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,"#2b6b6b"); g.addColorStop(1,"#1d4a55"); c.fillStyle=g; c.fillRect(0,0,W,H);
    for(let i=0;i<40;i++){ c.fillStyle=`hsla(${150+Math.random()*80},50%,${40+Math.random()*30}%,.5)`; c.beginPath(); c.ellipse(Math.random()*W,Math.random()*H,20+Math.random()*30,10+Math.random()*16,Math.random()*3,0,7); c.fill(); }
    for(let i=0;i<8;i++){ const x=Math.random()*W,y=Math.random()*H; c.fillStyle="#e8b7d0"; c.beginPath(); c.arc(x,y,10,0,7); c.fill(); }
  }
  function sunset(c,W,H){
    const g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,"#ff9e50"); g.addColorStop(0.5,"#ff5f7e"); g.addColorStop(1,"#6a2c70"); c.fillStyle=g; c.fillRect(0,0,W,H);
    c.fillStyle="#ffd34d"; c.beginPath(); c.arc(W*0.5,H*0.55,60,0,7); c.fill();
    c.fillStyle="rgba(30,10,40,.85)"; c.fillRect(0,H*0.72,W,H*0.28);
    for(let i=0;i<3;i++){ c.beginPath(); c.moveTo(W*(0.2+i*0.3),H*0.72); c.lineTo(W*(0.28+i*0.3),H*0.5); c.lineTo(W*(0.36+i*0.3),H*0.72); c.fill(); }
  }

  /* ---------- 퍼즐 상태 ---------- */
  let N=3, pieces=[], solved=false;
  const statEl=$("#puzzleStat"), hintEl=$("#puzzleHint"), comboEl=$("#puzzleCombo");
  let comboTimer=0; function flash(t){ comboEl.textContent=t; comboEl.classList.add("show"); comboTimer=2; }

  function boardGeom(){
    const S=Math.min(dims.h-40, dims.w-40, 380);
    const bx=(dims.w-S)/2, by=(dims.h-S)/2 + 6;
    return {S, bx, by, ps:S/N};
  }
  function newPuzzle(){
    N=parseInt($("#puzzleSize").value);
    const ai=parseInt(artSel.value)||0;
    sctx.clearRect(0,0,src.width,src.height); ART[ai].paint(sctx, src.width, src.height);
    const {bx,by,ps}=boardGeom();
    pieces=[]; solved=false;
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      pieces.push({ r,c, placed:false,
        x: 30+Math.random()*(dims.w-60), y: 30+Math.random()*(dims.h-60) });
    }
    updateStat();
    hintEl.textContent="조각을 드래그해 제자리에 끼워 맞추세요 ("+ART[ai].name+")";
  }
  function updateStat(){ const done=pieces.filter(p=>p.placed).length; statEl.textContent=done+" / "+pieces.length; }
  $("#puzzleNew").addEventListener("click",()=>{ newPuzzle(); playClick(600); });
  $("#puzzleSize").addEventListener("change", newPuzzle);
  artSel.addEventListener("change", newPuzzle);

  /* 드래그 */
  let drag=null, offX=0, offY=0;
  canvas.addEventListener("pointerdown",e=>{
    const r=canvas.getBoundingClientRect(); const mx=e.clientX-r.left, my=e.clientY-r.top;
    const {ps}=boardGeom();
    for(let i=pieces.length-1;i>=0;i--){ const p=pieces[i]; if(p.placed) continue;
      if(Math.abs(mx-p.x)<ps/2 && Math.abs(my-p.y)<ps/2){ drag=p; offX=mx-p.x; offY=my-p.y; pieces.push(pieces.splice(i,1)[0]); canvas.setPointerCapture(e.pointerId); break; } }
  });
  canvas.addEventListener("pointermove",e=>{
    if(!drag) return; const r=canvas.getBoundingClientRect(); drag.x=e.clientX-r.left-offX; drag.y=e.clientY-r.top-offY;
  });
  function drop(){
    if(!drag) return;
    const {bx,by,ps}=boardGeom();
    const hx=bx+drag.c*ps+ps/2, hy=by+drag.r*ps+ps/2;
    if(Math.hypot(drag.x-hx,drag.y-hy)<ps*0.4){ drag.placed=true; drag.x=hx; drag.y=hy; playClick(880); updateStat();
      if(pieces.every(p=>p.placed)){ solved=true; flash("🎉 완성! 명화가 완성됐어요"); } }
    drag=null;
  }
  canvas.addEventListener("pointerup",drop); canvas.addEventListener("pointercancel",drop);

  function draw(){
    ctx.clearRect(0,0,dims.w,dims.h);
    ctx.fillStyle="#12151d"; ctx.fillRect(0,0,dims.w,dims.h);
    const {S,bx,by,ps}=boardGeom();
    // 보드 배경 + 격자
    ctx.fillStyle="#0c0e14"; ctx.fillRect(bx,by,S,S);
    ctx.strokeStyle="#2a3040"; ctx.lineWidth=1;
    for(let i=0;i<=N;i++){ ctx.beginPath(); ctx.moveTo(bx+i*ps,by); ctx.lineTo(bx+i*ps,by+S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(bx,by+i*ps); ctx.lineTo(bx+S,by+i*ps); ctx.stroke(); }
    const sr=src.width/N;
    // 놓인 조각 → 뜬 조각 순
    pieces.forEach(p=>{ if(!p.placed) return; ctx.drawImage(src, p.c*sr,p.r*sr,sr,sr, bx+p.c*ps,by+p.r*ps, ps,ps); });
    ctx.strokeStyle="#3adba0"; if(solved){ ctx.lineWidth=3; ctx.strokeRect(bx,by,S,S); }
    pieces.forEach(p=>{ if(p.placed) return;
      ctx.save(); ctx.shadowColor="rgba(0,0,0,.6)"; ctx.shadowBlur=8;
      ctx.drawImage(src, p.c*sr,p.r*sr,sr,sr, p.x-ps/2,p.y-ps/2, ps,ps);
      ctx.restore();
      ctx.strokeStyle="rgba(255,255,255,.35)"; ctx.lineWidth=1; ctx.strokeRect(p.x-ps/2,p.y-ps/2,ps,ps);
    });
    if(comboTimer>0){ comboTimer-=0.016; if(comboTimer<=0) comboEl.classList.remove("show"); }
  }

  /* ---------- 백색소음 ---------- */
  let ac=null, buffers=null;
  const noises={ rain:null, fire:null, vinyl:null };
  function buildBuffers(){
    if(buffers) return;
    const sr=ac.sampleRate, n=sr*2;
    const white=ac.createBuffer(1,n,sr); let d=white.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
    const brown=ac.createBuffer(1,n,sr); d=brown.getChannelData(0); let l=0; for(let i=0;i<n;i++){ l+=(Math.random()*2-1)*0.02; l=Math.max(-1,Math.min(1,l)); d[i]=l*3.2; }
    const crackle=ac.createBuffer(1,n,sr); d=crackle.getChannelData(0); for(let i=0;i<n;i++) d[i]=0;
    for(let k=0;k<600;k++){ const idx=(Math.random()*n)|0; const amp=Math.random()*0.8; for(let j=0;j<40 && idx+j<n;j++) d[idx+j]=amp*Math.exp(-j/6)*(Math.random()*2-1); }
    buffers={white,brown,crackle};
  }
  function makeNode(kind, vol){
    const g=ac.createGain(); g.gain.value=vol; g.connect(ac.destination);
    const s=ac.createBufferSource(); s.loop=true;
    if(kind==="rain"){ s.buffer=buffers.white; const f=ac.createBiquadFilter(); f.type="highpass"; f.frequency.value=1000; s.connect(f); f.connect(g); }
    else if(kind==="fire"){ s.buffer=buffers.brown; const f=ac.createBiquadFilter(); f.type="lowpass"; f.frequency.value=500; s.connect(f); f.connect(g); }
    else { s.buffer=buffers.crackle; s.connect(g); }
    s.start();
    return {s,g};
  }
  const NCTL=[
    {k:"rain",  chk:"#nRain",  vol:"#vRain",  scale:0.5},
    {k:"fire",  chk:"#nFire",  vol:"#vFire",  scale:0.6},
    {k:"vinyl", chk:"#nVinyl", vol:"#vVinyl", scale:0.5},
  ];
  NCTL.forEach(cfg=>{
    const chk=$(cfg.chk), vol=$(cfg.vol);
    function apply(){
      if(chk.checked){ ac=ensureAudio(); buildBuffers(); if(!noises[cfg.k]) noises[cfg.k]=makeNode(cfg.k, vol.value/100*cfg.scale); }
      else { if(noises[cfg.k]){ try{noises[cfg.k].s.stop();}catch(e){} noises[cfg.k]=null; } }
    }
    chk.addEventListener("change", apply);
    vol.addEventListener("input",()=>{ if(noises[cfg.k]) noises[cfg.k].g.gain.value = vol.value/100*cfg.scale; });
  });
  function stopAllNoise(){ NCTL.forEach(cfg=>{ if(noises[cfg.k]){ try{noises[cfg.k].s.stop();}catch(e){} noises[cfg.k]=null; } }); }
  function resumeCheckedNoise(){ NCTL.forEach(cfg=>{ const chk=$(cfg.chk),vol=$(cfg.vol); if(chk.checked && !noises[cfg.k]){ ac=ensureAudio(); buildBuffers(); noises[cfg.k]=makeNode(cfg.k, vol.value/100*cfg.scale); } }); }

  /* ---------- 루프 (탭 이탈 시 소음 일시정지) ---------- */
  let wasActive=false;
  function loop(){
    const active = TB.currentTab==="puzzle";
    if(active){ if(!wasActive){ resumeCheckedNoise(); } draw(); }
    else if(wasActive){ stopAllNoise(); }
    wasActive=active;
    requestAnimationFrame(loop);
  }
  resize(); newPuzzle(); requestAnimationFrame(loop);
})();
