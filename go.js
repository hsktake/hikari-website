/* QR・リンクの中継（go.html?l=ID）
   ホームページ管理シートの「リンク・QR」タブ（集計画面の「QR・リンクを作る」で作った行）から行き先を探して移動する。
   ・行き先がサイト内（パス）：目印 utm_source/medium/campaign（＝ID）を付けて移動。ここでは計測しない（移動先で「QR・リンクから来た訪問」として数える）
   ・行き先が外部（https://〜）：ここで link_click を記録してから移動
   行き先は管理シートに登録したものだけ（勝手な飛び先は使えない）。 */
(function () {
  "use strict";
  var GA_ID = "G-P582HM9KTN";
  var SHEET_ID = "1RBR08sNvthcwJHfssDh8RFLwtZ-17URXR149_jYetzw";
  var TAB = "リンク・QR";
  var me = document.currentScript;
  var ROOT = me ? me.src.replace(/go\.js.*$/, "") : location.href.replace(/go\.html.*$/, "");
  var m = location.search.match(/[?&]l=([a-z0-9]+)/i), id = m ? m[1] : "";

  function fail(msg) {
    document.getElementById("msg").textContent = msg;
    document.getElementById("home").hidden = false;
  }
  function parseCsv(t) {
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  function withUtm(url, kind) {
    var hash = "", k = url.indexOf("#");
    if (k >= 0) { hash = url.slice(k); url = url.slice(0, k); }
    var s = kind === "QR" ? "qr" : "link";
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "utm_source=" + s + "&utm_medium=" + s + "&utm_campaign=" + encodeURIComponent(id) + hash;
  }
  function track(then) {
    var off = false, done = false;
    try { off = localStorage.getItem("hk_notrack") === "1"; } catch (e) { /* 読めなくても動く */ }
    if (off || /^(localhost|127\.)/.test(location.hostname)) { then(); return; }
    var go = function () { if (!done) { done = true; then(); } };
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { content_group: "リンク" });
    window.gtag("event", "link_click", { event_callback: go, event_timeout: 1500 });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    setTimeout(go, 1800);
  }

  if (!id) { fail("リンクが正しくありません"); return; }
  fetch("https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?tqx=out:csv&sheet=" + encodeURIComponent(TAB) + "&_=" + Date.now())
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (csv) {
      var rows = parseCsv(csv), head = rows.shift() || [];
      var col = function (name) { for (var i = 0; i < head.length; i++) if (String(head[i]).trim() === name) return i; return -1; };
      var ci = col("ID"), cd = col("行き先"), ck = col("種類"), cs = col("状態");
      var row = rows.filter(function (r) { return String(r[ci]).trim() === id; })[0];
      if (!row) { fail("このリンクは見つかりませんでした"); return; }
      if (cs >= 0 && String(row[cs]).trim() === "止める") { fail("このリンクの受付は終了しました"); return; }
      var dest = String(row[cd] || "").trim(), kind = String(row[ck] || "").trim();
      if (/^https:\/\//i.test(dest)) { track(function () { location.replace(dest); }); return; }
      if (/^[a-z0-9_\-\/\.#]*$/i.test(dest) && dest.indexOf("..") < 0) { location.replace(withUtm(ROOT + dest.replace(/^\/+/, ""), kind)); return; }
      fail("このリンクの行き先が正しくありません");
    })
    .catch(function () { fail("移動できませんでした。時間をおいてもう一度お試しください"); });
})();
