/* カットハウスひかり：動きと動画 */
(function () {
  "use strict";
  // JS が動くときだけ「スクロールで現れる」演出を使う
  document.documentElement.classList.add("js");

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    // 中身を1つずつ順番にポンッと出す（リストの子要素に番号をふる）
    var groups = ".pref-grid > li, .flow > li, .app-points > li, .rc-stats > li, .rc-jobs > li, .rc-tags > li, .videos > div, .stores > a";
    document.querySelectorAll(groups).forEach(function (el) {
      var i = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.classList.add("rv");
      el.style.setProperty("--i", i);
    });
    // 横に並んだ .reveal 同士（メニューのカードなど）も少しずつずらす
    document.querySelectorAll(".reveal").forEach(function (el) {
      var sib = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains("reveal"); });
      if (sib.length > 1 && el.parentNode.classList.contains("menu-cards")) el.style.setProperty("--i", sib.indexOf(el));
    });

    var targets = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.18, rootMargin: "0px 0px -40px 0px" });
      targets.forEach(function (t) { io.observe(t); });
    } else {
      targets.forEach(function (t) { t.classList.add("is-in"); });
    }

    // スマホ用メニュー
    var header = document.querySelector(".site-header");
    var menuBtn = document.querySelector(".menu-btn");
    if (header && menuBtn) {
      menuBtn.addEventListener("click", function () {
        var open = header.classList.toggle("is-open");
        menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      header.querySelectorAll(".nav a").forEach(function (a) {
        a.addEventListener("click", function () {
          header.classList.remove("is-open");
          menuBtn.setAttribute("aria-expanded", "false");
        });
      });
    }

    // ヘアカタログ：自動で流れつつ、指やマウスでもスライドできる
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll(".style-marquee").forEach(function (box) {
      var track = box.querySelector(".style-track");
      if (!track) return;
      var pos = 0, paused = false, resumeTimer = null, speed = reduce ? 0.3 : 0.5;
      function half() { return track.scrollWidth / 2; }
      function pause() { paused = true; clearTimeout(resumeTimer); }
      function resume(delay) {
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(function () { pos = box.scrollLeft; paused = false; }, delay);
      }
      box.addEventListener("touchstart", pause, { passive: true });
      box.addEventListener("touchend", function () { resume(2500); }, { passive: true });
      box.addEventListener("touchcancel", function () { resume(2500); }, { passive: true });
      box.addEventListener("mouseenter", pause);
      box.addEventListener("mouseleave", function () { resume(600); });
      box.addEventListener("scroll", function () {
        // 端まで来たら半分戻して、途切れずに続くようにする
        var h = half();
        if (box.scrollLeft >= h) { box.scrollLeft -= h; pos = box.scrollLeft; }
        else if (box.scrollLeft <= 0 && paused) { box.scrollLeft += h; pos = box.scrollLeft; }
      }, { passive: true });
      // マウスでドラッグしてもスライドできるように
      var dragging = false, startX = 0, startLeft = 0;
      box.addEventListener("mousedown", function (e) { dragging = true; startX = e.pageX; startLeft = box.scrollLeft; box.style.cursor = "grabbing"; e.preventDefault(); });
      window.addEventListener("mouseup", function () { if (dragging) { dragging = false; box.style.cursor = ""; } });
      window.addEventListener("mousemove", function (e) { if (dragging) box.scrollLeft = startLeft - (e.pageX - startX); });
      // 「動きを減らす」設定の端末でも、ゆっくり流す（オーナー指示）
      function tick() {
        if (!paused && !document.hidden) {
          if (Math.abs(box.scrollLeft - pos) > 2) pos = box.scrollLeft;
          pos += speed;
          if (pos >= half()) pos -= half();
          box.scrollLeft = pos;
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });

    // 動画はクリックしたときだけ読み込む（ページを軽く保つため）
    document.querySelectorAll(".video[data-id]").forEach(function (box) {
      var btn = box.querySelector("button");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var f = document.createElement("iframe");
        f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(box.dataset.id) + "?autoplay=1&rel=0";
        f.title = btn.getAttribute("aria-label") || "動画";
        f.allow = "autoplay; encrypted-media; picture-in-picture";
        f.allowFullscreen = true;
        f.loading = "lazy";
        box.textContent = "";
        box.appendChild(f);
      });
    });
  });
})();
