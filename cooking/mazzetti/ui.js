const $ = s => document.querySelector(s);
const state = {
  lang: localStorage.getItem("mz-lang") || ((navigator.language||"it").toLowerCase().startsWith("sv")?"sv":(navigator.language||"").toLowerCase().startsWith("en")?"en":"it"),
  season: "ALL", kind: "", favOnly: false, q: "",
  timeB: "", ease: 0, cost: 0, byTime: false,
  fav: new Set(JSON.parse(localStorage.getItem("mz-fav")||"[]")),
  shop: JSON.parse(localStorage.getItem("mz-shop")||"[]"),
  notes: JSON.parse(localStorage.getItem("mz-notes")||"{}"),
  openId: null
};
const X18 = {
  en:{quick:"≤45 min",mid:"45–90 min",slow:"90+ min",easy:"Easy",easeMid:"Medium",hard:"Involved",timeH:"Time",easeH:"Effort",costH:"Price",sortTime:"Shortest first"},
  it:{quick:"≤45 min",mid:"45–90 min",slow:"90+ min",easy:"Facile",easeMid:"Media",hard:"Impegnativa",timeH:"Tempo",easeH:"Sforzo",costH:"Costo",sortTime:"Più veloci"},
  sv:{quick:"≤45 min",mid:"45–90 min",slow:"90+ min",easy:"Lätt",easeMid:"Medel",hard:"Mer jobb",timeH:"Tid",easeH:"Möda",costH:"Pris",sortTime:"Kortast först"}
};
function X(){ return X18[state.lang] || X18.it; }
function timeBucket(r){ return r.time<=45?"quick":r.time<=90?"mid":"slow"; }
function easeOf(r){
  const blob = ((r.p&&(r.p.it||r.p.en))||"")+" "+((r.i&&(r.i.it||r.i.en))||"");
  const long = /brasato|bollito|lievito|marin|riposo|simmer|hours|ore /i.test(blob);
  if(r.time<=30 && !long) return 1;
  if(r.time>=120 || long) return 3;
  return 2;
}
function costOf(r){
  const s = ((r.i&&(r.i.it||r.i.en))||"").toLowerCase();
  if(/tartufo|barolo|castelmagno|saffron|zafferano|aragosta|osso buco|filetto|marsala/.test(s)) return 3;
  if(/parmigiano|formaggio|olio extra|burro|panna|pinoli|mandorl|nocciol|gorgonzola|fontina|prosciutto|vitello/.test(s)) return 2;
  return 1;
}
function moneyOf(n){ return (state.lang==="en"?"$":"€").repeat(n); }
function easeWord(n){ const x=X(); return n===1?x.easy:n===2?x.easeMid:x.hard; }
function tagsOf(r){
  const e=easeOf(r), c=costOf(r);
  return [timeBucket(r), e===1?"easy facile lätt":e===2?"medium media":"involved impegnativa", c===1?"cheap economico € $":c===2?"€€ $$":"€€€ $$$"].join(" ");
}
const SEASONS = ["INVERNO","PRIMAVERA","ESTATE","AUTUNNO"];
const KINDS = ["antipasto","primo","secondo","dolce","conserve"];
const BANNERS = {
  INVERNO: (typeof IMAGES!=="undefined" && IMAGES.winter) || "",
  PRIMAVERA: (typeof IMAGES!=="undefined" && IMAGES.spring) || "",
  ESTATE: (typeof IMAGES!=="undefined" && IMAGES.summer) || "",
  AUTUNNO: (typeof IMAGES!=="undefined" && IMAGES.autumn) || ""
};
function persist(){
  localStorage.setItem("mz-lang", state.lang);
  localStorage.setItem("mz-fav", JSON.stringify([...state.fav]));
  localStorage.setItem("mz-shop", JSON.stringify(state.shop));
  localStorage.setItem("mz-notes", JSON.stringify(state.notes));
}
function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.add("on"); setTimeout(()=>el.classList.remove("on"),1600); }
function L(){ return I18N[state.lang]; }
function filtered(){
  const q = state.q.trim().toLowerCase();
  let list = RECIPES.filter(r=>{
    if(state.season!=="ALL" && r.s!==state.season) return false;
    if(state.kind && r.k!==state.kind) return false;
    if(state.favOnly && !state.fav.has(r.id)) return false;
    if(state.timeB && timeBucket(r)!==state.timeB) return false;
    if(state.ease && easeOf(r)!==state.ease) return false;
    if(state.cost && costOf(r)!==state.cost) return false;
    if(!q) return true;
    return [r.t.it,r.t.en,r.t.sv,r.i.it,r.p.it,r.m,String(r.time),tagsOf(r)].join(" ").toLowerCase().includes(q);
  });
  if(state.byTime) list = list.slice().sort((a,b)=>a.time-b.time);
  return list;
}
function renderSide(){
  const i = L(); const x = X(); const tog = on => on ? "on" : "";
  $("#side").innerHTML =
    `<button class="navb ${state.season==="ALL"&&!state.favOnly?"on":""}" data-s="ALL">${i.all}</button>` +
    SEASONS.map(s=>`<button class="navb ${state.season===s?"on":""}" data-s="${s}">${i[s]}</button>`).join("") +
    `<h3></h3>` +
    KINDS.map(k=>`<button class="navb ${state.kind===k?"on":""}" data-k="${k}">${i[k]}</button>`).join("") +
    `<h3>${x.timeH}</h3>` +
    [["quick",x.quick],["mid",x.mid],["slow",x.slow]].map(([k,lab])=>`<button class="navb ${tog(state.timeB===k)}" data-t="${k}">${lab}</button>`).join("") +
    `<h3>${x.easeH}</h3>` +
    [[1,x.easy],[2,x.easeMid],[3,x.hard]].map(([k,lab])=>`<button class="navb ${tog(state.ease===k)}" data-e="${k}">${lab}</button>`).join("") +
    `<h3>${x.costH}</h3>` +
    [1,2,3].map(n=>`<button class="navb ${tog(state.cost===n)}" data-c="${n}">${moneyOf(n)}</button>`).join("") +
    `<button class="navb ${tog(state.byTime)}" data-sort="time">${x.sortTime}</button>`;
  $("#side").querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{state.season=b.dataset.s;state.favOnly=false;render();});
  $("#side").querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{state.kind=state.kind===b.dataset.k?"":b.dataset.k;render();});
  $("#side").querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{state.timeB=state.timeB===b.dataset.t?"":b.dataset.t;render();});
  $("#side").querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>{const n=+b.dataset.e;state.ease=state.ease===n?0:n;render();});
  $("#side").querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{const n=+b.dataset.c;state.cost=state.cost===n?0:n;render();});
  $("#side").querySelectorAll("[data-sort]").forEach(b=>b.onclick=()=>{state.byTime=!state.byTime;render();});
}
function renderGrid(){
  const i = L(); const list = filtered();
  const ban = BANNERS[state.season]; if(ban) $("#hero").style.backgroundImage = `url("${ban}")`;
  $("#heroTitle").textContent = state.favOnly ? i.fav : (state.season==="ALL"? i.all : i[state.season]);
  $("#count").textContent = list.length + " " + i.results;
  if(!list.length){ $("#grid").innerHTML = `<p class="empty">${state.favOnly?i.emptyFav:i.noResults}</p>`; return; }
  $("#grid").innerHTML = list.map(r=>`
    <article class="card" data-id="${r.id}">
      <div class="mo">${i[r.m]} · ${i[r.k]}</div>
      <h4>${r.t.it}</h4>
      <p>${r.t[state.lang]}</p>
      <div class="meta"><span>⏱ ${r.time} min · ${easeWord(easeOf(r))} · ${moneyOf(costOf(r))}</span>
        <button class="heart ${state.fav.has(r.id)?"on":""}" data-heart="${r.id}">${state.fav.has(r.id)?"♥":"♡"}</button>
      </div>
    </article>`).join("");
  $("#grid").querySelectorAll(".card").forEach(c=>c.onclick=e=>{
    if(e.target.dataset.heart){ toggleFav(e.target.dataset.heart); e.stopPropagation(); return; }
    openRecipe(c.dataset.id);
  });
}
function toggleFav(id){
  if(state.fav.has(id)) state.fav.delete(id); else state.fav.add(id);
  persist(); renderGrid(); if(state.openId===id) openRecipe(id);
}
function openRecipe(id){
  const r = RECIPES.find(x=>x.id===id); if(!r) return;
  state.openId = id; const i = L(); const onList = state.shop.some(s=>s.id===id);
  $("#panel").innerHTML = `
    <header><div>
      <div class="mo" style="font-family:Outfit,sans-serif;letter-spacing:.16em;color:var(--wine);font-size:11px">${i[r.s]} · ${i[r.m]} · ⏱ ${r.time} min · ${easeWord(easeOf(r))} · ${moneyOf(costOf(r))}</div>
      <h2>${r.t.it}</h2><em>${r.t[state.lang]}</em>
    </div><button class="chip" id="xClose">${i.close}</button></header>
    <div class="acts">
      <button class="chip on" id="xCook">${i.cook}</button>
      <button class="chip ${state.fav.has(id)?"on":""}" id="xFav">${state.fav.has(id)?"♥":"♡"} ${i.fav}</button>
      <button class="chip" id="xShop">${onList?i.added:i.addShop}</button>
      <button class="chip" id="xPrint">${i.print}</button>
    </div>
    <div class="label">${i.ing}</div><div class="it">${r.i.it}</div>
    ${state.lang==="it"?"":`<div class="tr">${r.i[state.lang]}</div>`}
    <div class="label">${i.prep}</div><div class="it">${r.p.it}</div>
    ${state.lang==="it"?"":`<div class="tr">${r.p[state.lang]}</div>`}
    <div class="label">${i.notes}</div>
    <textarea id="note" placeholder="${i.notePh}">${state.notes[id]||""}</textarea>
    <p class="empty">${i.save}</p>`;
  $("#overlay").classList.add("on");
  $("#xClose").onclick = closePanel;
  $("#xFav").onclick = ()=>toggleFav(id);
  $("#xShop").onclick = ()=>addShop(r);
  $("#xCook").onclick = ()=>cookMode(r);
  $("#xPrint").onclick = ()=>window.print();
  $("#note").oninput = e=>{ state.notes[id]=e.target.value; persist(); };
  history.replaceState(null,"","#/"+id);
}
function closePanel(){ $("#overlay").classList.remove("on"); state.openId=null; history.replaceState(null,"","#/book"); }
function addShop(r){
  if(!state.shop.some(s=>s.id===r.id)){
    state.shop.push({id:r.id,title:r.t.it,items:r.i[state.lang]||r.i.it,done:false});
    persist(); toast(L().added);
  }
  renderShopBadge(); if(state.openId===r.id) openRecipe(r.id);
}
function renderShopBadge(){ $("#shopN").hidden = state.shop.length===0; $("#shopN").textContent = state.shop.length; }
function openShop(){
  const i = L();
  $("#drawer").innerHTML = `<header style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-family:Outfit,sans-serif;margin:0">${i.shopTitle}</h2><button class="chip" id="dClose">${i.close}</button></header>${state.shop.length? state.shop.map((s,n)=>`<label class="shop-item"><input type="checkbox" ${s.done?"checked":""} data-i="${n}"><div><strong>${s.title}</strong><div class="tr">${s.items}</div></div></label>`).join("") : `<p class="empty">${i.emptyShop}</p>`}${state.shop.length? `<button class="chip" id="dClear" style="margin-top:16px">${i.clearShop}</button>`:""}`;
  $("#drawer").classList.add("on");
  $("#dClose").onclick=()=>$("#drawer").classList.remove("on");
  const clr=$("#dClear"); if(clr) clr.onclick=()=>{state.shop=[];persist();renderShopBadge();openShop();};
  $("#drawer").querySelectorAll("input").forEach(inp=>inp.onchange=()=>{state.shop[+inp.dataset.i].done=inp.checked;persist();});
}
function stepsOf(r){ return (r.p[state.lang]||r.p.it).split(/(?<=[.;])\s+/).map(s=>s.trim()).filter(Boolean); }
function fmt(s){ return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0"); }
function cookMode(r){
  const i = L(); const steps = stepsOf(r); let n=0, left=r.time*60, tick=null;
  const paint=()=>{
    $("#cook").innerHTML = `<nav><button class="chip" id="cClose">${i.close}</button><div>${r.t[state.lang]} · ${n+1}/${steps.length}</div><div class="timer" id="tm">${fmt(left)}</div></nav><div class="step">${steps[n]}</div><nav><button class="chip" id="cPrev">${i.prev}</button><button class="chip" id="cTog">${i.timer}</button><button class="chip on" id="cNext">${n===steps.length-1?i.done:i.next}</button></nav>`;
    $("#cClose").onclick=()=>{clearInterval(tick);$("#cook").classList.remove("on");};
    $("#cPrev").onclick=()=>{n=Math.max(0,n-1);paint();};
    $("#cNext").onclick=()=>{if(n<steps.length-1){n++;paint();}else{clearInterval(tick);$("#cook").classList.remove("on");}};
    $("#cTog").onclick=()=>{ if(tick){clearInterval(tick);tick=null;} else tick=setInterval(()=>{left=Math.max(0,left-1);const el=$("#tm");if(el)el.textContent=fmt(left);},1000); };
  };
  $("#cook").classList.add("on"); paint();
}
function openAbout(){
  const i = L();
  $("#panel").innerHTML = `<header><h2>${i.about}</h2><button class="chip" id="xClose">${i.close}</button></header><p class="it">${i.aboutBody}</p><p class="label">${i.addr}</p><p>${i.illu}</p><div class="dedica" style="margin-top:24px"><div class="label">${i.dedicaTitle}</div>${i.d.map(line=>`<p>${line}</p>`).join("")}</div>`;
  $("#overlay").classList.add("on"); $("#xClose").onclick=closePanel;
}
function applyLang(){
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-lang]").forEach(b=>b.setAttribute("aria-pressed", b.dataset.lang===state.lang));
  const i=L(); $("#openBtn").textContent=i.open; $("#q").placeholder=i.search; $("#btnFav").textContent=i.fav; $("#btnAbout").textContent=i.about;
}
function render(){ applyLang(); renderSide(); renderGrid(); renderShopBadge(); }
function enterBook(){
  $("#cover").style.display="none"; $("#app").classList.add("on"); render();
  const hash=location.hash.replace("#/","");
  if(hash && RECIPES.some(r=>r.id===hash)) openRecipe(hash);
}
$("#openBtn").onclick=()=>{location.hash="#/book";enterBook();};
document.querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>{state.lang=b.dataset.lang;persist();render();if(state.openId)openRecipe(state.openId);});
$("#q").oninput=e=>{state.q=e.target.value;renderGrid();};
$("#btnFav").onclick=()=>{state.favOnly=!state.favOnly;state.season="ALL";render();};
$("#btnShop").onclick=openShop;
$("#btnAbout").onclick=openAbout;
$("#overlay").addEventListener("click",e=>{if(e.target.id==="overlay")closePanel();});
document.addEventListener("keydown",e=>{ if(e.key==="Escape"){closePanel();$("#drawer").classList.remove("on");$("#cook").classList.remove("on");} });
if(location.hash && location.hash!=="#") enterBook();
else enterBook();
