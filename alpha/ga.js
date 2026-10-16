/* アクセス解析（Googleアナリティクス 4。カットハウスひかりと同じプロパティ。コンテンツグループ＝このお店の名前）
   ページの表示と、待ち状況・地図・電話・LINE・カットハウスひかりへのリンクのクリックを記録する。（tools/build_brands.py が作成） */
(function () {
  "use strict";
  var GA_ID = "G-P582HM9KTN";
  if (/^(localhost|127\.|\[::1\])/.test(location.hostname) || location.protocol === "file:") return;
  var me = document.currentScript;
  var NAME = (me && me.getAttribute("data-name")) || document.title;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_ID, { content_group: "グループ：" + NAME });
  var tag = document.createElement("script");
  tag.async = true;
  tag.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(tag);
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var h = a.href || "", p = { shop_name: NAME, section_name: "グループ：" + NAME };
    if (/cut-hikari\.info/.test(h)) gtag("event", "wait_status_click", p);
    else if (/goo\.gl\/maps|google\.[a-z.]+\/maps|maps\.app\.goo\.gl/.test(h)) gtag("event", "map_click", p);
    else if (/^tel:/.test(h)) { p.method = "電話"; gtag("event", a.closest(".recruit") ? "recruit_contact" : "tel_click", p); }
    else if (/line\.me|lin\.ee/.test(h)) gtag("event", "line_click", p);
    else if (/instagram\.com/.test(h)) gtag("event", "instagram_click", p);
  }, true);
})();
