/* 店舗一覧：絞り込みと表示 */
(function () {
  "use strict";

  var SHOPS = window.SHOPS || [];
  var PREFS = ["茨城", "栃木", "千葉", "福島"];
  var BRAND = "カットハウスひかり";
  var state = { pref: "すべて", q: "", care: false, open: false };

  var $q = document.getElementById("q");
  var $tabs = document.getElementById("tabs");
  var $list = document.getElementById("list");
  var $count = document.getElementById("count");
  var $care = document.getElementById("f-care");
  var $open = document.getElementById("f-open");

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // 表記ゆれ（ヶ/ケ、全角半角）を吸収して検索しやすくする
  function norm(s) {
    return (s || "").normalize("NFKC").toLowerCase().replace(/[ヶヵ]/g, "ケ").replace(/\s+/g, "");
  }

  SHOPS.forEach(function (s) {
    s.noHoliday = s.holiday === "無休";
    s.key = norm(s.name + s.city + s.address);
  });

  // ---- エリアのタブ ----
  ["すべて"].concat(PREFS).forEach(function (p) {
    var b = el("button", "tab");
    b.type = "button";
    b.dataset.pref = p;
    b.appendChild(document.createTextNode(p));
    var n = p === "すべて" ? SHOPS.length : SHOPS.filter(function (s) { return s.p === p; }).length;
    b.appendChild(el("small", null, String(n)));
    b.addEventListener("click", function () { setPref(p, true); });
    $tabs.appendChild(b);
  });

  function setPref(p, push) {
    state.pref = p;
    Array.prototype.forEach.call($tabs.children, function (b) {
      b.setAttribute("aria-pressed", b.dataset.pref === p ? "true" : "false");
    });
    if (push) {
      var h = p === "すべて" ? location.pathname : "#" + encodeURIComponent(p);
      history.replaceState(null, "", h);
    }
    render();
  }

  // ---- 店舗カード ----
  function card(s) {
    var li = el("li", "shop");
    var page = "shop/" + s.code + ".html";

    var photo = el("a", "shop-photo" + (s.logo ? " is-logo" : ""));
    photo.href = page;
    photo.setAttribute("aria-hidden", "true");
    photo.tabIndex = -1;
    photo.appendChild(el("span", "ph", "準備中"));
    if (s.img) {
      var img = document.createElement("img");
      img.loading = "lazy";
      img.alt = "";
      img.src = s.img;
      img.addEventListener("error", function () { img.remove(); });
      photo.appendChild(img);
    }
    photo.appendChild(el("span", "pref-tag", s.city));
    li.appendChild(photo);

    var body = el("div", "shop-body");
    var h3 = el("h3");
    var link = el("a");
    link.href = page;
    if (s.name.indexOf(BRAND) === 0) {
      link.appendChild(el("span", "brand-small", BRAND));
      link.appendChild(document.createTextNode(s.name.slice(BRAND.length)));
    } else {
      link.textContent = s.name;
    }
    h3.appendChild(link);
    body.appendChild(h3);

    var dl = el("dl");
    [["住所", s.address], ["営業時間", s.hours], ["定休日", s.holiday]].forEach(function (r) {
      var d = el("div");
      d.appendChild(el("dt", null, r[0]));
      d.appendChild(el("dd", null, r[1]));
      dl.appendChild(d);
    });
    body.appendChild(dl);

    var tags = el("div", "tags");
    if (s.care) tags.appendChild(el("span", "tag tag-care", "ヒゲ脱毛・光フェイシャル"));
    if (s.other) tags.appendChild(el("span", "tag tag-other", s.men ? "別ブランド・男性専用" : "別ブランド"));
    if (s.station) tags.appendChild(el("span", "tag", "駅チカ"));
    if (tags.children.length) body.appendChild(tags);

    var act = el("div", "shop-actions");
    var a1 = el("a", "primary", "店舗ページを見る");
    a1.href = page;
    var a2 = el("a", "secondary", "地図");
    a2.href = s.map;
    a2.rel = "noopener";
    a2.target = "_blank";
    act.appendChild(a1);
    act.appendChild(a2);
    body.appendChild(act);

    li.appendChild(body);
    return li;
  }

  // ---- 表示 ----
  function render() {
    var q = norm(state.q);
    var hits = SHOPS.filter(function (s) {
      if (state.pref !== "すべて" && s.p !== state.pref) return false;
      if (state.care && !s.care) return false;
      if (state.open && !s.noHoliday) return false;
      if (q && s.key.indexOf(q) < 0) return false;
      return true;
    });

    $count.textContent = "";
    $count.appendChild(document.createTextNode(state.pref === "すべて" ? "全エリア" : state.pref + "県"));
    $count.appendChild(el("strong", null, String(hits.length)));
    $count.appendChild(document.createTextNode("店舗"));

    $list.textContent = "";
    if (!hits.length) {
      var empty = el("div", "empty");
      empty.appendChild(el("p", null, "条件に合う店舗が見つかりません。市町村名や、近くのお店の名前でもお探しいただけます。"));
      var reset = el("button", "btn btn-ghost", "条件をクリアする");
      reset.type = "button";
      reset.addEventListener("click", function () {
        state.q = ""; $q.value = "";
        state.care = state.open = false; $care.checked = $open.checked = false;
        setPref("すべて", true);
      });
      empty.appendChild(reset);
      $list.appendChild(empty);
      return;
    }

    // 県ごとにまとめ、県の中は市町村順に並べる
    PREFS.forEach(function (pref) {
      var items = hits.filter(function (s) { return s.p === pref; });
      if (!items.length) return;
      // 並び順は現行サイトの掲載順（市町村の読み順）をそのまま使う
      var sec = el("section", "city-group");
      var h = el("h2", "city-name", pref + "県");
      h.appendChild(el("small", null, items.length + "店舗"));
      sec.appendChild(h);
      var ul = el("ul", "shop-grid");
      items.forEach(function (s) { ul.appendChild(card(s)); });
      sec.appendChild(ul);
      $list.appendChild(sec);
    });
  }

  $q.addEventListener("input", function () { state.q = $q.value; render(); });
  $care.addEventListener("change", function () { state.care = $care.checked; render(); });
  $open.addEventListener("change", function () { state.open = $open.checked; render(); });

  // トップページの検索欄から来たときは、その言葉で絞り込む
  var qParam = new URLSearchParams(location.search).get("q");
  if (qParam) { state.q = qParam; $q.value = qParam; }

  var fromHash = decodeURIComponent(location.hash.slice(1));
  setPref(PREFS.indexOf(fromHash) >= 0 ? fromHash : "すべて", false);
})();
