/* =====================================================
   PEN SPINNING — 펜 돌리기 콤보 슬롯머신
===================================================== */
(function(){
  "use strict";
  const TB = window.TB;
  const { $, ensureAudio, playClick, setupCanvas } = TB;

  const canvas = $("#penCanvas");
  canvas.height = 420;
  const {ctx, dims, resize} = setupCanvas(canvas);
  TB.registerResizer(resize);

  // 기술 목록 (난이도: 1 초급 / 2 중급 / 3 고급)
  const TRICKS = [
    {n:"엄지 돌리기 (Thumbaround)", d:1},
    {n:"검지 넘기기 (Fingerpass)", d:1},
    {n:"백어라운드 (Backaround)", d:1},
    {n:"패스 (Pass)", d:1},
    {n:"소닉 (Sonic)", d:2},
    {n:"차지 (Charge)", d:2},
    {n:"와이퍼 (Wiper)", d:2},
    {n:"팜스핀 (Palm Spin)", d:2},
    {n:"인피니티 (Infinity)", d:3},
    {n:"트위스티드 소닉 (Twisted Sonic)", d:3},
    {n:"버스트 (Bust)", d:3},
    {n:"신 (Shin)", d:3},
  ];
  const filterEls = { 1:$("#penEasy"), 2:$("#penMid"), 3:$("#penHard") };
  function pool(){
    const p = TRICKS.filter(t=> filterEls[t.d].checked);
    return p.length ? p : TRICKS.slice();
  }

  const statEl=$("#penStat"), resultEl=$("#penResult"), comboEl=$("#penCombo");
  let comboCount=0, comboTimer=0;

  // 릴 3개
  const reels = [0,1,2].map(()=>({ items:TRICKS.slice(), pos:0, vel:0, stopAt:0, spinning:false, result:0 }));
  let spinning=false;

  function spin(){
    ensureAudio(); playClick(520);
    const p = pool();
    spinning=true;
    reels.forEach((r,i)=>{
      r.items = p.slice();
      r.pos = Math.random()*r.items.length;
      r.vel = 22 + Math.random()*6;              // index/sec
      r.stopAt = performance.now() + 900 + i*450; // 릴이 순차적으로 멈춤
      r.spinning = true;
    });
  }
  $("#penSpin").addEventListener("click", spin);
  window.addEventListener("keydown", e=>{
    if(TB.currentTab!=="pen") return;
    if(e.code==="Space" && !e.ctrlKey && !e.metaKey){ e.preventDefault(); if(!spinning) spin(); }
  });

  function update(dt){
    let anySpinning=false;
    reels.forEach(r=>{
      if(!r.spinning) return;
      anySpinning=true;
      const now=performance.now();
      if(now < r.stopAt){
        r.pos = (r.pos + r.vel*dt) % r.items.length;
        playTickMaybe(r);
      } else {
        // 감속 후 정수 인덱스에 스냅
        r.vel *= Math.max(0, 1 - 3.2*dt);
        r.pos = (r.pos + r.vel*dt) % r.items.length;
        if(r.vel < 0.6){
          r.result = Math.round(r.pos) % r.items.length;
          r.pos = r.result; r.vel=0; r.spinning=false;
          playClick(300);
        }
      }
    });
    if(spinning && !anySpinning){
      spinning=false;
      comboCount++;
      const combo = reels.map(r=> r.items[r.result].n).join("  ➔  ");
      resultEl.textContent = "오늘의 콤보: " + reels.map(r=> r.items[r.result].n.replace(/\s*\(.*\)/,"")).join(" ➔ ");
      showCombo("탕! 콤보 완성 🎉");
      statEl.textContent = "콤보 뽑기: " + comboCount;
    }
    if(comboTimer>0){ comboTimer-=dt; if(comboTimer<=0) comboEl.classList.remove("show"); }
  }
  let tickAcc=0;
  function playTickMaybe(r){ /* 시각적 회전만; 과한 소리 방지 */ }
  function showCombo(t){ comboEl.textContent=t; comboEl.classList.add("show"); comboTimer=1.4; }

  function draw(){
    ctx.clearRect(0,0,dims.w,dims.h);
    const g=ctx.createLinearGradient(0,0,0,dims.h);
    g.addColorStop(0,"#1a1420"); g.addColorStop(1,"#0e1017");
    ctx.fillStyle=g; ctx.fillRect(0,0,dims.w,dims.h);

    const pad=18, gap=12;
    const rw=(dims.w-pad*2-gap*2)/3;
    const ry=64, rh=Math.min(dims.h-ry-24, 300);
    const rowH=rh/3;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    reels.forEach((r,i)=>{
      const rx=pad+i*(rw+gap);
      // 창
      ctx.fillStyle="#0c0e14"; roundRect(rx,ry,rw,rh,12); ctx.fill();
      ctx.save(); roundRect(rx,ry,rw,rh,12); ctx.clip();
      const centerIdx=r.pos;
      for(let k=-1;k<=1;k++){
        const idx=((Math.round(centerIdx)+k)%r.items.length+r.items.length)%r.items.length;
        const frac=centerIdx-Math.round(centerIdx);
        const y=ry+rh/2 + (k-frac)*rowH;
        const name=r.items[idx].n.replace(/\s*\(.*\)/,"");
        const center=Math.abs(k-frac)<0.5;
        ctx.fillStyle = center? "#ffd166" : "rgba(200,205,220,.5)";
        ctx.font = (center? "700 ":"400 ") + Math.max(12,Math.min(18,rw*0.11)) + "px sans-serif";
        wrapText(name, rx+rw/2, y, rw-16, 18);
      }
      ctx.restore();
      // 중앙 하이라이트 라인
      ctx.strokeStyle="rgba(124,140,255,.6)"; ctx.lineWidth=2;
      ctx.strokeRect(rx+2, ry+rh/2-rowH/2, rw-4, rowH);
    });
    ctx.textAlign="left"; ctx.textBaseline="alphabetic";
  }
  function wrapText(text,cx,cy,maxW,lh){
    const words=text.split(" "); let line="", lines=[];
    words.forEach(w=>{ const test=line?line+" "+w:w; if(ctx.measureText(test).width>maxW && line){ lines.push(line); line=w; } else line=test; });
    if(line) lines.push(line);
    const startY=cy-(lines.length-1)*lh/2;
    lines.forEach((l,i)=> ctx.fillText(l, cx, startY+i*lh));
  }
  function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

  let last=performance.now();
  function loop(t){
    const dt=Math.min(0.033,(t-last)/1000); last=t;
    if(TB.currentTab==="pen"){ update(dt); draw(); }
    requestAnimationFrame(loop);
  }
  resize();
  requestAnimationFrame(loop);
})();
