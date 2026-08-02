/* ============================================================
   王塨钰 · 像素梦境存档 — interactions
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- starfield + shooting stars ---------- */
  var canvas = document.getElementById('stars');
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext('2d');
    var stars = [];
    var shooting = null;
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      var r = canvas.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = [];
      var n = Math.floor(W * H / 5200);
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H * 0.62,
          s: Math.random() < 0.82 ? 2 : 3,
          p: Math.random() * Math.PI * 2,
          v: 0.6 + Math.random() * 1.4
        });
      }
    }

    function tick(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var a = 0.35 + 0.65 * Math.abs(Math.sin(t / 1000 * st.v + st.p));
        ctx.fillStyle = 'rgba(255, 246, 220,' + a.toFixed(2) + ')';
        ctx.fillRect(Math.round(st.x), Math.round(st.y), st.s, st.s);
      }
      if (!shooting && Math.random() < 0.006) {
        shooting = { x: Math.random() * W * 0.7 + W * 0.2, y: Math.random() * H * 0.25 + 20, life: 1 };
      }
      if (shooting) {
        var sh = shooting;
        ctx.fillStyle = 'rgba(255,255,255,' + (sh.life * 0.9).toFixed(2) + ')';
        for (var k = 0; k < 6; k++) {
          ctx.fillRect(Math.round(sh.x - k * 7), Math.round(sh.y - k * 4), 3, 3);
        }
        sh.x += 7; sh.y += 4; sh.life -= 0.03;
        if (sh.life <= 0 || sh.x > W + 40) shooting = null;
      }
      requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(tick);
  }

  /* ---------- typed dialog ---------- */
  var typedEl = document.getElementById('typed');
  if (typedEl && !reduceMotion) {
    var lines = ['你好，我是王塨钰', '一名内容运营梦游者', '欢迎来到我的梦境存档'];
    var li = 0, ci = 0, deleting = false;
    function type() {
      var line = lines[li];
      if (!deleting) {
        ci++;
        typedEl.textContent = line.slice(0, ci);
        if (ci >= line.length) {
          deleting = true;
          setTimeout(type, 2200);
          return;
        }
        setTimeout(type, 130);
      } else {
        ci--;
        typedEl.textContent = line.slice(0, ci);
        if (ci <= 0) {
          deleting = false;
          li = (li + 1) % lines.length;
          setTimeout(type, 500);
          return;
        }
        setTimeout(type, 45);
      }
    }
    typedEl.textContent = '';
    setTimeout(type, 600);
  }

  /* ---------- reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- skill bars ---------- */
  var bars = document.querySelectorAll('.bar');
  bars.forEach(function (bar) {
    var val = parseInt(bar.getAttribute('data-val'), 10) || 0;
    for (var i = 0; i < 10; i++) {
      var seg = document.createElement('span');
      seg.className = 'seg';
      bar.appendChild(seg);
    }
  });
  function fillBar(bar) {
    var val = parseInt(bar.getAttribute('data-val'), 10) || 0;
    var segs = bar.querySelectorAll('.seg');
    for (var i = 0; i < val && i < segs.length; i++) {
      (function (idx) {
        setTimeout(function () { segs[idx].classList.add('on'); }, reduceMotion ? 0 : idx * 70);
      })(i);
    }
  }
  if ('IntersectionObserver' in window) {
    var bio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          fillBar(e.target);
          bio.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    bars.forEach(function (b) { bio.observe(b); });
  } else {
    bars.forEach(fillBar);
  }

  /* ---------- mouse parallax on hero props ---------- */
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    var hero = document.querySelector('.hero');
    var sun = document.querySelector('.hero-sun');
    var moon = document.querySelector('.hero-moon');
    var ghost = document.querySelector('.hero-ghost');
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5;
      var dy = (e.clientY - r.top) / r.height - 0.5;
      if (sun) sun.style.marginLeft = (dx * 18) + 'px';
      if (moon) moon.style.marginRight = (dx * -26) + 'px';
      if (ghost) ghost.style.marginLeft = (dx * 10) + 'px';
    });
  }

  /* ---------- CRT toggle ---------- */
  var crtBtn = document.getElementById('crt-toggle');
  if (crtBtn) {
    crtBtn.addEventListener('click', function () {
      document.body.classList.toggle('crt-off');
      toast(document.body.classList.contains('crt-off') ? 'CRT 滤镜：OFF' : 'CRT 滤镜：ON');
    });
  }

  /* ---------- toast ---------- */
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  /* ---------- konami code: DREAM DEEPER ---------- */
  var seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var pos = 0;
  window.addEventListener('keydown', function (e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = (k === seq[pos]) ? pos + 1 : (k === seq[0] ? 1 : 0);
    if (pos === seq.length) {
      pos = 0;
      document.body.classList.toggle('deep-dream');
      toast(document.body.classList.contains('deep-dream')
        ? '◈ DREAM DEEPER — 梦境加深中 ◈'
        : '◈ 浮回浅层梦境 ◈');
    }
  });

  /* ---------- secret click on ghost ---------- */
  var ghostEl = document.querySelector('.hero-ghost');
  var ghostClicks = 0;
  if (ghostEl) {
    ghostEl.addEventListener('click', function () {
      ghostClicks++;
      var lines = ['(´･ω･`) ?', 'Zzz…', '要一起做梦吗', '梦核浓度 +1'];
      toast(lines[ghostClicks % lines.length]);
    });
  }
})();
