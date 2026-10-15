/* 下までスクロールしたら「ページの一番上へ」ボタンを出す */
(function () {
  function init() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "to-top";
    btn.setAttribute("aria-label", "ページの一番上へ戻る");
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14l6-6 6 6"/></svg><span>TOP</span>';
    document.body.appendChild(btn);
    var shown = false;
    function check() {
      var on = window.scrollY > 600;
      if (on !== shown) { shown = on; btn.classList.toggle("is-on", on); }
    }
    window.addEventListener("scroll", check, { passive: true });
    check();
    btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
