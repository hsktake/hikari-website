#!/usr/bin/env python3
"""メニューのページ（haircut.html・brow.html・facecare.html）を作る。

使い方（リポジトリのいちばん上で）:  python3 tools/build_menu.py
内容は旧サイト（cut-hikari.com のコンセプト・料金案内、beauty-wellness-hub.com のヘアカタログ・眉毛オプション・
フェイスケア）の掲載事実をもとに、このサイトのデザインに合わせて再構成。
フェイスケアの対応店舗は data/shops.json の care（ヒゲ脱毛・光フェイシャルあり）から自動で並べる。
ページの外側（ヘッダー・フッター）は privacy.html と同じものを使う。
文章は t() / ph() に渡すと「|」と読点の位置でだけ折り返す（言葉の途中で改行しない）。
"""
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREFS = ["茨城", "栃木", "千葉", "福島"]


def esc(s):
    return html.escape(str(s), quote=True)


def t(text):
    """1文ずつ改行し、文の中は「|」と読点の位置でまとめて、言葉の途中で折り返さない"""
    sents = [x for x in re.split(r"(?<=[。！？])(?![」）！])", text) if x.strip()]
    out = []
    for sn in sents:
        parts = [x for x in re.split(r"\||(?<=、)", sn) if x]
        out.append('<span class="s">' + "".join(f'<span class="ph">{esc(x)}</span>' for x in parts) + "</span>")
    return "".join(out)


def ph(text):
    """文の改行はせず、「|」と読点の位置でだけ区切る（見出し・短い行用）"""
    parts = [x for x in re.split(r"\||(?<=、)", text) if x]
    return "".join(f'<span class="ph">{esc(x)}</span>' for x in parts)


def shell(title, desc):
    with open(os.path.join(ROOT, "privacy.html"), encoding="utf-8") as f:
        src = f.read()
    head = src[: src.index('<main id="main">')]
    foot = src[src.index('<footer class="site-footer">'):]
    head = re.sub(r"<title>.*?</title>", lambda m: f"<title>{esc(title)}</title>", head)
    head = re.sub(r'<meta name="description" content="[^"]*">', lambda m: f'<meta name="description" content="{esc(desc)}">', head)
    return head, foot


MENUS = [
    ("haircut.html", "ヘアカット", "丸刈りからロングまで", '<img src="assets/scissors.svg" alt="" width="28" height="28">'),
    ("brow.html", "眉毛カット", "カットと一緒に", '<svg viewBox="0 0 40 28" width="30" height="21" aria-hidden="true"><path d="M3 18c8-10 22-12 34-5" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/></svg>'),
    ("facecare.html", "フェイスケア", "ヒゲ・肌のケア", '<img src="assets/sparkle.svg" alt="" width="26" height="26">'),
]


def menu_switch(current):
    """3つのメニューページを行き来するボタン"""
    lis = []
    for href, name, sub, icon in MENUS:
        cur = ' aria-current="page"' if href == current else ""
        lis.append(f'<li><a href="{href}"{cur}><span class="mx-ic">{icon}</span><b>{name}</b><small>{sub}</small></a></li>')
    return f'<nav class="mx-switch wrap" aria-label="メニューのページ"><ul>{"".join(lis)}</ul></nav>'


OTHER = {
    "haircut.html": ('<img src="assets/menu/haircut-main.webp" alt="" width="600" height="600" loading="lazy">', "丸刈りからロングまで。|大人もお子さまも、|男性も女性も。"),
    "brow.html": ('<img src="assets/menu/brow-trim.webp" alt="" width="305" height="305" loading="lazy">', "ヘアカットと一緒に|ご注文いただける|オプションです。"),
    "facecare.html": ('<img src="assets/menu/facecare-smile.webp" alt="" width="600" height="600" loading="lazy">', "カットのついでに、|ヒゲと肌のお悩みも。"),
}


def other_menus(current):
    """ページの最後に、ほかの2つのメニューを案内する"""
    cards = []
    for href, name, _sub, _icon in MENUS:
        if href == current:
            continue
        img, txt = OTHER[href]
        cards.append(f'<a class="mx-card" href="{href}"><span class="mx-photo">{img}</span><span class="mx-body"><b>{name}</b><span class="mx-txt">{ph(txt)}</span><span class="mx-more">詳しく見る</span></span></a>')
    return f"""  <section class="fc-sec fc-alt mx-other" aria-labelledby="h-other">
    <div class="wrap">
      <p class="fc-en">MENU</p>
      <h2 id="h-other">ほかのメニューも見る</h2>
      <div class="mx-cards">{"".join(cards)}</div>
      <p class="fc-note center-t">{ph("カット等のサービスメニューや料金は、|店舗によって異なります。")}</p>
    </div>
  </section>
"""


# ---------- アイコン（線のイラスト。色は CSS の currentColor） ----------
ICONS = {
    "clock": '<circle cx="24" cy="24" r="17"/><path d="M24 14v10l7 5"/>',
    "sparkle": '<path d="M22 6c1.6 9 4.2 11.6 13 13.2-8.8 1.6-11.4 4.2-13 13.2-1.6-9-4.2-11.6-13-13.2 8.8-1.6 11.4-4.2 13-13.2Z"/><path d="M38 31c.6 3 1.4 3.8 4 4.4-2.6.6-3.4 1.4-4 4.4-.6-3-1.4-3.8-4-4.4 2.6-.6 3.4-1.4 4-4.4Z"/>',
    "person": '<circle cx="24" cy="16" r="7"/><path d="M11 41c1-8 6-12.5 13-12.5S36 33 37 41"/>',
    "phone": '<rect x="14" y="5" width="20" height="38" rx="4"/><path d="M21 37h6"/><path d="m19.5 21 3.5 3.5 6-6.5"/>',
    "shield": '<path d="M24 5 9 11v11c0 10 6.5 17 15 21 8.5-4 15-11 15-21V11Z"/><path d="m17 24 5 5 9-10"/>',
    "eyebrow": '<path d="M7 19c7-8 23-10 34-3"/><path d="M11 31c5-6 21-6 26 0-5 6-21 6-26 0Z"/><circle cx="24" cy="31" r="3"/>',
    "family": '<circle cx="14" cy="12" r="5"/><circle cx="34" cy="12" r="5"/><circle cx="24" cy="26" r="4"/><path d="M5 40c0-9 4-15 9-15s7 3 8 5M43 40c0-9-4-15-9-15s-7 3-8 5"/><path d="M17 43c0-5 3-8 7-8s7 3 7 8"/>',
    "pair": '<circle cx="15" cy="14" r="6"/><circle cx="33" cy="14" r="6"/><path d="M4 41c0-8 4.5-14 11-14s11 6 11 14"/><path d="M22 41c0-8 4.5-14 11-14s11 6 11 14"/><path d="M9 12c1-6 11-6 12 0"/>',
    "kid": '<circle cx="24" cy="19" r="10"/><path d="M20 18h.01M28 18h.01"/><path d="M20.5 23c2 2 5 2 7 0"/><path d="M11 43c1.5-6 6.5-9.5 13-9.5S35.5 37 37 43"/><path d="M24 9c-1-3 1-5 3-4"/>',
    "qr": '<rect x="7" y="7" width="13" height="13" rx="2"/><rect x="28" y="7" width="13" height="13" rx="2"/><rect x="7" y="28" width="13" height="13" rx="2"/><path d="M28 28h5v5h-5zM36 36h5v5h-5zM28 39v2M39 28h2"/>',
    "machine": '<rect x="10" y="5" width="28" height="38" rx="3"/><rect x="15" y="10" width="18" height="10" rx="1.5"/><path d="M16 27h4M22 27h4M28 27h4M18 36h12"/>',
    "calendar": '<rect x="7" y="10" width="34" height="31" rx="4"/><path d="M7 19h34M16 6v8M32 6v8"/><path d="m18 30 4 4 8-8"/>',
    "yen": '<circle cx="24" cy="24" r="17"/><path d="m17 14 7 10 7-10M24 24v12M18 26h12M18 31h12"/>',
    "smile": '<circle cx="24" cy="24" r="17"/><path d="M17 28c3 5 11 5 14 0"/><path d="M18 19h.01M30 19h.01"/>',
    "medal": '<circle cx="24" cy="18" r="11"/><path d="m17 27-4 15 11-5 11 5-4-15"/><path d="m19.5 18 3 3 6-6"/>',
    "scissors": '<circle cx="14" cy="35" r="6"/><circle cx="34" cy="35" r="6"/><path d="M18 30.5 37 7M30 30.5 11 7"/>',
    "razor": '<rect x="9" y="10" width="30" height="9" rx="2"/><path d="M13 14.5h22"/><path d="M24 19v23"/>',
    "outline": '<path d="M6 28c7-9 25-11 34-4" stroke-dasharray="1 6"/><path d="m27 37 12-12 4 4-12 12h-4z"/>',
    "beard": '<path d="M13 19c0-8 5-14 11-14s11 6 11 14"/><path d="M13 19v5c0 10 5 18 11 18s11-8 11-18v-5"/><path d="M13 25c3 2 6 3 11 3s8-1 11-3M19 34c3-2 7-2 10 0"/>',
    "coin": '<ellipse cx="24" cy="13" rx="13" ry="5"/><path d="M11 13v8c0 3 6 5 13 5s13-2 13-5v-8M11 21v8c0 3 6 5 13 5s13-2 13-5v-8M11 29v6c0 3 6 5 13 5s13-2 13-5v-6"/>',
    "sun": '<circle cx="24" cy="24" r="8"/><path d="M24 5v5M24 38v5M5 24h5M38 24h5M10.5 10.5l3.5 3.5M34 34l3.5 3.5M37.5 10.5 34 14M14 34l-3.5 3.5"/>',
    "target": '<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="9"/><circle cx="24" cy="24" r="2"/>',
    "leaf": '<path d="M9 39C9 19 21 8 40 8c0 19-11 31-31 31Z"/><path d="M9 39 28 20"/>',
    "feather": '<path d="M39 9C25 9 13 19 13 35c16 0 26-12 26-26Z"/><path d="M7 41 31 17M17 31h9M22 25h9"/>',
    "bolt": '<path d="M27 5 11 27h12l-3 16 17-23H25Z"/>',
    "staff": '<circle cx="24" cy="15" r="7"/><path d="M11 42c1-8 6-13 13-13s12 5 13 13"/><path d="m24 30 3 5-3 5-3-5z"/>',
    "lift": '<path d="M24 41V9M13 20 24 9l11 11"/><path d="M13 41h22"/>',
    "drop": '<path d="M24 6c8 10 12 17 12 23a12 12 0 0 1-24 0c0-6 4-13 12-23Z"/><path d="M19 30a5 5 0 0 0 5 5"/>',
    "wave": '<path d="M6 16c4-4 8-4 12 0s8 4 12 0 8-4 12 0M6 26c4-4 8-4 12 0s8 4 12 0 8-4 12 0M6 36c4-4 8-4 12 0s8 4 12 0 8-4 12 0"/>',
    "chat": '<path d="M7 9h34v23H20l-9 8v-8H7z"/><path d="M16 20.5h.01M24 20.5h.01M32 20.5h.01"/>',
    "chair": '<path d="M15 6h18v17H15zM10 23h28v7H10zM15 30v12M33 30v12"/>',
    "store": '<path d="M6 18 10 8h28l4 10"/><path d="M6 18c0 3 2.5 5 6 5s6-2 6-5c0 3 2.5 5 6 5s6-2 6-5c0 3 2.5 5 6 5s6-2 6-5"/><path d="M9 23v18h30V23M20 41V31h8v10"/>',
    "cash": '<rect x="5" y="13" width="38" height="22" rx="3"/><circle cx="24" cy="24" r="5"/><path d="M10 18h.01M38 30h.01"/>',
    "light": '<path d="M24 6v6M10 12l4 4M38 12l-4 4M6 26h6M36 26h6"/><path d="M15 34a9 9 0 1 1 18 0Z"/><path d="M12 40h24"/>',
}


def ic(name):
    return f'<span class="ic"><svg viewBox="0 0 48 48" aria-hidden="true">{ICONS[name]}</svg></span>'


ICONS["check"] = '<path d="m12 25 8 8 16-17"/>'


# ---------- 見せ方の部品（セクションごとに形を変えて、単調にしない） ----------
def checks(items):
    """写真の横に置くチェックリスト。items = [(アイコン, 見出し, 補足), ...]"""
    lis = "".join(
        f'<li>{ic(it[0])}<p><b>{ph(it[1])}</b>' + (f'<small>{ph(it[2])}</small>' if len(it) > 2 else "") + "</p></li>"
        for it in items)
    return f'<ul class="mx-checks">{lis}</ul>'


def nums(items):
    """オレンジの帯に大きな数字。items = [(上の小さな文字, 前, 数字, 後), ...]"""
    lis = "".join(
        f'<li><small>{esc(label)}</small><span class="mx-num">{esc(pre)}<b>{esc(num)}</b>{esc(post)}</span></li>'
        for label, pre, num, post in items)
    return f'<ul class="mx-nums">{lis}</ul>'


def timeline(items):
    """線でつながった流れ。items = [(アイコン, 見出し, 補足), ...]"""
    lis = "".join(
        f'<li><span class="mx-tl-ic">{ic(it[0])}<i>{n}</i></span><b>{ph(it[1])}</b>' + (f'<small>{ph(it[2])}</small>' if len(it) > 2 else "") + "</li>"
        for n, it in enumerate(items, 1))
    return f'<ol class="mx-timeline">{lis}</ol>'


def ways(items):
    """「または」で並ぶ選択肢。items = [(アイコン, 見出し, 補足), ...]"""
    out = []
    for i, it in enumerate(items):
        if i:
            out.append('<li class="mx-or" aria-hidden="true">or</li>')
        out.append(f'<li>{ic(it[0])}<b>{ph(it[1])}</b>' + (f'<small>{ph(it[2])}</small>' if len(it) > 2 else "") + "</li>")
    return f'<ul class="mx-ways">{"".join(out)}</ul>'


def bubbles(items, stars=False):
    """お客様の声を吹き出しで。items = [(ことば, 店名), ...]"""
    star = '<span class="mx-stars" aria-label="星5つ">★★★★★</span>' if stars else ""
    lis = "".join(
        f'<li><span class="mx-face">{ic("smile")}</span><div class="mx-bubble">{star}<p>{ph(q)}</p><small>{esc(shop)}</small></div></li>'
        for q, shop in items)
    return f'<ul class="mx-bubbles">{lis}</ul>'


def info(items):
    """アイコン付きの1行のお知らせ（丸いラベル）"""
    return '<ul class="mx-info">' + "".join(f'<li>{ic(n)}<span>{ph(txt)}</span></li>' for n, txt in items) + "</ul>"


def head_block(en, hid, title, sub=""):
    s = f'<small class="mx-h-sub">{esc(sub)}</small>' if sub else ""
    return f'<p class="fc-en">{en}</p>\n      <h2 id="{hid}">{ph(title)}{s}</h2>'


def store_list():
    with open(os.path.join(ROOT, "data", "shops.json"), encoding="utf-8") as f:
        shops = [s for s in json.load(f) if s["care"]]
    groups = []
    for p in PREFS:
        items = [s for s in shops if s["pref"] == p]
        if not items:
            continue
        lis = "".join(f'<li><a href="shop/{s["code"]}.html"><small>{esc(s["city"])}</small>{esc(s["short"])}</a></li>' for s in items)
        groups.append(f'<div class="fc-pref"><p class="fc-pref-name">{p}県<span>{len(items)}店舗</span></p><ul>{lis}</ul></div>')
    return len(shops), "".join(groups)


def write(name, head, body, foot):
    with open(os.path.join(ROOT, name), "w", encoding="utf-8") as f:
        f.write(head + body + foot)


# ---------- フェイスケア ----------
def build_facecare():
    head, foot = shell("フェイスケア（ヒゲ脱毛・光フェイシャル）｜カットハウスひかり",
                       "カットハウスひかりのフェイスケア。ヒゲ脱毛（初回お試し1,000円）・光フェイシャル（初回お試し2,000円）。都度払いで、ヘアカットのついでに気軽に。茨城・栃木・千葉・福島の対応店舗で受付中。")
    n, stores = store_list()
    faq = [
        ("永久脱毛ですか？", "光脱毛は永久脱毛ではなく、|抑毛・減毛効果が期待できる|脱毛方法です。繰り返し照射することで|毛根にダメージを与え、|徐々に毛が薄くなる|脱毛方法です。"),
        ("何回くらいで効果がでますか？", "一般的に6回目から|効果を実感でき、|回数を重ねるごとに|自己処理が|どんどん楽になってきます。個人差はございますが、|15回〜20回で|ヒゲが気にならない|状態になります。"),
        ("痛みはありますか？", "様々な脱毛方法の中でも、|刺激が少ないのが|光脱毛の特徴です。チクチクという|刺激は感じます。"),
        ("途中解約はできますか？", "当店のヒゲ脱毛に|契約の縛りはございません。1回ずつ都度払いなので、|気軽にご利用ください。"),
        ("こどもでも利用できますか？", "ヒゲが気になる|思春期のお子様にも|ご利用いただけます。未成年者の場合、|初回のみ|保護者さまの同意を|いただいております。"),
    ]
    faq_html = "\n".join(
        f'      <details class="qa"><summary><span class="q-mark" aria-hidden="true">Q</span><span class="q-text">{esc(q)}</span></summary><div class="a-body"><span class="a-mark" aria-hidden="true">A</span><div><p>{t(a)}</p></div></div></details>'
        for q, a in faq)
    body = f"""<main id="main">
  <section class="fc-hero">
    <div class="wrap fc-hero-grid">
      <div class="fc-hero-copy">
        <p class="fc-en">FACE CARE</p>
        <h1>髪も、肌も、髭も。<br><span>首から上のトータルケア</span></h1>
        <p class="fc-lead">{ph("カットのついでに、|ヒゲと肌のケアも。")}</p>
        <ul class="fc-tabs">
          <li><a href="#beard"><b>ヒゲ脱毛</b><small>初回1,000円</small></a></li>
          <li><a href="#facial"><b>光フェイシャル</b><small>初回2,000円</small></a></li>
          <li><a href="#fc-shops"><b>対応店舗</b><small>{n}店舗</small></a></li>
        </ul>
      </div>
      <div class="fc-hero-photo"><img src="assets/facecare/hero-smile.webp" alt="あごに手を当てて笑う男性" width="900" height="696"></div>
    </div>
  </section>
{menu_switch("facecare.html")}
  <section class="fc-sec" id="beard" aria-labelledby="h-beard">
    <div class="wrap">
      {head_block("BEARD", "h-beard", "ヒゲ脱毛")}
      <div class="fc-price"><p><small>初回お試し</small><b>1,000</b>円</p><p class="fc-price-sub">{ph("通常 1回 3,500円（税込）")}</p></div>
      {nums([("施術時間", "最短約", "20", "分"), ("次の照射まで", "最短", "2", "週間"), ("回数契約", "", "なし", "")])}
      <div class="fc-intro mx-split">
        <img src="assets/facecare/beard-ba.webp" alt="ヒゲ脱毛のイメージ" width="560" height="620" loading="lazy">
        {checks([("sun", "毎朝の身支度が|ラクに", "シェービングの手間から解放"), ("sparkle", "清潔感|アップ", "若々しい印象に"), ("leaf", "肌にやさしい|LPL脱毛", "低刺激・うぶ毛もOK")])}
      </div>
      <p class="fc-note center-t">{ph("※光脱毛は永久脱毛ではなく、|抑毛・減毛効果が期待できる|脱毛方法です。")}</p>
      {bubbles([("2・3回目で|目に見える効果が|出ました。", "Google口コミ・鮎川店"), ("都度払いが|OKなのも|助かります！", "Google口コミ・カットスペースPLUS")], stars=True)}
    </div>
  </section>

  <section class="fc-sec fc-alt" id="facial" aria-labelledby="h-facial">
    <div class="wrap">
      {head_block("LIGHT FACIAL", "h-facial", "光フェイシャル")}
      <div class="fc-price"><p><small>初回お試し</small><b>2,000</b>円</p><p class="fc-price-sub">{ph("通常 1回 4,500円（税込）・|約25分")}</p></div>
      <div class="fc-intro mx-split">
        <img src="assets/facecare/facial.webp" alt="光フェイシャルの施術のようす" width="718" height="546" loading="lazy">
        {checks([("lift", "リフトアップ", "肌のハリ・毛穴に"), ("sparkle", "肌のトーンアップ", "くすみ・黒ずみに"), ("wave", "シワ・肌荒れに", "赤みにも")])}
      </div>
      <div class="fc-ba">
        <figure><img src="assets/facecare/facial-before.webp" alt="光フェイシャル照射前" width="440" height="640" loading="lazy"><figcaption>BEFORE</figcaption></figure>
        <figure><img src="assets/facecare/facial-after.webp" alt="光フェイシャル照射後（4回目）" width="440" height="640" loading="lazy"><figcaption class="is-after">AFTER</figcaption></figure>
        <p class="fc-ba-note">40代 男性（照射4回目）<br><small>{ph("※肌質により、|効果には個人差がございます。")}</small></p>
      </div>
      <p class="mx-badge">女性の方もご利用いただけます</p>
    </div>
  </section>

  <section class="fc-sec" id="fc-flow" aria-labelledby="h-fcflow">
    <div class="wrap">
      {head_block("FLOW", "h-fcflow", "ご利用の流れ")}
      {timeline([("store", "受付", "アプリ or 店舗"), ("chat", "カウンセリング", "部位を選べます"), ("chair", "施術", "座ったまま")])}
      {info([("calendar", "次回は2〜3週間後がおすすめ"), ("cash", "都度払い（現金・QR決済）")])}
      <p class="fc-note center-t"><span class="s">{ph("※ご来店前の|「シェービング・|ファンデーションの除去」を|お願いいたします。")}</span><span class="s">{ph("※一部店舗は|店舗受付のみです。")}</span><span class="s"><span class="ph">※カットと同じ日にご希望の場合は、</span><span class="ph"><a href="news.html#n20250530">こちらのお知らせ</a>を</span><span class="ph">ご確認ください。</span></span></p>
    </div>
  </section>

  <section class="fc-sec fc-alt" id="fc-faq" aria-labelledby="h-fcfaq">
    <div class="wrap fc-narrow">
      {head_block("Q&amp;A", "h-fcfaq", "よくあるご質問")}
{faq_html}
      <div class="mx-consult">{ic("chat")}<p><b>ご相談・見学受付中！</b>{ph("費用や効果など、|お気軽にご相談ください。")}</p></div>
    </div>
  </section>

  <section class="fc-sec" id="fc-shops" aria-labelledby="h-fcshops">
    <div class="wrap">
      {head_block("SHOP", "h-fcshops", "対応店舗")}
      <p class="fc-sec-lead">{ph(f"{n}店舗で|受付中です。")}</p>
      <div class="fc-stores">{stores}</div>
      <p class="center"><a class="btn btn-main" href="shops.html">すべての店舗を探す</a></p>
    </div>
  </section>
{other_menus("facecare.html")}</main>

"""
    write("facecare.html", head, body, foot)
    print(f"フェイスケアのページを作成しました（対応{n}店舗）")


# ---------- ヘアカット ----------
U35 = ["サイド|ツーブロック", "ショート|ツーブロック", "ツンツン系|ツーブロック", "韓流系|ショートレイヤー", "軽め|ショートマッシュ", "無造作|ショートスタンダード"]
O35 = ["インテリ風|ツーブロック", "オールバック|ツーブロ", "ナチュラル|スタンダード", "カジュアル風|ソフトモヒカン", "ワイルドショート|刈上げ", "ワイルド風|ツーブロ"]
# いろいろなスタイル（イメージ画像）：レディース → メンズ
MORE = [("ai02", "レイヤーボブ"), ("ai04", "前下がりボブ"), ("ai23", "グラボブ"), ("ai10", "ショートレイヤー"),
        ("ai12", "ミディアムレイヤー"), ("ai16", "ロングレイヤー"), ("ai07", "ワンレン"), ("ai17", "コンケーブ"),
        ("ai00", "丸刈り"), ("ai14", "スポーツ刈り"), ("ai03", "角刈り"), ("ai08", "刈上げ"),
        ("ai01", "マッシュ"), ("ai06", "ツーブロック"), ("ai18", "ソフトモヒカン"), ("ai11", "ツンツン"),
        ("ai05", "ナチュラルショート"), ("ai21", "スタンダード")]


def style_row(items):
    """ヘアカタログを横にスワイプして見る列"""
    return '<ul class="hc-row">' + "".join(
        f'<li><figure><img src="{src}" alt="ヘアスタイル例：{esc(name.replace("|", ""))}" width="340" height="400" loading="lazy"><figcaption>{ph(name)}</figcaption></figure></li>'
        for src, name in items) + "</ul>"


def build_haircut():
    head, foot = shell("ヘアカット・ヘアカタログ｜カットハウスひかり",
                       "カットハウスひかりのヘアカット。丸刈りからロングまで、大人もお子さまも、男性も女性も。ヘアカタログ（UNDER35・OVER35・いろいろなスタイル）とチケットの買い方をご案内します。")
    u35 = style_row([(f"assets/styles/u35-0{i+1}.jpg", nm) for i, nm in enumerate(U35)])
    o35 = style_row([(f"assets/styles/o35-0{i+1}.jpg", nm) for i, nm in enumerate(O35)])
    more = style_row([(f"assets/catalog/{k}.jpg", nm) for k, nm in MORE])
    body = f"""<main id="main">
  <section class="fc-hero hc-hero">
    <div class="wrap fc-hero-grid">
      <div class="fc-hero-copy">
        <p class="fc-en">HAIR CUT</p>
        <h1>ヘアカット<br><span>丸刈りからロングまで</span></h1>
        <p class="fc-lead">{ph("大人もお子さまも、|男性も女性も。")}</p>
        <p class="mx-hero-btn"><a class="btn btn-main" href="#catalog">ヘアカタログを見る</a></p>
      </div>
      <div class="fc-hero-photo"><img src="assets/styles/haircut-main.webp" alt="メガネの男性のツーブロックスタイル" width="900" height="696"></div>
    </div>
  </section>
{menu_switch("haircut.html")}
  <section class="fc-sec" id="hc-point" aria-labelledby="h-hcpoint">
    <div class="wrap">
      {head_block("POINT", "h-hcpoint", "ひかりのヘアカット")}
      <div class="fc-intro mx-split">
        <img src="assets/recruit/stylist-sub.webp" alt="お客様の髪をカットするスタッフ" width="340" height="210" loading="lazy">
        {checks([("clock", "カットだけで|スピーディー", "シャンプーなしでサクッと"), ("sparkle", "トレンドも|定番もおまかせ", "ツーブロック・センターパートも"), ("phone", "アプリで|予約・決済", "待ち状況も見られます")])}
      </div>
    </div>
  </section>

  <section class="fc-sec fc-alt" id="catalog" aria-labelledby="h-catalog">
    <div class="wrap">
      {head_block("HAIR CATALOG", "h-catalog", "ヘアカタログ")}
      <p class="hc-swipe">横にスワイプして見られます</p>
      <h3 class="hc-cat-h" id="cat-u35"><span>UNDER 35</span>メンズ</h3>
      {u35}
      <h3 class="hc-cat-h" id="cat-o35"><span>OVER 35</span>メンズ</h3>
      {o35}
      <h3 class="hc-cat-h" id="cat-more"><span>いろいろなスタイル</span>レディース・メンズ</h3>
      {more}
      <p class="fc-note center-t">※いろいろなスタイルの画像はイメージです。</p>
    </div>
  </section>

  <section class="fc-sec" id="hc-ticket" aria-labelledby="h-hcticket">
    <div class="wrap">
      {head_block("TICKET", "h-hcticket", "チケットの買い方")}
      {ways([("phone", "公式アプリ", "日時指定もOK"), ("qr", "店頭で|QR決済"), ("machine", "店頭の|券売機", "現金")])}
      <p class="fc-note center-t">{ph("日時指定の予約は手数料無料。|指定時刻の1時間前を過ぎた|キャンセルは300円です。")}</p>
      <div class="hc-price">
        <p class="hc-price-h">{ph("料金は|店舗ごとに|異なります")}</p>
        <p class="hc-btns"><a class="btn btn-main" href="shops.html">店舗を探す</a><a class="btn btn-ghost" href="./#app">公式アプリについて</a></p>
      </div>
    </div>
  </section>
{other_menus("haircut.html")}</main>

"""
    write("haircut.html", head, body, foot)
    print(f"ヘアカットのページを作成しました（ヘアカタログ{len(U35) + len(O35) + len(MORE)}スタイル）")


# ---------- 眉毛カット ----------
def build_brow():
    head, foot = shell("眉毛カット｜カットハウスひかり",
                       "カットハウスひかりの眉毛カット。ヘアカットと一緒にご注文いただけるオプションです。スペシャルコース200円・全体コース100円・部分コース無料。公式アプリからもご注文いただけます。")
    body = f"""<main id="main">
  <section class="fc-hero bw-hero">
    <div class="wrap fc-hero-grid">
      <div class="fc-hero-copy">
        <p class="fc-en">EYEBROW</p>
        <h1>眉毛カット<br><span>眉毛も髪もプロにおまかせ</span></h1>
        <p class="fc-lead">{ph("ヘアカットと一緒に|注文できるオプション")}</p>
      </div>
      <div class="fc-brow-ba bw-hero-ba">
        <figure><img src="assets/menu/brow-before.webp" alt="眉毛カット前" width="300" height="131"><figcaption>BEFORE</figcaption></figure>
        <figure><img src="assets/menu/brow-after.webp" alt="眉毛カット後（スペシャルコース）" width="300" height="131"><figcaption class="is-after">AFTER</figcaption></figure>
      </div>
    </div>
  </section>
{menu_switch("brow.html")}
  <section class="fc-sec" id="bw-survey" aria-labelledby="h-bwsurvey">
    <div class="wrap">
      {head_block("SURVEY", "h-bwsurvey", "第一印象は|眉毛で変わる！")}
      <div class="bw-survey">
        <div class="bw-donut" role="img" aria-label="男性の第一印象に眉毛が影響すると答えた方が82%"><p><small>影響すると<br>答えた方が</small><span class="bw-num"><b>82</b>%</span></p></div>
        <ul class="bw-legend">
          <li><i class="c1"></i>とても影響する<b>27.2%</b></li>
          <li><i class="c2"></i>影響する<b>54.8%</b></li>
          <li><i class="c3"></i>あまり関係ない<b>12.7%</b></li>
          <li><i class="c4"></i>全く関係ない<b>5.3%</b></li>
        </ul>
      </div>
      <p class="fc-note center-t">{ph("男性の第一印象に「眉毛」が|影響を与えると思いますか？|（計1001人・インターネット調べ）")}</p>
    </div>
  </section>

  <section class="fc-sec fc-alt" id="bw-course" aria-labelledby="h-bwcourse">
    <div class="wrap">
      {head_block("COURSE", "h-bwcourse", "選べる3つのコース")}
      <ul class="bw-prices">
        <li class="is-main"><span class="bw-name">スペシャル</span><b>200<small>円</small></b><span class="bw-desc">{ph("全体の長さ|＋眉周り")}</span></li>
        <li><span class="bw-name">全体</span><b>100<small>円</small></b><span class="bw-desc">{ph("全体の|長さ")}</span></li>
        <li><span class="bw-name">部分</span><b class="is-free">無料</b><span class="bw-desc">{ph("長い毛を|1〜2本")}</span></li>
      </ul>
      <p class="fc-note center-t">※料金は税込です。</p>
    </div>
  </section>

  <section class="fc-sec" id="bw-flow" aria-labelledby="h-bwflow">
    <div class="wrap">
      {head_block("FLOW", "h-bwflow", "施術の流れ", "スペシャルコース")}
      {timeline([("scissors", "長さを|整える"), ("razor", "ムダ毛を|処理"), ("outline", "輪郭を|整える")])}
      {info([("phone", "アプリからも注文できます")])}
      {bubbles([("顔の印象が|明るくなり|お願いして|良かったです！", "つくば梅園店のお客様"), ("眉毛ケアのオーダーが|さっそくアプリで|できるようになった。", "鮎川店のお客様")])}
    </div>
  </section>
{other_menus("brow.html")}</main>

"""
    write("brow.html", head, body, foot)
    print("眉毛カットのページを作成しました")


if __name__ == "__main__":
    build_haircut()
    build_brow()
    build_facecare()
