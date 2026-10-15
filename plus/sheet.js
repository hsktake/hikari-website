/* ホームページ管理シート（カットハウスひかりと同じシート）の「店舗情報」「料金」を読んで、
   営業時間・定休日・閉店のお知らせ・料金を最新にする。読めないときは書いてある内容のまま。（tools/build_brands.py が作成） */
(function () {
  "use strict";
  var SHEET_ID = "1RBR08sNvthcwJHfssDh8RFLwtZ-17URXR149_jYetzw";
  var CODE = document.body.getAttribute("data-code");
  var CLOSED_TEXT = "この店舗は閉店いたしました。長らくのご利用、誠にありがとうございました。";
  if (!window.fetch || !CODE) return;
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function parseCSV(text) {
    var rows = [], row = [], cur = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += c;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  function load(tab, need) {
    var url = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?tqx=out:csv&headers=1&sheet=" + encodeURIComponent(tab) + "&_=" + Date.now();
    return fetch(url, { credentials: "omit" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (t) {
      if (/^\s*</.test(t)) throw new Error("not csv");
      var rows = parseCSV(t);
      if (!need.test((rows[0] || []).join(","))) throw new Error("wrong tab");
      return rows;
    });
  }
  function col(head, re, def) {
    for (var i = 0; i < head.length; i++) if (re.test(head[i])) return i;
    return def;
  }
  function hoursNotes(h) {
    var m = String(h).match(/^(\d{1,2}):(\d{2})〜(\d{1,2}):(\d{2})$/);
    if (!m) return [];
    var t = +m[3] + "時" + (m[4] !== "00" ? +m[4] + "分" : "");
    return ["ご案内の目安の時刻が" + t + "以降となるチケットは購入できません。", "混雑状況によって" + t + "より早く受付を終了する場合があります。"];
  }
  function ready(fn) { if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }

  ready(function () {
    // 料金
    var els = document.querySelectorAll("[data-price]");
    if (els.length) load("料金", /金額/).then(function (rows) {
      var map = {};
      rows.slice(1).forEach(function (r) { var n = String(r[2] || "").replace(/[^\d]/g, ""); if (r[0] && n) map[r[0].trim()] = Number(n).toLocaleString("ja-JP"); });
      els.forEach(function (el) { var v = map[el.getAttribute("data-price")]; if (v) el.textContent = v; });
    }).catch(function () {});
    // 店舗情報（営業時間・定休日・閉店）
    load("店舗情報", /営業時間/).then(function (rows) {
      var h = rows[0], cC = col(h, /コード/, 0), cH = col(h, /営業時間/, 2), cD = col(h, /定休日/, 3), cS = col(h, /状態/, 5);
      var r = rows.slice(1).filter(function (r) { return ("0000" + String(r[cC] || "").trim()).slice(-5) === CODE; })[0];
      if (!r) return;
      var hours = String(r[cH] || "").trim(), hol = String(r[cD] || "").trim();
      var eh = document.querySelector('[data-sf="hours"]'), en = document.querySelector('[data-sf="notes"]'), ed = document.querySelector('[data-sf="holiday"]');
      if (eh && hours && hours !== eh.getAttribute("data-base") && hours !== eh.textContent) {
        eh.textContent = hours;
        if (en) en.innerHTML = hoursNotes(hours).map(function (n) { return "<br><small>※" + esc(n) + "</small>"; }).join("");
      }
      if (ed && hol && hol !== ed.getAttribute("data-base")) ed.textContent = hol;
      if (/閉店/.test(r[cS] || "") && !document.querySelector(".closed-note")) {
        var main = document.querySelector("main"), n = document.createElement("div");
        n.className = "closed-note";
        n.innerHTML = "<p>" + esc(CLOSED_TEXT) + "</p>";
        if (main) main.insertBefore(n, main.firstChild);
      }
    }).catch(function () {});
  });
})();
