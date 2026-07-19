/* =====================================================
   KEYCAP
===================================================== */
(function(){
  "use strict";
  const TB = window.TB;
  const { $, store, saveStore, playClick } = TB;

  const ROWS = [
    [["Backquote","`",1],["Digit1","1",1],["Digit2","2",1],["Digit3","3",1],["Digit4","4",1],
     ["Digit5","5",1],["Digit6","6",1],["Digit7","7",1],["Digit8","8",1],["Digit9","9",1],
     ["Digit0","0",1],["Minus","-",1],["Equal","=",1],["Backspace","⌫",2]],
    [["Tab","Tab",1.5],["KeyQ","Q",1],["KeyW","W",1],["KeyE","E",1],["KeyR","R",1],["KeyT","T",1],
     ["KeyY","Y",1],["KeyU","U",1],["KeyI","I",1],["KeyO","O",1],["KeyP","P",1],
     ["BracketLeft","[",1],["BracketRight","]",1],["Backslash","\\",1.5]],
    [["CapsLock","Caps",1.75],["KeyA","A",1],["KeyS","S",1],["KeyD","D",1],["KeyF","F",1],["KeyG","G",1],
     ["KeyH","H",1],["KeyJ","J",1],["KeyK","K",1],["KeyL","L",1],["Semicolon",";",1],["Quote","'",1],
     ["Enter","Enter",2.25]],
    [["ShiftLeft","Shift",2.25],["KeyZ","Z",1],["KeyX","X",1],["KeyC","C",1],["KeyV","V",1],["KeyB","B",1],
     ["KeyN","N",1],["KeyM","M",1],["Comma",",",1],["Period",".",1],["Slash","/",1],["ShiftRight","Shift",2.75]],
    [["ControlLeft","Ctrl",1.25],["MetaLeft","Win",1.25],["AltLeft","Alt",1.25],["Space","",6.25],
     ["AltRight","Alt",1.25],["ControlRight","Ctrl",1.25]],
  ];
  const MOD_CODES = new Set(["Tab","CapsLock","Enter","ShiftLeft","ShiftRight","Backspace",
    "ControlLeft","ControlRight","AltLeft","AltRight","MetaLeft"]);
  const ACCENT_CODES = new Set(["Enter","Space","Backspace"]);

  function defaultColorFor(code){
    if(ACCENT_CODES.has(code)) return {bg:"#8fa4ff", fg:"#12142a"};
    if(MOD_CODES.has(code)) return {bg:"#e4e8f7", fg:"#20233a"};
    return {bg:"#f7f8fd", fg:"#20233a"};
  }

  const savedColors = (store.keycap && store.keycap.colors) || {};
  const colors = {};
  ROWS.forEach(row => row.forEach(([code])=>{
    colors[code] = Object.assign(defaultColorFor(code), savedColors[code] || {});
  }));

  const root = $("#kbRoot");
  const keyEls = {};
  ROWS.forEach(row=>{
    const rEl = document.createElement("div");
    rEl.className = "krow";
    row.forEach(([code,label,w])=>{
      const k = document.createElement("div");
      k.className = "key";
      k.style.flex = "0 0 calc(var(--u) * " + w + " + " + ((w-1)*6) + "px)";
      k.dataset.code = code;
      k.textContent = label;
      applyKeyColor(k, code);
      k.addEventListener("pointerdown", ()=> selectKey(code));
      rEl.appendChild(k);
      keyEls[code] = k;
    });
    root.appendChild(rEl);
  });

  function applyKeyColor(el, code){
    const c = colors[code];
    el.style.background = c.bg;
    el.style.color = c.fg;
  }

  function persist(){ saveStore({keycap:{colors}}); }

  let selected = null;
  const selLabel = $("#keySelLabel");
  const bgInput = $("#keyBg"), fgInput = $("#keyFg");

  function selectKey(code){
    if(selected) keyEls[selected].classList.remove("selected");
    selected = code;
    keyEls[code].classList.add("selected");
    selLabel.textContent = "선택된 키: " + (keyEls[code].textContent || code);
    bgInput.disabled = false; fgInput.disabled = false;
    bgInput.value = colors[code].bg;
    fgInput.value = colors[code].fg;
  }
  bgInput.addEventListener("input", ()=>{
    if(!selected) return;
    colors[selected].bg = bgInput.value;
    applyKeyColor(keyEls[selected], selected);
    persist();
  });
  fgInput.addEventListener("input", ()=>{
    if(!selected) return;
    colors[selected].fg = fgInput.value;
    applyKeyColor(keyEls[selected], selected);
    persist();
  });

  const THEMES = {
    pastel: {alpha:["#fff0f6","#5c4b3a"], mod:["#ffe1ee","#5c4b3a"], accent:["#d6ffd2","#2f5c34"]},
    cherry: {alpha:["#fff4e9","#7a3b12"], mod:["#ffe3c2","#7a3b12"], accent:["#ff9f45","#2e1500"]},
    mint:   {alpha:["#e6fff6","#0a5c40"], mod:["#c6ffe9","#0a5c40"], accent:["#39ffc0","#04331f"]},
    mono:   {alpha:["#ffffff","#222"],   mod:["#eceff5","#222"],   accent:["#c9ccd9","#222"]},
    candy:  {alpha:["#fff1f5","#8a2c52"], mod:["#ffd1e3","#8a2c52"], accent:["#ff6fa5","#ffffff"]},
    sky:    {alpha:["#eaf6ff","#0a3d62"], mod:["#d2ecff","#0a3d62"], accent:["#4cc9f0","#062b3f"]},
    lemon:  {alpha:["#fffbe6","#6b5900"], mod:["#fff3b0","#6b5900"], accent:["#ffd60a","#3d2f00"]},
    lilac:  {alpha:["#f5f0ff","#4b2e83"], mod:["#e6d9ff","#4b2e83"], accent:["#b388eb","#2d1a4d"]},
    peach:  {alpha:["#fff1e6","#7a3b12"], mod:["#ffddc2","#7a3b12"], accent:["#ff9f45","#3a1c00"]},
    seafoam:{alpha:["#eafff6","#0a5c40"], mod:["#c9ffe9","#0a5c40"], accent:["#4ee1a0","#04331f"]},
    rose:   {alpha:["#fff0f3","#7a1030"], mod:["#ffd6df","#7a1030"], accent:["#ff5d8f","#3a0016"]},
    sunny:  {alpha:["#fffaf0","#7a4b00"], mod:["#ffe9b8","#7a4b00"], accent:["#ffb703","#3a2400"]},
    arctic: {alpha:["#f2fbff","#083344"], mod:["#dbf3ff","#083344"], accent:["#7dd3fc","#062b3f"]},
    grape:  {alpha:["#f6f0ff","#3b0764"], mod:["#e5d4ff","#3b0764"], accent:["#a78bfa","#2e1065"]},
    silver: {alpha:["#fdfdfd","#333333"], mod:["#e9e9ef","#333333"], accent:["#a0a4b8","#111111"]},
  };
  function applyTheme(name){
    const t = THEMES[name];
    ROWS.forEach(row => row.forEach(([code])=>{
      const kind = ACCENT_CODES.has(code) ? "accent" : (MOD_CODES.has(code) ? "mod" : "alpha");
      const [bg,fg] = t[kind];
      colors[code] = {bg, fg};
      applyKeyColor(keyEls[code], code);
    }));
    persist();
  }
  const presetWrap = $("#keycapPresets");
  Object.keys(THEMES).forEach(name=>{
    const t = THEMES[name];
    const el = document.createElement("div");
    el.className = "swatch";
    el.style.background = `linear-gradient(135deg, ${t.alpha[0]} 50%, ${t.accent[0]} 50%)`;
    el.title = name;
    el.addEventListener("click", ()=> applyTheme(name));
    presetWrap.appendChild(el);
  });

  $("#keycapReset").addEventListener("click", ()=>{
    ROWS.forEach(row => row.forEach(([code])=>{
      colors[code] = defaultColorFor(code);
      applyKeyColor(keyEls[code], code);
    }));
    persist();
  });

  window.addEventListener("keydown", e=>{
    if(TB.currentTab !== "keycap") return;
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    const el = keyEls[e.code];
    if(!el) return;
    e.preventDefault();
    if(!el.classList.contains("pressed")){
      el.classList.add("pressed");
      playClick();
    }
  });
  window.addEventListener("keyup", e=>{
    const el = keyEls[e.code];
    if(el) el.classList.remove("pressed");
  });
})();
