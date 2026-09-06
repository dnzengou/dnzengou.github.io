const $ = s => document.querySelector(s);
function storeGet(k, fallback){
  try { const v = localStorage.getItem(k); return v == null ? fallback : v; } catch (e) { return fallback; }
}
function storeSet(k, v){ try { localStorage.setItem(k, v); } catch (e) {}
}
function storeJSON(k, fallback){
  try { return JSON.parse(storeGet(k, JSON.stringify(fallback))); } catch (e) { return fallback; }
}
const navLang = (typeof navigator !== "undefined" && navigator.language || "en").toLowerCase();
const state = {
  lang: storeGet("wo-lang", "") || (navLang.startsWith("sv") ? "sv" : navLang.startsWith("it") ? "it" : "en"),
  season: "ALL", kind: "", favOnly: false, q: "",
  timeB: "", ease: 0, cost: 0, byTime: false,
  fav: new Set(storeJSON("wo-fav", [])),
  shop: storeJSON("wo-shop", []),
  notes: storeJSON("wo-notes", {}),
  openId: null
};
const X18 = {
  en:{quick:"≤45 min",mid:"45–90 min",slow:"90+ min",easy:"Easy",easeMid:"Medium",hard:"Involved",timeH:"Time",easeH:"Effort",costH:"Price",sortTime:"Shortest first"},
  it:{quick:"≤45 min",mid:"45–90 min",slow:"90+ min",easy:"Facile",easeMid:"Media",hard:"Impegnativa",timeH:"Tempo",easeH:"Sforzo",costH:"Costo",sortTime:"Più veloci"},
  sv:{quick:"≤45 min",mid:"45–90 min",slow:"90+ min",easy:"Lätt",easeMid:"Medel",hard:"Mer jobb",timeH:"Tid",easeH:"Möda",costH:"Pris",sortTime:"Kortast först"}
};
function X(){ return X18[state.lang] || X18.en; }
function timeBucket(r){ return r.time<=45?"quick":r.time<=90?"mid":"slow"; }
function easeOf(r){
  const blob = ((r.p&&(r.p.en||r.p.it))||"")+" "+((r.i&&(r.i.en||r.i.it))||"");
  const yeast = /yeast|lievito|jäst|prove|ferment|rise 1/i.test(blob);
  if(r.time<=35 && !yeast) return 1;
  if(r.time>=120 || (yeast && r.time>=90)) return 3;
  return 2;
}
function costOf(r){
  const s = ((r.i&&(r.i.en||r.i.it))||"").toLowerCase();
  if(/saffron|zafferano|matcha|pine nut|pinoli|pistachio|pecorino|canastra|taleggio|castelmagno|tartufo|truffle|barolo/.test(s)) return 3;
  if(/cheese|formaggio|parmigiano|olive oil|olio|yogurt|honey|miele|sesame|almond|mandorl|walnut|noci|tahini|coconut|cocco|molasses|za.?atar|labneh|butter|burro/.test(s)) return 2;
  return 1;
}
function moneyOf(n){ return (state.lang==="en"?"$":"€").repeat(n); }
function easeWord(n){ const x=X(); return n===1?x.easy:n===2?x.easeMid:x.hard; }
function tagsOf(r){
  const e=easeOf(r), c=costOf(r);
  return [timeBucket(r), e===1?"easy facile lätt cheap":e===2?"medium media medel":"involved impegnativa", c===1?"cheap economico billig € $":c===2?"€€ $$":"€€€ $$$ costly"].join(" ");
}
const SEASONS = ["EUROPE","MED","LEVANT","ASIA","AMERICAS","AFRICA"];
const KINDS = ["bread","flatbread","cake","cookie","steamed"];
function persist(){
  storeSet("wo-lang", state.lang);
  storeSet("wo-fav", JSON.stringify([...state.fav]));
  storeSet("wo-shop", JSON.stringify(state.shop));
  storeSet("wo-notes", JSON.stringify(state.notes));
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
    return [r.t.en,r.t.it,r.t.sv,r.i.en,r.p.en,r.c.en,r.k,String(r.time),tagsOf(r)].join(" ").toLowerCase().includes(q);
  });
  if(state.byTime) list = list.slice().sort((a,b)=>a.time-b.time);
  return list;
}
function renderSide(){
  const i = L(); const x = X();
  const tog = (on) => on ? "on" : "";
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
  const i = L();
  const list = filtered();
  const hero = $("#hero");
  hero.className = "hero r-" + (state.season==="ALL"?"WORLD":state.season);
  $("#heroTitle").textContent = state.favOnly ? i.fav : (state.season==="ALL"? i.all : i[state.season]);
  $("#count").textContent = list.length + " " + i.results;
  if(!list.length){ $("#grid").innerHTML = `<p class="empty">${state.favOnly?i.emptyFav:i.noResults}</p>`; return; }
  $("#grid").innerHTML = list.map(r=>`
    <article class="card" data-id="${r.id}">
      <div class="mo">${r.c[state.lang]} · ${i[r.k]}</div>
      <h4>${r.t[state.lang]}</h4>
      <p>${r.t.en===r.t[state.lang] ? r.w[state.lang] : r.t.en}</p>
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
  persist(); renderGrid();
  if(state.openId===id) openRecipe(id);
}
function openRecipe(id){
  const r = RECIPES.find(x=>x.id===id); if(!r) return;
  state.openId = id;
  const i = L();
  const onList = state.shop.some(s=>s.id===id);
  $("#panel").innerHTML = `
    <header>
      <div>
        <div class="mo">${r.c[state.lang]} · ${i[r.k]} · ${i[r.s]} · ⏱ ${r.time} min · ${easeWord(easeOf(r))} · ${moneyOf(costOf(r))}</div>
        <h2>${r.t[state.lang]}</h2>
        ${state.lang==="en"?"":`<em>${r.t.en}</em>`}
      </div>
      <button class="chip" id="xClose">${i.close}</button>
    </header>
    <div class="acts">
      <button class="chip on" id="xCook">${i.cook}</button>
      <button class="chip ${state.fav.has(id)?"on":""}" id="xFav">${state.fav.has(id)?"♥":"♡"} ${i.fav}</button>
      <button class="chip" id="xShop">${onList?i.added:i.addShop}</button>
      <button class="chip" id="xPrint">${i.print}</button>
    </div>
    <div class="label">${i.why}</div><div class="it">${r.w[state.lang]}</div>
    <div class="label">${i.ing}</div><div class="it">${r.i[state.lang]}</div>
    ${state.lang==="en"?"":`<div class="tr">${r.i.en}</div>`}
    <div class="label">${i.prep}</div><div class="it">${r.p[state.lang]}</div>
    ${state.lang==="en"?"":`<div class="tr">${r.p.en}</div>`}
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
    state.shop.push({id:r.id,title:r.t[state.lang],items:r.i[state.lang],done:false});
    persist(); toast(L().added);
  }
  renderShopBadge();
  if(state.openId===r.id) openRecipe(r.id);
}
function renderShopBadge(){
  $("#shopN").hidden = state.shop.length===0;
  $("#shopN").textContent = state.shop.length;
}
function openShop(){
  const i = L();
  $("#drawer").innerHTML = `
    <header style="display:flex;justify-content:space-between;align-items:center">
      <h2 style="font-family:Nunito Sans,sans-serif;margin:0">${i.shopTitle}</h2>
      <button class="chip" id="dClose">${i.close}</button>
    </header>
    ${state.shop.length? state.shop.map((s,n)=>`<label class="shop-item"><input type="checkbox" ${s.done?"checked":""} data-i="${n}"><div><strong>${s.title}</strong><div class="tr">${s.items}</div></div></label>`).join("") : `<p class="empty">${i.emptyShop}</p>`}
    ${state.shop.length? `<button class="chip" id="dClear" style="margin-top:16px">${i.clearShop}</button>`:""}`;
  $("#drawer").classList.add("on");
  $("#dClose").onclick=()=>$("#drawer").classList.remove("on");
  const clr=$("#dClear"); if(clr) clr.onclick=()=>{state.shop=[];persist();renderShopBadge();openShop();};
  $("#drawer").querySelectorAll("input").forEach(inp=>inp.onchange=()=>{state.shop[+inp.dataset.i].done=inp.checked;persist();});
}
function stepsOf(r){ return (r.p[state.lang]||r.p.en).split(/(?<=[.;])\s+/).map(s=>s.trim()).filter(Boolean); }
function fmt(s){ return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0"); }
function cookMode(r){
  const i = L(); const steps = stepsOf(r);
  let n=0, left=r.time*60, tick=null;
  const paint=()=>{
    $("#cook").innerHTML = `
      <nav><button class="chip" id="cClose">${i.close}</button>
      <div>${r.t[state.lang]} · ${n+1}/${steps.length}</div>
      <div class="timer" id="tm">${fmt(left)}</div></nav>
      <div class="step">${steps[n]}</div>
      <nav><button class="chip" id="cPrev">${i.prev}</button>
      <button class="chip" id="cTog">${i.timer}</button>
      <button class="chip on" id="cNext">${n===steps.length-1?i.done:i.next}</button></nav>`;
    $("#cClose").onclick=()=>{clearInterval(tick);$("#cook").classList.remove("on");};
    $("#cPrev").onclick=()=>{n=Math.max(0,n-1);paint();};
    $("#cNext").onclick=()=>{if(n<steps.length-1){n++;paint();}else{clearInterval(tick);$("#cook").classList.remove("on");}};
    $("#cTog").onclick=()=>{
      if(tick){clearInterval(tick);tick=null;}
      else tick=setInterval(()=>{left=Math.max(0,left-1);const el=$("#tm");if(el)el.textContent=fmt(left);},1000);
    };
  };
  $("#cook").classList.add("on"); paint();
}
function openAbout(){
  const i = L();
  $("#panel").innerHTML = `
    <header><h2>${i.about}</h2><button class="chip" id="xClose">${i.close}</button></header>
    <p class="it">${i.aboutBody}</p>
    <p class="label">${i.addr}</p><p>${i.illu}</p>
    <div class="dedica" style="margin-top:24px"><div class="label">${i.dedicaTitle}</div>${i.d.map(line=>`<p>${line}</p>`).join("")}</div>`;
  $("#overlay").classList.add("on");
  $("#xClose").onclick=closePanel;
}
function applyLang(){
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-lang]").forEach(b=>b.setAttribute("aria-pressed", b.dataset.lang===state.lang));
  const i=L();
  $("#openBtn").textContent=i.open;
  $("#q").placeholder=i.search;
  $("#btnFav").textContent=i.fav;
  $("#btnAbout").textContent=i.about;
}
function render(){ applyLang(); renderSide(); renderGrid(); renderShopBadge(); }
function enterBook(){
  $("#cover").style.display="none";
  $("#app").classList.add("on");
  render();
  const hash=location.hash.replace("#/","");
  if(hash && RECIPES.some(r=>r.id===hash)) openRecipe(hash);
}
function bootError(msg){
  const el = document.getElementById("bootErr");
  if (el) { el.hidden = false; el.textContent = msg; }
  console.error(msg);
}
function bindUI(){
  const open = () => { location.hash = "#/book"; enterBook(); };
  const btn = $("#openBtn");
  if (btn) btn.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); open(); });
  document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", ev => {
    ev.stopPropagation();
    state.lang = b.dataset.lang;
    persist(); render();
    if (state.openId) openRecipe(state.openId);
  }));
  const q = $("#q"); if (q) q.addEventListener("input", e => { state.q = e.target.value; renderGrid(); });
  const fav = $("#btnFav"); if (fav) fav.addEventListener("click", () => { state.favOnly = !state.favOnly; state.season = "ALL"; render(); });
  const shop = $("#btnShop"); if (shop) shop.addEventListener("click", openShop);
  const about = $("#btnAbout"); if (about) about.addEventListener("click", openAbout);
  const overlay = $("#overlay"); if (overlay) overlay.addEventListener("click", e => { if (e.target.id === "overlay") closePanel(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closePanel();
      const d = $("#drawer"); if (d) d.classList.remove("on");
      const c = $("#cook"); if (c) c.classList.remove("on");
    }
  });
}
function boot(){
  if (typeof I18N === "undefined") { bootError("Translations failed to load."); return; }
  if (typeof RECIPES === "undefined" || !RECIPES.length) { bootError("Recipes failed to load."); return; }
  bindUI();
  enterBook();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
