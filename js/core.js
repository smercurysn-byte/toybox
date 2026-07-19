/* =====================================================
   CORE — 공유 유틸 / 저장소 / 오디오 / 캔버스 / 탭
   window.TB 네임스페이스로 각 장난감 모듈에 제공한다.
   (일반 <script>로 로드되므로 file:// 더블클릭에서도 동작)
===================================================== */
(function(){
  "use strict";

  /* ---------------- DOM helpers ---------------- */
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

  /* ---------------- localStorage ---------------- */
  const STORAGE_KEY = "toybox-config-v1";
  function loadStore(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch(e){ return {}; }
  }
  function saveStore(patch){
    const cur = loadStore();
    Object.assign(cur, patch);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
  }
  const store = loadStore();

  /* ---------------- resize 관리 ---------------- */
  const resizers = [];
  function resizeAll(){ resizers.forEach(fn=>fn()); }
  window.addEventListener("resize", resizeAll);
  window.addEventListener("load", resizeAll);

  /* ---------------- tabs ---------------- */
  let currentTab = "yoyo";
  $$("nav.tabs button").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      $$("nav.tabs button").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      $$(".stage").forEach(s=>s.classList.remove("active"));
      currentTab = btn.dataset.tab;
      $("#stage-"+currentTab).classList.add("active");
      requestAnimationFrame(resizeAll);
    });
  });

  /* ---------------- audio (shared click) ---------------- */
  let actx = null;
  function ensureAudio(){
    if(!actx){
      const AC = window.AudioContext || window.webkitAudioContext;
      actx = new AC();
    }
    if(actx.state === "suspended") actx.resume();
    return actx;   // 커스텀 사운드(피젯 등)에서 공유 컨텍스트를 직접 쓰도록 반환
  }
  function playClick(freq){
    if(!$("#soundToggle").checked) return;
    ensureAudio();
    const t = actx.currentTime;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = "square";
    o.frequency.value = freq || (1100 + Math.random()*260);
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t+0.07);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t+0.08);
  }

  /* ---------------- canvas helper ---------------- */
  function setupCanvas(canvas){
    const ctx = canvas.getContext("2d");
    const dims = {w:0,h:0};
    function resize(){
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      dims.w = Math.max(200, rect.width);
      dims.h = Math.max(240, canvas.clientHeight || rect.height);
      canvas.width = dims.w * dpr;
      canvas.height = dims.h * dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    return {ctx, dims, resize};
  }

  /* ---------------- 공유 네임스페이스 ---------------- */
  window.TB = {
    $, $$, clamp, store, saveStore,
    ensureAudio, playClick, setupCanvas,
    registerResizer(fn){ resizers.push(fn); },
    get currentTab(){ return currentTab; },   // 항상 최신 탭 값을 읽도록 getter로 제공
  };
})();
