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
    var targets = document.querySelectorAll(".reveal, .compare");
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
