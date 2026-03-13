(() => {
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  const messageEl = document.getElementById('message');

  function nextNewYear() {
    const now = new Date();
    const targetYear = now.getFullYear() + 1;
    return new Date(targetYear, 0, 1, 0, 0, 0);
  }

  let target = nextNewYear();

  function update() {
    const now = new Date();
    const diff = target - now;
    if (diff <= 0) {
      daysEl.textContent = '0'; hoursEl.textContent = '00'; minutesEl.textContent = '00'; secondsEl.textContent = '00';
      messageEl.textContent = 'Happy New Year! 🎉';
      launchConfetti();
      // prepare next year after celebration
      setTimeout(()=>{target = nextNewYear(); messageEl.textContent='';}, 10_000);
      return;
    }
    const s = Math.floor(diff / 1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    // animate changes
    const setAndPulse = (el, text) => {
      if(el.textContent !== String(text)){
        el.textContent = String(text);
        el.classList.add('pop');
        setTimeout(()=>el.classList.remove('pop'), 350);
      }
    };

    setAndPulse(daysEl, days);
    setAndPulse(hoursEl, String(hours).padStart(2,'0'));
    setAndPulse(minutesEl, String(minutes).padStart(2,'0'));
    setAndPulse(secondsEl, String(seconds).padStart(2,'0'));
  }

  // confetti: simple particle system
  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  addEventListener('resize', resize); resize();

  function createParticle(x,y){
    return {
      x, y,
      vx: (Math.random()*2-1)*6,
      vy: Math.random()*-7 - 2,
      size: Math.random()*6+4,
      color: `hsl(${Math.floor(Math.random()*360)} 80% 60%)`,
      life: 60 + Math.random()*40
    };
  }

  function launchConfetti(count=120){
    for(let i=0;i<count;i++){
      const x = Math.random()*canvas.width;
      const y = -10 - Math.random()*120;
      particles.push(createParticle(x,y));
    }
    if (!animating) startAnimation();
  }

  let animating = false;
  function startAnimation(){ animating = true; requestAnimationFrame(step); }

  function step(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.vy += 0.25; p.x += p.vx; p.y += p.vy; p.life--;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size*0.6);
      if (p.y > canvas.height + 50 || p.life <= 0) particles.splice(i,1);
    }
    if (particles.length>0) requestAnimationFrame(step); else animating=false;
  }

  // update every second, but run first update immediately
  update();
  setInterval(update, 1000);

  // small hover/practice confetti when clicking the header
  document.querySelector('.brand h1').addEventListener('click', ()=>launchConfetti(24));

  // --------------------
  // World clocks (timezones)
  // --------------------
  const cities = [
    {id:'bd', label:'Bangladesh', tz:'Asia/Dhaka', flag:'🇧🇩'},
    {id:'ny', label:'New York', tz:'America/New_York', flag:'🇺🇸'},
    {id:'tk', label:'Tokyo', tz:'Asia/Tokyo', flag:'🇯🇵'},
    {id:'ld', label:'London', tz:'Europe/London', flag:'🇬🇧'}
  ];

  const worldList = document.getElementById('worldList');
  if(worldList){
    cities.forEach(c=>{
      const el = document.createElement('div'); el.className='city'; el.id = 'city-'+c.id;
      el.innerHTML = `<div class="city-head"><div class="flag">${c.flag}</div><div><div class="city-name">${c.label}</div><div class="tz">${c.tz}</div></div></div><div class="clock" id="clock-${c.id}">--:--:--</div><div class="countdown-small" id="cd-${c.id}">calculating...</div>`;
      worldList.appendChild(el);
      c.el = el; c.clockEl = el.querySelector('#clock-'+c.id); c.cdEl = el.querySelector('#cd-'+c.id);
      c.targetEpoch = null; c.targetYear = null; c.needsCompute=true;
    });

    const fmtParts = (epoch, tz) => {
      const f = new Intl.DateTimeFormat('en-US', {timeZone: tz, year:'numeric', month:'numeric', day:'numeric', hour:'numeric', minute:'numeric', second:'numeric', hour12:false});
      const parts = f.formatToParts(new Date(epoch));
      const obj = {};
      parts.forEach(p=>{ if(p.type!=='literal') obj[p.type]=p.value; });
      return obj;
    };

    const localKey = (epoch,tz) => {
      const p = fmtParts(epoch,tz);
      return Number(p.year)*1e10 + Number(p.month)*1e8 + Number(p.day)*1e6 + Number(p.hour)*1e4 + Number(p.minute)*1e2 + Number(p.second);
    };

    function findEpochForLocal(year, month, day, hour, minute, second, tz){
      const targetKey = Number(year)*1e10 + Number(month)*1e8 + Number(day)*1e6 + Number(hour)*1e4 + Number(minute)*1e2 + Number(second);
      let lo = Date.now() - 1000*60*60*24*400;
      let hi = Date.now() + 1000*60*60*24*800;
      let iter = 0;
      while(lo <= hi && iter < 64){
        const mid = Math.floor((lo+hi)/2);
        const k = localKey(mid,tz);
        if(k === targetKey){
          let m = mid;
          while(m-1>lo && localKey(m-1,tz)===targetKey) m--;
          return m;
        }
        if(k < targetKey) lo = mid+1; else hi = mid-1;
        iter++;
      }
      return lo;
    }

    function ensureTargets(){
      const nowEpoch = Date.now();
      cities.forEach(c=>{
        const parts = fmtParts(nowEpoch, c.tz);
        const localYear = Number(parts.year);
        const targetYear = localYear + 1;
        if(c.targetYear !== targetYear || c.targetEpoch === null){
          c.targetYear = targetYear;
          c.targetEpoch = findEpochForLocal(targetYear,1,1,0,0,0, c.tz);
        }
      });
    }

    function updateWorld(){
      const now = Date.now();
      ensureTargets();
      let firstSoonest = null;
      cities.forEach(c=>{
        const diff = Math.max(0, c.targetEpoch - now);
        const s = Math.floor(diff/1000);
        const days = Math.floor(s/86400);
        const hours = Math.floor((s%86400)/3600);
        const minutes = Math.floor((s%3600)/60);
        const seconds = s%60;
        const newCd = `${days}d ${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
        if(c.cdEl.textContent !== newCd){ c.cdEl.textContent = newCd; c.cdEl.classList.add('pop'); setTimeout(()=>c.cdEl.classList.remove('pop'),300); }
        const p = fmtParts(now, c.tz);
        const newClock = `${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}:${String(p.second).padStart(2,'0')}`;
        if(c.clockEl.textContent !== newClock){ c.clockEl.textContent = newClock; c.clockEl.classList.add('pop'); setTimeout(()=>c.clockEl.classList.remove('pop'),220); }
        if(diff<=0){ c.cdEl.textContent = '🎆 Happy New Year!'; }
        if(firstSoonest === null || diff < firstSoonest.diff){ firstSoonest = {city:c, diff}; }
      });
      cities.forEach(c=> c.el.classList.toggle('highlight', firstSoonest && firstSoonest.city===c));
    }

    updateWorld(); setInterval(updateWorld, 1000);
  }

})();
