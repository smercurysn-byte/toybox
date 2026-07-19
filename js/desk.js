/* =====================================================
   DESKTERIOR — 책상 꾸미기 & 광합성 타이머
===================================================== */
(function(){
  "use strict";
  const TB = window.TB;
  const { $, clamp, store, saveStore, ensureAudio, playClick, setupCanvas } = TB;

  const canvas = $("#deskCanvas");
  canvas.height = 420;
  const {ctx, dims, resize} = setupCanvas(canvas);
  TB.registerResizer(resize);

  const PALETTE=[
    {type:"lamp",  ic:"💡", label:"모니터등"},
    {type:"plant", ic:"🪴", label:"반려식물"},
    {type:"book",  ic:"📚", label:"책"},
    {type:"figure",ic:"🧸", label:"피규어"},
    {type:"cactus",ic:"🌵", label:"미니어처"},
    {type:"cup",   ic:"☕", label:"커피"},
  ];
  const EMO={lamp:"💡",plant:"🪴",book:"📚",figure:"🧸",cactus:"🌵",cup:"☕",sprout:"🌱"};

  let saved = (store.desk) || {};
  let objs = saved.objs || [];         // {type,x,y}  (x,y = 0..1 비율)
  let plant = saved.plant || {growth:0, water:100};
  let lightOn = false;

  function persist(){ saveStore({desk:{objs, plant}}); }

  // 팔레트 버튼
  const palWrap=$("#deskPalette");
  PALETTE.forEach(p=>{
    const b=document.createElement("button"); b.className="pill";
    b.innerHTML=`<span class="ic">${p.ic}</span>${p.label}`;
    b.addEventListener("click",()=>{
      if(p.type==="plant" && objs.some(o=>o.type==="plant")){ flash("반려식물은 하나만!"); return; }
      objs.push({type:p.type, x:0.3+Math.random()*0.4, y:0.55+Math.random()*0.25});
      persist(); playClick(700);
    });
    palWrap.appendChild(b);
  });

  const infoEl=$("#deskInfo"), statEl=$("#deskStat"), comboEl=$("#deskCombo");
  let comboTimer=0; function flash(t){ comboEl.textContent=t; comboEl.classList.add("show"); comboTimer=1.4; }

  const lightBtn=$("#deskLight"), waterBtn=$("#deskWater");
  lightBtn.addEventListener("click",()=>{ lightOn=!lightOn; lightBtn.textContent = lightOn? "💡 식물등 끄기":"💡 식물등 켜기"; playClick(760); });
  waterBtn.addEventListener("click",()=>{ plant.water=100; persist(); playClick(520); flash("💧 물을 줬어요!"); });
  $("#deskReset").addEventListener("click",()=>{ objs=[]; plant={growth:0,water:100}; lightOn=false; lightBtn.textContent="💡 식물등 켜기"; persist(); });

  // 드래그
  let drag=null;
  function pick(mx,my){
    for(let i=objs.length-1;i>=0;i--){ const o=objs[i]; const px=o.x*dims.w, py=o.y*dims.h; if(Math.hypot(mx-px,my-py)<34) return i; }
    return -1;
  }
  canvas.addEventListener("pointerdown",e=>{
    const r=canvas.getBoundingClientRect(); const mx=e.clientX-r.left, my=e.clientY-r.top;
    const i=pick(mx,my); if(i>=0){ drag=i; canvas.setPointerCapture(e.pointerId); }
  });
  canvas.addEventListener("pointermove",e=>{
    if(drag==null) return; const r=canvas.getBoundingClientRect();
    objs[drag].x=clamp((e.clientX-r.left)/dims.w,0.05,0.95);
    objs[drag].y=clamp((e.clientY-r.top)/dims.h,0.2,0.95);
  });
  function drop(){ if(drag!=null){ drag=null; persist(); } }
  canvas.addEventListener("pointerup",drop);
  canvas.addEventListener("pointercancel",drop);

  function update(dt){
    if(lightOn){
      const pl=objs.find(o=>o.type==="plant");
      if(pl && plant.water>0){ plant.growth=clamp(plant.growth+dt*3.5,0,100); }
      if(pl) plant.water=clamp(plant.water - dt*1.5,0,100);
    } else {
      // 불 꺼져 있어도 물은 천천히 마름
      if(objs.some(o=>o.type==="plant")) plant.water=clamp(plant.water - dt*0.4,0,100);
    }
    statEl.textContent = "🌱 성장 "+Math.round(plant.growth)+"%  ·  💧 "+Math.round(plant.water)+"%";
    infoEl.textContent = lightOn ? (plant.water<=0? "물이 말랐어요! 물을 주세요 💧" : "광합성 중… 식물이 자라고 있어요 🌿")
                                 : "식물등을 켜면 식물이 자라요.";
    if(comboTimer>0){ comboTimer-=dt; if(comboTimer<=0) comboEl.classList.remove("show"); }
  }

  function draw(){
    ctx.clearRect(0,0,dims.w,dims.h);
    // 벽 + 책상
    const wall=ctx.createLinearGradient(0,0,0,dims.h);
    wall.addColorStop(0,"#20242f"); wall.addColorStop(1,"#181c26");
    ctx.fillStyle=wall; ctx.fillRect(0,0,dims.w,dims.h);
    const deskY=dims.h*0.72;
    ctx.fillStyle="#3a2e26"; ctx.fillRect(0,deskY,dims.w,dims.h-deskY);
    ctx.fillStyle="#4a3a2e"; ctx.fillRect(0,deskY,dims.w,6);
    // 선반
    ctx.fillStyle="#2a2019"; ctx.fillRect(dims.w*0.08,dims.h*0.4,dims.w*0.84,7);

    // 식물등 불빛
    if(lightOn){
      const lamp=objs.find(o=>o.type==="lamp");
      const lx=(lamp?lamp.x:0.5)*dims.w, ly=(lamp?lamp.y:0.4)*dims.h;
      const gr=ctx.createRadialGradient(lx,ly,10,lx,ly,dims.h*0.5);
      gr.addColorStop(0,"rgba(255,225,140,.30)"); gr.addColorStop(1,"rgba(255,225,140,0)");
      ctx.fillStyle=gr; ctx.fillRect(0,0,dims.w,dims.h);
    }

    // 오브젝트
    ctx.textAlign="center"; ctx.textBaseline="middle";
    objs.forEach(o=>{
      const x=o.x*dims.w, y=o.y*dims.h;
      let size=42, emo=EMO[o.type];
      if(o.type==="plant"){
        size=30+plant.growth*0.5;                       // 성장할수록 커짐
        emo = plant.growth<25? EMO.sprout : EMO.plant;
        if(plant.water<25 && Math.floor(performance.now()/400)%2===0){  // 목마르면 반짝
          ctx.globalAlpha=0.5;
        }
      }
      ctx.font = size+"px serif";
      ctx.fillText(emo, x, y);
      ctx.globalAlpha=1;
    });
    ctx.textAlign="left"; ctx.textBaseline="alphabetic";

    if(!objs.length){
      ctx.fillStyle="#6b7590"; ctx.font="15px sans-serif"; ctx.textAlign="center";
      ctx.fillText("오른쪽 팔레트에서 소품을 추가해 나만의 책상을 꾸며보세요", dims.w/2, dims.h*0.3);
      ctx.textAlign="left";
    }
  }

  let last=performance.now();
  function loop(t){ const dt=Math.min(0.05,(t-last)/1000); last=t; if(TB.currentTab==="desk"){ update(dt); draw(); } requestAnimationFrame(loop); }
  resize(); requestAnimationFrame(loop);
})();
