/* お問い合わせフォーム（contact.html）
   ・質問・県ごとの店舗は HSK-VOICE お問い合わせフォーム（GAS）から読み込む（?api=layout）
   ・送信は同じ GAS に POST（本文は JSON。写真は画面で縮めた JPEG を5枚まで）
   ・URL の ?from=受付媒体 で「どこから来たか」を記録。なければ スマホ／パソコン のHP
*/
(function () {
  "use strict";
  var box = document.getElementById("cf");
  if (!box) return;
  var API = box.getAttribute("data-api");
  var MAX = 5, PH = [], L = null, Q = null;
  var FROM = (function () {
    var f = "";
    try { f = new URLSearchParams(location.search).get("from") || ""; } catch (e) {}
    f = f.replace(/[<>"'&\\]/g, "").trim().slice(0, 40);
    if (f) return f;
    var sp = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent) || (window.matchMedia && matchMedia("(max-width: 768px)").matches);
    return sp ? "メール（スマホHP）" : "メール（パソコンHP）";
  })();

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function tag(r) { return r ? '<span class="cf-req">必須</span>' : '<span class="cf-opt">任意</span>'; }
  function q(id, title, req, help, inner) {
    return '<div class="cf-q" id="q-' + id + '"><label class="cf-t" for="f-' + id + '">' + esc(title) + tag(req) + '</label>' +
      (help ? '<p class="cf-help">' + esc(help) + '</p>' : '') + inner + '<p class="cf-err" role="alert"></p></div>';
  }
  function chips(name, opts) {
    return '<div class="cf-chips" role="radiogroup">' + opts.map(function (o) {
      return '<label><input type="radio" name="' + name + '" value="' + esc(o) + '"><span>' + esc(o) + '</span></label>';
    }).join("") + '</div>';
  }
  function sel(id, opts) {
    return '<select id="f-' + id + '"><option value="">選択してください</option>' + opts.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join("") + '</select>';
  }

  function fail() {
    box.innerHTML = '<p class="cf-load">フォームを読み込めませんでした。<br>お手数ですが、ページを読み込み直すか、下のお電話・メールでお問い合わせください。</p>';
  }

  function load() {
    var done = false, t = setTimeout(function () { if (!done) fail(); }, 25000);
    fetch(API + "?api=layout", { method: "GET" }).then(function (r) { return r.json(); }).then(function (x) {
      done = true; clearTimeout(t);
      if (!x || !x.ok || !x.layout) return fail();
      L = x.layout; Q = L.q; render();
    }).catch(function () { done = true; clearTimeout(t); fail(); });
  }

  function render() {
    var h = '<div class="cf-msg" id="cf-msg"></div>';
    h += q("name", "お名前", 1, "フルネームでご記入ください。", '<input type="text" id="f-name" autocomplete="name" maxlength="60">');
    h += q("mail", "メールアドレス", 1, "ご返信はこちらのアドレスにお送りします。お間違いのないようご確認ください。", '<input type="email" id="f-mail" autocomplete="email" inputmode="email" maxlength="120">');
    h += q("kind", "お問い合わせの種類", 1, "", chips("kind", Q.kind.opts));
    h += q("pref", "ご利用の店舗がある県", 1, "ご利用になった（またはご利用予定の）店舗の県をお選びください。", sel("pref", L.prefs.map(function (p) { return p.label; })));
    h += '<div id="cf-store"></div>';
    h += q("body", "お問い合わせ内容", 1, "担当スタッフの特徴など、わかる範囲でご記入いただくと、よりスムーズにご案内できます。", '<textarea id="f-body" maxlength="4000"></textarea>');
    h += q("photo", "写真", 0, "仕上がりなど、お伝えしたいことがあれば写真を添えてください（" + MAX + "枚まで）。",
      '<label class="cf-addph"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 6l1.5-2.5h4L15.5 6"/></svg>写真を選ぶ<input type="file" id="f-photo" accept="image/*" multiple></label><div class="cf-ph" id="cf-ph"></div>');
    h += '<div class="cf-more"><p class="cf-sub">わかる範囲でご記入ください。</p>';
    if (Q.date) h += q("date", "ご利用日", 0, "ご来店された日がわかる場合は、カレンダーからお選びください。", '<input type="date" id="f-date">');
    if (Q.time) h += q("time", "ご利用の時間帯", 0, "", sel("time", Q.time.opts));
    if (Q.sex) h += q("sex", "性別", 0, "", chips("sex", Q.sex.opts));
    if (Q.age) h += q("age", "年代", 0, "", sel("age", Q.age.opts));
    if (Q.phone) h += q("phone", "電話番号", 0, "お電話でのご連絡をご希望の場合のみ、ご記入ください。", '<input type="tel" id="f-phone" autocomplete="tel" inputmode="tel" maxlength="20">');
    h += '</div>';
    h += '<div class="cf-hp" aria-hidden="true"><input type="text" id="f-hp" tabindex="-1" autocomplete="off"></div>';
    h += '<p class="cf-agree">ご入力いただいた個人情報は、<a href="privacy.html">プライバシーポリシー</a>に基づき適切に取り扱います。</p>';
    h += '<button type="button" class="btn btn-main cf-send" id="cf-send">送信する</button>';
    box.innerHTML = h;
    $("f-pref").addEventListener("change", storeBox);
    $("f-photo").addEventListener("change", addPhotos);
    $("cf-send").addEventListener("click", send);
    box.addEventListener("input", clearBad);
    box.addEventListener("change", clearBad);
  }

  function clearBad(e) { var x = e.target.closest && e.target.closest(".cf-q"); if (x && x.id !== "q-photo") x.classList.remove("bad"); }
  function prefOf() { var v = $("f-pref").value; return L.prefs.filter(function (p) { return p.label === v; })[0]; }
  function storeBox() {
    var p = prefOf();
    $("cf-store").innerHTML = p && p.stores.length ? q("store", "ご利用店舗（" + p.label + "）", 1, "一覧からお選びください。", sel("store", p.stores)) : "";
  }

  function addPhotos(e) {
    var files = [].slice.call(e.target.files || []); e.target.value = "";
    files.forEach(function (f) {
      if (PH.length >= MAX) { bad("photo", "写真は" + MAX + "枚までです"); return; }
      if (!/^image\//.test(f.type) && !/\.(jpe?g|png|heic|heif|webp)$/i.test(f.name)) { bad("photo", "画像のファイルを選んでください"); return; }
      var slot = { data: "" }; PH.push(slot); drawPh();
      shrink(f, function (d) { slot.data = d; drawPh(); }, function () {
        PH.splice(PH.indexOf(slot), 1); drawPh(); bad("photo", "この写真は読み込めませんでした。別の写真をお試しください");
      });
    });
  }
  function shrink(f, ok, ng) {
    var img = new Image(), u = URL.createObjectURL(f);
    img.onload = function () {
      var m = 1600, w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, m / Math.max(w, h));
      var c = document.createElement("canvas"); c.width = Math.round(w * s); c.height = Math.round(h * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = function () { URL.revokeObjectURL(u); ng(); };
    img.src = u;
  }
  function drawPh() {
    var b = $("cf-ph");
    b.innerHTML = PH.map(function (p, i) {
      return '<div>' + (p.data ? '<img src="' + p.data + '" alt="">' : '<span class="cf-spin" aria-label="読み込み中"></span>') +
        '<button type="button" data-i="' + i + '" aria-label="この写真を外す">×</button></div>';
    }).join("");
    [].forEach.call(b.querySelectorAll("button"), function (x) { x.onclick = function () { PH.splice(+x.getAttribute("data-i"), 1); drawPh(); }; });
    ok("photo");
  }

  function val(id) { var e = $("f-" + id); return e ? String(e.value || "").trim() : ""; }
  function radio(n) { var e = box.querySelector('input[name="' + n + '"]:checked'); return e ? e.value : ""; }
  function bad(id, m) { var e = $("q-" + id); if (!e) return; e.classList.add("bad"); e.querySelector(".cf-err").textContent = m; }
  function ok(id) { var e = $("q-" + id); if (e) e.classList.remove("bad"); }

  function send() {
    var d = {
      name: val("name"), mail: val("mail"), kind: radio("kind"), pref: val("pref"), store: val("store"), body: val("body"),
      date: val("date"), time: val("time"), sex: radio("sex"), age: val("age"), phone: val("phone"), hp: val("hp"), from: FROM,
      photos: PH.filter(function (p) { return p.data; }).map(function (p) { return { type: "image/jpeg", data: p.data }; })
    };
    ["name", "mail", "kind", "pref", "store", "body", "phone", "photo"].forEach(ok);
    var first = null, need = function (c, id, m) { if (!c) { bad(id, m); first = first || id; } };
    need(d.name, "name", "お名前を入力してください");
    need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.mail), "mail", "メールアドレスを正しく入力してください");
    need(d.kind, "kind", "お問い合わせの種類を選んでください");
    need(d.pref, "pref", "県を選んでください");
    var p = prefOf(); if (p && p.stores.length) need(d.store, "store", "ご利用店舗を選んでください");
    need(d.body, "body", "お問い合わせ内容を入力してください");
    if (d.phone) need(/^[0-9０-９\-－ ]{10,20}$/.test(d.phone), "phone", "電話番号を正しく入力してください");
    if (PH.some(function (p) { return !p.data; })) { bad("photo", "写真を読み込み中です。少し待ってから送信してください"); first = first || "photo"; }
    if (first) { $("q-" + first).scrollIntoView({ behavior: "smooth", block: "center" }); return; }

    var b = $("cf-send"), m = $("cf-msg");
    b.disabled = true; b.textContent = "送信しています…"; m.className = "cf-msg";
    var again = function (msg) {
      b.disabled = false; b.textContent = "送信する"; m.className = "cf-msg ng";
      m.textContent = (msg || "送信できませんでした") + "。お手数ですが、もう一度お試しください。";
      m.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    fetch(API, { method: "POST", body: JSON.stringify(d) }).then(function (r) { return r.json(); }).then(function (x) {
      if (!x || !x.ok) return again(x && x.error);
      box.innerHTML = '<div class="cf-done"><p class="cf-done-ttl">送信しました</p><p>お問い合わせいただき、ありがとうございます。<br>内容を確認のうえ、担当者よりメールでご返信いたします。</p><p class="cf-help">内容によっては、ご返信までにお時間をいただく場合がございます。</p></div>';
      box.scrollIntoView({ behavior: "smooth", block: "start" });
      if (typeof window.gtag === "function") window.gtag("event", "contact_form_submit", { method: "フォーム", from: FROM, photos: d.photos.length });
    }).catch(function () { again(); });
  }

  load();
})();
