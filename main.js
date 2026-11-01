(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  initGrip();
  initReveal();
  initSignup();

  /* Griptape over the hero photo. Moving the pointer scrapes it off. */
  function initGrip() {
    const hero = document.querySelector('[data-hero]');
    const canvas = hero.querySelector('[data-hero-grip]');
    const photo = hero.querySelector('[data-hero-photo]');
    const rip = hero.querySelector('[data-hero-rip]');
    const ctx = canvas.getContext('2d');
    const tile = new Image();
    // Strokes are stored relative to the hero size, so a resize can replay them.
    const MAX_HISTORY = 4000;
    let history = [];
    let last = null;
    let width = 0;
    let height = 0;
    let scale = 1;
    // The brush: one solid core and loose bristles around it, in units of the radius.
    const bristles = [{ x: 0, y: 0, w: 1.3 }];
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.5 + Math.random() * 0.5;
      bristles.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, w: 0.05 + Math.random() * 0.3 });
    }

    tile.onload = () => {
      paint();
      hero.classList.add('is-live');
      if (!reducedMotion) {
        const ready = photo.decode ? photo.decode().catch(() => {}) : Promise.resolve();
        ready.then(() => setTimeout(intro, 500));
      }
    };
    tile.src = 'assets/grit-pink.webp';

    function radius() {
      return Math.min(64, Math.max(30, width * 0.036));
    }

    function paint() {
      width = hero.clientWidth;
      height = hero.clientHeight;
      scale = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = ctx.createPattern(tile, 'repeat');
      ctx.fillRect(0, 0, width, height);
      history.forEach(([a, b, c, d]) => scrape(a * width, b * height, c * width, d * height));
    }

    function scrape(x0, y0, x1, y1) {
      const r = radius();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // First a pale torn edge, painted only where griptape remains. Then the erase.
      ctx.globalCompositeOperation = 'source-atop';
      ctx.strokeStyle = '#ffd9e8';
      bristles.forEach((b) => drawBristle(b, r, 4, x0, y0, x1, y1));
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = '#000';
      bristles.forEach((b) => drawBristle(b, r, 0, x0, y0, x1, y1));

      // Loose grit along the edge keeps the line from looking drawn.
      const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 12));
      ctx.fillStyle = '#000';
      for (let i = 0; i <= steps; i++) {
        const x = x0 + ((x1 - x0) * i) / steps;
        const y = y0 + ((y1 - y0) * i) / steps;
        for (let k = 0; k < 3; k++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = r * (0.95 + Math.random() * 0.3);
          ctx.beginPath();
          ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 0.5 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawBristle(bristle, r, extra, x0, y0, x1, y1) {
      ctx.lineWidth = bristle.w * r + extra;
      ctx.beginPath();
      ctx.moveTo(x0 + bristle.x * r, y0 + bristle.y * r);
      ctx.lineTo(x1 + bristle.x * r, y1 + bristle.y * r);
      ctx.stroke();
    }

    function stroke(x0, y0, x1, y1) {
      scrape(x0, y0, x1, y1);
      history.push([x0 / width, y0 / height, x1 / width, y1 / height]);
      if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    }

    function pointerAt(event) {
      const box = hero.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    }

    hero.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch' && !event.isPrimary) return;
      const point = pointerAt(event);
      if (last) stroke(last.x, last.y, point.x, point.y);
      last = point;
    });
    hero.addEventListener('pointerdown', (event) => {
      if (event.target.closest('a, button')) return;
      const point = pointerAt(event);
      stroke(point.x, point.y, point.x + 0.01, point.y);
      last = point;
    });
    ['pointerleave', 'pointercancel'].forEach((name) => {
      hero.addEventListener(name, () => { last = null; });
    });
    hero.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'touch') last = null;
    });

    // One zigzag on load shows what the griptape does. Points are in photo pixels.
    function intro() {
      const zigzag = [
        [640, 40], [1000, 40], [560, 190], [1060, 160], [500, 330], [1120, 300], [520, 480],
        [1120, 450], [560, 640], [1060, 600], [580, 780], [1060, 760], [660, 940], [1060, 930],
      ];
      const cover = Math.max(width / 1536, height / 1024);
      const offsetX = (width - 1536 * cover) / 2;
      const offsetY = (height - 1024 * cover) / 2;
      let points = zigzag.map(([x, y]) => ({ x: x * cover + offsetX, y: y * cover + offsetY }));
      // On tall screens the griptape stays as a strip on the left, under the logo.
      if (window.matchMedia('(max-aspect-ratio: 4/5)').matches) {
        points = [];
        for (let y = height * 0.02, i = 0; y < height; y += radius() * 1.05, i++) {
          points.push({ x: i % 2 ? width * 1.04 : width * (0.5 + Math.random() * 0.1), y });
        }
      }
      const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
      const total = lengths.reduce((sum, len) => sum + len, 0);
      const duration = 1500;
      const start = performance.now();
      let segment = 0;
      let travelled = 0;
      let previous = points[0];

      requestAnimationFrame(function frame(now) {
        const t = Math.max(0, Math.min(1, (now - start) / duration));
        const target = total * (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
        while (segment < lengths.length && travelled + lengths[segment] <= target) {
          const end = points[segment + 1];
          stroke(previous.x, previous.y, end.x, end.y);
          previous = end;
          travelled += lengths[segment];
          segment++;
        }
        if (segment < lengths.length) {
          const f = (target - travelled) / lengths[segment];
          const a = points[segment];
          const b = points[segment + 1];
          const point = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
          stroke(previous.x, previous.y, point.x, point.y);
          previous = point;
        }
        if (t < 1) requestAnimationFrame(frame);
      });
    }

    rip.addEventListener('click', () => {
      const ripped = hero.classList.toggle('is-ripped');
      rip.setAttribute('aria-pressed', String(ripped));
      rip.textContent = ripped ? 'Put it back' : 'Rip it all off';
      if (!ripped) {
        history = [];
        paint();
      }
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // A mobile address bar changes only the height by a small amount: keep the canvas then.
        if (hero.clientWidth !== width || Math.abs(hero.clientHeight - height) > 120) paint();
      }, 150);
    });
  }

  function initReveal() {
    const targets = document.querySelectorAll('.reveal, [data-frame], [data-fan]');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('in-view'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => observer.observe(el));
  }

  function initSignup() {
    const form = document.querySelector('[data-signup]');
    const status = document.querySelector('[data-signup-status]');
    const button = form.querySelector('button');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      button.disabled = true;
      status.textContent = 'Sending.';
      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });
        const { message } = await response.json();
        status.textContent = message;
        if (response.ok) form.reset();
      } catch (error) {
        status.textContent = 'That did not go through. Try again in a minute.';
      }
      button.disabled = false;
    });
  }
})();
