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
      // PC：メニューの外をクリック・Escキーで閉じる
      function closeMenu() {
        header.classList.remove("is-open");
        menuBtn.setAttribute("aria-expanded", "false");
        document.documentElement.classList.remove("nav-lock");
      }
      document.addEventListener("click", function (e) {
        if (header.classList.contains("is-open") && !header.contains(e.target)) closeMenu();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && header.classList.contains("is-open")) { closeMenu(); menuBtn.focus(); }
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
  /* Q&A のジャンル切り替え（タブ） */
  ready(function () {
    document.querySelectorAll("[data-tabs]").forEach(function (box) {
      var tabs = box.querySelectorAll('[role="tab"]');
      function show(t) {
        tabs.forEach(function (x) {
          var on = x === t;
          x.setAttribute("aria-selected", on ? "true" : "false");
          x.tabIndex = on ? 0 : -1;
          var p = document.getElementById(x.getAttribute("aria-controls"));
          if (p) p.hidden = !on;
        });
      }
      tabs.forEach(function (t, i) {
        t.addEventListener("click", function () { show(t); });
        t.addEventListener("keydown", function (e) {
          var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (!d) return;
          var n = tabs[(i + d + tabs.length) % tabs.length];
          n.focus(); show(n);
        });
      });
      if (tabs.length) show(tabs[0]);
    });
  });
  /* 下までスクロールしたら「ページの一番上へ」ボタンを出す */
  ready(function () {
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
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
})();

/* ===== ホームページ管理シート（Googleスプレッドシート）から、店舗の予定・料金・採用を読み込む =====
   シートが読めないときは、HTML に書いてある内容をそのまま表示する。 */
(function () {
  "use strict";
  var SHEET_ID = "1RBR08sNvthcwJHfssDh8RFLwtZ-17URXR149_jYetzw";
  var CACHE_MIN = 0; // 同じタブを何分おきに読み直すか
  var BAR_DAYS = 14; // 「全店舗」の休業を、何日前から全ページの上の帯に出すか
  var script = document.currentScript;
  var BASE = script ? script.src.replace(/[^/]*$/, "") : location.href.replace(/[^/]*$/, "");

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // CSV を行の配列に（"" で囲んだ改行・カンマにも対応）
  function parseCSV(text) {
    var rows = [], row = [], cur = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); rows.push(row); row = []; cur = "";
      } else cur += c;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  // need：1行目（見出し）にあるはずの文字。違うタブが返ってきたときは使わない
  var loading = {};
  function load(tab, need) {
    if (loading[tab]) return loading[tab];
    var key = "hk-sheet:" + tab;
    try {
      var c = JSON.parse(sessionStorage.getItem(key) || "null");
      if (c && Date.now() - c.t < CACHE_MIN * 60000) return Promise.resolve(c.rows);
    } catch (e) {}
    var url = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?tqx=out:csv&headers=1&sheet=" + encodeURIComponent(tab) + "&_=" + Date.now();
    return (loading[tab] = fetch(url, { credentials: "omit" }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (t) {
      if (/^\s*</.test(t)) throw new Error("not csv"); // ログイン画面などが返ってきたとき
      var all = parseCSV(t);
      if (need && !need.test((all[0] || []).join(","))) throw new Error("wrong tab");
      var rows = all.slice(1).filter(function (r) {
        return r.some(function (v) { return v.trim() !== ""; });
      });
      try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), rows: rows })); } catch (e) {}
      return rows;
    }));
  }
  function toDate(s) {
    var m = String(s || "").match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  var WD = "日月火水木金土";
  function fmtDay(d, withYear) {
    return (withYear ? d.getFullYear() + "/" : "") + (d.getMonth() + 1) + "/" + d.getDate() + "（" + WD[d.getDay()] + "）";
  }
  function money(v) {
    var n = String(v).replace(/[^\d]/g, "");
    return n ? Number(n).toLocaleString("ja-JP") : "";
  }
  function href(link) {
    try { return new URL(link, BASE).href; } catch (e) { return ""; }
  }

  // 料金：data-price="キー" の数字を置きかえる
  function prices() {
    var els = document.querySelectorAll("[data-price]");
    if (!els.length) return;
    load("料金", /金額/).then(function (rows) {
      var map = {};
      rows.forEach(function (r) { var v = money(r[2]); if (r[0] && v) map[r[0].trim()] = v; });
      els.forEach(function (el) {
        var v = map[el.getAttribute("data-price")];
        if (v) el.textContent = v;
      });
    }).catch(function () {});
  }

  // 「店舗の予定」タブ（日付・店舗・内容・時刻・理由）。休業も営業時間の変更もここ。1日1行
  function plan() {
    return load("店舗の予定", /内容/).then(planItems);
  }
  // 行を { s:開始日, e:終了日, shop, kind:"休業"|"変更", why, html:お知らせページ用, own:店舗ページ用 } に。
  // 過ぎた日は除く。同じ店舗の休業が続く日は「10/17〜10/18」のように1つにまとめる
  function planItems(rows) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var list = [];
    rows.forEach(function (r) {
      var s = toDate(r[0]), shop = (r[1] || "").trim(), naiyo = (r[2] || "").trim();
      var tm = String(r[3] || "").match(/(\d{1,2}):(\d{2})/), why = (r[4] || "").trim();
      if (!s || !shop || s < today) return;
      var all = shop === "全店舗", html, own, kind;
      if (!naiyo || /休業|休み/.test(naiyo)) {
        kind = "休業";
        html = all ? "<strong>全店舗休業</strong>" : esc(shop);
        own = all ? "<strong>全店舗休業</strong>" : "<strong>休業</strong>";
        if (why) { html += "（" + esc(why) + "）"; own += "（" + esc(why) + "）"; }
      } else {
        kind = "変更";
        var t = tm ? +tm[1] + ":" + tm[2] : "";
        var body = /定休日/.test(naiyo) ? WD[s.getDay()] + "曜ですが営業いたします。"
          : /終了/.test(naiyo) && t ? t + "営業終了"
          : /開始/.test(naiyo) && t ? t + "から営業"
          : naiyo;
        if (why && !/定休日/.test(naiyo)) body += "（" + why + "）";
        html = (all ? "<strong>全店舗</strong>" : esc(shop)) + "　" + esc(body);
        own = (all ? "全店舗　" : "") + esc(body);
      }
      list.push({ s: s, e: null, shop: shop, kind: kind, why: why, html: html, own: own });
    });
    list.sort(function (a, b) { return a.s - b.s; });
    var out = [], last = {};
    list.forEach(function (it) {
      var k = it.shop + "|" + it.kind + "|" + it.html, p = last[k];
      if (p) {
        var gap = Math.round((it.s - (p.e || p.s)) / 86400000);
        if (gap === 0) return; // 同じ行が2つあるとき
        if (gap === 1 && it.kind === "休業") { p.e = it.s; return; }
      }
      last[k] = it; out.push(it);
    });
    return out;
  }
  function dayLabel(g) {
    return g.s.getFullYear() + "/" + fmtDay(g.s, false) + (g.e ? "〜" + fmtDay(g.e, g.e.getFullYear() !== g.s.getFullYear()) : "");
  }
  function groupDays(items) {
    var groups = [], byKey = {};
    items.forEach(function (it) {
      var k = it.s.getTime() + "-" + (it.e ? it.e.getTime() : "");
      if (!byKey[k]) { byKey[k] = { s: it.s, e: it.e, items: [] }; groups.push(byKey[k]); }
      byKey[k].items.push(it.html);
    });
    return groups.sort(function (a, b) { return a.s - b.s || (a.e ? 1 : 0) - (b.e ? 1 : 0); });
  }
  function renderDays(groups) {
    return groups.map(function (g) {
      return '<div class="nw-day"><p class="nw-date">' + dayLabel(g) + "</p><ul>" +
        g.items.map(function (h) { return "<li>" + h + "</li>"; }).join("") + "</ul></div>";
    }).join("");
  }

  // お知らせページの「休業情報」（data-sheet="休業"）と「営業時間変更情報」（data-sheet="営業時間変更"）
  function days(box, which) {
    var kind = which === "休業" ? "休業" : "変更";
    plan().then(function (items) {
      var groups = groupDays(items.filter(function (it) { return it.kind === kind; }));
      box.innerHTML = groups.length ? renderDays(groups) : '<p class="nw-none">現在、予定はありません。</p>';
      var upd = box.parentNode.querySelector(".nw-upd");
      if (upd) upd.hidden = true;
    }).catch(function () {});
  }

  // 店舗ページ：その店舗（と全店舗）の予定だけを出す
  function shopDays(box) {
    var name = box.getAttribute("data-shop");
    plan().then(function (items) {
      var mine = items.filter(function (it) { return it.shop === name || it.shop === "全店舗"; });
      if (!mine.length) return;
      box.innerHTML = '<p class="sps-h"><span aria-hidden="true">!</span>臨時休業・営業時間の変更</p><ul class="sps-list">' +
        mine.map(function (it) { return "<li><b>" + dayLabel(it).replace(/^\d{4}\//, "") + "</b><span>" + it.own + "</span></li>"; }).join("") + "</ul>" +
        '<a class="sps-more" href="' + esc(href("news.html#eigyo")) + '">ほかの店舗の情報も見る ›</a>';
      box.hidden = false;
    }).catch(function () {});
  }

  // 全ページのいちばん上の帯（自動）：近づいた「全店舗」の休業
  function notice() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var limit = new Date(today.getTime() + BAR_DAYS * 86400000);
    plan().then(function (items) {
      items.filter(function (it) { return it.shop === "全店舗" && it.kind === "休業" && it.s <= limit; }).slice(0, 2).forEach(function (it) {
        var when = it.s <= today && !it.e ? "本日" : fmtDay(it.s, false) + (it.e ? "〜" + fmtDay(it.e, false) : "");
        var why = it.why.replace(/のため$/, "");
        var bar = document.createElement("div");
        bar.className = "site-notice";
        bar.innerHTML = '<a href="' + esc(href("news.html#eigyo")) + '"><span class="sn-ic" aria-hidden="true">!</span><span>' +
          esc(when + "は" + (why ? why + "のため" : "") + "全店舗休業です") + '</span><span class="sn-go" aria-hidden="true">›</span></a>';
        header.parentNode.insertBefore(bar, header);
      });
    }).catch(function () {});
  }

  // 採用：募集停止の職種に印。「応募フォームのURL」の行にURLがあれば、相談・見学・応募のボタンをフォームへ
  function recruit() {
    var jobs = document.querySelectorAll("[data-job]"), entries = document.querySelectorAll("[data-entry]");
    if (!jobs.length && !entries.length) return;
    load("採用", /職種/).then(function (rows) {
      var closed = {}, url = "";
      rows.forEach(function (r) {
        if (/応募フォーム/.test(r[1] || "")) { if (/^https:\/\//.test((r[2] || "").trim())) url = r[2].trim(); }
        else if (/停止/.test(r[2] || "")) closed[(r[0] || "").trim()] = true;
      });
      jobs.forEach(function (el) {
        if (!closed[el.getAttribute("data-job")]) return;
        el.classList.add("is-closed");
        var tag = document.createElement(el.tagName === "LI" ? "span" : "p");
        tag.className = "rq-closed";
        tag.textContent = "現在、募集していません";
        var at = el.querySelector(".rq-job-body, .rq-jhero-copy h1");
        if (at && at.tagName === "H1") at.parentNode.insertBefore(tag, at.nextSibling);
        else if (at) at.insertBefore(tag, at.firstChild);
      });
      if (url) entries.forEach(function (a) {
        a.href = url; a.target = "_blank"; a.rel = "noopener";
        var sp = a.querySelector("span");
        if (sp) sp.textContent = a.getAttribute("data-entry") + "フォームへ";
      });
    }).catch(function () {});
  }

  ready(function () {
    if (!window.fetch || !SHEET_ID) return;
    notice();
    prices();
    recruit();
    document.querySelectorAll("[data-shop]").forEach(shopDays);
    document.querySelectorAll("[data-sheet]").forEach(function (box) { days(box, box.getAttribute("data-sheet")); });
  });
})();
