/* この端末の計測設定（notrack.html・社内用）
   localStorage hk_notrack：「1」＝数えない／「test」＝テストで数える（コンテンツグループ「社内テスト」。HSK-COUNT のふだんの数字には入らない）／なし＝お客様と同じ。
   ?set=off|test|on を付けて開くと、その設定にする（HSK-COUNT のQRから一度で切り替えられる）。 */
(function () {
  "use strict";
  var LABEL = { off: "数えない", test: "テストで数える", on: "お客様と同じに数える" };
  function get() {
    try { var v = localStorage.getItem("hk_notrack"); return v === "1" ? "off" : v === "test" ? "test" : "on"; }
    catch (e) { return null; }
  }
  function set(v) {
    try {
      if (v === "off") localStorage.setItem("hk_notrack", "1");
      else if (v === "test") localStorage.setItem("hk_notrack", "test");
      else localStorage.removeItem("hk_notrack");
      return true;
    } catch (e) { return false; }
  }
  function show(msg) {
    var cur = get(), now = document.getElementById("ntNow");
    document.querySelectorAll(".nt-opt").forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-v") === cur ? "true" : "false"); });
    if (cur === null) { now.textContent = "このブラウザでは設定を保存できません（プライベートブラウズなど）"; now.className = "nt-now ng"; return; }
    now.textContent = (msg ? msg + "\n" : "") + "いまの設定：" + LABEL[cur];
    now.className = "nt-now " + cur;
  }
  var m = location.search.match(/[?&]set=(off|test|on)/);
  if (m) { set(m[1]); history.replaceState(null, "", location.pathname); show("切り替えました。"); }
  else show("");
  document.querySelectorAll(".nt-opt").forEach(function (b) {
    b.addEventListener("click", function () { if (set(b.getAttribute("data-v"))) show("切り替えました。"); });
  });
})();
