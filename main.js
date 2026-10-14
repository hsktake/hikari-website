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
    var groups = ".pref-grid > li, .flow > li, .rx-staff > li, .rx-stats > li, .videos > div, .stores > a";
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
        document.documentElement.classList.toggle("nav-lock", open); // メニューを開いている間は後ろのページを動かさない
      });
      header.querySelectorAll(".nav a").forEach(function (a) {
        a.addEventListener("click", function () {
          header.classList.remove("is-open");
          menuBtn.setAttribute("aria-expanded", "false");
          document.documentElement.classList.remove("nav-lock");
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

    // 公式アプリ：できることのタブ（自動で切り替わり、さわったら止まる）
    document.querySelectorAll(".app-tabs").forEach(function (box) {
      var tabs = Array.prototype.slice.call(box.querySelectorAll('[role="tab"]'));
      var cur = 0, timer = null;
      function show(i) {
        cur = i;
        tabs.forEach(function (t, j) {
          var on = j === i;
          t.setAttribute("aria-selected", on ? "true" : "false");
          t.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(t.getAttribute("aria-controls"));
          if (panel) panel.hidden = !on;
        });
      }
      function stop() { clearInterval(timer); timer = null; }
      tabs.forEach(function (t, i) {
        t.addEventListener("click", function () { stop(); show(i); });
        t.addEventListener("keydown", function (e) {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            stop();
            var n = (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
            show(n); tabs[n].focus(); e.preventDefault();
          }
        });
      });
      timer = setInterval(function () { show((cur + 1) % tabs.length); }, 4000);
    });

    // ページ内リンク（#お知らせ）で開いたときは、その項目を開いておく
    function openFromHash() {
      var id = decodeURIComponent(location.hash.slice(1));
      var t = id && document.getElementById(id);
      if (t && t.tagName === "DETAILS") { t.open = true; t.scrollIntoView(); }
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);

    // 動画：押すと大きな画面（ポップアップ）で再生。閉じると止まる
    var lastBtn = null;
    function closeVideo() {
      var m = document.querySelector(".vmodal");
      if (!m) return;
      m.parentNode.removeChild(m); // iframe ごと消すので再生も止まる
      document.documentElement.classList.remove("modal-open");
      if (lastBtn) lastBtn.focus();
    }
    function openVideo(id, title) {
      closeVideo();
      var m = document.createElement("div");
      m.className = "vmodal";
      m.setAttribute("role", "dialog");
      m.setAttribute("aria-modal", "true");
      m.setAttribute("aria-label", title);
      var box = document.createElement("div");
      box.className = "vmodal-box";
      var x = document.createElement("button");
      x.type = "button";
      x.className = "vmodal-close";
      x.setAttribute("aria-label", "閉じる");
      x.textContent = "×";
      var frame = document.createElement("div");
      frame.className = "vmodal-frame";
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0&playsinline=1";
      f.title = title;
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      frame.appendChild(f);
      var cap = document.createElement("p");
      cap.className = "vmodal-title";
      cap.textContent = title;
      box.appendChild(x);
      box.appendChild(frame);
      box.appendChild(cap);
      m.appendChild(box);
      m.addEventListener("click", function (e) { if (e.target === m) closeVideo(); });
      x.addEventListener("click", closeVideo);
      document.body.appendChild(m);
      document.documentElement.classList.add("modal-open");
      x.focus();
    }
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeVideo(); });
    document.querySelectorAll(".video[data-id]").forEach(function (box) {
      var btn = box.querySelector("button");
      if (!btn) return;
      var wrap = box.parentNode;
      var tag = wrap.querySelector(".vt-tag"), main = wrap.querySelector(".vt-main");
      var title = ((tag ? tag.textContent + "　" : "") + (main ? main.textContent : "")) || "動画";
      btn.addEventListener("click", function () { lastBtn = btn; openVideo(box.dataset.id, title); });
    });
  });
  /* トップの家族写真を数秒ずつ切り替える */
  ready(function () {
    var box = document.querySelector("[data-slides]");
    if (!box) return;
    var imgs = box.querySelectorAll(".hero-photo");
    if (imgs.length < 2) return;
    var i = 0;
    setInterval(function () {
      if (document.hidden) return;
      imgs[i].classList.remove("is-on");
      i = (i + 1) % imgs.length;
      imgs[i].classList.add("is-on");
    }, 4500);
  });
  /* 「アプリで予約する」：スマホではその機種のダウンロードページへ */
  ready(function () {
    var ua = navigator.userAgent || "";
    var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
    var android = /Android/.test(ua);
    document.querySelectorAll("[data-app-link]").forEach(function (a) {
      if (ios) a.href = a.getAttribute("data-ios");
      else if (android) a.href = a.getAttribute("data-android");
      if (ios || android) a.rel = "noopener";
    });
  });
  /* 「画面で手順を見る」：閉じている説明を開いてそこへ移動 */
  ready(function () {
    document.querySelectorAll("[data-open-details]").forEach(function (a) {
      a.addEventListener("click", function () {
        var d = document.querySelector(a.getAttribute("href"));
        if (d && d.tagName === "DETAILS") d.open = true;
      });
    });
  });
})();
