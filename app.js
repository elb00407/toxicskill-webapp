// app.js (ES module) — minimal neon glass UI with animations
const API = '/api'; // replace with full URL if needed
const TOTAL = 21;

const grid = document.getElementById('pcGrid');
const tpl = document.getElementById('cardTpl');
const toast = document.getElementById('toast');
const sheet = document.getElementById('sheet');
const sheetPanel = sheet.querySelector('.sheet__panel');
const sheetBackdrop = document.getElementById('sheetBackdrop');

let pcs = [];
let current = null;

// Utilities
const showToast = (txt, ms=2200) => {
  toast.textContent = txt; toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'), ms);
};
const formatLeft = (iso) => {
  if(!iso) return '';
  const diff = new Date(iso) - new Date();
  if(diff<=0) return '—';
  const h = Math.floor(diff/3600000);
  const m = Math.floor((diff%3600000)/60000);
  return `${h}ч ${m}м`;
};

// Skeletons
function renderSkeleton(count=8){
  grid.setAttribute('aria-busy','true');
  grid.innerHTML = '';
  for(let i=0;i<count;i++){
    const node = tpl.content.cloneNode(true);
    grid.appendChild(node);
  }
}

// Load data (API with fallback)
async function load(){
  renderSkeleton(8);
  try{
    const res = await fetch(`${API}/pcs`);
    if(!res.ok) throw new Error('api');
    pcs = await res.json();
    // add img fallback
    pcs.forEach((p,i)=>p.img = `assets/pc-${(i%TOTAL)+1}.jpg`);
    render(pcs);
  }catch(e){
    pcs = Array.from({length:TOTAL}).map((_,i)=>({
      id:i+1, name:`PC #${i+1}`, vip:(i+1)%5===0, busy:Math.random()<0.25, booked_until:null, img:`assets/pc-${(i%TOTAL)+1}.jpg`
    }));
    render(pcs);
    showToast('Оффлайн режим');
  }
}

// Render cards with staggered animation
function render(list){
  grid.innerHTML = '';
  grid.setAttribute('aria-busy','false');

  const search = document.getElementById('search').value.trim().toLowerCase();
  const filtered = list.filter(p=>{
    if(!search) return true;
    return p.name.toLowerCase().includes(search) || String(p.id)===search;
  });

  filtered.forEach((p, idx)=>{
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector('.card');
    const img = node.querySelector('.card__img');
    const title = node.querySelector('.card__title');
    const status = node.querySelector('.badge--status');
    const vipBadge = node.querySelector('.badge--vip');
    const timeLeft = node.querySelector('.timeLeft');
    const btn = node.querySelector('.bookBtn');

    img.classList.remove('skeleton');
    title.classList.remove('skeleton-text');

    img.style.backgroundImage = p.img ? `url(${p.img})` : '';
    title.textContent = p.name;

    vipBadge.style.display = p.vip ? 'inline-block' : 'none';

    if(p.busy){
      status.textContent = 'Занят';
      status.classList.add('badge--busy');
    }else{
      status.textContent = 'Свободен';
      status.classList.remove('badge--busy');
    }

    timeLeft.textContent = p.booked_until ? formatLeft(p.booked_until) : '';

    // Staggered entrance
    card.style.animationDelay = `${idx*60}ms`;

    // Click handlers
    btn.addEventListener('click', (e)=>{ e.stopPropagation(); if(p.busy){ showToast('ПК занят'); return; } openSheet(p); });
    card.addEventListener('click', ()=>{ if(p.busy){ showToast('ПК занят'); } else openSheet(p); });

    grid.appendChild(node);
  });
}

// Filters & search
document.getElementById('filterAll').addEventListener('click', ()=>{ setActive('filterAll'); render(pcs); });
document.getElementById('filterFree').addEventListener('click', ()=>{ setActive('filterFree'); render(pcs.filter(p=>!p.busy)); });
document.getElementById('filterVIP').addEventListener('click', ()=>{ setActive('filterVIP'); render(pcs.filter(p=>p.vip)); });
function setActive(id){
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
document.getElementById('search').addEventListener('input', ()=>render(pcs));

// Bottom‑sheet open/close (spring)
function openSheet(pc){
  current = pc;
  document.getElementById('sheetTitle').textContent = `Бронирование ${pc.name}`;
  document.getElementById('pcPreviewImg').style.backgroundImage = pc.img ? `url(${pc.img})` : '';
  document.getElementById('pcPreviewName').textContent = pc.name;
  document.getElementById('pcPreviewBadges').innerHTML = pc.vip ? '<span class="badge badge--vip">VIP</span>' : '';

  sheet.classList.remove('hidden');
  sheet.setAttribute('aria-hidden','false');
  sheetBackdrop.style.opacity = '1';
  sheetPanel.style.transform = 'translateY(110%)';
  requestAnimationFrame(()=>{ sheetPanel.style.transition = 'transform .6s cubic-bezier(.22,.9,.3,1)'; sheetPanel.style.transform = 'translateY(0%)'; });
  document.getElementById('date').focus();
}
function closeSheet(){
  sheetPanel.style.transform = 'translateY(110%)';
  sheetBackdrop.style.opacity = '0';
  sheet.setAttribute('aria-hidden','true');
  setTimeout(()=>sheet.classList.add('hidden'),280);
}
document.getElementById('cancelBtn').addEventListener('click', closeSheet);
sheetBackdrop.addEventListener('click', closeSheet);

// Quick slots hooks + ripple
document.querySelectorAll('.quickSlots .btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const add = Number(btn.dataset.add);
    const now = new Date();
    now.setHours(now.getHours()+add);
    document.getElementById('date').value = now.toISOString().slice(0,10);
    document.getElementById('time').value = now.toTimeString().slice(0,5);
  });
});

// Confirm booking
document.getElementById('confirmBtn').addEventListener('click', async ()=>{
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  if(!date || !time){ showToast('Выберите дату и время'); return; }
  if(!current){ showToast('Нет выбранного ПК'); return; }
  const dt = new Date(`${date}T${time}:00`);
  const until = new Date(dt.getTime() + 60*60*1000).toISOString(); // default +1h

  try{
    const res = await fetch(`${API}/book`, {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+(localStorage.getItem('ts_token')||'')},
      body: JSON.stringify({ id: current.id, until })
    });
    const data = await res.json();
    if(!res.ok){ showToast(data.error || 'Ошибка брони'); return; }
    current.busy = true;
    current.booked_until = until;
    render(pcs);
    showToast(`Забронировано ${current.name}`);
    closeSheet();
  }catch(e){
    // Offline fallback
    current.busy = true;
    current.booked_until = until;
    render(pcs);
    showToast('Забронировано (локально)');
    closeSheet();
  }
});

// Auth demo toggle
document.getElementById('authBtn').addEventListener('click', async ()=>{
  const token = localStorage.getItem('ts_token');
  if(token){ localStorage.removeItem('ts_token'); showToast('Вы вышли'); return; }
  try{
    const res = await fetch(`${API}/auth/demo`, {method:'POST'});
    const data = await res.json();
    if(data.token){ localStorage.setItem('ts_token', data.token); showToast('Вошли как demo'); }
  }catch{ showToast('Ошибка входа'); }
});

// Init
load();
