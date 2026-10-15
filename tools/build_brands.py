#!/usr/bin/env python3
"""姉妹ブランド・関連店舗のホームページ（各フォルダの index.html と style.css）を作る。

  plus/       カットスペースPLUS（ひたちなか市）
  delight/    Men's Cut & Self DELIGHT（宇都宮市）
  mrcool/     HAIR STUDIO MR.COOL（那須町）
  alpha/      シャンプーカット アルファ（八千代市）
  laladream/  コインランドリー ララ・ドリーム 清原テクノ店（宇都宮市）

内容は各ブランドの現行サイトの掲載事実（と data/shops.json）から。
デザインはブランドごとのロゴ・色に合わせる（BRANDS の theme と各ブランドの CSS）。
各フォルダはそれだけで完結する（あとで各ブランドのドメインへ移しやすいように）。
文章は「|」で区切ると、その位置でだけ折り返す。

使い方: python3 tools/build_brands.py
"""
import html
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GROUP = "../"  # カットハウスひかり（グループのサイト）への相対パス
HQ_TEL = "050-1720-5983"
RECRUIT_TEL = "0120-877-100"


def esc(s):
    return html.escape(s, quote=True)


def ph(text):
    """「|」の位置でだけ折り返す"""
    return "".join(f'<span class="ph">{esc(x)}</span>' for x in text.split("|") if x)


ICONS = {
    "scissors": '<circle cx="14" cy="34" r="6"/><circle cx="34" cy="34" r="6"/><path d="M18 30 36 8M30 30 12 8"/>',
    "clock": '<circle cx="24" cy="24" r="17"/><path d="M24 14v11l7 5"/>',
    "shield": '<path d="M24 5 9 11v11c0 10 6 17 15 21 9-4 15-11 15-21V11z"/><path d="m17 24 5 5 9-10"/>',
    "sparkle": '<path d="M24 5c2 9 5 12 14 14-9 2-12 5-14 14-2-9-5-12-14-14 9-2 12-5 14-14z"/><path d="M38 31c1 4 2 5 6 6-4 1-5 2-6 6-1-4-2-5-6-6 4-1 5-2 6-6z"/>',
    "yen": '<circle cx="24" cy="24" r="18"/><path d="m16 13 8 11 8-11M24 24v12M17 25h14M17 31h14"/>',
    "ticket": '<path d="M6 15h36v6a4 4 0 0 0 0 8v6H6v-6a4 4 0 0 0 0-8z"/><path d="M18 15v20" stroke-dasharray="3 3"/>',
    "wifi": '<path d="M7 19a25 25 0 0 1 34 0M13 26a16 16 0 0 1 22 0M19 33a7 7 0 0 1 10 0"/><circle cx="24" cy="39" r="1.5"/>',
    "chat": '<path d="M7 9h34v23H20l-9 8v-8H7z"/><path d="M16 20.5h.01M24 20.5h.01M32 20.5h.01"/>',
    "drop": '<path d="M24 6c8 10 13 17 13 23a13 13 0 0 1-26 0c0-6 5-13 13-23z"/>',
    "wind": '<path d="M6 18h24a5 5 0 1 0-5-5M6 26h32a5 5 0 1 1-5 5M6 34h16"/>',
    "comb": '<rect x="6" y="18" width="36" height="9" rx="2"/><path d="M10 27v10M15 27v10M20 27v10M25 27v10M30 27v10M35 27v10"/>',
    "user": '<circle cx="24" cy="16" r="7"/><path d="M10 41c1-8 7-12 14-12s13 4 14 12"/>',
    "washer": '<rect x="9" y="5" width="30" height="38" rx="4"/><circle cx="24" cy="27" r="9"/><path d="M15 12h4M27 12h6"/>',
    "shoe": '<path d="M6 33V17h10c2 5 6 7 12 8l12 3c2 1 3 3 3 5v3H6z"/><path d="M6 36h37"/>',
    "sun": '<circle cx="24" cy="24" r="8"/><path d="M24 5v5M24 38v5M5 24h5M38 24h5M10.5 10.5l3.5 3.5M34 34l3.5 3.5M10.5 37.5 14 34M34 14l3.5-3.5"/>',
    "heart": '<path d="M24 40S7 30 7 18a9 9 0 0 1 17-4 9 9 0 0 1 17 4c0 12-17 22-17 22z"/>',
    "pin": '<path d="M24 43s14-13 14-24a14 14 0 0 0-28 0c0 11 14 24 14 24z"/><circle cx="24" cy="19" r="5"/>',
    "phone": '<rect x="14" y="5" width="20" height="38" rx="4"/><path d="M21 37h6"/>',
    "card": '<rect x="5" y="11" width="38" height="26" rx="4"/><path d="M5 19h38M11 29h10"/>',
    "star": '<path d="m24 6 5.5 11.5L42 19l-9 8.7 2.2 12.3L24 34l-11.2 6 2.2-12.3L6 19l12.5-1.5z"/>',
}


def ic(name):
    return f'<span class="ic"><svg viewBox="0 0 48 48" aria-hidden="true">{ICONS[name]}</svg></span>'


# ---------------------------------------------------------------- ブロック
def b_intro(d):
    paras = "".join(f"<p>{ph(p)}</p>" for p in d["text"])
    img = f'<figure class="intro-img"><img src="img/{d["img"]}" alt="{esc(d.get("alt", ""))}" loading="lazy"></figure>' if d.get("img") else ""
    return f"""<section class="sec intro" id="about"><div class="wrap intro-grid">
  <div class="intro-text"><p class="en">{esc(d.get("en", "ABOUT"))}</p><h2>{ph(d["title"])}</h2>{paras}</div>{img}
</div></section>"""


def b_price(d):
    groups = []
    for g in d["groups"]:
        rows = "".join(
            f'<li><span class="pr-name">{ph(n)}</span><span class="pr-dots" aria-hidden="true"></span>'
            f'<span class="pr-val">{esc(v)}</span></li>' for n, v in g["items"])
        lab = f'<h3>{esc(g["label"])}</h3>' if g.get("label") else ""
        groups.append(f'<div class="pr-group">{lab}<ul>{rows}</ul></div>')
    note = f'<p class="note">{ph(d["note"])}</p>' if d.get("note") else ""
    lead = f'<p class="lead">{ph(d["lead"])}</p>' if d.get("lead") else ""
    return f"""<section class="sec price" id="price"><div class="wrap">
  <p class="en">PRICE</p><h2>{ph(d.get("title", "料金"))}</h2>{lead}
  <div class="pr-board">{"".join(groups)}</div>{note}
</div></section>"""


def b_points(d):
    items = "".join(
        f'<li>{ic(i)}<h3>{ph(t)}</h3><p>{ph(x)}</p></li>' for i, t, x in d["items"])
    return f"""<section class="sec points" id="{d.get("id", "point")}"><div class="wrap">
  <p class="en">{esc(d.get("en", "POINT"))}</p><h2>{ph(d["title"])}</h2>
  <ul class="pt-list">{items}</ul>
</div></section>"""


def b_steps(d):
    items = "".join(
        f'<li><span class="st-n">{n:02d}</span>' + (f'<img src="img/{s[2]}" alt="" loading="lazy">' if len(s) > 2 else "") +
        f'<h3>{ph(s[0])}</h3><p>{ph(s[1])}</p></li>'
        for n, s in enumerate(d["items"], 1))
    note = f'<p class="note">{ph(d["note"])}</p>' if d.get("note") else ""
    lead = f'<p class="lead">{ph(d["lead"])}</p>' if d.get("lead") else ""
    return f"""<section class="sec steps" id="{d.get("id", "guide")}"><div class="wrap">
  <p class="en">{esc(d.get("en", "HOW TO"))}</p><h2>{ph(d["title"])}</h2>{lead}
  <ol class="st-list">{items}</ol>{note}
</div></section>"""


def b_worries(d):
    items = "".join(f"<li>{ph(x)}</li>" for x in d["items"])
    return f"""<section class="sec worries" id="worries"><div class="wrap">
  <p class="en">{esc(d.get("en", "CONCIERGE"))}</p><h2>{ph(d["title"])}</h2>
  <ul class="wr-list">{items}</ul>
  <p class="wr-after">{ph(d["after"])}</p>
</div></section>"""


def b_recommend(d):
    items = "".join(f"<li>{ic('star')}<span>{ph(x)}</span></li>" for x in d["items"])
    return f"""<section class="sec recommend"><div class="wrap">
  <p class="en">RECOMMEND</p><h2>{ph(d["title"])}</h2>
  <ul class="rc-list">{items}</ul><p class="rc-after">{ph(d["after"])}</p>
</div></section>"""


def b_gallery(d):
    imgs = "".join(f'<li><img src="img/{s}" alt="{esc(a)}" loading="lazy"></li>' for s, a in d["imgs"])
    t = f'<p class="en">GALLERY</p><h2>{ph(d["title"])}</h2>' if d.get("title") else ""
    return f"""<section class="sec gallery"><div class="wrap">{t}<ul class="gl-list">{imgs}</ul></div></section>"""


def b_products(d):
    items = "".join(
        f'<li><img src="img/{img}" alt="" loading="lazy"><h3>{esc(n)}</h3><p class="pd-price">{esc(p)}</p><p>{ph(t)}</p></li>'
        for img, n, p, t in d["items"])
    return f"""<section class="sec products"><div class="wrap">
  <p class="en">SELF BLOW &amp; SET</p><h2>{ph(d["title"])}</h2><p class="lead">{ph(d["lead"])}</p>
  <ul class="pd-list">{items}</ul>
</div></section>"""


def b_machines(d):
    groups = []
    for name, sub, icon, rows in d["groups"]:
        trs = "".join(f'<tr><th>{esc(a)}</th><td>{esc(b)}</td><td class="yen">{esc(c)}</td></tr>' for a, b, c in rows)
        groups.append(f'<div class="mc-card">{ic(icon)}<h3>{esc(name)}<small>{esc(sub)}</small></h3><table>{trs}</table></div>')
    return f"""<section class="sec machines" id="price"><div class="wrap">
  <p class="en">PRICE</p><h2>{ph(d["title"])}</h2><p class="lead">{ph(d["lead"])}</p>
  <div class="mc-list">{"".join(groups)}</div>
</div></section>"""


def b_line(d):
    return f"""<section class="sec line"><div class="wrap line-box">
  <div><p class="en">LINE</p><h2>{ph(d["title"])}</h2><p>{ph(d["text"])}</p></div>
  <a class="btn btn-line" href="{esc(d["url"])}" target="_blank" rel="noopener">友だち登録する</a>
</div></section>"""


def b_recruit(d):
    items = "".join(f"<li>{ph(x)}</li>" for x in d["items"])
    return f"""<section class="sec recruit" id="recruit"><div class="wrap rc-box">
  <p class="en">RECRUIT</p><h2>{ph(d["title"])}</h2><p>{ph(d["text"])}</p>
  <ul class="check">{items}</ul>
  <div class="btns"><a class="btn btn-main" href="tel:{RECRUIT_TEL}">採用専用ダイヤル {RECRUIT_TEL}</a>
  <a class="btn btn-sub" href="{GROUP}recruit.html">採用情報を見る</a></div>
</div></section>"""


def b_info(d, b):
    rows = [("住所", (f'〒{esc(d["zip"])}<br>' if d["zip"] else "") + f'{esc(d["address"])}' + (f'<br><small>{esc(d["near"])}</small>' if d.get("near") else ""))]
    hours = esc(d["hours"]) + "".join(f"<br><small>※{esc(n)}</small>" for n in d.get("notes", []))
    rows.append(("営業時間", hours))
    rows.append(("定休日", esc(d["holiday"])))
    if d.get("tel"):
        rows.append(("電話", f'<a href="tel:{d["tel"]}">{esc(d["tel"])}</a>' + (f'<br><small>{esc(d["telnote"])}</small>' if d.get("telnote") else "")))
    if d.get("pay"):
        rows.append(("お支払い", esc(d["pay"])))
    dl = "".join(f"<div><dt>{a}</dt><dd>{v}</dd></div>" for a, v in rows)
    btns = f'<a class="btn btn-main" href="{esc(d["map"])}" target="_blank" rel="noopener">{ic("pin")}地図を開く</a>'
    if d.get("wait"):
        btns += f'<a class="btn btn-sub" href="{esc(d["wait"])}" target="_blank" rel="noopener">{ic("clock")}{esc(b["wait_label"])}</a>'
    img = f'<figure class="info-img"><img src="img/{d["img"]}" alt="{esc(b["name"])}の外観" loading="lazy"></figure>' if d.get("img") else ""
    return f"""<section class="sec info" id="access"><div class="wrap">
  <p class="en">ACCESS</p><h2>店舗情報</h2>
  <div class="info-grid">{img}<div><dl class="info-dl">{dl}</dl><div class="btns">{btns}</div></div></div>
</div></section>"""


BLOCKS = {"intro": b_intro, "price": b_price, "points": b_points, "steps": b_steps, "worries": b_worries,
          "recommend": b_recommend, "gallery": b_gallery, "products": b_products, "machines": b_machines,
          "line": b_line, "recruit": b_recruit}


# ---------------------------------------------------------------- ブランドの内容（現行サイトの掲載事実）
BRANDS = [
    {
        "dir": "plus", "name": "カットスペースPLUS", "kana": "カットスペース プラス",
        "title": "カットスペースPLUS｜ひたちなか市のヘアカット専門店（ジョイフル本田ニューポートひたちなか店内）",
        "desc": "ひたちなか市ジョイフル本田ニューポートひたちなか店内のヘアカット専門店。ヘアカット1,500円（税込）。ひげ脱毛・光フェイシャルも。ご予約不要、タッチパネルで簡単受付。",
        "fonts": "family=Oswald:wght@500;700&family=Noto+Sans+JP:wght@500;700;900",
        "logo": "logo.webp", "logo_w": 200, "logo_h": 168,
        "wait_label": "ただ今のお待ち状況",
        "nav": [("#about", "PLUSについて"), ("#price", "料金"), ("#guide", "ご利用方法"), ("#access", "店舗情報")],
        "hero": {"img": "hero.webp", "en": "NEXT GENERATION HAIRCUT", "catch": "次世代型|ヘアカット専門店", "sub": "髪と顔のトータルケアは|お任せください。",
                 "badge": ("ヘアカット", "1,500", "円（税込）")},
        "blocks": [
            ("intro", {"en": "CONCEPT", "title": "第一印象で|より良い人生を！", "img": "face.webp", "alt": "フェイスケアの施術のようす",
                       "text": ["人の第一印象の九割は「見た目」で決まり、|その大半を占めるのが「髪と顔」の印象です。",
                                "カットスペースPLUSは、|お客様の理想のヘアスタイルの提供と|顔の肌の悩みを同時に解決できる|次世代型ヘアカット専門店です。"]}),
            ("price", {"title": "料金", "lead": "※すべて税込価格",
                       "groups": [{"label": "ヘアカット", "items": [("ヘアカット", "1,500円")]},
                                  {"label": "脱毛（都度払い）", "items": [("ひげ脱毛", "3,500円"), ("ひじ下", "3,000円"), ("手先", "2,000円"), ("うなじ", "2,000円"), ("耳毛", "2,000円")]},
                                  {"label": "光フェイシャル（都度払い）", "items": [("顔全体", "4,500円")]}],
                       "note": "どなたでも、どんなヘアスタイルでも|お一人様1,500円です。"}),
            ("points", {"en": "POINT", "title": "PLUSの|こだわり", "items": [
                ("scissors", "こだわりの|カット技術", "お客様の理想の|ヘアスタイルを形に。"),
                ("sparkle", "ひげ・肌の|お悩みも", "最新エステマシンで|お顔のケアも。"),
                ("shield", "完全除菌", "超音波洗浄器と|プリュテック除菌水で|ブラシを洗浄・除菌。")]}),
            ("steps", {"en": "HOW TO", "title": "ご予約不要。|タッチで簡単受付♪", "items": [
                ("受付", "入り口正面の|タッチパネルで|「発券する」をタッチ。", "ticket.webp"),
                ("お待ちください", "番号順にお呼びします。|フリーWi-Fiと|無料のコーヒーもどうぞ。", "wait.webp"),
                ("カット", "チケットを渡して|ご注文をお伝えください。", "chair.webp"),
                ("お会計", "現金のほか|一部のクレジットカード・|電子マネーも使えます。", "shop.webp")],
                "note": "お気に召さないところがあれば、|いつでも無料でお切り直しします。"}),
            ("gallery", {"title": "完全除菌で|安心・清潔", "imgs": [("clean.webp", "超音波洗浄器と除菌水"), ("clean2.webp", "ブラシを超音波で洗浄"), ("brush.webp", "洗浄・除菌したブラシ")]}),
            ("recruit", {"title": "私達と|喜びをつくりませんか？", "text": "カットスペースPLUSは|カットハウスひかりの姉妹ブランドです。",
                         "items": ["理容師", "すべてのメンズスタイルをカットできる方", "お客様に喜んでいただくことが好きな方", "カット技術を高めることが好きな方"]}),
        ],
        "info": {"zip": "312-0005", "address": "茨城県ひたちなか市新光町34-1", "near": "ジョイフル本田ニューポートひたちなか店内",
                 "hours": "9:00〜19:00", "notes": ["ご案内予定（ご来店）時刻が19時以降となるチケットは購入できません。", "混雑状況によって19時より早く受付を終了する場合があります。"],
                 "holiday": "無休", "tel": HQ_TEL, "telnote": "カットハウスひかり本部", "pay": "現金・一部のクレジットカード・電子マネー",
                 "map": "https://maps.app.goo.gl/2YT2KLk2yTPPwRsZ8", "wait": "https://www.cut-hikari.info/HO0010?shop_code=00201", "img": "hero.webp"},
    },
    {
        "dir": "delight", "name": "Men's Cut & Self DELIGHT", "kana": "ディライト",
        "title": "DELIGHT｜カットに特化し安い・早い・高品質を実現！宇都宮のメンズカット専門店",
        "desc": "ヘアカット以外をセルフ化することで、高品質・低価格・ハイスピードのお客様満足を提供するメンズヘアカット専門店DELIGHT（ディライト）。セルフコース1,300円・フルサービス1,400円。宇都宮市ゆいの杜。",
        "fonts": "family=Playfair+Display:wght@700;900&family=Noto+Sans+JP:wght@500;700;900",
        "logo": "logo.webp", "logo_w": 283, "logo_h": 180,
        "wait_label": "ただ今のお待ち状況",
        "nav": [("#about", "ABOUT"), ("#price", "PRICE"), ("#self", "SELF"), ("#access", "ACCESS")],
        "hero": {"img": "man.webp", "en": "MEN'S CUT & SELF", "catch": "ヘアカットに特化した|メンズ|ヘアカット専門店", "sub": "カット以外をセルフ化し、|低価格・高品質・ハイスピードの|限界へ挑戦します！",
                 "badge": ("セルフコース", "1,300", "円")},
        "blocks": [
            ("intro", {"en": "ABOUT", "title": "カットに特化して、|安い・早い・|高品質。", "img": "front.webp", "alt": "DELIGHTの店舗外観",
                       "text": ["DELIGHT（ディライト）は|ヘアカットに特化した|メンズヘアカット専門店です。",
                                "カウンセリングとカット以外は|セルフサービスにすることで、|高品質・低価格・ハイスピードの|お客様満足を追求します！"]}),
            ("recommend", {"title": "こんな方に|おすすめ", "items": ["髪型はこまめに|整えていたい！", "カット後のセットは|自分でやりたい", "カット代は|できるだけ安く済ませたい！"],
                           "after": "当てはまる方、|後悔はさせません！"}),
            ("price", {"title": "その日の気分で|選べる！", "lead": "お得にカットなら|セルフがおすすめ！",
                       "groups": [{"label": "", "items": [("セルフコース|（ヘアカットのみ）", "¥1,300"), ("フルサービス|（ヘアカット＋ドライ＋バキューム）", "¥1,400")]}]}),
            ("points", {"en": "POINT", "title": "DELIGHTの|3つの約束", "items": [
                ("scissors", "HIGH QUALITY", "カット特化で品質重視の|高速カット。|様々なメンズスタイルに対応！"),
                ("clock", "DON'T WAIT", "待ち時間が短い！|セルフサービスで|高回転率を実現。"),
                ("heart", "満足カット保証", "お気に召さなかった場合、|施術後の切り直しが可能！")]}),
            ("steps", {"id": "self", "en": "SELF SERVICE", "title": "セルフスタイリング|コーナー完備！", "lead": "簡単3ステップ！|約3〜5分！",
                       "items": [("ヘアドライ★", "", "self1.webp"), ("バキューム★", "", "self2.webp"), ("スタイリング", "", "self3.webp")],
                       "note": "★「フルサービス」はスタッフが担当します。|※整髪料のご用意はございません。"}),
        ],
        "info": {"zip": "321-3226", "address": "栃木県宇都宮市ゆいの杜4丁目1-50", "near": "ファミリーマート清原テクノ店さん向かい",
                 "hours": "平日 9:00〜19:00／土日祝 9:00〜18:30",
                 "notes": ["ご案内の目安の時刻が19時（土日祝は18時30分）以降となるチケットは購入できません。", "混雑状況によって19時（土日祝は18時30分）より早く受付を終了する場合があります。"],
                 "holiday": "無休", "tel": "050-3091-3104", "telnote": "本部 050-1720-5983", "pay": "現金・PayPay・メルペイ・au PAY・d払い・楽天ペイ",
                 "map": "https://maps.app.goo.gl/iD8EZErZ1C9mZLSf9", "wait": "https://www.cut-hikari.info/HO0010?shop_code=00207", "img": "front.webp"},
        "neighbor": ("laladream/", "となりはコインランドリー", "ララ・ドリーム 清原テクノ店", "カットの間にお洗濯も。"),
    },
    {
        "dir": "mrcool", "name": "HAIR STUDIO MR.COOL", "kana": "ヘアスタジオ ミスタークール",
        "title": "HAIR STUDIO MR.COOL｜那須町のヘアカット専門店（ザ・ビッグ那須店敷地内）",
        "desc": "「ヘアカット専門店×コミュニケーション」がコンセプトのHAIR STUDIO MR.COOL。男性1,500円・女性2,000円（税込）。那須町高久甲 ザ・ビッグ那須店敷地内。",
        "fonts": "family=Bebas+Neue&family=M+PLUS+1p:wght@500;700;800",
        "logo": "logo.webp", "logo_w": 391, "logo_h": 113,
        "wait_label": "ただ今のお待ち状況",
        "nav": [("#about", "コンセプト"), ("#price", "料金"), ("#worries", "お悩み相談"), ("#access", "店舗情報")],
        "hero": {"img": "hero.webp", "en": "HAIRCUT × COMMUNICATION", "catch": "髪型をCOOLに|キメて、|自分らしく。", "sub": "ゆったりとした|落ち着いた雰囲気の|ヘアカット専門店です。",
                 "badge": ("男性", "1,500", "円（税込）")},
        "blocks": [
            ("intro", {"en": "CONCEPT", "title": "ヘアカット専門店|×|コミュニケーション", "img": "sign.webp", "alt": "MR.COOLの看板",
                       "text": ["お客様とのコミュニケーションを通し、|お客様の困り事に寄り添い、|たくさんの笑顔を創ることを|大切にしています！"]}),
            ("price", {"title": "料金", "lead": "※税込価格",
                       "groups": [{"label": "", "items": [("男性", "¥1,500"), ("女性", "¥2,000")]}],
                       "note": "現金のほかに、PayPay・メルペイ・|au PAY・d払い・楽天ペイが|ご利用いただけます。"}),
            ("worries", {"title": "その「困り事」、|ご相談ください。", "items": ["髪型をどうしていいか|わからない", "もっとカッコよく、|若々しくなりたい", "ボリュームや|軽さがほしい", "最近、薄毛や白髪が|目立つ", "フケ、かゆみが|気になる"],
                         "after": "コンシェルジュスタッフのアドバイスや|サロン商品で、「喜び」に変えられるよう|お手伝いをいたします。"}),
            ("gallery", {"title": "落ち着いた|店内です", "imgs": [("chair.webp", "木のぬくもりのあるカットチェア"), ("sofa.webp", "待合のソファ"), ("pay.webp", "受付の券売機")]}),
        ],
        "info": {"zip": "", "address": "栃木県那須郡那須町高久甲484-1", "near": "ザ・ビッグ那須店敷地内",
                 "hours": "9:00〜18:45", "notes": ["ご案内予定（ご来店）時刻が19時以降となるチケットは購入できません。", "混雑状況によって18時45分より早く受付を終了する場合があります。"],
                 "holiday": "無休", "tel": HQ_TEL, "telnote": "カットハウスひかり本部", "pay": "現金・PayPay・メルペイ・au PAY・d払い・楽天ペイ",
                 "map": "https://goo.gl/maps/Ww3Mkr7p6YsEESFB7", "wait": "https://www.cut-hikari.info/HO0010?shop_code=00205", "img": "sign.webp"},
    },
    {
        "dir": "alpha", "name": "シャンプーカット アルファ", "kana": "シャンプーカット アルファ",
        "title": "シャンプーカット アルファ｜八千代市ジョイフル本田敷地内のメンズヘアサロン",
        "desc": "千葉県八千代市ジョイフル本田敷地内のヘアサロン。美容師によるメンズヘアサロン。カット2,000円、スキンフェードカット4,000円、カット＋マシンシャンプー3,400円（税込）。お買い物ついでにサッとカット。",
        "fonts": "family=Playfair+Display:wght@700;900&family=Zen+Old+Mincho:wght@600;700&family=Noto+Sans+JP:wght@500;700",
        "logo": "logo.webp", "logo_w": 164, "logo_h": 255,
        "wait_label": "ただ今のお待ち状況",
        "nav": [("#about", "アルファについて"), ("#price", "メニュー"), ("#point", "店内"), ("#access", "店舗情報")],
        "hero": {"img": "hero.webp", "en": "SHAMPOO & CUT  SINCE 2018", "catch": "お買い物ついでに|サッとカット", "sub": "美容師による|メンズヘアサロン。",
                 "badge": ("カット", "2,000", "円（税込）")},
        "blocks": [
            ("intro", {"en": "ABOUT", "title": "ご要望とこだわりを、|ヘアスタイルに。", "img": "cut.webp", "alt": "カットするスタッフ",
                       "text": ["カット技術の高さや、|安心で清潔な器具の取り扱いは勿論のこと、|「お客様からのご要望」|「ヘアスタイルのこだわり」を|伝えやすい環境と関係性を大切にしている|美容師によるメンズヘアサロンです。",
                                "その先にある充実した日常、|自信に満ち溢れる心の健康を|ご提供することが私達の使命です。"]}),
            ("price", {"title": "メニュー", "lead": "※すべて税込価格",
                       "groups": [{"label": "ヘアカット", "items": [("カット", "¥2,000"), ("スキンフェードカット", "¥4,000"), ("スキンフェードメンテナンス", "¥3,100"), ("カット＋マシンシャンプー", "¥3,400")]},
                                  {"label": "脱毛・フェイシャル（都度払い）", "items": [("ヒゲ脱毛", "¥3,500"), ("ひじ下脱毛", "¥3,000"), ("手先脱毛", "¥2,000"), ("光フェイシャル", "¥4,500")]}]}),
            ("points", {"en": "SERVICE", "title": "店内サービス", "items": [
                ("wifi", "フリーWi-Fi", "待合スペースで|ご自由にどうぞ。"),
                ("clock", "店外で待てる", "お買い物や外出しながら|お待ち時間を|過ごすことも可能です。"),
                ("card", "メンバーズカード", "カット履歴を保存できる|会員カードを|無料でお作りします。")]}),
            ("gallery", {"title": "店内のようす", "imgs": [("seat.webp", "セルフブローの席"), ("chair.webp", "カットチェア"), ("wait.webp", "待合のいす")]}),
            ("products", {"title": "サロン専売品で|あなた好みのセットを", "lead": "セルフブロー＆セットのコーナーで|お使いいただけます。",
                          "items": [("p1.webp", "クーリッシュ ヘアトニック", "¥1,800", "爽やかな柑橘系の香りと|適度な爽快感。|男性にも女性にも大人気♪"),
                                    ("p2.webp", "ハールワッサー ヘアトニック 360ml", "¥2,600", "超爽快！|地肌に快い刺激感・清涼感。|フケ・カユミを抑えます。"),
                                    ("p3.webp", "バーレイ ヘアーリキッド 150ml", "¥1,200", "高級葉たばこの香りを基調にした、|ムードある大人の香り。")]}),
            ("line", {"title": "アルファ公式LINE", "text": "勤務スタッフのスケジュール確認や、|お得なクーポンをいち早くゲット！|ご登録はもちろん無料です。", "url": "http://nav.cx/f9Q4dwG"}),
            ("recruit", {"title": "共に喜びをつくる|仲間を募集しています", "text": "まずはお気軽にお問い合わせください。",
                         "items": ["カット経験のある美容師", "土・日曜日勤務可能", "週3〜4日勤務", "人に喜んでいただくことが大好きな方"]}),
        ],
        "info": {"zip": "276-0028", "address": "千葉県八千代市村上2723-1", "near": "ジョイフル本田八千代店敷地内",
                 "hours": "9:00〜18:00", "notes": ["ご案内予定（ご来店）時刻が18時以降となるチケットは購入できません。", "混雑状況によって18時より早く受付を終了する場合があります。"],
                 "holiday": "毎週火曜日、1月1日〜3日", "tel": "047-409-7666", "pay": "現金・一部のクレジットカード・電子マネー（券売機とは別端末での決済）",
                 "map": "https://maps.app.goo.gl/PKFRko6sHAvtSkUs7", "wait": "https://www.cut-hikari.info/HO0010?shop_code=00202", "img": "chair.webp"},
    },
    {
        "dir": "laladream", "name": "ララ・ドリーム 清原テクノ店", "kana": "コインランドリー",
        "title": "コインランドリー ララ・ドリーム 清原テクノ店｜宇都宮市ゆいの杜",
        "desc": "宇都宮市ゆいの杜のコインランドリー ララ・ドリーム清原テクノ店。リーズナブルな価格で洗濯乾燥を！一台二役の洗濯乾燥機、くつも洗える機種あり。AM5:00〜AM0:00 年中無休。",
        "fonts": "family=Nunito:wght@800;900&family=M+PLUS+Rounded+1c:wght@500;700;800",
        "logo": "", "logo_w": 0, "logo_h": 0,
        "wait_label": "空き状況を確認する",
        "nav": [("#price", "料金"), ("#point", "特徴"), ("#access", "店舗情報")],
        "hero": {"img": "front.webp", "en": "COIN LAUNDRY", "catch": "リーズナブルな価格で|洗濯乾燥を！", "sub": "一台二役！|洗濯＆乾燥機。",
                 "badge": ("営業時間", "5:00-0:00", "年中無休")},
        "blocks": [
            ("machines", {"title": "料金", "lead": "一台二役！|洗濯＆乾燥機",
                          "groups": [("洗濯乾燥機", "16K", "washer", [("洗濯＆乾燥", "60分", "1,500円"), ("洗濯＆乾燥", "45分", "1,200円"), ("洗濯のみ", "30分", "1,100円"), ("乾燥のみ", "6分", "100円")]),
                                     ("洗濯乾燥機", "10K", "washer", [("洗濯＆乾燥", "60分", "900円"), ("洗濯＆乾燥", "45分", "700円"), ("洗濯のみ", "30分", "600円"), ("乾燥のみ", "8分", "100円")]),
                                     ("乾燥機", "14K（二段式）", "wind", [("乾燥", "8分", "100円")])]}),
            ("points", {"en": "POINT", "title": "ララ・ドリームの|特徴", "items": [
                ("washer", "乾燥・洗濯|別々でもOK", "洗濯のみ・乾燥のみも|ご利用いただけます。"),
                ("shoe", "くつも洗える", "くつも洗える|機種があります。"),
                ("scissors", "となりは|ヘアカット専門店", "Men's Cut & Self DELIGHTを|併設。お洗濯の間に|カットもどうぞ。")]}),
            ("gallery", {"title": "店内のようす", "imgs": [("machines.webp", "洗濯乾燥機が並ぶ店内"), ("delight.webp", "となりのヘアカット専門店DELIGHT")]}),
        ],
        "info": {"zip": "321-3226", "address": "栃木県宇都宮市ゆいの杜4丁目1-49", "near": "",
                 "hours": "AM5:00〜AM0:00", "notes": [], "holiday": "年中無休", "tel": "", "pay": "",
                 "map": "https://www.google.com/maps/search/?api=1&query=%E6%A0%83%E6%9C%A8%E7%9C%8C%E5%AE%87%E9%83%BD%E5%AE%AE%E5%B8%82%E3%82%86%E3%81%84%E3%81%AE%E6%9D%9C4%E4%B8%81%E7%9B%AE1-49",
                 "wait": "https://www.coin-laundry.co.jp/userp/shop_detail/10025222", "img": "front.webp"},
        "neighbor": ("delight/", "となりはメンズカット専門店", "Men's Cut & Self DELIGHT", "お洗濯の間にカットも。"),
    },
]


# ---------------------------------------------------------------- ページ
def page(b):
    fonts = f'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?{b["fonts"]}&display=swap">'
    if b["logo"]:
        logo = f'<img class="logo" src="img/{b["logo"]}" alt="{esc(b["name"])}" width="{b["logo_w"]}" height="{b["logo_h"]}">'
    else:
        logo = f'<span class="wordmark"><small>{esc(b["kana"])}</small>{esc(b["name"])}</span>'
    nav = "".join(f'<a href="{h}">{esc(t)}</a>' for h, t in b["nav"])
    h = b["hero"]
    badge = f'<p class="hero-badge"><small>{esc(h["badge"][0])}</small><b>{esc(h["badge"][1])}</b><span>{esc(h["badge"][2])}</span></p>'
    hero_logo = ""
    if b["dir"] == "delight":
        hero_logo = '<img class="hero-logo" src="img/logo-white.webp" alt="" width="1000" height="241">'
    hero = f"""<section class="hero">
  <div class="hero-bg"><img src="img/{h["img"]}" alt="" fetchpriority="high"></div>
  <div class="wrap hero-in">
    {hero_logo}<p class="en hero-en">{esc(h["en"])}</p>
    <h1>{ph(h["catch"])}</h1>
    <p class="hero-sub">{ph(h["sub"])}</p>
    {badge}
    <div class="btns"><a class="btn btn-main" href="{esc(b["info"]["wait"])}" target="_blank" rel="noopener">{ic("clock")}{esc(b["wait_label"])}</a><a class="btn btn-sub" href="#access">{ic("pin")}店舗情報</a></div>
  </div>
</section>"""
    body = "\n".join(BLOCKS[k](d) for k, d in b["blocks"])
    neighbor = ""
    if b.get("neighbor"):
        href, lab, name, txt = b["neighbor"]
        neighbor = f'<section class="sec neighbor"><div class="wrap"><a class="nb-box" href="../{href}"><small>{esc(lab)}</small><b>{esc(name)}</b><span>{esc(txt)} ›</span></a></div></section>'
    info = b_info(b["info"], b)
    zipline = b["info"]["zip"] and f'〒{b["info"]["zip"]} '
    foot = f"""<footer class="foot"><div class="wrap">
  <p class="foot-name">{esc(b["name"])}</p>
  <p class="foot-addr">{esc(zipline or "")}{esc(b["info"]["address"])}</p>
  <nav class="foot-nav" aria-label="フッターメニュー">{nav}</nav>
  <p class="foot-group">運営：株式会社エイチ・エス・ケイ（<a href="{GROUP}">カットハウスひかり</a>）<br><a href="{GROUP}privacy.html">プライバシーポリシー</a></p>
  <p class="copy">© {esc(b["name"])}</p>
</div></footer>"""
    return f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; base-uri 'self'; form-action 'none'">
<title>{esc(b["title"])}</title>
<meta name="description" content="{esc(b["desc"])}">
<link rel="icon" href="img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="img/favicon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="img/apple-touch-icon.png">
{fonts}
<link rel="stylesheet" href="style.css?v={VERSION}">
<script src="to-top.js?v={VERSION}" defer></script>
</head>
<body class="b-{b["dir"]}">
<header class="head"><div class="wrap head-in">
  <a class="brand" href="./">{logo}</a>
  <nav class="gnav" aria-label="メニュー">{nav}</nav>
</div></header>
<main>
{hero}
{body}
{info}
{neighbor}
</main>
{foot}
</body>
</html>
"""


VERSION = 2

TOTOP_JS = r"""/* 下までスクロールしたら「ページの一番上へ」ボタンを出す */
(function () {
  function init() {
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
    btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
"""

BASE_CSS = r"""
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:80px;-webkit-text-size-adjust:100%}
body{margin:0;font-family:var(--jp);color:var(--ink);background:var(--bg);line-height:1.85;letter-spacing:.03em;overflow-x:hidden}
@supports (overflow-x:clip){body{overflow-x:clip}}
img{display:block;max-width:100%;height:auto}
a{color:inherit}
h1,h2,h3,p{margin:0}
.ph{display:inline-block}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.en{font-family:var(--en);letter-spacing:.14em;color:var(--accent);font-size:14px}
.ic{display:inline-grid;place-items:center;width:56px;height:56px;border-radius:50%;flex:none}
.ic svg{width:30px;height:30px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:10px 26px;font-weight:700;text-decoration:none;font-size:16px;transition:transform .15s,background .15s}
.btn .ic{width:auto;height:auto;background:none!important;border-radius:0}
.btn .ic svg{width:22px;height:22px}
.btn:hover{transform:translateY(-2px)}
.btns{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}
/* ヘッダー */
.head{position:sticky;top:0;z-index:20;background:var(--head-bg);border-bottom:var(--head-border)}
.head-in{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:68px}
.brand{display:flex;align-items:center;text-decoration:none}
.logo{height:52px;width:auto}
.gnav{display:flex;gap:4px}
.gnav a{text-decoration:none;font-weight:700;font-size:14px;padding:8px 12px;white-space:nowrap}
/* ヒーロー */
.hero{position:relative;overflow:hidden;color:var(--hero-ink)}
.hero-bg{position:absolute;inset:0}
.hero-bg img{width:100%;height:100%;object-fit:cover}
.hero-bg::after{content:"";position:absolute;inset:0;background:var(--hero-shade)}
.hero-in{position:relative;padding:90px 20px 80px;min-height:560px;display:flex;flex-direction:column;justify-content:center}
.hero h1{font-size:clamp(32px,5.2vw,58px);line-height:1.3;margin-top:10px}
.hero-sub{font-size:clamp(16px,2vw,19px);margin-top:14px;font-weight:700}
.hero-en{color:var(--hero-en)}
.hero-badge{display:inline-flex;align-items:baseline;gap:6px;margin-top:22px;padding:10px 20px;align-self:flex-start}
.hero-badge small{font-size:14px;font-weight:700}
.hero-badge b{font-family:var(--num);font-size:40px;line-height:1}
.hero-badge span{font-size:14px;font-weight:700}
/* セクション */
.sec{padding:84px 0}
.sec h2{font-size:clamp(25px,3.6vw,36px);line-height:1.45;margin-top:6px}
.sec .lead{margin-top:12px;font-weight:700}
.note{margin-top:18px;font-size:14px;opacity:.85}
.intro-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}
.intro-text p:not(.en){margin-top:16px}
.intro-img img{width:100%;aspect-ratio:4/3;object-fit:cover}
.price .wrap,.points .wrap,.steps .wrap,.gallery .wrap,.worries .wrap,.recommend .wrap,.products .wrap,.machines .wrap{text-align:center}
.pr-board{max-width:620px;margin:30px auto 0;text-align:left;padding:30px 34px}
.pr-group+.pr-group{margin-top:22px}
.pr-group h3{font-size:15px;margin-bottom:6px;color:var(--accent)}
.pr-group ul{list-style:none;margin:0;padding:0}
.pr-group li{display:flex;align-items:baseline;gap:10px;padding:9px 0}
.pr-name{font-weight:700}
.pr-dots{flex:1;border-bottom:2px dotted var(--line);transform:translateY(-4px)}
.pr-val{font-family:var(--num);font-size:24px;font-weight:700;white-space:nowrap}
.pt-list{list-style:none;margin:34px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.pt-list li{padding:30px 22px;display:flex;flex-direction:column;align-items:center;gap:12px}
.pt-list .ic{width:72px;height:72px}
.pt-list .ic svg{width:38px;height:38px}
.pt-list h3{font-size:19px;line-height:1.4}
.pt-list p{font-size:14.5px}
.st-list{list-style:none;margin:34px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;counter-reset:st}
.st-list li{position:relative;padding:22px 18px;display:flex;flex-direction:column;align-items:center;gap:10px}
.st-list img{width:100%;aspect-ratio:1;object-fit:cover}
.st-n{font-family:var(--num);font-size:30px;line-height:1;color:var(--accent)}
.st-list h3{font-size:18px}
.st-list p{font-size:14px}
.steps .note{text-align:center}
.wr-list{list-style:none;margin:30px auto 0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:900px}
.wr-list li{padding:14px 22px;font-weight:700}
.wr-after{margin-top:26px;font-weight:700}
.rc-list{list-style:none;margin:30px auto 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:900px}
.rc-list li{display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 14px;font-weight:700}
.rc-after{margin-top:22px;font-size:20px;font-weight:900}
.gl-list{list-style:none;margin:30px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.gl-list img{width:100%;aspect-ratio:4/3;object-fit:cover}
.pd-list{list-style:none;margin:30px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.pd-list li{padding:20px;text-align:center}
.pd-list img{width:100%;aspect-ratio:330/200;object-fit:contain;background:#fff}
.pd-list h3{font-size:16px;margin-top:12px}
.pd-price{font-family:var(--num);font-size:22px;font-weight:700}
.pd-list p:last-child{font-size:13.5px;margin-top:6px}
.mc-list{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:30px;text-align:left}
.mc-card{padding:24px 22px}
.mc-card h3{display:flex;align-items:baseline;gap:8px;font-size:19px;margin-top:10px}
.mc-card h3 small{font-family:var(--num);font-size:24px}
.mc-card table{width:100%;border-collapse:collapse;margin-top:10px}
.mc-card th,.mc-card td{padding:9px 4px;border-top:1px dashed var(--line);text-align:left;font-size:15px}
.mc-card td.yen{text-align:right;font-family:var(--num);font-size:20px;font-weight:800;white-space:nowrap}
.line-box{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:34px 36px}
.line-box p:not(.en){margin-top:10px}
.btn-line{background:#06C755;color:#fff;border-radius:999px}
.rc-box{text-align:center}
.rc-box > p:not(.en){margin-top:12px;font-weight:700}
.check{list-style:none;margin:24px auto 0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:10px;max-width:760px}
.check li{padding:8px 16px;font-weight:700;font-size:14.5px}
.rc-box .btns{justify-content:center}
.info-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:40px;margin-top:30px;align-items:start}
.info-img img{width:100%;aspect-ratio:4/3;object-fit:cover}
.info-dl{margin:0}
.info-dl div{display:grid;grid-template-columns:7em 1fr;gap:12px;padding:14px 0;border-bottom:1px solid var(--line)}
.info-dl dt{font-weight:800}
.info-dl dd{margin:0}
.info-dl small{display:inline-block;font-size:12.5px;opacity:.8;line-height:1.6;margin-top:4px}
.nb-box{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;padding:28px 20px;text-decoration:none}
.nb-box small{font-weight:700}
.nb-box b{font-size:22px}
.nb-box span{font-weight:700}
.neighbor{padding:0 0 70px}
.foot{padding:50px 0 34px;text-align:center;font-size:14px}
.foot-name{font-size:20px;font-weight:800}
.foot-addr{margin-top:4px;opacity:.85}
.foot-nav{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 18px;margin-top:18px}
.foot-nav a{text-decoration:none;font-weight:700}
.foot-group{margin-top:20px;font-size:13px;opacity:.85;line-height:2}
.copy{margin-top:14px;font-size:12px;opacity:.6}
@media (max-width:860px){
  .gnav{display:none}
  .intro-grid,.info-grid{grid-template-columns:1fr;gap:28px}
  .pt-list,.rc-list,.pd-list,.mc-list{grid-template-columns:1fr}
  .line-box{flex-direction:column;text-align:center}
}
@media (max-width:600px){
  .sec{padding:60px 0}
  .head-in{min-height:60px}
  .logo{height:44px}
  .hero-in{min-height:520px;padding:64px 20px 56px}
  .hero h1{font-size:clamp(26px,7.4vw,32px)}
  .btns{flex-direction:column}
  .btn{width:100%}
  .pr-board{padding:22px 18px}
  .pr-val{font-size:20px}
  .info-dl div{grid-template-columns:5.5em 1fr}
  .st-list{grid-template-columns:1fr 1fr;gap:12px}
  .st-list li{padding:14px 10px}
  .gl-list{grid-template-columns:1fr 1fr;gap:8px}
}
/* ページの一番上へ戻るボタン（色は各ブランドの --totop） */
.to-top{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:40;width:56px;height:56px;border-radius:50%;border:2px solid #fff;background:var(--totop,var(--accent));color:#fff;display:grid;place-items:center;align-content:center;cursor:pointer;padding:0;box-shadow:0 6px 16px rgba(0,0,0,.25);opacity:0;visibility:hidden;transform:translateY(12px);transition:opacity .25s,transform .25s,visibility .25s}
.to-top.is-on{opacity:1;visibility:visible;transform:none}
.to-top svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round;margin-bottom:-4px}
.to-top span{font-family:var(--en);font-size:12px;font-weight:700;letter-spacing:.06em;line-height:1}
@media (max-width:600px){.to-top{width:50px;height:50px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom))}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.btn{transition:none}.to-top{transition:none}}
"""

# 各ブランドの見た目（ロゴ・現行サイトの色に合わせる）
THEMES = {
    # 理容のサインポール（紺・赤・白）
    "plus": r"""
:root{--totop:#1d3170;--jp:"Noto Sans JP",sans-serif;--en:"Oswald",sans-serif;--num:"Oswald",sans-serif;--ink:#1d2433;--bg:#fff;--navy:#1d3170;--red:#c8202f;--accent:#c8202f;--line:#d9dde8;
--head-bg:#fff;--head-border:0;--hero-ink:#fff;--hero-en:#fff;--hero-shade:linear-gradient(90deg,rgba(18,30,70,.88) 0%,rgba(18,30,70,.55) 55%,rgba(18,30,70,.15) 100%)}
.head{box-shadow:0 2px 0 var(--line)}
.head::after{content:"";position:absolute;left:0;right:0;bottom:-6px;height:6px;background:repeating-linear-gradient(-45deg,var(--red) 0 12px,#fff 12px 24px,var(--navy) 24px 36px,#fff 36px 48px)}
.gnav a{color:var(--navy)} .gnav a:hover{color:var(--red)}
.hero h1{font-weight:900}
.hero-badge{background:#fff;color:var(--navy);border-left:8px solid var(--red)}
.hero-badge b{color:var(--red)}
.btn-main{background:var(--red);color:#fff} .btn-sub{background:#fff;color:var(--navy);border:2px solid currentColor}
.sec h2{color:var(--navy);font-weight:900}
.intro{background:#f4f6fb} .intro-img img{border:8px solid #fff;box-shadow:0 10px 30px rgba(29,49,112,.15)}
.pr-board{background:#fff;border:3px solid var(--navy);box-shadow:8px 8px 0 var(--red)}
.pr-group h3{color:var(--red)} .pr-val{color:var(--navy)}
.points{background:var(--navy);color:#fff} .points .sec h2,.points h2{color:#fff} .points .en{color:#ffb3ba}
.pt-list li{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.25)}
.pt-list .ic{background:#fff;color:var(--red)}
.st-list li{background:#f4f6fb} .st-list img{border:4px solid #fff}
.gallery{background:#f4f6fb}
.recruit{background:var(--red);color:#fff} .recruit h2{color:#fff} .recruit .en{color:#ffe1e4}
.check li{background:#fff;color:var(--red)} .recruit .btn-main{background:#fff;color:var(--red)} .recruit .btn-sub{color:#fff;background:transparent}
.info .btn .ic{color:inherit}
.foot{background:var(--navy);color:#fff}
""",
    # 黒・白＋赤と紫のストライプ（現行サイトの配色）
    "delight": r"""
:root{--totop:#111;--jp:"Noto Sans JP",sans-serif;--en:"Playfair Display",serif;--num:"Playfair Display",serif;--ink:#111;--bg:#fff;--red:#b22222;--purple:#4b0082;--accent:#b22222;--line:#d6d6d6;
--head-bg:#fff;--head-border:0;--hero-ink:#fff;--hero-en:#fff;--hero-shade:linear-gradient(90deg,rgba(0,0,0,.92) 0%,rgba(0,0,0,.7) 55%,rgba(0,0,0,.25) 100%)}
.stripe,.head::after,.foot::before{background:repeating-linear-gradient(90deg,#fff 0 10px,#000 10px 20px,var(--red) 20px 30px,#000 30px 40px,#fff 40px 50px,#000 50px 60px,var(--purple) 60px 70px,#000 70px 80px)}
.head{border-bottom:1px solid #000}
.head::after{content:"";position:absolute;left:0;right:0;bottom:-7px;height:6px}
.gnav a{font-family:var(--en);letter-spacing:.1em;color:#111} .gnav a:hover{color:var(--red)}
.hero{background:#000} .hero-bg{left:45%} .hero-bg img{object-position:50% 20%}
.hero-logo{width:min(420px,80%);height:auto;margin-bottom:18px}
.hero h1{font-weight:900}
.hero-badge{background:#fff;color:#000} .hero-badge b{font-weight:900}
.btn-main{background:#fff;color:#000} .btn-sub{background:transparent;color:#fff;border:2px solid #fff}
.sec h2{font-weight:900}
.en{font-weight:900}
.intro-img img{filter:grayscale(.15)}
.recommend{background:#111;color:#fff} .recommend .en{color:#e98d8d}
.rc-list li{background:#222;border:1px solid #444} .rc-list .ic{background:var(--red);color:#fff}
.pr-board{background:#fff;border:2px solid #000;box-shadow:10px 10px 0 #000}
.pr-group li{padding:14px 0} .pr-val{font-size:32px;font-weight:900}
.points{background:#f2f2f2}
.pt-list li{background:#fff;border-top:6px solid #000} .pt-list .ic{background:#000;color:#fff}
.pt-list h3{font-family:var(--en);font-weight:900;letter-spacing:.06em}
.steps{background:#111;color:#fff} .steps .en{color:#e98d8d} .st-n{color:#fff}
.st-list li{background:#1d1d1d}
.info .btn-main{background:#000;color:#fff} .info .btn-sub{color:#000;border-color:#000}
.nb-box{background:#eaf2ff;color:#123;border:2px solid #1e4fa3}
.foot{background:#000;color:#fff;position:relative} .foot::before{content:"";position:absolute;left:0;right:0;top:0;height:6px}
""",
    # 黒×白＋木のぬくもりとオレンジ（店内のイス・現行サイトの配色）
    "mrcool": r"""
:root{--totop:#e37100;--jp:"M PLUS 1p",sans-serif;--en:"Bebas Neue",sans-serif;--num:"Bebas Neue",sans-serif;--ink:#1c1a17;--bg:#faf7f2;--orange:#e37100;--wood:#9a6a3a;--accent:#e37100;--line:#e1d8cb;
--head-bg:#111;--head-border:0;--hero-ink:#fff;--hero-en:#ffb35c;--hero-shade:linear-gradient(0deg,rgba(17,14,10,.85) 0%,rgba(17,14,10,.45) 60%,rgba(17,14,10,.25) 100%)}
.head .logo{background:#fff;padding:6px 10px;height:56px}
.gnav a{color:#fff} .gnav a:hover{color:var(--orange)}
.en{font-size:18px;letter-spacing:.16em}
.hero-in{justify-content:flex-end}
.hero h1{font-weight:800}
.hero-badge{background:var(--orange);color:#fff;border-radius:4px}
.hero-badge b{font-size:48px}
.btn{border-radius:4px} .btn-main{background:var(--orange);color:#fff} .btn-sub{background:rgba(255,255,255,.12);color:#fff;border:2px solid #fff}
.sec h2{font-weight:800}
.intro-img img{border-radius:6px}
.price{background:#111;color:#fff} .price .lead{color:#ccc}
.pr-board{background:#1c1c1c;border:2px solid var(--orange);border-radius:6px} .pr-group li{padding:14px 0} .pr-name{font-size:20px}
.pr-val{color:var(--orange);font-size:40px;font-weight:400} .pr-dots{border-color:#555}
.price .note{opacity:1;color:#ddd}
.worries{background:linear-gradient(180deg,#f3e9db,#faf7f2)}
.wr-list li{background:#fff;border:2px solid var(--wood);border-radius:999px;position:relative}
.wr-after{color:var(--wood)}
.gallery .gl-list img{border-radius:6px}
.info .btn-sub{color:#111;border-color:#111;background:transparent}
.info-dl dt{color:var(--wood)}
.foot{background:#111;color:#fff}
""",
    # ヴィンテージの理容室（こげ茶・クリーム・エンブレム）
    "alpha": r"""
:root{--totop:#3a2a1f;--jp:"Noto Sans JP",sans-serif;--en:"Playfair Display",serif;--num:"Playfair Display",serif;--mincho:"Zen Old Mincho",serif;--ink:#2b2119;--bg:#f6f0e6;--brown:#3a2a1f;--gold:#b0844a;--accent:#b0844a;--line:#d8c9b3;
--head-bg:#3a2a1f;--head-border:0;--hero-ink:#fff;--hero-en:#e6c58f;--hero-shade:linear-gradient(90deg,rgba(40,28,20,.9) 0%,rgba(40,28,20,.6) 55%,rgba(40,28,20,.2) 100%)}
.head .logo{background:#fff;padding:4px;height:60px}
.gnav a{color:#f3e6cf} .gnav a:hover{color:var(--gold)}
.hero h1,.sec h2{font-family:var(--mincho);font-weight:700}
.hero-badge{background:#f6f0e6;color:var(--brown);border:2px solid var(--gold);outline:4px solid rgba(246,240,230,.35)}
.hero-badge b{font-weight:900}
.btn-main{background:var(--gold);color:#fff} .btn-sub{background:transparent;color:#fff;border:2px solid #f3e6cf}
.en{font-style:italic}
.intro-img img{border:10px solid #fff;box-shadow:0 12px 30px rgba(58,42,31,.2)}
.price{background:var(--brown);color:#f6f0e6} .price h2{color:#fff}
.pr-board{background:#f6f0e6;color:var(--ink);border:3px double var(--gold);outline:6px solid #f6f0e6}
.pr-group h3{font-family:var(--mincho);color:var(--gold);border-bottom:1px solid var(--line);padding-bottom:4px}
.pr-val{font-weight:900}
.pt-list li{background:#fff;border:1px solid var(--line)} .pt-list .ic{background:var(--brown);color:#f3e6cf}
.gallery .gl-list img{border:6px solid #fff}
.products{background:#efe5d4} .pd-list li{background:#fff}
.line-box{background:#fff;border:2px solid #06C755;border-radius:12px}
.recruit{background:var(--brown);color:#f6f0e6} .recruit h2{color:#fff}
.check li{border:1px solid var(--gold);color:#f3e6cf}
.recruit .btn-sub{color:#fff;border-color:#f3e6cf}
.info .btn-sub{color:var(--brown);border-color:var(--brown)}
.foot{background:#271c14;color:#f3e6cf}
""",
    # コインランドリー：青・赤・白で清潔に
    "laladream": r"""
:root{--totop:#1c4fa3;--jp:"M PLUS Rounded 1c",sans-serif;--en:"Nunito",sans-serif;--num:"Nunito",sans-serif;--ink:#16243d;--bg:#fff;--blue:#1c4fa3;--red:#e2363c;--sky:#eaf3ff;--accent:#e2363c;--line:#d5e2f4;
--head-bg:#fff;--head-border:4px solid var(--blue);--hero-ink:#fff;--hero-en:#fff;--hero-shade:linear-gradient(0deg,rgba(15,45,100,.85) 0%,rgba(15,45,100,.45) 60%,rgba(15,45,100,.1) 100%)}
.wordmark{display:flex;flex-direction:column;line-height:1.2;font-weight:800;color:var(--blue);font-size:20px}
.wordmark small{font-size:12px;color:var(--red);letter-spacing:.2em}
.gnav a{color:var(--blue);border-radius:999px} .gnav a:hover{background:var(--sky)}
.en{font-weight:900}
.hero-in{justify-content:flex-end}
.hero h1{font-weight:800}
.hero-badge{background:#fff;color:var(--blue);border-radius:999px;padding:10px 24px}
.hero-badge b{font-size:32px;font-weight:900} .hero-badge span{color:var(--red)}
.btn{border-radius:999px} .btn-main{background:var(--red);color:#fff;box-shadow:0 5px 0 #a8202a} .btn-sub{background:#fff;color:var(--blue)}
.sec h2{color:var(--blue);font-weight:800}
.machines{background:var(--sky)}
.mc-card{background:#fff;border-radius:22px;box-shadow:0 8px 0 rgba(28,79,163,.12)}
.mc-card .ic{background:var(--blue);color:#fff}
.mc-card h3 small{color:var(--red)}
.mc-card td.yen{color:var(--blue)}
.pt-list li{background:var(--sky);border-radius:22px} .pt-list .ic{background:#fff;color:var(--blue)}
.gallery{background:var(--sky)} .gl-list img{border-radius:16px}
.info .btn-sub{border:2px solid var(--blue)}
.info-img img{border-radius:16px}
.nb-box{background:#111;color:#fff;border-radius:18px}
.foot{background:var(--blue);color:#fff}
""",
}


def main():
    for b in BRANDS:
        d = os.path.join(ROOT, b["dir"])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(page(b))
        with open(os.path.join(d, "to-top.js"), "w", encoding="utf-8") as f:
            f.write(TOTOP_JS)
        with open(os.path.join(d, "style.css"), "w", encoding="utf-8") as f:
            f.write(BASE_CSS.strip() + "\n/* ---- このブランドの見た目 ---- */\n" + THEMES[b["dir"]].strip() + "\n")
        print(f"{b['dir']}/ を作成しました（{b['name']}）")


if __name__ == "__main__":
    main()
