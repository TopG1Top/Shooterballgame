/* ULTRAKRASS — Brutal Neon Arena KRASS++ by Linhard Zejneli (MIT) */
// ===== Helpers =====
const rand=(a=1,b=0)=>Math.random()*(a-b)+b; const rint=(a,b=0)=>Math.floor(rand(a+1,b));
const clamp=(v,min,max)=>v<min?min:v>max?max:v; const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const angleTo=(ax,ay,bx,by)=>Math.atan2(by-ay,bx-ax);

// ===== Canvas =====
const cvs=document.getElementById('game'); const ctx=cvs.getContext('2d');
const DPR=Math.max(1,Math.min(2,window.devicePixelRatio||1)); const state={w:0,h:0,dt:0,paused:true,lowFx:false};
function resize(){ state.w=cvs.width=Math.floor(innerWidth*DPR); state.h=cvs.height=Math.floor(innerHeight*DPR); cvs.style.width='100%'; cvs.style.height='100%'; }
addEventListener('resize',resize); resize();
addEventListener('contextmenu',e=>e.preventDefault());

// ===== Input =====
const key={}; addEventListener('keydown',e=>{ key[e.key.toLowerCase()]=true; if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault(); if(e.key.toLowerCase()==='p'){togglePause();} tryStartBGM();});
addEventListener('keyup',e=> key[e.key.toLowerCase()]=false);
const mouse={x:0,y:0,btn0:false,btn2:false}; addEventListener('mousemove',e=>{const r=cvs.getBoundingClientRect(); mouse.x=(e.clientX-r.left)*DPR; mouse.y=(e.clientY-r.top)*DPR;});
addEventListener('mousedown',e=>{ if(e.button===0) mouse.btn0=true; if(e.button===2) mouse.btn2=true; tryStartBGM(); });
addEventListener('mouseup',e=>{ if(e.button===0) mouse.btn0=false; if(e.button===2) mouse.btn2=false; });
const isMobile=/Mobi|Android/i.test(navigator.userAgent); const mobileTip=document.getElementById('mobileTip'); if(isMobile) mobileTip.style.display='block';
let touchMove={id:null,x:0,y:0,ax:0,ay:0}; let touchAim={id:null,x:0,y:0,down:false};
addEventListener('touchstart',e=>{ tryStartBGM(); for(const t of e.changedTouches){ const x=t.clientX*DPR,y=t.clientY*DPR; if(x<state.w/2 && touchMove.id===null){ touchMove={id:t.identifier,x,y,ax:x,ay:y}; } else if(touchAim.id===null){ touchAim={id:t.identifier,x,y,down:true}; mouse.btn0=true; mouse.x=x; mouse.y=y; } } },{passive:false});
addEventListener('touchmove',e=>{ for(const t of e.changedTouches){ const x=t.clientX*DPR,y=t.clientY*DPR; if(t.identifier===touchMove.id){ touchMove.ax=x; touchMove.ay=y; } if(t.identifier===touchAim.id){ touchAim.x=x; touchAim.y=y; mouse.x=x; mouse.y=y; } } },{passive:false});
addEventListener('touchend',e=>{ for(const t of e.changedTouches){ if(t.identifier===touchMove.id) touchMove={id:null,x:0,y:0,ax:0,ay:0}; if(t.identifier===touchAim.id){ touchAim={id:null,x:0,y:0,down:false}; mouse.btn0=false; } } });

// ===== Audio (SFX + prozedurale BGM) =====
let audioCtx=null; let sfxOn=true;
function ensureAudio(){ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }
function beep(type='square',freq=440,dur=.06,vol=.2){ if(!sfxOn) return; ensureAudio(); const t=audioCtx.currentTime; const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type=type; o.frequency.setValueAtTime(freq,t); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+.01); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t+dur); }
const sfx={shoot:()=>beep('square',rint(520,460),.05,.12), hit:()=>beep('sawtooth',rint(220,180),.07,.2), kill:()=>beep('triangle',rint(340,300),.12,.22), dash:()=>beep('square',120,.08,.2), heal:()=>beep('sine',660,.12,.18), power:()=>beep('triangle',520,.09,.18), boom:()=>{beep('sawtooth',80,.18,.3); setTimeout(()=>beep('square',60,.22,.28),40)}, boss:()=>beep('sawtooth',140,.35,.25), win:()=>beep('sine',880,.35,.22), gameover:()=>beep('sine',180,.6,.25)};

const music={started:false,nextTime:0,tick:0,tickDur:0,beat:60/104}; // 104 BPM
function scheduleNote(f,start,dur,gain=0.12,type='sine'){
  const o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type=type; o.frequency.setValueAtTime(f,start);
  g.gain.setValueAtTime(0.0001,start); g.gain.exponentialRampToValueAtTime(gain,start+.02); g.gain.exponentialRampToValueAtTime(0.0001,start+dur);
  o.connect(g).connect(audioCtx.destination); o.start(start); o.stop(start+dur);
}
function scheduler(){
  const look=0.5;
  while(music.nextTime < audioCtx.currentTime + look){
    // Bass alle 4 Achtel
    if(music.tick%4===0){
      const bass=[55.0,82.41,98.0,73.42]; const f=bass[((music.tick/4)|0)%4];
      scheduleNote(f,music.nextTime,music.beat*1.2,0.15,'sawtooth');
    }
    // Arp jedes Achtel
    const arp=[440,523.25,659.25,880,659.25,523.25,440,587.33];
    scheduleNote(arp[music.tick%8], music.nextTime, music.tickDur*0.8, 0.08, 'triangle');
    music.tick++; music.nextTime += music.tickDur;
  }
  if(music.started) setTimeout(scheduler,100);
}
function startBGM(){ ensureAudio(); if(music.started) return; music.started=true; music.tick=0; music.tickDur = music.beat/2; music.nextTime=audioCtx.currentTime+0.05; scheduler(); }
function tryStartBGM(){ startBGM(); }

// ===== UI Nodes =====
const $=q=>document.querySelector(q);
const scoreEl=$('#score b'); const comboEl=$('#score').children[1]; const levelEl=$('#level'); const livesEl=$('#lives'); const fpsEl=$('#fps b');
const pauseBtn=$('#pauseBtn'); const menu=$('#menu'); const how=$('#how'); const over=$('#gameover'); const overTitle=$('#overTitle'); const finalStats=$('#finalStats'); const bestScore=$('#bestScore');
const campaignBtn=$('#campaignBtn'); const endlessBtn=$('#endlessBtn'); const howBtn=$('#howBtn'); const backBtn=$('#backBtn'); const playNow=$('#playNow'); const resetBtn=$('#resetBtn');
const aimAssistEl=$('#aimAssist'); const shakeEl=$('#screenShake'); const sfxEl=$('#sfx'); const lowFxEl=$('#lowFx'); const diffSel=$('#difficulty');
const againBtn=$('#againBtn'); const menuBtn=$('#menuBtn'); const shareBtn=$('#shareBtn'); const perkDraft=$('#perkDraft'); const perkChoices=$('#perkChoices');
const stageBanner=$('#stageBanner'); const testStatus=$('#testStatus');

// Toggle + handlers
pauseBtn.onclick = () => togglePause();
function togglePause(){
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? '▶ Resume' : '⏸️ Pause';
  document.body.classList.toggle('paused', state.paused);
}
howBtn.onclick   = () => { state.paused = true; document.body.classList.add('paused'); menu.classList.add('hidden'); how.classList.remove('hidden'); };
backBtn.onclick  = () => { state.paused = true; document.body.classList.add('paused'); hideAll(); menu.classList.remove('hidden'); };
playNow.onclick  = () => startCampaign();
campaignBtn.onclick = () => startCampaign();
endlessBtn.onclick  = () => startEndless();
resetBtn.onclick = () => { localStorage.removeItem('ultrakrass-best'); bestScore.textContent='Highscore: 0'; };
againBtn.onclick = () => { state.paused = true; document.body.classList.add('paused'); hideAll(); menu.classList.remove('hidden'); };
menuBtn.onclick  = () => { state.paused = true; document.body.classList.add('paused'); hideAll(); menu.classList.remove('hidden'); };
shareBtn.onclick = () => { const u=`${location.href.split('#')[0]}#score=${G.score}`; (navigator.clipboard?.writeText(u)||Promise.resolve()).finally(()=>{ shareBtn.textContent='✅ Link kopiert'; setTimeout(()=>shareBtn.textContent='🔗 Score teilen',1200); }); };
aimAssistEl.onchange=()=>G.aimAssist=aimAssistEl.checked; shakeEl.onchange=()=>G.screenShake=shakeEl.checked; sfxEl.onchange=()=>sfxOn=sfxEl.checked; lowFxEl.onchange=()=>state.lowFx=lowFxEl.checked;

function hideAll(){ [menu,how,over,perkDraft].forEach(n=>n.classList.add('hidden')); }

// ===== Game State =====
const G={
  mode:'campaign', difficulty:'normal',
  dmul:{hp:1, es:1, pwr:1, lives:3},
  player:{x:0,y:0,r:12,speed:300,vx:0,vy:0,lives:3,fireCd:0,fireRate:.12,focus:1,slow:false,dashCd:0,inv:0,bulletDmg:1, trail:[]},
  drones:0, rage:0, energy:1, // energy for laser (0..1)
  score:0, combo:1, comboTimer:0,
  bullets:[], enemies:[], particles:[], powerups:[], boss:null,
  levelIndex:0, stageTime:0, nextSpawn:0, elapsed:0,
  aimAssist:true, screenShake:true,
  achie:{first:false,boss:false,rage:false}
};

const DIFF={ easy:{hp:.9, es:.85, pwr:1.4, lives:4, fire:.1, focus:.25}, normal:{hp:1, es:1, pwr:1, lives:3, fire:.12, focus:.2}, hard:{hp:1.2, es:1.15, pwr:.8, lives:3, fire:.13, focus:.18} };
const STAGES=[ {name:'1-1 Tutorial', dur:45, spawn:.9, types:['basic'], boss:false},
  {name:'1-2 Swarm', dur:60, spawn:.8, types:['basic','zig','split'], boss:false},
  {name:'1-3 Shooters', dur:65, spawn:.75, types:['basic','shoot','split'], boss:false},
  {name:'1-4 Mix', dur:70, spawn:.7, types:['basic','zig','shoot','tank','mine'], boss:false},
  {name:'1-5 BOSS', dur:80, spawn:.62, types:['basic','zig','shoot','tank','elite'], boss:true} ];

// ===== Spawning =====
function DIFFScale(){ return G.mode==='endless'? (1+G.elapsed/180) : 1; }
const DIFFHp=()=>G.difficulty==='hard'?1.2:G.difficulty==='easy'?0.9:1;

function spawnEnemy(type){
  const dm=G.dmul.es; const side=rint(3,0), m=40*DPR; let x,y; if(side===0){x=-m;y=rand(state.h);} else if(side===1){x=state.w+m;y=rand(state.h);} else if(side===2){x=rand(state.w);y=-m;} else {x=rand(state.w);y=state.h+m;}
  if(type==='basic'){ G.enemies.push({t:0,type:'basic',x,y,r:rint(15,11),hp:Math.round(3*DIFFScale()),speed:rand(70,95)*dm}); }
  else if(type==='zig'){ G.enemies.push({t:0,type:'zig',x,y,r:14,hp:Math.round(4*DIFFScale()),speed:rand(85,110)*dm}); }
  else if(type==='shoot'){ G.enemies.push({t:0,type:'shoot',x,y,r:16,hp:Math.round(5*DIFFScale()),speed:rand(60,80)*dm,cool:rand(1.2,.5)}); }
  else if(type==='tank'){ G.enemies.push({t:0,type:'tank',x,y,r:20,hp:Math.round(10*DIFFScale()),speed:rand(45,60)*dm}); }
  else if(type==='split'){ G.enemies.push({t:0,type:'split',x,y,r:16,hp:5,speed:rand(70,95)*dm}); }
  else if(type==='mine'){ G.enemies.push({t:0,type:'mine',x,y,r:14,hp:4,speed:rand(40,55)*dm, arm:rand(2.5,1.4)}); }
  else if(type==='elite'){ G.enemies.push({t:0,type:'elite',x,y,r:18,hp:12*DIFFHp(),speed:rand(90,120)*dm,aura:1}); }
}

function spawnPower(x,y){ const types=['rate','heal','gold','mag']; const type=types[rint(types.length-1,0)]; G.powerups.push({x,y,r:10,type,t:0}); }
function spawnBoss(){ const r=50,hp=Math.round((160+G.levelIndex*50)*DIFFScale()*DIFFHp()); const x=rand(state.w*.2,state.w*.8), y=rand(state.h*.2,state.h*.8); G.boss={x,y,r,hp,max:hp,t:0,cool:0,phase:0}; sfx.boss(); }

// ===== Rendering =====
function glowCircle(x,y,r,color,a=.9){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=a; ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=r*1.5; ctx.shadowColor=color; ctx.globalAlpha=.35; ctx.beginPath(); ctx.arc(x,y,r*.6,0,Math.PI*2); ctx.fill(); ctx.restore(); }
function neonLine(x1,y1,x2,y2,w,color){ ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=w; ctx.lineCap='round'; ctx.globalCompositeOperation='lighter'; ctx.shadowBlur=w*3; ctx.shadowColor=color; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.restore(); }
function ring(x,y,r,color){ ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=2*DPR; ctx.globalAlpha=.8; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
function burst(x,y,color,n=12,pow=1){ for(let i=0;i<n;i++){ const a=rand(Math.PI*2), s=rand(60,180)*pow, life=rand(.3,.9); G.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:0,life,color}); } }
function camShake(a){ if(!G.screenShake) return; shakeAmp=Math.max(shakeAmp,a); shakeT=.3; } let shakeT=0, shakeAmp=0;

// ===== Bullets / Shooting =====
function shoot(){ const p=G.player; const a=angleTo(p.x,p.y,mouse.x,mouse.y); const spread= (G.rage>0?0.01:(G.aimAssist?0.02:0.08)); const multi= (G.rage>0?3:1);
  for(let k=0;k<multi;k++){ const off=(k-(multi-1)/2)*0.06; const ang=a+off+rand(spread,-spread); const v=720; const r=5+G.player.bulletDmg*0.6; G.bullets.push({x:p.x+Math.cos(ang)*p.r,y:p.y+Math.sin(ang)*p.r,vx:Math.cos(ang)*v,vy:Math.sin(ang)*v,r,t:0,dmg:G.player.bulletDmg}); }
  sfx.shoot();
}
// Laser Ult (RMB hold)
function laser(){ const p=G.player; if(G.energy<=0) return; const a=angleTo(p.x,p.y,mouse.x,mouse.y);
  const len=Math.hypot(mouse.x-p.x,mouse.y-p.y); const step=12*DPR; const lx=p.x, ly=p.y; G.energy=Math.max(0,G.energy - state.dt*0.25);
  for(let d=step; d<len; d+=step){ const x=lx+Math.cos(a)*d, y=ly+Math.sin(a)*d; neonLine(x-2,y-2,x+2,y+2,2*DPR,'#ffd166'); glowCircle(x,y,2*DPR,'#ffd166',.7); }
  for(let i=G.enemies.length-1;i>=0;i--){ const e=G.enemies[i]; const px=e.x-lx, py=e.y-ly; const proj=px*Math.cos(a)+py*Math.sin(a); const cx=lx+proj*Math.cos(a), cy=ly+proj*Math.sin(a);
    if(proj>0 && proj<len && dist(e.x,e.y,cx,cy)<e.r+6){ e.hp-=20*state.dt; if(e.hp<=0){ burst(e.x,e.y,'#ffd166', state.lowFx?8:20, 1.3); G.score+=Math.round(12*G.combo); G.enemies.splice(i,1); sfx.kill(); } } }
}

// ===== UI helpers =====
function renderLives(){ const el=livesEl; el.innerHTML=''; for(let i=0;i<G.player.lives;i++){ const d=document.createElement('div'); d.className='heart'; el.appendChild(d); } }
function showBanner(text){ stageBanner.textContent=text; stageBanner.classList.remove('hidden'); setTimeout(()=>stageBanner.classList.add('hidden'),2200); }
function toast(t){ showBanner(t); }

// ===== Modes =====
function applyDifficulty(){ G.difficulty=diffSel.value; const d=DIFF[G.difficulty]; G.dmul={hp:d.hp, es:d.es, pwr:d.pwr, lives:d.lives}; Object.assign(G.player,{lives:d.lives,fireRate:d.fire,focus:d.focus}); renderLives(); aimAssistEl.checked=true; G.aimAssist=true; }
function startCommon(mode){ hideAll(); Object.assign(G,{mode,score:0,combo:1,comboTimer:0,bullets:[],enemies:[],particles:[],powerups:[],boss:null,elapsed:0,levelIndex:0,stageTime:0,nextSpawn:0,drones:0,rage:0,energy:1}); state.paused=false; pauseBtn.textContent='⏸️ Pause'; document.body.classList.remove('paused'); Object.assign(G.player,{x:state.w/2,y:state.h/2,vx:0,vy:0,inv:0,dashCd:0,bulletDmg:1,trail:[]}); applyDifficulty(); levelEl.textContent= mode==='campaign'? '1-1' : '∞'; showBanner(mode==='campaign'? STAGES[0].name : 'Endless'); tryStartBGM(); }
const startCampaign=()=>startCommon('campaign'); const startEndless=()=>startCommon('endless');

// ===== Perks =====
const PERKS=[
  {id:'heart',  name:'💚 +1 Leben',        apply:()=>{G.player.lives=Math.min(6,G.player.lives+1); renderLives();}},
  {id:'firerate',name:'⚡ Schnellfeuer',    apply:()=>{G.player.fireRate=Math.max(.06,G.player.fireRate-.015);}},
  {id:'speed',  name:'🏃 Mehr Speed',      apply:()=>{G.player.speed+=28;}},
  {id:'focus',  name:'🧊 Mehr Focus-Regen',apply:()=>{G.player.focus=Math.min(.5,G.player.focus+.05);}},
  {id:'damage', name:'💥 +1 Bullet-DMG',   apply:()=>{G.player.bulletDmg+=1;}},
  {id:'drone',  name:'🛰️ Orbit-Drohne',    apply:()=>{G.drones=Math.min(3,G.drones+1); toast(`Drohnen: ${G.drones}`);}},
  {id:'magnet', name:'🌀 Magnet-Pulse',    apply:()=>{ for(const e of G.enemies){ e.vx=(e.vx||0)*0.2; e.vy=(e.vy||0)*0.2; } camShake(6);} },
];
function openPerkDraft(){ perkChoices.innerHTML=''; const picks=[...PERKS].sort(()=>Math.random()-.5).slice(0,3); for(const p of picks){ const b=document.createElement('button'); b.className='btn'; b.textContent=p.name; b.onclick=()=>{ p.apply(); sfx.power(); perkDraft.classList.add('hidden'); nextStage(); }; perkChoices.appendChild(b);} perkDraft.classList.remove('hidden'); state.paused=true; document.body.classList.add('paused'); }
function nextStage(){ if(G.mode!=='campaign') return; G.levelIndex++; if(G.levelIndex>=STAGES.length){ winGame(); return; } G.stageTime=0; G.nextSpawn=0; showBanner(STAGES[G.levelIndex].name); levelEl.textContent=`1-${G.levelIndex+1}`; state.paused=false; document.body.classList.remove('paused'); }

// ===== Achievements =====
function ach(id){ if(G.achie[id]) return; G.achie[id]=true; localStorage.setItem('ultrakrass-ach', JSON.stringify(G.achie)); toast('🏅 '+({first:'First Blood',boss:'Boss Down!',rage:'Rage Unleashed'})[id]||id); }

// ===== Loop =====
let last=performance.now();
function loop(t){
  const dt=Math.min(.033,(t-last)/1000); last=t; state.dt=dt;
  if(state.paused){ requestAnimationFrame(loop); draw(); return; }

  const p=G.player; G.elapsed+=dt;

  // Rage
  if(key['e'] && G.combo>=15 && G.rage<=0){ G.rage=6; G.combo=10; p.speed+=80; p.lives=Math.min(6,p.lives+1); renderLives(); camShake(12); sfx.power(); ach('rage'); }
  if(G.rage>0){ G.rage-=dt; if(G.rage<=0){ G.rage=0; p.speed-=80; } }

  // Energy regen
  G.energy = Math.min(1, G.energy + dt*0.12);

  // Spawns
  if(G.mode==='campaign'){
    G.stageTime+=dt; const st=STAGES[G.levelIndex];
    if(st){
      G.nextSpawn-=dt; const sInt=Math.max(.33, st.spawn - G.levelIndex*0.05);
      if(G.nextSpawn<=0){ const type=st.types[rint(st.types.length-1,0)]; spawnEnemy(type); if(Math.random()<.42) spawnEnemy(st.types[rint(st.types.length-1,0)]); if(Math.random()<.12) spawnEnemy('elite'); G.nextSpawn=sInt; }
      if(st.boss && !G.boss && G.stageTime>st.dur*.35){ spawnBoss(); }
      if(G.stageTime>=st.dur && !G.boss){ openPerkDraft(); }
    }
  } else {
    G.nextSpawn-=dt; const base=Math.max(.25, .9 - G.elapsed*0.01);
    if(G.nextSpawn<=0){ const pool=['basic','zig','shoot','tank','split','mine','elite']; spawnEnemy(pool[rint(pool.length-1,0)]); if(Math.random()<.5) spawnEnemy(pool[rint(pool.length-1,0)]); G.nextSpawn=base; }
    if(!G.boss && Math.floor(G.elapsed)%75===0 && G.elapsed>5){ spawnBoss(); }
  }

  // Movement
  const ax=(key['a']||key['arrowleft']?-1:0)+(key['d']||key['arrowright']?1:0);
  const ay=(key['w']||key['arrowup']?-1:0)+(key['s']||key['arrowdown']?1:0);
  let mx=0,my=0; if(touchMove.id!==null){ mx=(touchMove.ax-touchMove.x)/DPR; my=(touchMove.ay-touchMove.y)/DPR; mx=clamp(mx,-1,1); my=clamp(my,-1,1); }
  const slow=(key[' ']||key['space'])?0.55:1; const sp=p.speed*slow; let dx=ax+mx, dy=ay+my; const n=Math.hypot(dx,dy)||1; dx/=n; dy/=n; p.vx=dx*sp; p.vy=dy*sp; p.x=clamp(p.x+p.vx*dt,p.r,state.w-p.r); p.y=clamp(p.y+p.vy*dt,p.r,state.h-p.r);

  // Trail
  p.trail.push({x:p.x,y:p.y,t:0}); if(p.trail.length>40) p.trail.shift(); for(const tdot of p.trail) tdot.t+=dt;

  // Dash
  p.dashCd-=dt; if(key['shift'] && p.dashCd<=0){ const a=angleTo(0,0,p.vx,p.vy); const m=(Math.hypot(p.vx,p.vy)||p.speed); p.x+=Math.cos(a)*m*0.18; p.y+=Math.sin(a)*m*0.18; p.inv=.4; p.dashCd=1.1; sfx.dash(); camShake(10); }
  if(p.inv>0) p.inv-=dt;

  // Fire
  p.fireCd-=dt; if((mouse.btn0||touchAim.down) && p.fireCd<=0){ shoot(); p.fireCd=G.player.fireRate; }
  if(mouse.btn2){ laser(); }

  // Drones
  if(G.drones>0){ const a=angleTo(p.x,p.y,mouse.x,mouse.y); for(let i=0;i<G.drones;i++){ const ang=a + (i-(G.drones-1)/2)*0.6; if(Math.random()<0.14){ const v=560; const r=4; G.bullets.push({x:p.x+Math.cos(ang)*20,y:p.y+Math.sin(ang)*20,vx:Math.cos(ang)*v,vy:Math.sin(ang)*v,r,t:0,dmg:Math.max(1,G.player.bulletDmg-1)}); } } }

  // Bullets
  for(let i=G.bullets.length-1;i>=0;i--){ const b=G.bullets[i]; b.x+=b.vx*dt; b.y+=b.vy*dt; b.t+=dt; if(b.x<-20||b.y<-20||b.x>state.w+20||b.y>state.h+20||b.t>2.2){ G.bullets.splice(i,1); } }

  // Enemies
  for(let e of G.enemies){
    e.t=(e.t||0)+dt; const a=angleTo(e.x,e.y,p.x,p.y); const base=e.speed;
    if(e.type==='zig'){ e.x+=Math.cos(e.t*6)*40*dt; e.y+=Math.sin(e.t*6)*40*dt; e.x+=Math.cos(a)*base*dt; e.y+=Math.sin(a)*base*dt; }
    else if(e.type==='shoot'){ e.cool=(e.cool||0)-dt; e.x+=Math.cos(a)*base*.6*dt; e.y+=Math.sin(a)*base*.6*dt; if(e.cool<=0){ const ang=a+(Math.random()-.5)*.4; const v=200; G.enemies.push({x:e.x,y:e.y,r:8,vx:Math.cos(ang)*v,vy:Math.sin(ang)*v,speed:0,hp:1,t:0,type:'proj'}); e.cool=rand(1.6,0.8);} }
    else if(e.type==='mine'){ e.arm-=dt; if(e.arm<=0){ for(let k=0;k<12;k++){ const ang=(k*Math.PI*2/12); const v=220; G.enemies.push({x:e.x,y:e.y,r:8,vx:Math.cos(ang)*v,vy:Math.sin(ang)*v,speed:0,hp:1,t:0,type:'proj'});} e.hp=0; }
      else { e.x+=Math.cos(a)*base*.35*dt; e.y+=Math.sin(a)*base*.35*dt; } }
    else { e.x+=Math.cos(a)*base*dt; e.y+=Math.sin(a)*base*dt; }
  }

  // Projectiles + Collisions
  for(let i=G.enemies.length-1;i>=0;i--){
    const e=G.enemies[i];
    if(e.speed===0){ e.x+=e.vx*dt; e.y+=e.vy*dt; if(e.x<-120||e.y<-120||e.x>state.w+120||e.y>state.h+120){ G.enemies.splice(i,1); continue; } }
    // bullets
    for(let j=G.bullets.length-1;j>=0;j--){ const b=G.bullets[j]; if(dist(e.x,e.y,b.x,b.y)<e.r+b.r){ e.hp-=b.dmg; G.bullets.splice(j,1); burst(b.x,b.y,'#63fff2', state.lowFx?2:6, .6); sfx.hit(); if(!G.achie.first){ ach('first'); }
      if(e.hp<=0){
        if(e.type==='split'){ for(let k=0;k<2;k++){ G.enemies.push({t:0,type:'basic',x:e.x+rint(10,-10),y:e.y+rint(10,-10),r:10,hp:2,speed:rand(100,140)}); } }
        burst(e.x,e.y, e.type==='proj'? '#ffd166':'#ff2bd6', state.lowFx?8:16, 1.2); camShake(5); sfx.kill(); if(Math.random()<0.16*DIFF[G.difficulty].pwr) spawnPower(e.x,e.y); G.enemies.splice(i,1); G.combo=Math.min(25,G.combo+0.14); G.comboTimer=2.2; G.score+=Math.round((10+(e.type==='elite'?10:0))*G.combo); break;
      }
    } }
    if(dist(e.x,e.y,G.player.x,G.player.y)<e.r+G.player.r){ if(G.player.inv<=0) damagePlayer(); e.x+=(e.x-G.player.x)*0.4; e.y+=(e.y-G.player.y)*0.4; }
  }

  // Boss
  if(G.boss){
    const b=G.boss; b.t+=dt; b.cool-=dt; const a=angleTo(b.x,b.y,p.x,p.y); const s=70*G.dmul.es; b.x+=Math.cos(a)*s*dt; b.y+=Math.sin(a)*s*dt;
    if(b.cool<=0){ const rings = b.phase%2? 24:18; for(let k=0;k<rings;k++){ const ang=a+(k*Math.PI*2/rings); const v=220+(b.phase%2?60:0); G.enemies.push({x:b.x,y:b.y,r:8,vx:Math.cos(ang)*v,vy:Math.sin(ang)*v,speed:0,hp:1,t:0,type:'proj'}); } b.cool=1.8; sfx.boom(); camShake(12); b.phase++; }
    for(let j=G.bullets.length-1;j>=0;j--){ const bl=G.bullets[j]; if(dist(b.x,b.y,bl.x,bl.y)<b.r+bl.r){ G.bullets.splice(j,1); b.hp-=2*G.player.bulletDmg; burst(bl.x,bl.y,'#63fff2', state.lowFx?4:10, .8); sfx.hit(); if(b.hp<=0){ burst(b.x,b.y,'#ffd166', state.lowFx?24:60, 1.7); sfx.boom(); camShake(22); ach('boss'); G.score+=800; G.boss=null; if(G.mode==='campaign'){ openPerkDraft(); } } } }
    if(G.boss && dist(G.boss.x,G.boss.y,p.x,p.y)<G.boss.r+p.r && p.inv<=0) damagePlayer();
  }

  // Powerups
  for(let i=G.powerups.length-1;i>=0;i--){ const u=G.powerups[i]; u.t+=dt; u.x+=Math.cos(u.t*2)*10*dt; u.y+=Math.sin(u.t*2)*10*dt;
    if(dist(u.x,u.y,p.x,p.y)<p.r+u.r+4){ if(u.type==='heal'){ p.lives=Math.min(6,p.lives+1); sfx.heal(); renderLives(); }
      if(u.type==='rate'){ p.fireRate=Math.max(.05,p.fireRate-.012); sfx.power(); }
      if(u.type==='gold'){ G.score+=160; sfx.power(); }
      if(u.type==='mag'){ for(const e of G.enemies){ e.vx=(e.vx||0)*0.2; e.vy=(e.vy||0)*0.2; } sfx.power(); camShake(8); }
      G.powerups.splice(i,1);
    }
  }

  // Combo decay
  G.comboTimer-=dt; if(G.comboTimer<=0) G.combo=Math.max(1,G.combo-0.08);

  // UI
  scoreEl.textContent=G.score; comboEl.textContent=`x${G.combo.toFixed(1)}`; fpsEl.textContent=(1/Math.max(.0001,dt)).toFixed(0);

  draw();
  requestAnimationFrame(loop);
}

function damagePlayer(){ const p=G.player; if(p.inv>0) return; p.lives--; p.inv=1; sfx.boom(); camShake(14); burst(p.x,p.y,'#ff5a7a', state.lowFx?18:40, 1.4); renderLives(); if(p.lives<=0) gameOver(); }

// ===== Draw =====
function draw(){
  ctx.clearRect(0,0,state.w,state.h);
  // parallax grid + scanlines
  const t=performance.now()*0.001; const grid=18*DPR; ctx.save(); ctx.globalAlpha=.9; ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--bg'); ctx.fillRect(0,0,state.w,state.h);
  ctx.globalAlpha=.10; ctx.strokeStyle='#1a2238'; ctx.lineWidth=1*DPR; ctx.beginPath(); for(let x=((t*30)%grid); x<state.w; x+=grid){ ctx.moveTo(x,0); ctx.lineTo(x,state.h); } for(let y=((t*24)%grid); y<state.h; y+=grid){ ctx.moveTo(0,y); ctx.lineTo(state.w,y); } ctx.stroke();
  ctx.globalAlpha=.06; ctx.fillStyle='#000'; for(let y=0;y<state.h;y+=2*DPR){ ctx.fillRect(0,y,state.w,1*DPR); } ctx.restore();
  if(shakeT>0){ shakeT-=state.dt; const s=shakeAmp*(shakeT/0.3); ctx.setTransform(1,0,0,1, rand(s,-s), rand(s,-s)); } else { ctx.setTransform(1,0,0,1,0,0); shakeAmp=0; }

  const p=G.player;
  for(const tdot of p.trail){ const k=Math.min(1,tdot.t/0.6); glowCircle(tdot.x,tdot.y,Math.max(2, p.r*(1-k)*.8),'rgba(99,255,242,.5)',.45); }
  glowCircle(p.x,p.y,p.r, G.rage>0?'#ffd166':'#63fff2', .95); ring(p.x,p.y,p.r+(p.inv>0? rint(4,2):0), p.inv>0? '#ffd166':'#63fff2'); neonLine(p.x,p.y,mouse.x,mouse.y,2*DPR,'rgba(99,255,242,.35)');

  if(G.drones>0){ for(let i=0;i<G.drones;i++){ const ang=t*2 + i*(Math.PI*2/G.drones); glowCircle(p.x+Math.cos(ang)*20,p.y+Math.sin(ang)*20,5,'#7efc7a',.9); } }
  for(const b of G.bullets){ neonLine(b.x-b.vx*0.02,b.y-b.vy*0.02,b.x,b.y,3*DPR,G.rage>0?'#ffd166':'#63fff2'); }

  for(const e of G.enemies){ const c= e.type==='zig'? '#ff2bd6' : e.type==='shoot'? '#ffd166' : e.type==='tank'? '#7efc7a' : e.type==='proj'? '#ffd166' : e.type==='mine'? '#ff5a7a' : e.type==='elite'? '#9ecbff' : '#9ecbff'; glowCircle(e.x,e.y,e.r,c,.85); if(e.hp>1 && !state.lowFx && e.type!=='proj') ring(e.x,e.y,e.r+4,c); }

  if(G.boss){ const b=G.boss; const prog=b.hp/b.max; glowCircle(b.x,b.y,b.r,'#ffd166',.95); if(!state.lowFx) ring(b.x,b.y,b.r+8,'#ffd166'); const w=Math.min(state.w*.6,420*DPR), x=state.w/2-w/2, y=20*DPR; ctx.save(); ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(x,y,w,10*DPR); ctx.fillStyle='#ffd166'; ctx.fillRect(x,y,w*prog,10*DPR); ctx.restore(); }

  for(const u of G.powerups){ const map={rate:'#7efc7a', heal:'#ff5a7a', gold:'#ffd166', mag:'#63fff2'}; glowCircle(u.x,u.y,u.r,map[u.type],.9); if(!state.lowFx) ring(u.x,u.y,u.r+4,map[u.type]); }

  for(let i=G.particles.length-1;i>=0;i--){ const q=G.particles[i]; q.t+=state.dt; const k=q.t/q.life; q.x+=q.vx*state.dt; q.y+=q.vy*state.dt; if(k>=1){ G.particles.splice(i,1); continue; } ctx.globalAlpha=1-k; glowCircle(q.x,q.y,3*DPR,q.color,.7); ctx.globalAlpha=1; }

  // energy bar
  const ew=Math.min(state.w*.25, 240*DPR), ex=state.w-ew-16*DPR, ey=state.h-18*DPR;
  ctx.save(); ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(ex,ey,ew,8*DPR); ctx.fillStyle='#ffd166'; ctx.fillRect(ex,ey,ew*G.energy,8*DPR); ctx.restore();
}

// ===== Results =====
function winGame(){ sfx.win(); state.paused=true; document.body.classList.add('paused'); over.classList.remove('hidden'); overTitle.textContent='🏆 Du hast gewonnen!'; finalStats.textContent=`Score ${G.score} · Combo x${G.combo.toFixed(1)}`; const best=Math.max(G.score,+(localStorage.getItem('ultrakrass-best')||0)); localStorage.setItem('ultrakrass-best',best); bestScore.textContent=`Highscore: ${best}`; }
function gameOver(){ sfx.gameover(); state.paused=true; document.body.classList.add('paused'); over.classList.remove('hidden'); overTitle.textContent='Game Over'; finalStats.textContent=`Score ${G.score} · Stage ${G.mode==='campaign'? `1-${G.levelIndex+1}`:'∞'} · Combo x${G.combo.toFixed(1)}`; const best=Math.max(G.score,+(localStorage.getItem('ultrakrass-best')||0)); localStorage.setItem('ultrakrass-best',best); bestScore.textContent=`Highscore: ${best}`; }

// ===== Self-tests =====
(function selfTests(){
  try{
    console.assert(cvs && ctx, 'canvas/context');
    const pre=G.enemies.length; spawnEnemy('basic'); console.assert(G.enemies.length===pre+1, 'spawn basic');
    const p0=G.powerups.length; spawnPower(10,10); console.assert(G.powerups.length===p0+1, 'spawn power');
    const el=document.getElementById('testStatus'); if(el) el.textContent='Self-tests: OK';
  }catch(e){ const el=document.getElementById('testStatus'); if(el) el.textContent='Self-tests: FAIL '+e.message; }
})();

// ===== Boot =====
(function boot(){ renderLives(); hideAll(); menu.classList.remove('hidden'); state.paused=true; pauseBtn.textContent='▶ Start'; document.body.classList.add('paused'); requestAnimationFrame(loop); })();
