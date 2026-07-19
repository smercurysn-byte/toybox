/* =====================================================
   FOUNTAIN PEN INK — 잉크 차트 & 오늘의 필사 문장
===================================================== */
(function(){
  "use strict";
  const TB = window.TB;
  const { $, store, saveStore, playClick, setupCanvas } = TB;

  const canvas = $("#inkCanvas");
  canvas.height = 420;
  const {ctx, dims, resize} = setupCanvas(canvas);
  TB.registerResizer(resize);

  let inks = (store.ink && store.ink.list) || [];
  const brandIn=$("#inkBrand"), nameIn=$("#inkName"), colorIn=$("#inkColor");
  const listEl=$("#inkList"), countEl=$("#inkCount"), statEl=$("#inkStat");

  function persist(){ saveStore({ink:{list:inks}}); }
  function esc(s){ return String(s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m])); }
  function render(){
    countEl.textContent=inks.length; statEl.textContent="잉크 "+inks.length+"색";
    listEl.innerHTML="";
    if(!inks.length){ const e=document.createElement("p"); e.className="small"; e.textContent="아직 등록한 잉크가 없어요."; listEl.appendChild(e); return; }
    inks.forEach((k,i)=>{
      const row=document.createElement("div"); row.className="ink";
      row.innerHTML=`<span class="drop" style="background:${k.color}"></span>`+
        `<span class="nm">${esc(k.name)}</span><span class="meta">${esc(k.brand)}</span><span class="del" title="삭제">✕</span>`;
      row.querySelector(".del").addEventListener("click",()=>{ inks.splice(i,1); persist(); render(); });
      listEl.appendChild(row);
    });
  }
  $("#inkAdd").addEventListener("click",()=>{
    const name=(nameIn.value||"").trim(); if(!name){ nameIn.focus(); return; }
    inks.push({ brand:(brandIn.value||"").trim()||"기타", name, color:colorIn.value, t:performance.now() });
    persist(); render(); playClick(700);
    nameIn.value=""; nameIn.focus();
  });

  /* 필사 문장 */
  const QUOTES=[
    ["인생은 가까이서 보면 비극이지만, 멀리서 보면 희극이다.","찰리 채플린"],
    ["가장 어두운 밤도 끝나고 해는 떠오른다.","빅토르 위고"],
    ["펜은 칼보다 강하다.","에드워드 불워리턴"],
    ["책이 없는 방은 영혼이 없는 육체와 같다.","키케로"],
    ["천 리 길도 한 걸음부터 시작된다.","노자"],
    ["오늘 할 수 있는 일에 전력을 다하라.","아이작 뉴턴"],
    ["글쓰기란 마음의 목소리를 종이에 옮기는 일이다.","볼테르"],
    ["느리더라도 꾸준한 자가 경주에서 이긴다.","이솝"],
    ["한 줄의 글이 하루를 바꾼다.","작자 미상"],
  ];
  let quote=null; // [text, author]
  $("#inkQuote").addEventListener("click",()=>{ quote=QUOTES[Math.floor(Math.random()*QUOTES.length)]; playClick(560); });
  canvas.addEventListener("pointerdown",()=>{ if(quote) quote=null; });

  function drop(x,y,r,color){
    ctx.beginPath();
    ctx.moveTo(x,y-r);
    ctx.bezierCurveTo(x+r*1.05,y-r*0.2, x+r*0.8,y+r*0.9, x,y+r);
    ctx.bezierCurveTo(x-r*0.8,y+r*0.9, x-r*1.05,y-r*0.2, x,y-r);
    ctx.closePath();
    const g=ctx.createRadialGradient(x-r*0.3,y-r*0.3,r*0.1,x,y,r*1.1);
    g.addColorStop(0, lighten(color,40)); g.addColorStop(1, color);
    ctx.fillStyle=g; ctx.fill();
    ctx.fillStyle="rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(x-r*0.3,y-r*0.25,r*0.2,r*0.12,-0.5,0,7); ctx.fill();
  }
  function lighten(hex,amt){ const n=parseInt(hex.slice(1),16); let r=(n>>16)+amt,g=((n>>8)&255)+amt,b=(n&255)+amt; r=Math.min(255,r);g=Math.min(255,g);b=Math.min(255,b); return `rgb(${r},${g},${b})`; }

  function wrap(text,cx,y,maxW,lh,font,color){
    ctx.font=font; ctx.fillStyle=color; ctx.textAlign="center";
    const chars=[...text]; let line="", lines=[];
    chars.forEach(ch=>{ const test=line+ch; if(ctx.measureText(test).width>maxW && line){ lines.push(line); line=ch; } else line=test; });
    if(line) lines.push(line);
    lines.forEach((l,i)=> ctx.fillText(l, cx, y+i*lh));
    return lines.length*lh;
  }

  function draw(){
    ctx.clearRect(0,0,dims.w,dims.h);
    const g=ctx.createLinearGradient(0,0,0,dims.h); g.addColorStop(0,"#181a22"); g.addColorStop(1,"#0e1017");
    ctx.fillStyle=g; ctx.fillRect(0,0,dims.w,dims.h);

    if(!inks.length){
      ctx.fillStyle="#6b7590"; ctx.font="15px sans-serif"; ctx.textAlign="center";
      ctx.fillText("오른쪽에서 잉크를 등록하면 방울로 나타나요", dims.w/2, dims.h*0.35); ctx.textAlign="left";
    } else {
      const cols=Math.max(1,Math.min(inks.length, Math.floor(dims.w/120)));
      const rows=Math.ceil(inks.length/cols);
      const cw=dims.w/cols, chh=Math.min(140,(dims.h-30)/rows);
      const r=Math.min(cw,chh)*0.28;
      inks.forEach((k,i)=>{
        const cx=(i%cols+0.5)*cw, cy=(Math.floor(i/cols)+0.5)*chh+10;
        const age=(performance.now()-(k.t||0))/300; const pop=age<1? 0.5+age*0.5 : 1;
        drop(cx,cy,r*pop,k.color);
        ctx.fillStyle="#c7cede"; ctx.font="600 12px sans-serif"; ctx.textAlign="center";
        ctx.fillText(k.name.length>8?k.name.slice(0,8)+"…":k.name, cx, cy+r+16);
        ctx.fillStyle="#8892a8"; ctx.font="10px sans-serif";
        ctx.fillText(k.brand.length>10?k.brand.slice(0,10)+"…":k.brand, cx, cy+r+30);
      });
      ctx.textAlign="left";
    }

    // 필사 문장 오버레이
    if(quote){
      ctx.fillStyle="rgba(10,12,18,.82)"; ctx.fillRect(0,0,dims.w,dims.h);
      const maxW=dims.w*0.8;
      const h=wrap("“"+quote[0]+"”", dims.w/2, dims.h*0.4, maxW, 34,
        "italic 600 "+Math.max(18,Math.min(26,dims.w*0.03))+"px Georgia, serif", "#f3efe6");
      ctx.font="15px sans-serif"; ctx.fillStyle="#ffd166"; ctx.textAlign="center";
      ctx.fillText("— "+quote[1], dims.w/2, dims.h*0.4 + h + 14);
      ctx.fillStyle="#6b7590"; ctx.font="12px sans-serif";
      ctx.fillText("(화면을 클릭하면 닫혀요. 만년필로 따라 적어보세요 ✒️)", dims.w/2, dims.h-24);
      ctx.textAlign="left";
    }
  }

  function loop(){ if(TB.currentTab==="ink"){ draw(); } requestAnimationFrame(loop); }
  render(); resize(); requestAnimationFrame(loop);
})();
