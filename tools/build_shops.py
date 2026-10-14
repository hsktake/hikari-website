#!/usr/bin/env python3
"""店舗データ（data/shops.json）から、店舗一覧用の shops-data.js と
各店舗ページ shop/<店舗コード>.html を作る。

使い方（リポジトリのいちばん上で）:  python3 tools/build_shops.py
店舗情報を直すときは data/shops.json を直してから、これを実行する。
"""
import html
import json
import os
import re
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREFS = ["茨城", "栃木", "千葉", "福島"]
BRAND = "カットハウスひかり"
EIGYO_URL = "../news.html#eigyo"
APP_IOS = "https://apple.co/3tl829o"
APP_ANDROID = "https://play.google.com/store/apps/details?id=hsk.hims_app&hl=ja"


def esc(s):
    return html.escape(str(s), quote=True)


def zen(s):
    """半角カッコを全角にそろえる"""
    return s.replace("(", "（").replace(")", "）")


def read_version():
    with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
        m = re.search(r'style\.css\?v=(\d+)', f.read())
    return m.group(1) if m else "1"


def load():
    with open(os.path.join(ROOT, "data", "shops.json"), encoding="utf-8") as f:
        return json.load(f)


# ---------- 店舗一覧用データ ----------
def write_list_data(shops):
    rows = []
    for s in shops:
        rows.append({
            "p": s["pref"], "code": s["code"], "name": s["name"], "city": s["city"],
            "address": s["address"], "hours": s["hours"], "holiday": s["holiday"],
            "img": s["photo"] or s["logo"], "logo": bool(s["logo"] and not s["photo"]),
            "care": s["care"], "other": s["brand"] == "other", "men": s["menOnly"],
            "station": s["station"], "wifi": bool(s["wifi"]), "map": s["map"],
        })
    body = ",\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows)
    js = ("/* 店舗データ（自動生成：tools/build_shops.py が data/shops.json から作成。直接編集しない） */\n"
          "window.SHOPS = [\n" + body + "\n];\n")
    with open(os.path.join(ROOT, "shops-data.js"), "w", encoding="utf-8") as f:
        f.write(js)


# ---------- 店舗ページ ----------
CSP = ("default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; "
       "img-src 'self' data:; frame-src https://www.google.com; script-src 'self'; base-uri 'self'; form-action 'none'")

SCISSORS = ('<svg class="hero-scissors" viewBox="0 0 200 200" aria-hidden="true">'
            '<g class="blade-a" fill="currentColor"><path d="M95 103 178 8q12-4 12 8l-85 91Z"/><path d="M100 100 72 136" stroke="currentColor" stroke-width="14" stroke-linecap="round"/><circle cx="56" cy="156" r="24" fill="none" stroke="currentColor" stroke-width="14"/></g>'
            '<g class="blade-b" fill="currentColor"><path d="M105 103 22 8Q10 4 10 16l85 91Z"/><path d="M100 100l28 36" stroke="currentColor" stroke-width="14" stroke-linecap="round"/><circle cx="144" cy="156" r="24" fill="none" stroke="currentColor" stroke-width="14"/></g></svg>')

ICON = {
    "clock": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    "cal": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    "pin": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    "yen": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l6 8 6-8M12 12v8M7.5 13h9M7.5 16.5h9"/></svg>',
    "card": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/></svg>',
    "wifi": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.7 15.8a5 5 0 0 1 6.6 0"/><circle cx="12" cy="19" r="1.2" class="dot"/></svg>',
    "wait": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9"/></svg>',
    "phone": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>',
    "map": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z"/><path d="M9 4v14M15 6v14"/></svg>',
}


def head(title, desc, v, canonical_path):
    return f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<!-- 試作版のため検索エンジンに載せない（本番切り替え時に削除） -->
<meta name="robots" content="noindex, nofollow">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="theme-color" content="#EF7A00">
<link rel="icon" href="../assets/scissors.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=M+PLUS+Rounded+1c:wght@500;700;800&display=swap">
<link rel="stylesheet" href="../style.css?v={v}">
<script src="../main.js?v={v}"></script>
</head>
<body class="shop-page">
<a class="skip" href="#main">本文へ移動</a>

<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="../" aria-label="カットハウスひかり トップへ">
      <img class="brand-logo" src="../assets/logo-hikari.webp" alt="カットハウスひかり" width="356" height="218">
      <span class="brand-area"><span class="area-sub">茨城・栃木・千葉・福島</span><span class="area-main">北関東に<strong>62</strong>店舗</span></span>
    </a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav"><span class="bars" aria-hidden="true"></span><span class="menu-label">メニュー</span></button>
    <nav class="nav" id="site-nav" aria-label="メインメニュー">
      <a href="../news.html">お知らせ</a>
      <a href="../shops.html" aria-current="page">店舗を探す</a>
      <a href="../haircut.html">ヘアカット</a>
      <a href="../brow.html">眉毛カット</a>
      <a href="../facecare.html">フェイスケア</a>
      <a href="../app.html">公式アプリ</a>
      <a class="nav-recruit" href="../recruit.html">採用情報</a>
      <div class="nav-sub"><a href="../app-guide.html">アプリの使い方</a><a href="../member.html">HiCARD会員</a><a href="../faq.html">よくあるご質問</a><a href="../contact.html">お問い合わせ</a><a href=".././#company">会社案内</a><a href="../community.html">地域とともに</a><a href="https://www.instagram.com/cut_hikari/" rel="noopener">Instagram</a><a href="../privacy.html">プライバシーポリシー</a><a href="../tokushoho.html">特定商取引法に基づく表記</a></div>
    </nav>
  </div>
</header>
"""


FOOTER = """
<footer class="site-footer">
  <div class="wrap footer-inner">
    <img class="footer-logo" src="../assets/logo-hikari.webp" alt="カットハウスひかり" width="356" height="218" loading="lazy">
    <p class="footer-name">ヘアカット専門店</p>
    <nav class="footer-nav" aria-label="フッターメニュー">
      <a href=".././">ホーム</a>
      <a href="../news.html">お知らせ</a>
      <a href="../shops.html">店舗を探す</a>
      <a href="../haircut.html">ヘアカット</a>
      <a href="../brow.html">眉毛カット</a>
      <a href="../facecare.html">フェイスケア</a>
      <a href="../app.html">公式アプリ</a>
      <a href="../recruit.html">採用情報</a>
      <a href="../app-guide.html">アプリの使い方</a>
      <a href="../member.html">HiCARD会員</a>
      <a href="../faq.html">よくあるご質問</a>
      <a href="../contact.html">お問い合わせ</a>
      <a href=".././#company">会社案内</a>
      <a href="../community.html">地域とともに</a>
      <a href="https://www.instagram.com/cut_hikari/" rel="noopener">Instagram</a>
      <a href="../privacy.html">プライバシーポリシー</a>
      <a href="../tokushoho.html">特定商取引法に基づく表記</a>
    </nav>
    <p class="copy">© 1997 H.S.K</p>
  </div>
</footer>
</body>
</html>
"""


def addr_html(addr):
    """住所を空白の区切りごとにまとめ、言葉の途中で折り返さない"""
    return "".join(f'<span class="ph">{esc(p)}</span>' for p in addr.split(" ") if p)


def name_html(s):
    if s["name"].startswith(BRAND):
        return f'<span class="brand-small">{BRAND}</span>{esc(s["short"])}'
    return esc(s["name"])


def badges(s):
    out = []
    if s["holiday"] == "無休":
        out.append('<span class="sb sb-open">定休日なし</span>')
    if s["care"]:
        out.append('<span class="sb sb-care">ヒゲ脱毛・光フェイシャル</span>')
    if s["menOnly"]:
        out.append('<span class="sb sb-other">男性専用</span>')
    if s["brand"] == "other":
        out.append('<span class="sb sb-other">別ブランド</span>')
    if s["station"]:
        out.append('<span class="sb">駅チカ</span>')
    return "".join(out)


def price_html(s):
    groups = []
    for g in s["prices"]:
        items = "".join(
            f'<li><span>{esc(zen(n))}</span><b>{esc(p)}</b></li>' for n, p in g["items"])
        groups.append(f'<div class="pg"><p class="pg-ttl">{esc(zen(g["label"]))}</p><ul>{items}</ul></div>')
    return "".join(groups)


def map_embed_url(s):
    q = urllib.parse.quote(f'{s["name"]} {s["address"]}')
    return f"https://www.google.com/maps?q={q}&output=embed&hl=ja"


def nearby(s, shops):
    same_city = [x for x in shops if x["city"] == s["city"] and x["code"] != s["code"]]
    same_pref = [x for x in shops if x["pref"] == s["pref"] and x["code"] != s["code"] and x not in same_city]
    picks = (same_city + same_pref)[:4]
    cards = []
    for x in picks:
        img = x["photo"] or x["logo"]
        cls = "nb-photo is-logo" if (x["logo"] and not x["photo"]) else "nb-photo"
        im = f'<img src="../{esc(img)}" alt="" loading="lazy">' if img else ''
        cards.append(f'<li><a href="{x["code"]}.html"><span class="{cls}">{im}</span>'
                     f'<span class="nb-city">{esc(x["city"])}</span><span class="nb-name">{esc(x["short"])}</span></a></li>')
    return "".join(cards)


def shop_page(s, shops, v):
    pref_full = s["pref"] + "県"
    title = f'{s["name"]}（{s["city"]}）｜カットハウスひかり'
    desc = (f'{s["name"]}の店舗情報。{s["address"]}。営業時間{s["hours"]}、定休日{s["holiday"]}。'
            f'公式アプリで予約すれば、待ち時間を自由に過ごせます。')
    img = s["photo"] or s["logo"]
    photo_cls = "sp-photo is-logo" if (s["logo"] and not s["photo"]) else "sp-photo"
    photo = (f'<img src="../{esc(img)}" alt="{esc(s["name"])}の外観" width="800" height="600">' if s["photo"]
             else (f'<img src="../{esc(img)}" alt="{esc(s["name"])}のロゴ">' if img else '<span class="ph">写真準備中</span>'))

    notes = "".join(f"<li>{esc(zen(n))}</li>" for n in s["hoursNotes"])
    wifi = "、".join(s["wifi"]) if s["wifi"] else "なし"
    pay = "".join(f'<span class="chip">{esc(p)}</span>' for p in s["pay"])
    pay_label = "QR決済" if s["pay"] and "クレジット" not in s["pay"][0] else "お支払い"
    other_note = ""
    if s["brand"] == "other":
        extra = f'<br>{esc(s["formerly"])}' if s["formerly"] else ""
        link = f'<a class="ext" href="{esc(s["official"])}" rel="noopener">{esc(s["name"])} 公式サイト</a>' if s["official"] else ""
        other_note = (f'<div class="sp-notice"><p>別業態の店舗のため、サービス等がカットハウスひかりとは異なる場合があります。{extra}</p>{link}</div>')
    notice = ""
    if s.get("notice"):
        notice = (f'<div class="sp-notice"><p>{esc(s["notice"]["text"])}</p>'
                  f'<a class="ext" href="{esc(s["notice"]["url"])}">お知らせを見る</a></div>')
    parking = ""
    if s.get("parking"):
        parking = (f'<section class="sp-block reveal"><h2 class="sp-h">駐車場のご案内</h2>'
                   f'<p class="sp-parking"><img src="../{esc(s["parking"])}" alt="{esc(s["name"])}の駐車場のご案内" loading="lazy"></p></section>')

    ld = {
        "@context": "https://schema.org", "@type": "HairSalon", "name": s["name"],
        "address": {"@type": "PostalAddress", "addressRegion": pref_full, "streetAddress": s["address"], "addressCountry": "JP"},
        "openingHours": s["hours"], "parentOrganization": {"@type": "Organization", "name": "株式会社エイチ・エス・ケイ"},
    }
    ld_json = json.dumps(ld, ensure_ascii=False).replace("</", "<\\/")

    return head(title, desc, v, f"shop/{s['code']}.html") + f"""
<main id="main">
  <nav class="crumbs wrap" aria-label="現在地">
    <a href="../">ホーム</a><span aria-hidden="true">›</span><a href="../shops.html">店舗一覧</a><span aria-hidden="true">›</span><a href="../shops.html#{urllib.parse.quote(s["pref"])}">{pref_full}</a><span aria-hidden="true">›</span><span aria-current="page">{esc(s["short"])}</span>
  </nav>

  <section class="sp-hero">
    {SCISSORS}
    <div class="wrap sp-hero-grid">
      <div class="{photo_cls}">{photo}<span class="pref-tag">{esc(pref_full)} {esc(s["city"])}</span></div>
      <div class="sp-head">
        <h1>{name_html(s)}</h1>
        <p class="sp-addr">{ICON["pin"]}<span>{addr_html(s["address"])}</span></p>
        {('<div class="sp-badges">' + badges(s) + '</div>') if badges(s) else ""}
        <div class="sp-actions">
          <a class="btn sp-btn-wait" href="{esc(s["mis"])}" rel="noopener">{ICON["wait"]}いまの待ち状況を見る</a>
          <a class="btn sp-btn-app" href="#sp-app">{ICON["phone"]}アプリで予約する</a>
          <a class="btn sp-btn-map" href="{esc(s["map"])}" rel="noopener" target="_blank">{ICON["map"]}地図アプリで開く</a>
        </div>
      </div>
    </div>
  </section>

  <div class="wrap sp-body">
    {other_note}{notice}
    <section class="sp-block reveal" aria-labelledby="h-info">
      <h2 class="sp-h" id="h-info">店舗情報</h2>
      <dl class="sp-info">
        <div><dt>{ICON["clock"]}営業時間</dt><dd><strong>{esc(s["hours"])}</strong><ul class="sp-notes">{notes}</ul></dd></div>
        <div><dt>{ICON["cal"]}定休日</dt><dd><strong>{esc(s["holiday"])}</strong><a class="sp-link" href="{EIGYO_URL}">臨時休業・営業時間の変更はこちら</a></dd></div>
        <div><dt>{ICON["pin"]}住所</dt><dd>{addr_html(s["address"])}</dd></div>
        <div><dt>{ICON["card"]}{pay_label}</dt><dd><span class="chips">{pay}</span></dd></div>
        <div><dt>{ICON["wifi"]}Wi-Fi</dt><dd>{esc(wifi)}</dd></div>
      </dl>
    </section>

    <section class="sp-block reveal" aria-labelledby="h-price">
      <h2 class="sp-h" id="h-price">料金</h2>
      <div class="sp-price">{price_html(s)}</div>
      <p class="sp-small">※チケットは店頭の券売機、または公式アプリでお求めください。</p>
      {('<p class="sp-fc"><a href="../facecare.html">ヒゲ脱毛・光フェイシャル・眉毛カットについて詳しく ›</a></p>') if s["care"] else ""}
    </section>
    {parking}
    <section class="sp-block reveal" aria-labelledby="h-map">
      <h2 class="sp-h" id="h-map">地図</h2>
      <div class="sp-map"><iframe src="{esc(map_embed_url(s))}" title="{esc(s["name"])}の地図" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
      <p class="sp-maplink"><a href="{esc(s["map"])}" rel="noopener" target="_blank">Googleマップで大きく見る ›</a></p>
    </section>

    <section class="sp-app reveal" id="sp-app" aria-labelledby="h-app">
      <p class="sp-app-kicker">カットハウスひかり 公式アプリ</p>
      <h2 id="h-app">待ち時間は、自由に過ごそう。</h2>
      <p class="sp-app-lead"><span class="s">アプリで予約すれば、案内時刻に来るだけ。</span><span class="s">お店ではほとんど待ちません。</span></p>
      <div class="stores">
        <a class="store" href="{APP_IOS}" rel="noopener"><img src="../assets/app/appstore.png" alt="App Storeからダウンロード" width="480" height="176" loading="lazy"></a>
        <a class="store" href="{esc(APP_ANDROID)}" rel="noopener"><img src="../assets/app/gplay.png" alt="Google Playで手に入れよう" width="480" height="143" loading="lazy"></a>
      </div>
      <a class="sp-app-more" href="../#flow">予約からカットまでの流れ ›</a>
    </section>

    <section class="sp-block reveal" aria-labelledby="h-near">
      <h2 class="sp-h" id="h-near">近くの店舗</h2>
      <ul class="sp-nearby">{nearby(s, shops)}</ul>
      <p class="center"><a class="btn btn-ghost" href="../shops.html#{urllib.parse.quote(s["pref"])}">{pref_full}の店舗一覧へ</a></p>
    </section>
  </div>
</main>
<script type="application/ld+json">{ld_json}</script>
""" + FOOTER


def main():
    shops = load()
    v = read_version()
    write_list_data(shops)
    out_dir = os.path.join(ROOT, "shop")
    os.makedirs(out_dir, exist_ok=True)
    keep = set()
    for s in shops:
        fn = f'{s["code"]}.html'
        keep.add(fn)
        with open(os.path.join(out_dir, fn), "w", encoding="utf-8") as f:
            f.write(shop_page(s, shops, v))
    for fn in os.listdir(out_dir):  # なくなった店舗のページは消す
        if fn.endswith(".html") and fn not in keep:
            os.remove(os.path.join(out_dir, fn))
    print(f"{len(shops)} 店舗のページを作成しました（v={v}）")


if __name__ == "__main__":
    main()
