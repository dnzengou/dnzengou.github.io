const $ = s => document.querySelector(s);
const state = {
  lang: localStorage.getItem("wo-lang") || ((navigator.language||"en").toLowerCase().startsWith("sv")?"sv":(navigator.language||"").toLowerCase().startsWith("it")?"it":"en"),
  season: "ALL", kind: "", favOnly: false, q: "",
  fav: new Set(JSON.parse(localStorage.getItem("wo-fav")||"[]")),
  shop: JSON.parse(localStorage.getItem("wo-shop")||"[]"),
  notes: JSON.parse(localStorage.getItem("wo-notes")||"{}"),
  openId: null
};
const SEASONS = ["EUROPE","MED","LEVANT","ASIA","AMERICAS","AFRICA"];
const KINDS = ["bread","flatbread","cake","cookie","steamed"];

function persist(){
  localStorage.setItem("wo-lang", state.lang);
  localStorage.setItem("wo-fav", JSON.stringify([...state.fav]));
  localStorage.setItem("wo-shop", JSON.stringify(state.shop));
  localStorage.setItem("wo-notes", JSON.stringify(state.notes));
}
function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.add("on"); setTimeout(()=>el.classList.remove("on"),1600); }
function L(){ return I18N[state.lang]; }

function filtered(){
  const q = state.q.trim().toLowerCase();
  return RECIPES.filter(r=>{
    if(state.season!=="ALL" && r.s!==state.season) return false;
    if(state.kind && r.k!==state.kind) return false;
    if(state.favOnly && !state.fav.has(r.id)) return false;
    if(!q) return true;
    return [r.t.en,r.t.it,r.t.sv,r.i.en,r.p.en,r.c.en,r.k].join(" ").toLowerCase().includes(q);
  });
}

function renderSide(){
  const i = L();
  $("#side").innerHTML =
    `<button class="navb ${state.season==="ALL"&&!state.favOnly?"on":""}" data-s="ALL">${i.all}</button>` +
    SEASONS.map(s=>`<button class="navb ${state.season===s?"on":""}" data-s="${s}">${i[s]}</button>`).join("") +
    `<h3></h3>` +
    KINDS.map(k=>`<button class="navb ${state.kind===k?"on":""}" data-k="${k}">${i[k]}</button>`).join("");
  $("#side").querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{state.season=b.dataset.s;state.favOnly=false;render();});
  $("#side").querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{state.kind=state.kind===b.dataset.k?"":b.dataset.k;render();});
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
      <div class="meta"><span>⏱ ${r.time} min</span>
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
        <div class="mo">${r.c[state.lang]} · ${i[r.k]} · ${i[r.s]}</div>
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

$("#openBtn").onclick=()=>{location.hash="#/book";enterBook();};
document.querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>{state.lang=b.dataset.lang;persist();render();if(state.openId)openRecipe(state.openId);});
$("#q").oninput=e=>{state.q=e.target.value;renderGrid();};
$("#btnFav").onclick=()=>{state.favOnly=!state.favOnly;state.season="ALL";render();};
$("#btnShop").onclick=openShop;
$("#btnAbout").onclick=openAbout;
$("#overlay").addEventListener("click",e=>{if(e.target.id==="overlay")closePanel();});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){closePanel();$("#drawer").classList.remove("on");$("#cook").classList.remove("on");}
});
if(location.hash && location.hash!=="#") enterBook();
