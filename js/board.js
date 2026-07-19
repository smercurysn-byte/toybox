/* =====================================================
   FINGERBOARD
===================================================== */
(function(){
  "use strict";
  const TB = window.TB;
  const { $, clamp, store, saveStore, ensureAudio, playClick, setupCanvas } = TB;

  const canvas = $("#boardCanvas");
  canvas.height = 420;
  canvas.tabIndex = 0;
  const {ctx, dims, resize} = setupCanvas(canvas);
  TB.registerResizer(resize);

  const defaults = { deck:"#7c8cff", grip:"#22c3a6", truck:"#c9ccd6", wheel:"#ff7ca8" };
  const colors = Object.assign({}, defaults, (store.board||{}));

  const inputs = {
    deck: $("#boardDeck"), grip: $("#boardGrip"), truck: $("#boardTruck"), wheel: $("#boardWheel")
  };
  Object.keys(inputs).forEach(k=>{
    inputs[k].value = colors[k];
    inputs[k].addEventListener("input", ()=>{
      colors[k] = inputs[k].value;
      saveStore({board:colors});
    });
  });

  const presets = [
    {deck:"#7c8cff",grip:"#22c3a6",truck:"#c9ccd6",wheel:"#ff7ca8"},
    {deck:"#111318",grip:"#ff5f7e",truck:"#e0a458",wheel:"#f2f2f2"},
    {deck:"#f2f2f2",grip:"#111318",truck:"#111318",wheel:"#ff5f7e"},
    {deck:"#39ffc0",grip:"#0b0f13",truck:"#0b0f13",wheel:"#0b0f13"},
    {deck:"#ffb703",grip:"#023047",truck:"#8ecae6",wheel:"#023047"},
    {deck:"#ff006e",grip:"#8338ec",truck:"#3a0ca3",wheel:"#ffbe0b"},
    {deck:"#06d6a0",grip:"#1b9aaa",truck:"#073b4c",wheel:"#f7f7f7"},
    {deck:"#e63946",grip:"#f1faee",truck:"#1d3557",wheel:"#a8dadc"},
    {deck:"#3a86ff",grip:"#ffbe0b",truck:"#001219",wheel:"#e5e5e5"},
    {deck:"#8ac926",grip:"#1982c4",truck:"#22223b",wheel:"#ffca3a"},
    {deck:"#ffffff",grip:"#111111",truck:"#111111",wheel:"#ff006e"},
    {deck:"#111111",grip:"#39ffc0",truck:"#39ffc0",wheel:"#ffffff"},
    {deck:"#fb5607",grip:"#ffbe0b",truck:"#03071e",wheel:"#ffe8d6"},
    {deck:"#cdb4db",grip:"#ffc8dd",truck:"#22223b",wheel:"#fdf0f4"},
    {deck:"#9d4edd",grip:"#c77dff",truck:"#240046",wheel:"#e0aaff"},
  ];
  const presetWrap = $("#boardPresets");
  presets.forEach(p=>{
    const el = document.createElement("div");
    el.className = "swatch";
    el.style.background = `linear-gradient(135deg, ${p.deck} 50%, ${p.wheel} 50%)`;
    el.title = "프리셋 적용";
    el.addEventListener("click", ()=>{
      Object.assign(colors, p);
      Object.keys(inputs).forEach(k=> inputs[k].value = colors[k]);
      saveStore({board:colors});
    });
    presetWrap.appendChild(el);
  });

  $("#boardReset").addEventListener("click", ()=>{
    Object.assign(colors, defaults);
    Object.keys(inputs).forEach(k=> inputs[k].value = colors[k]);
    saveStore({board:colors});
  });

  const bd = {
    mode:"ground",              // ground | air | manual | grind
    y:0, vy:0, rot:0, rotVel:0, airborne:false, trickCount:0,
    effect:null, shuvRate:0, trickName:"", trickTimer:0, trail:[],
    modeTimer:0, modeDur:0,
    manualNose:false, manualTilt:0,
    grindKind:null, slideX:0,
  };
  const statEl = $("#boardStat");
  const comboEl = $("#boardCombo");
  let comboTimer = 0;

  function showCombo(text){
    comboEl.textContent = text;
    comboEl.classList.add("show");
    comboTimer = 1.2;
  }

  const GRAVITY = 2200;
  // 상한 없이 캔버스 실제 높이에 항상 비례해서 점프 정점을 정한다 (화면이 커지면 더 높이, 작아지면 그만큼 낮게)
  function maxJumpHeight(){ return Math.max(50, dims.h - 140); }
  function jumpVelFor(heightPx){ return Math.sqrt(2 * GRAVITY * Math.max(20, heightPx)); }

  function ollie(){
    if(bd.mode !== "ground") return;
    ensureAudio(); playClick(700);
    bd.mode = "air"; bd.airborne = true;
    bd.vy = jumpVelFor(maxJumpHeight()); bd.rot = 0; bd.rotVel = 0;
    bd.effect = null; bd.shuvRate = 0; bd.trickName = ""; bd.trickTimer = 0; bd.trail = [];
  }
  canvas.addEventListener("pointerdown", ()=>{ canvas.focus(); ollie(); });

  const BOARD_TRICKS = {
    // 공중 플립 / 회전 기술
    Digit1: { name:"킥플립",        kind:"air", flipRotVel:16,  jumpFactor:1.0 },
    Digit2: { name:"힐플립",        kind:"air", flipRotVel:-16, jumpFactor:1.0 },
    Digit3: { name:"샤빗",          kind:"air", shuvRate:10,    jumpFactor:0.85 },
    Digit4: { name:"FS 알리 (180)", kind:"air", shuvRate:6,     jumpFactor:0.95 },
    Digit5: { name:"배리얼 킥플립",  kind:"air", flipRotVel:16,  shuvRate:10, jumpFactor:1.05 },
    Digit6: { name:"하드플립",       kind:"air", flipRotVel:20,  shuvRate:8,  jumpFactor:1.15 },
    Digit7: { name:"레이저 플립",    kind:"air", flipRotVel:-18, shuvRate:12, jumpFactor:1.2 },
    Digit8: { name:"임파서블",       kind:"air", flipRotVel:30,  trail:true,  jumpFactor:1.15 },
    // 균형 (매뉴얼)
    Digit9: { name:"매뉴얼",         kind:"manual", nose:false },
    Digit0: { name:"노즈매뉴얼",     kind:"manual", nose:true },
    // 그라인드 / 슬라이드 (레일 활용)
    KeyQ:   { name:"노즈슬라이드",    kind:"grind", variant:"slide-nose" },
    KeyW:   { name:"테일슬라이드",    kind:"grind", variant:"slide-tail" },
    KeyE:   { name:"스미스 그라인드", kind:"grind", variant:"smith" },
    KeyR:   { name:"크루키드 그라인드", kind:"grind", variant:"crooked" },
  };

  function startAir(t){
    bd.mode = "air"; bd.airborne = true;
    bd.vy = jumpVelFor(maxJumpHeight() * (t.jumpFactor||1));
    bd.rot = 0; bd.rotVel = t.flipRotVel || 0;
    bd.shuvRate = t.shuvRate || 0;
    bd.effect = t.trail ? "trail" : null;
    bd.trickName = t.name; bd.trickTimer = 0; bd.trail = [];
  }
  function startManual(t){
    bd.mode = "manual"; bd.airborne = false;
    bd.manualNose = !!t.nose; bd.manualTilt = 0;
    bd.modeTimer = 0; bd.modeDur = 2.4; bd.trickName = t.name;
  }
  function startGrind(t){
    bd.mode = "grind"; bd.airborne = false;
    bd.grindKind = t.variant; bd.slideX = -1;
    bd.modeTimer = 0; bd.modeDur = 2.2; bd.trickName = t.name;
  }
  function doTrick(code){
    const t = BOARD_TRICKS[code];
    if(!t || bd.mode !== "ground") return;
    ensureAudio(); playClick(760);
    if(t.kind === "manual") startManual(t);
    else if(t.kind === "grind") startGrind(t);
    else startAir(t);
  }

  window.addEventListener("keydown", e=>{
    if(TB.currentTab !== "board") return;
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    if(e.code === "Space"){ e.preventDefault(); ollie(); }
    else if(e.code === "ArrowLeft"){ e.preventDefault(); if(bd.mode === "air") bd.rotVel -= 5.5; }
    else if(e.code === "ArrowRight"){ e.preventDefault(); if(bd.mode === "air") bd.rotVel += 5.5; }
    else if(BOARD_TRICKS[e.code]){ e.preventDefault(); doTrick(e.code); }
  });

  function landCombo(){
    if(bd.trickName){ showCombo(bd.trickName + "!"); return; }
    const spins = Math.abs(bd.rot) / (Math.PI*2);
    if(spins >= 1.75) showCombo("더블 킥플립! 🔥");
    else if(spins >= 0.75) showCombo("킥플립!");
    else showCombo("올리!");
  }

  function update(dt){
    if(bd.mode === "air"){
      bd.trickTimer += dt;
      bd.vy -= GRAVITY*dt;
      bd.y += bd.vy*dt;
      bd.rot += bd.rotVel*dt;
      if(bd.effect === "trail"){
        bd.trail.push({y:bd.y, rot:bd.rot, a:1});
        if(bd.trail.length > 18) bd.trail.shift();
        bd.trail.forEach(p=> p.a -= 2.6*dt);
        bd.trail = bd.trail.filter(p=> p.a > 0);
      }
      if(bd.y <= 0){
        bd.y = 0; bd.vy = 0; bd.airborne = false; bd.mode = "ground";
        bd.trickCount++;
        landCombo();
        bd.rot = 0; bd.rotVel = 0; bd.effect = null; bd.shuvRate = 0;
        bd.trickName = ""; bd.trail = [];
      }
    } else if(bd.mode === "manual"){
      bd.modeTimer += dt;
      const d = bd.modeDur, ramp = 0.4;
      let k;
      if(bd.modeTimer < ramp) k = bd.modeTimer/ramp;
      else if(bd.modeTimer > d-ramp) k = Math.max(0, (d-bd.modeTimer)/ramp);
      else k = 1;
      bd.manualTilt = 0.34 * k;
      if(bd.modeTimer >= d){
        bd.trickCount++; showCombo(bd.trickName + "!");
        bd.mode = "ground"; bd.manualTilt = 0; bd.trickName = "";
      }
    } else if(bd.mode === "grind"){
      bd.modeTimer += dt;
      bd.slideX = -1 + 2*(bd.modeTimer/bd.modeDur);
      if(bd.modeTimer >= bd.modeDur){
        bd.trickCount++; showCombo(bd.trickName + "!");
        bd.mode = "ground"; bd.trickName = ""; bd.slideX = 0;
      }
    }
    if(comboTimer > 0){
      comboTimer -= dt;
      if(comboTimer <= 0) comboEl.classList.remove("show");
    }
    statEl.textContent = "트릭 성공: " + bd.trickCount;
  }

  // 보드 본체(바퀴+트럭+데크+그립)를 원점(데크 윗면 중앙) 기준으로 그린다
  function paintDeck(deckW, deckH){
    const wheelR = deckH*0.55;
    ctx.fillStyle = colors.wheel;
    [-deckW*0.32, deckW*0.32].forEach(dx=>{
      ctx.beginPath(); ctx.arc(dx, deckH*0.9, wheelR, 0, Math.PI*2); ctx.fill();
    });
    ctx.fillStyle = colors.truck;
    [-deckW*0.32, deckW*0.32].forEach(dx=>{
      ctx.fillRect(dx-deckW*0.09, deckH*0.35, deckW*0.18, deckH*0.4);
    });
    const r = deckH*0.5;
    ctx.beginPath();
    ctx.moveTo(-deckW/2+r, 0);
    ctx.arcTo(deckW/2, 0, deckW/2, deckH, r);
    ctx.arcTo(deckW/2, deckH, -deckW/2, deckH, r);
    ctx.arcTo(-deckW/2, deckH, -deckW/2, 0, r);
    ctx.arcTo(-deckW/2, 0, deckW/2, 0, r);
    ctx.closePath();
    ctx.fillStyle = colors.deck;
    ctx.fill();
    ctx.fillStyle = colors.grip;
    ctx.fillRect(-deckW/2+8, deckH*0.28, deckW-16, deckH*0.14);
  }

  function draw(){
    ctx.clearRect(0,0,dims.w,dims.h);
    const grad = ctx.createLinearGradient(0,0,0,dims.h);
    grad.addColorStop(0,"#181c26"); grad.addColorStop(1,"#0e1017");
    ctx.fillStyle = grad; ctx.fillRect(0,0,dims.w,dims.h);

    const groundY = dims.h - 60;
    ctx.fillStyle = "#2a3040";
    ctx.fillRect(0, groundY, dims.w, 4);
    ctx.fillStyle = "#12151d";
    ctx.fillRect(0, groundY+4, dims.w, dims.h-groundY-4);

    const cx = dims.w/2;
    const deckW = clamp(dims.w*0.34, 160, 240);
    const deckH = deckW*0.16;
    const cy = groundY - 22 - bd.y;

    // 임파서블 잔상 효과
    if(bd.trail.length){
      bd.trail.forEach(p=>{
        ctx.save();
        ctx.globalAlpha = clamp(p.a, 0, 1) * 0.35;
        ctx.translate(cx, groundY - 22 - p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.ellipse(0, deckH*0.5, deckW*0.5, deckH*0.7, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }

    if(bd.mode === "grind"){
      // 레일과 그 위를 미끄러지는 보드
      const railY = groundY - deckH*2.4;
      ctx.fillStyle = "#454d63";
      ctx.fillRect(0, railY, dims.w, 6);
      ctx.fillStyle = "#252b39";
      [0.18, 0.5, 0.82].forEach(fx=> ctx.fillRect(dims.w*fx-3, railY+6, 6, groundY-railY-6));

      const bx = cx + bd.slideX * (dims.w*0.30);
      let poseRot = 0;
      if(bd.grindKind === "slide-nose") poseRot = -0.16;
      else if(bd.grindKind === "slide-tail") poseRot = 0.16;
      else if(bd.grindKind === "smith") poseRot = 0.30;     // 앞트럭을 아래로 내림
      else if(bd.grindKind === "crooked") poseRot = -0.28;  // 앞트럭만 삐딱하게 걸침

      ctx.save();
      ctx.translate(bx, railY - deckH*0.9);
      ctx.rotate(poseRot);
      paintDeck(deckW, deckH);
      ctx.restore();

      // 마찰 스파크
      ctx.fillStyle = "rgba(255,209,102,.9)";
      for(let i=0;i<3;i++){
        ctx.beginPath();
        ctx.arc(bx - deckW*0.18 - Math.random()*18, railY + Math.random()*4, 1.2+Math.random()*1.6, 0, Math.PI*2);
        ctx.fill();
      }
    } else if(bd.mode === "manual"){
      // 앞/뒤 바퀴를 축으로 기울여 균형 잡기
      const pivotDx = bd.manualNose ? deckW*0.32 : -deckW*0.32;
      const angle = bd.manualTilt * (bd.manualNose ? 1 : -1);
      ctx.save();
      ctx.translate(cx + pivotDx, (groundY-22) + deckH*0.9);
      ctx.rotate(angle);
      ctx.translate(-pivotDx, -deckH*0.9);
      paintDeck(deckW, deckH);
      ctx.restore();
    } else {
      // 지면 / 공중 (플립·샤빗·회전)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(bd.rot);
      if(bd.shuvRate && bd.mode === "air"){
        ctx.scale(Math.cos(bd.trickTimer*bd.shuvRate), 1);
      }
      paintDeck(deckW, deckH);
      ctx.restore();
    }
  }

  // 보드가 점프/트릭으로 움직이는 동안, 그 세로 위치를 화면 중앙 밴드 안에 유지하도록
  // 페이지 스크롤을 부드럽게 따라가게 한다. (사용자가 직접 스크롤하지 않아도 항상 보드가 보임)
  function followBoard(){
    const rect = canvas.getBoundingClientRect();
    const groundY = dims.h - 60;
    const dW = clamp(dims.w*0.34, 160, 240), dH = dW*0.16;
    // 보드의 현재 세로 위치(캔버스 상단 기준 CSS px)
    const localY = (bd.mode === "grind") ? (groundY - dH*2.4) : (groundY - 22 - bd.y);
    const viewportY = rect.top + localY;               // 화면(뷰포트) 기준 세로 위치
    const hi = window.innerHeight * 0.30;              // 이 밴드(30%~70%)를 벗어나면 따라간다
    const lo = window.innerHeight * 0.70;
    let diff = 0;
    if(viewportY < hi) diff = viewportY - hi;
    else if(viewportY > lo) diff = viewportY - lo;
    if(Math.abs(diff) > 1) window.scrollBy(0, diff * 0.5);   // 부드럽게 추적
  }

  let last = performance.now();
  function loop(t){
    const dt = Math.min(0.033, (t-last)/1000); last = t;
    if(TB.currentTab === "board"){ update(dt); draw(); followBoard(); }
    requestAnimationFrame(loop);
  }
  resize();
  requestAnimationFrame(loop);
})();
