/* =====================================================
   YOYO
===================================================== */
(function(){
  "use strict";
  const TB = window.TB;
  const { $, clamp, store, saveStore, ensureAudio, playClick, setupCanvas } = TB;

  const canvas = $("#yoyoCanvas");
  canvas.height = 420;
  const {ctx, dims, resize} = setupCanvas(canvas);
  TB.registerResizer(resize);

  const defaults = { body:"#ff5f7e", accent:"#ffd166", axle:"#2b2d42", string:"#e8e8f0" };
  const colors = Object.assign({}, defaults, (store.yoyo||{}));

  const inputs = {
    body: $("#yoyoBody"), accent: $("#yoyoAccent"), axle: $("#yoyoAxle"), string: $("#yoyoString")
  };
  Object.keys(inputs).forEach(k=>{
    inputs[k].value = colors[k];
    inputs[k].addEventListener("input", ()=>{
      colors[k] = inputs[k].value;
      saveStore({yoyo:colors});
    });
  });

  const presets = [
    {body:"#ff5f7e",accent:"#ffd166",axle:"#2b2d42",string:"#e8e8f0"},
    {body:"#4cc9f0",accent:"#f72585",axle:"#14213d",string:"#eaeaea"},
    {body:"#2b2d42",accent:"#8d99ae",axle:"#edf2f4",string:"#c9c9c9"},
    {body:"#7bd389",accent:"#f9c74f",axle:"#274c39",string:"#f1f1f1"},
    {body:"#b388eb",accent:"#ffe066",axle:"#3a2e5c",string:"#eee"},
    {body:"#ff9f1c",accent:"#2ec4b6",axle:"#011627",string:"#f0f0f0"},
    {body:"#e63946",accent:"#f1faee",axle:"#1d3557",string:"#a8dadc"},
    {body:"#06d6a0",accent:"#ffd166",axle:"#073b4c",string:"#f7f7f7"},
    {body:"#ffafcc",accent:"#a2d2ff",axle:"#1d3557",string:"#ffffff"},
    {body:"#3a86ff",accent:"#ffbe0b",axle:"#07070a",string:"#e5e5e5"},
    {body:"#ff006e",accent:"#8338ec",axle:"#3a0ca3",string:"#ffffff"},
    {body:"#fb5607",accent:"#ffbe0b",axle:"#03071e",string:"#ffe8d6"},
    {body:"#8ac926",accent:"#ffca3a",axle:"#1982c4",string:"#f5f5f5"},
    {body:"#111111",accent:"#ffffff",axle:"#ff0000",string:"#cccccc"},
    {body:"#cdb4db",accent:"#ffc8dd",axle:"#22223b",string:"#fdf0f4"},
  ];
  const presetWrap = $("#yoyoPresets");
  presets.forEach(p=>{
    const el = document.createElement("div");
    el.className = "swatch";
    el.style.background = `linear-gradient(135deg, ${p.body} 50%, ${p.accent} 50%)`;
    el.title = "프리셋 적용";
    el.addEventListener("click", ()=>{
      Object.assign(colors, p);
      Object.keys(inputs).forEach(k=> inputs[k].value = colors[k]);
      saveStore({yoyo:colors});
    });
    presetWrap.appendChild(el);
  });

  $("#yoyoReset").addEventListener("click", ()=>{
    Object.assign(colors, defaults);
    Object.keys(inputs).forEach(k=> inputs[k].value = colors[k]);
    saveStore({yoyo:colors});
  });

  const yy = {
    state:"idle", y:0, vy:0, riseVel:0,
    spin:0, spinVel:0,
    sleepTime:0, bestSleep:0,
    swayT:0, xOff:0,
    trickType:null, trickName:"", trickTimer:0, trickDur:0, pendingTrick:null,
    trickCount:0,
  };
  const statEl = $("#yoyoStat");
  const comboEl = $("#yoyoCombo");
  let comboTimer = 0;
  function showCombo(text){
    comboEl.textContent = text;
    comboEl.classList.add("show");
    comboTimer = 1.2;
  }

  function pointerDown(){
    ensureAudio();
    if(yy.state === "idle"){
      yy.state = "down"; yy.vy = 0; yy.spinVel = Math.max(yy.spinVel, 2);
    }
  }
  function pointerUp(){
    if(yy.state === "down" || yy.state === "sleep"){
      if(yy.state === "sleep" && yy.sleepTime > yy.bestSleep) yy.bestSleep = yy.sleepTime;
      yy.state = "up"; yy.riseVel = 0;
    }
  }
  canvas.addEventListener("pointerdown", e=>{ canvas.setPointerCapture(e.pointerId); pointerDown(); });
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);
  canvas.addEventListener("pointerleave", ()=>{ if(yy.state==="down") pointerUp(); });

  const YOYO_TRICKS = {
    Digit1: { name:"브레인 트위스터", type:"twister", dur:2.2 },
    Digit2: { name:"락 더 베이비",   type:"baby",    dur:2.6 },
    Digit3: { name:"워크 더 독", type:"dog", dur:2.4 },
    Digit4: { name:"강제 리턴", type:"return", dur:0.9 },
    Digit5: { name:"롱 슬리퍼", type:"sleeper", dur:4.5 },
    Digit6: { name:"트라피즈", type:"trapeze", dur:2.6 },
    Digit7: { name:"오버 언더 마운트", type:"mount", dur:2.6 },
    Digit8: { name:"디엔에이 (DNA)", type:"dna", dur:3.2 },
  };
  function startTrick(t){
    ensureAudio(); playClick(520);
    yy.state = "trick"; yy.trickType = t.type; yy.trickName = t.name;
    yy.trickTimer = 0; yy.trickDur = t.dur; yy.xOff = 0;
    showCombo(t.name + "!");
  }
  function triggerTrick(code){
    const t = YOYO_TRICKS[code];
    if(!t) return;
    if(yy.state === "up") return; // 돌아오는 중에는 새 기술을 받지 않음
    if(yy.state === "idle"){
      ensureAudio();
      yy.state = "down"; yy.vy = 0; yy.spinVel = Math.max(yy.spinVel, 2);
      yy.pendingTrick = t;
    } else if(yy.state === "down"){
      yy.pendingTrick = t;
    } else {
      yy.pendingTrick = null;
      startTrick(t);
    }
  }
  window.addEventListener("keydown", e=>{
    if(TB.currentTab !== "yoyo") return;
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    if(YOYO_TRICKS[e.code]){ e.preventDefault(); triggerTrick(e.code); }
  });

  function yoyoRadius(){ return clamp(dims.w*0.09, 34, 58); }

  function update(dt){
    const r = yoyoRadius();
    const maxY = Math.max(40, dims.h - 16 - 34 - r - 10);
    switch(yy.state){
      case "down": {
        yy.vy += 2600*dt;
        yy.y += yy.vy*dt;
        yy.spinVel = Math.min(yy.spinVel + 42*dt, 34);
        yy.spin += yy.spinVel*dt;
        if(yy.y >= maxY){
          yy.y = maxY; yy.vy = 0;
          if(yy.pendingTrick){
            const t = yy.pendingTrick; yy.pendingTrick = null;
            yy.sleepTime = 0;
            startTrick(t);
          } else {
            yy.state = "sleep"; yy.sleepTime = 0;
          }
        }
        break;
      }
      case "sleep": {
        yy.sleepTime += dt;
        yy.spinVel = Math.max(yy.spinVel - 0.7*dt, 5);
        yy.spin += yy.spinVel*dt;
        yy.y = maxY + Math.sin(yy.sleepTime*6)*3;
        if(yy.sleepTime > 8){
          if(yy.sleepTime > yy.bestSleep) yy.bestSleep = yy.sleepTime;
          yy.state = "up"; yy.riseVel = 0;
        }
        break;
      }
      case "trick": {
        yy.trickTimer += dt;
        yy.sleepTime += dt;
        yy.spinVel = Math.max(yy.spinVel - 0.35*dt, 8);
        yy.spin += yy.spinVel*dt;
        if(yy.trickType === "twister"){
          yy.xOff = Math.sin(yy.trickTimer*11)*38;
          yy.y = maxY + Math.sin(yy.trickTimer*11)*2;
        } else if(yy.trickType === "baby"){
          yy.xOff = Math.sin(yy.trickTimer*2.1)*74;
          yy.y = maxY - Math.abs(Math.sin(yy.trickTimer*2.1))*16;
        } else if(yy.trickType === "dog"){
          yy.xOff = Math.sin((yy.trickTimer/yy.trickDur)*Math.PI*3)*90;
          yy.y = maxY + Math.abs(Math.sin(yy.trickTimer*8))*3;
        } else if(yy.trickType === "return"){
          // 아래에서 손으로 빠르게 튕겨 올라오는 리턴 (ease-out)
          const p = yy.trickTimer / yy.trickDur;
          yy.xOff = 0;
          yy.y = maxY * (1 - p) * (1 - p);
        } else if(yy.trickType === "sleeper"){
          // 바닥에서 거의 안 움직이고 길게 공회전, 회전 오래 유지
          yy.xOff = 0;
          yy.y = maxY + Math.sin(yy.trickTimer*6)*2;
          yy.spinVel = Math.max(yy.spinVel, 14);
        } else if(yy.trickType === "trapeze"){
          // 늘어진 줄 위에 옆으로 얹혀 걸침
          yy.xOff = -70 + Math.sin(yy.trickTimer*2)*10;
          yy.y = maxY - 46;
        } else if(yy.trickType === "mount"){
          // 교차된 줄 안에 걸어 넣기 (좌우로 살짝 흔들림)
          yy.xOff = Math.sin(yy.trickTimer*3)*24;
          yy.y = maxY - 34;
        } else if(yy.trickType === "dna"){
          // 손가락 위 팽이처럼 나선 회전
          yy.xOff = Math.sin(yy.trickTimer*5)*54;
          yy.y = maxY - 30 + Math.sin(yy.trickTimer*10)*12;
        }
        if(yy.trickTimer >= yy.trickDur){
          if(yy.sleepTime > yy.bestSleep) yy.bestSleep = yy.sleepTime;
          yy.trickCount++;
          yy.xOff = 0;
          yy.state = "up"; yy.riseVel = 0;
        }
        break;
      }
      case "up": {
        yy.riseVel += 3400*dt;
        yy.y -= yy.riseVel*dt;
        yy.spin += yy.spinVel*dt;
        yy.spinVel *= Math.max(0, 1 - 2.4*dt);
        yy.xOff *= Math.max(0, 1 - 6*dt);
        if(yy.y <= 0){
          yy.y = 0; yy.xOff = 0; yy.state = "idle"; yy.spinVel *= 0.4;
        }
        break;
      }
      case "idle": {
        yy.swayT += dt;
        yy.y = Math.sin(yy.swayT*1.4)*3;
        yy.spinVel = Math.max(0, yy.spinVel - 3*dt);
        yy.spin += yy.spinVel*dt;
        break;
      }
    }
    if(comboTimer > 0){
      comboTimer -= dt;
      if(comboTimer <= 0) comboEl.classList.remove("show");
    }
    statEl.textContent = "최고 슬립: " + yy.bestSleep.toFixed(1) + "s · 기술 성공: " + yy.trickCount +
      (yy.state==="sleep" ? "  (진행 중 " + yy.sleepTime.toFixed(1) + "s)" : "") +
      (yy.state==="trick" ? "  (" + yy.trickName + ")" : "");
  }

  function drawYoyoBody(cx, cy, r, spin){
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spin);
    // outer rim
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
    ctx.fillStyle = colors.body; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.stroke();
    // spin spokes (accent)
    ctx.strokeStyle = colors.accent; ctx.lineWidth = Math.max(3, r*0.09);
    for(let i=0;i<6;i++){
      const a = (Math.PI*2/6)*i;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*r*0.25, Math.sin(a)*r*0.25);
      ctx.lineTo(Math.cos(a)*r*0.86, Math.sin(a)*r*0.86);
      ctx.stroke();
    }
    // inner cap
    ctx.beginPath(); ctx.arc(0,0,r*0.42,0,Math.PI*2);
    ctx.fillStyle = colors.body; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.stroke();
    // axle
    ctx.beginPath(); ctx.arc(0,0,r*0.12,0,Math.PI*2);
    ctx.fillStyle = colors.axle; ctx.fill();
    ctx.restore();
  }

  function draw(){
    ctx.clearRect(0,0,dims.w,dims.h);
    // backdrop
    const grad = ctx.createLinearGradient(0,0,0,dims.h);
    grad.addColorStop(0,"#161a24"); grad.addColorStop(1,"#0e1017");
    ctx.fillStyle = grad; ctx.fillRect(0,0,dims.w,dims.h);

    const anchorX = dims.w/2, anchorY = 16;
    const r = yoyoRadius();
    const baseHang = 34;
    const cy = anchorY + baseHang + yy.y;
    const cx = clamp(anchorX + (yy.xOff||0), r+4, dims.w-r-4);

    // hand anchor
    ctx.beginPath(); ctx.arc(anchorX, anchorY, 6, 0, Math.PI*2);
    ctx.fillStyle = "#555b73"; ctx.fill();

    // string (기술에 따라 줄 모양을 다르게 그림)
    ctx.strokeStyle = colors.string;
    ctx.lineWidth = 2;
    if(yy.state === "trick" && yy.trickType === "trapeze"){
      // 손에서 늘어진 줄이 아래로 처지고 그 위에 요요가 얹힘
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      ctx.quadraticCurveTo(cx, cy + r*0.9, anchorX + 64, anchorY);
      ctx.stroke();
      // 반대쪽 손가락 지점
      ctx.beginPath(); ctx.arc(anchorX + 64, anchorY, 5, 0, Math.PI*2);
      ctx.fillStyle = "#555b73"; ctx.fill();
    } else if(yy.state === "trick" && yy.trickType === "mount"){
      // 교차된 V자 줄
      ctx.beginPath();
      ctx.moveTo(anchorX - 22, anchorY);
      ctx.lineTo(cx, cy - r*0.15);
      ctx.lineTo(anchorX + 22, anchorY);
      ctx.stroke();
    } else if(yy.state === "trick" && yy.trickType === "dna"){
      // 손가락 위에서 감긴 나선 줄
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      ctx.quadraticCurveTo(cx - 48, cy - 46, cx, cy - r*0.15);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      ctx.lineTo(cx, cy - r*0.15);
      ctx.stroke();
    }

    drawYoyoBody(cx, cy, r, yy.spin);
  }

  let last = performance.now();
  function loop(t){
    const dt = Math.min(0.033, (t-last)/1000); last = t;
    if(TB.currentTab === "yoyo"){ update(dt); draw(); }
    requestAnimationFrame(loop);
  }
  resize();
  requestAnimationFrame(loop);
})();
