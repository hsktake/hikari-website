/* 店舗一覧：絞り込みと表示 */
(function () {
  "use strict";

  var SHOPS = window.SHOPS || [];
  var PREFS = ["茨城", "栃木", "千葉", "福島"];
  var BRAND = "カットハウスひかり";
  var IMG_BASE = "https://www.cut-hikari.com/image/";
  var SHOP_PAGE = "https://www.cut-hikari.info/HO0010?shop_code=";
  // 試作用にサイト内へ取り込んだ店舗写真（他は本番ドメインで表示される）
  var LOCAL_PHOTOS = ["p07","p20","p29","p48","p51","p60","p69","p71","p76","p78","p86","p88","p90","p91","p95"];

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
    s.hasCare = s.note.indexOf("脱毛") >= 0;
    s.isOther = s.note.indexOf("別業態") >= 0;
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

    var photo = el("div", "shop-photo");
    photo.appendChild(el("span", "ph", "準備中"));
    if (s.img) {
      var img = document.createElement("img");
      img.loading = "lazy";
      img.alt = "";
      var local = LOCAL_PHOTOS.indexOf(s.img.replace(".png", "")) >= 0;
      img.src = local ? "assets/shops/" + s.img.replace(".png", ".jpg") : IMG_BASE + s.img;
      img.addEventListener("error", function () { img.remove(); });
      photo.appendChild(img);
    }
    photo.appendChild(el("span", "pref-tag", s.city));
    li.appendChild(photo);

    var body = el("div", "shop-body");
    var h3 = el("h3");
    if (s.name.indexOf(BRAND) === 0) {
      h3.appendChild(el("span", "brand-small", BRAND));
      h3.appendChild(document.createTextNode(s.name.slice(BRAND.length)));
    } else {
      h3.textContent = s.name;
    }
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
    if (s.hasCare) tags.appendChild(el("span", "tag tag-care", "ヒゲ脱毛・光フェイシャル"));
    if (s.isOther) tags.appendChild(el("span", "tag tag-other", s.note.indexOf("男性専用") >= 0 ? "別ブランド・男性専用" : "別ブランド"));
    if (s.note.indexOf("駅チカ") >= 0) tags.appendChild(el("span", "tag", "駅チカ"));
    if (s.note.indexOf("Wi-Fiなし") < 0) tags.appendChild(el("span", "tag", "フリーWi-Fi"));
    body.appendChild(tags);

    var act = el("div", "shop-actions");
    var a1 = el("a", "primary", "店舗ページ");
    a1.href = SHOP_PAGE + s.code;
    a1.rel = "noopener";
    var a2 = el("a", "secondary", "地図を開く");
    a2.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(s.name + " " + s.address);
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
      if (state.care && !s.hasCare) return false;
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

  var fromHash = decodeURIComponent(location.hash.slice(1));
  setPref(PREFS.indexOf(fromHash) >= 0 ? fromHash : "すべて", false);
})();
