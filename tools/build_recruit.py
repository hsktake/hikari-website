#!/usr/bin/env python3
"""採用ページ（recruit.html と recruit/職種.html）を data/recruit.json から作る。

使い方（リポジトリのいちばん上で）:  python3 tools/build_recruit.py
内容は旧採用サイト recruit.cut-hikari.com の掲載文から作成。
相談・見学・応募の受付先は ENTRY_FORM_URL（Googleフォーム）。未設定の間は電話とメールで受け付ける。
"""
import html
import json
import os
import re
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FREE_DIAL = "0120-877-100"
FREE_DIAL_TEL = "0120877100"
MAIL = "info@cut-hikari.com"
# Googleフォームができたら、ここにURLを入れて実行し直す（空のときはメールで受付）
ENTRY_FORM_URL = ""


def esc(s):
    return html.escape(str(s), quote=True)


def version():
    with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
        m = re.search(r"style\.css\?v=(\d+)", f.read())
    return m.group(1) if m else "1"


def rich(text):
    """旧サイトの記号（●・⭐️・【】・＜＞）を見出しと箇条書きに整える"""
    text = text.replace("～", "〜")
    parts = re.split(r"(【[^】]+】|＜[^＞]+＞|●|⭐️)", text)
    out, ul, mode = [], [], None

    def flush():
        nonlocal ul
        if ul:
            out.append("<ul>" + "".join(f"<li>{esc(x)}</li>" for x in ul) + "</ul>")
            ul = []

    for p in parts:
        if not p or not p.strip():
            continue
        if p in ("●", "⭐️"):
            mode = "li"
            continue
        if re.fullmatch(r"【[^】]+】|＜[^＞]+＞", p):
            flush()
            out.append(f'<p class="rq-sub">{esc(p.strip("【】＜＞"))}</p>')
            mode = None
            continue
        p = p.strip()
        if mode == "li":
            ul.append(p)
            mode = None
        else:
            flush()
            for line in re.split(r"\s{2,}", p):
                if line.strip():
                    out.append(f"<p>{esc(line.strip())}</p>")
    flush()
    return "".join(out)


def phr(text):
    """1文ずつ改行し、文の中は読点ごとにまとめて、言葉の途中で折り返さない"""
    sents = [x for x in re.split(r"(?<=[。！？])", text) if x.strip()]
    out = []
    for sn in sents:
        parts = [x for x in re.split(r"(?<=、)", sn) if x]
        out.append('<span class="s">' + "".join(f'<span class="ph">{esc(x)}</span>' for x in parts) + "</span>")
    return "".join(out)


def mailto(kind, job=""):
    subject = f"【採用】{kind}の申し込み" + (f"（{job}）" if job else "")
    body = ("お名前：\nふりがな：\n電話番号：\nお住まいの地域（市町村まで）：\n性別：\n年齢：\n"
            "資格（理容師／美容師／資格なし）：\n希望の職種：" + (job or "") + "\nご連絡可能な時間帯：\n要望・質問など：\n")
    return "mailto:" + MAIL + "?subject=" + urllib.parse.quote(subject) + "&body=" + urllib.parse.quote(body)


def page(prefix, title, desc, body, v):
    p = prefix
    return f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<!-- 試作版のため検索エンジンに載せない（本番切り替え時に削除） -->
<meta name="robots" content="noindex, nofollow">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self' https://docs.google.com https://*.googleusercontent.com; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-src https://docs.google.com; script-src 'self'; base-uri 'self'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="theme-color" content="#EF7A00">
<link rel="icon" href="{p}assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="{p}assets/favicon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="{p}assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=M+PLUS+Rounded+1c:wght@500;700;800&display=swap">
<link rel="stylesheet" href="{p}style.css?v={v}">
<script src="{p}main.js?v={v}"></script>
</head>
<body class="rq-page">
<a class="skip" href="#main">本文へ移動</a>

<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="{p}./" aria-label="カットハウスひかり トップへ">
      <img class="brand-logo" src="{p}assets/logo-hikari.webp" alt="カットハウスひかり" width="356" height="218">
      <span class="brand-area"><span class="area-sub">茨城・栃木・千葉・福島</span><span class="area-main">北関東に<strong>62</strong>店舗</span></span>
    </a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav"><span class="bars" aria-hidden="true"></span><span class="menu-label">メニュー</span></button>
    <nav class="nav" id="site-nav" aria-label="メインメニュー">
      <a href="{p}news.html">お知らせ</a>
      <a href="{p}app.html">公式アプリ</a>
      <a href="{p}shops.html">店舗を探す</a>
      <a href="{p}haircut.html">ヘアカット</a>
      <a href="{p}brow.html">眉毛カット</a>
      <a href="{p}facecare.html">フェイスケア</a>
      <a class="nav-recruit" href="{p}recruit.html" aria-current="page">採用情報</a>
      <div class="nav-sub"><a href="{p}app-guide.html">アプリの使い方</a><a href="{p}member.html">HiCARD会員</a><a href="{p}faq.html">よくあるご質問</a><a href="{p}contact.html">お問い合わせ</a><a href="{p}./#company">会社案内</a><a href="{p}community.html">地域とともに</a><a href="{p}group.html">グループのお店</a><a href="https://www.instagram.com/cut_hikari/" rel="noopener">Instagram</a></div>
    </nav>
  </div>
</header>

{body}

<footer class="site-footer">
  <div class="wrap footer-inner">
    <img class="footer-logo" src="{p}assets/logo-hikari.webp" alt="カットハウスひかり" width="356" height="218" loading="lazy">
    <p class="footer-name">ヘアカット専門店</p>
    <nav class="footer-nav" aria-label="フッターメニュー">
      <div class="fn-col"><p class="fn-h">公式アプリ・会員</p><ul><li><a href="{p}app.html">公式アプリ</a></li><li><a href="{p}app-guide.html">アプリの使い方</a></li><li><a href="{p}member.html">HiCARD会員</a></li></ul></div>
      <div class="fn-col"><p class="fn-h">お店・メニュー</p><ul><li><a href="{p}shops.html">店舗を探す</a></li><li><a href="{p}haircut.html">ヘアカット</a></li><li><a href="{p}brow.html">眉毛カット</a></li><li><a href="{p}facecare.html">フェイスケア</a></li></ul></div>
      <div class="fn-col"><p class="fn-h">ご案内</p><ul><li><a href="{p}news.html">お知らせ</a></li><li><a href="{p}faq.html">よくあるご質問</a></li><li><a href="{p}contact.html">お問い合わせ</a></li></ul></div>
      <div class="fn-col"><p class="fn-h">会社</p><ul><li><a href="{p}./#company">会社案内</a></li><li><a href="{p}group.html">グループのお店</a></li><li><a href="{p}community.html">地域とともに</a></li><li><a href="{p}recruit.html">採用情報</a></li><li><a href="https://www.instagram.com/cut_hikari/" rel="noopener">Instagram</a></li></ul></div>
      <p class="fn-legal"><a href="{p}./">トップページ</a><a href="{p}privacy.html">プライバシーポリシー</a><a href="{p}tokushoho.html">特定商取引法に基づく表記</a></p>
    </nav>
    <p class="copy">© 1997 H.S.K</p>
  </div>
</footer>
</body>
</html>
"""


ICON_TEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.5h3.2l1.6 4.2-2.1 1.4a11 11 0 0 0 5.2 5.2l1.4-2.1 4.2 1.6V17a2.5 2.5 0 0 1-2.7 2.5A15.5 15.5 0 0 1 2.5 6.2 2.5 2.5 0 0 1 5 3.5Z"/></svg>'
ICON_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>'


def entry_block(prefix, job=""):
    """相談・見学・応募（電話＋フォームまたはメール）"""
    cards = [
        ("相談", "疑問・質問を聞いてみたい！", "勤務条件についてや、経験に対しての不安など、お気軽にお問合せください。"),
        ("店舗見学", "職場見学をしてから決めたい！", "職場の雰囲気や仕事内容、一緒に働く仲間のことなど、応募前にご覧ください。見学の日程はご都合に合わせて調整可能です。"),
        ("応募", "採用面接へエントリーする", "エントリーは24時間受け付け中！近日中に担当よりご連絡いたします。"),
    ]
    items = []
    for kind, head, text in cards:
        if ENTRY_FORM_URL:
            href, label, ext = ENTRY_FORM_URL, f"{kind}フォームへ", ' rel="noopener" target="_blank"'
        else:
            href, label, ext = mailto(kind, job), f"メールで{kind}する", ""
        cls = "rq-e is-main" if kind == "応募" else "rq-e"
        items.append(f'<li class="{cls}"><p class="rq-e-tag">{kind}</p><h3>{head}</h3><p class="rq-e-txt">{phr(text)}</p>'
                     f'<a class="btn" data-entry="{kind}" href="{esc(href)}"{ext}>{ICON_MAIL}<span>{label}</span></a></li>')
    return f"""
  <section class="rq-entry" id="entry" aria-labelledby="h-entry">
    <div class="wrap">
      <p class="rq-en">ENTRY</p>
      <h2 id="h-entry">相談・見学・応募</h2>
      <p class="rq-entry-lead"><span class="s"><span class="ph">「まだ応募するかどうかを</span><span class="ph">決めかねている」</span><span class="ph">という方も大歓迎です！</span></span><span class="s"><span class="ph">疑問・質問のご相談も、</span><span class="ph">職場見学も、</span><span class="ph">お気軽にどうぞ。</span></span></p>
      <div class="rq-tel">
        <p class="rq-tel-ttl">お電話でも受付中です</p>
        <a class="rq-tel-btn" href="tel:{FREE_DIAL_TEL}">{ICON_TEL}<span><small>フリーダイヤル</small>{FREE_DIAL}</span></a>
        <p class="rq-tel-note"><span class="s">カットハウスひかり本部　採用係</span><span class="s">（株式会社エイチ・エス・ケイ）</span><span class="s rq-tel-time">9:00〜18:00受付（土日祝OK）</span></p>
      </div>
      <ul class="rq-entries">{''.join(items)}</ul>
      <p class="rq-privacy"><span class="s"><span class="ph">ご記入いただいた個人情報は、</span><span class="ph">お問い合わせ（応募）への対応</span><span class="ph">および確認のためのみに利用します。</span></span><span class="s"><span class="ph">また、この目的のために</span><span class="ph">お問い合わせ（応募）の記録を</span><span class="ph">残すことがあります。</span></span><span class="s"><a href="{prefix}privacy.html">プライバシーポリシーを見る ›</a></span></p>
    </div>
  </section>"""


def job_card(x, prefix):
    tag_cls = "rq-type is-full" if x["type"] == "正社員" else "rq-type"
    info = "".join(f"<li>{esc(c)}</li>" for c in x["card"])
    return (f'<li data-job="{x["slug"]}"><a href="{prefix}recruit/{x["slug"]}.html">'
            f'<span class="rq-job-photo"><img src="{prefix}assets/recruit/{x["photo"]}" alt="" width="400" height="565" loading="lazy"></span>'
            f'<span class="rq-job-body"><span class="{tag_cls}">{esc(x["type"])}</span><strong>{esc(x["title"])}</strong>'
            f'<ul>{info}</ul><span class="rq-more">募集要項を見る ›</span></span></a></li>')


def build_top(data, v):
    jobs = data["jobs"]
    cards = "".join(job_card(x, "") for x in jobs)
    voices = "".join(
        f'<li><a href="recruit/{x["slug"]}.html#voice"><img src="assets/recruit/{x["sub"]}" alt="" width="340" height="210" loading="lazy">'
        f'<span class="rq-v-who">{esc(x["title"])}（{esc(x["type"])}）<small>先輩スタッフ・勤続{esc(x["interview"]["years"])}</small></span>'
        f'<span class="rq-v-q">{esc(x["interview"]["qa"][2][1])}</span></a></li>' for x in jobs)
    merits = [
        ("仕事環境・勤務条件", "働きやすさを大切に！安心のサポートと柔軟なシフトで理想の仕事環境が叶う"),
        ("キャリア・スキルアップ", "技術を磨く環境がここに！成長できる場所でキャリアを輝かせましょう"),
        ("福利厚生・待遇", "安心の福利厚生と昇給システム！頑張りがしっかり報われる職場です"),
        ("職場の人間関係・社風", "フラットで温かい仲間と一緒に！協力的で安心できる職場環境"),
        ("ワークライフバランス", "プライベートも大切に！家族や自分の時間を確保しながら働ける"),
        ("地域とのつながり・やりがい", "地域に根差し、愛される存在に！お客様とのつながりを楽しめる仕事"),
    ]
    merit_html = "".join(f'<li><span class="rq-pt">Point.{i}</span><h3>{esc(a)}</h3><p>{esc(b)}</p></li>' for i, (a, b) in enumerate(merits, 1))
    stats = [("年間来店者数", "70", "万人以上"), ("平均勤続年数", "約10", "年"), ("産休・育休取得率", "100", "%"),
             ("有給取得率", "69.8", "%"), ("離職率", "約10", "%"), ("平均年齢", "51", "歳")]
    stat_html = "".join(f"<li><small>{a}</small><strong><b>{b}</b>{c}</strong></li>" for a, b, c in stats)
    staff = "".join(
        f'<li class="t{i}"><a href="recruit/{x["slug"]}.html"><img src="assets/recruit/staff-{i}.webp" alt="" width="220" height="360">'
        f'<span class="rx-l"><em>{esc(x["type"])}</em>{esc(x["title"])}</span></a></li>' for i, x in enumerate(jobs, 1))

    body = f"""<main id="main">
  <section class="section rx rq-hero">
    <div class="wrap">
      <div class="rx-head">
        <span class="rx-pill">RECRUIT<i>｜</i>採用情報</span>
        <h1>いっしょに働く仲間を<br>募集しています！</h1>
        <p class="rx-catch">安心、楽しい、やりがい、<span>見つかる！</span></p>
      </div>
      <div class="rx-board">
        <ul class="rx-staff">{staff}</ul>
        <p class="rx-band">各スタッフ募集中<small>写真をタップすると募集要項が見られます</small></p>
      </div>
      <p class="rq-hero-cta"><a class="btn rx-apply" href="#entry">相談・見学・応募はこちら</a></p>
    </div>
  </section>

  <section class="rq-sec rq-about" aria-labelledby="h-about">
    <div class="wrap">
      <p class="rq-en">ABOUT</p>
      <h2 id="h-about">カットハウスひかりとは？</h2>
      <div class="rq-about-grid">
        <p class="rq-about-txt">茨城・栃木・千葉・福島にヘアカット専門店を62店舗展開。ただ髪を切るだけでなく、プラスαのサービスを加えた高付加価値の新しいカット専門店。年間来店者数は70万人以上。社会保険完備・年5日以上の有給休暇取得・産休（育休）取得率100％など働きやすい環境。平均勤続年数は約10年・離職率は約10％。長く安心して働ける職場がここにあります。</p>
        <img class="rq-about-img" src="assets/recruit/training.webp" alt="社内研修のようす" width="900" height="600" loading="lazy">
      </div>
      <ul class="rq-stats">{stat_html}</ul>
    </div>
  </section>

  <section class="rq-sec rq-merit" aria-labelledby="h-merit">
    <div class="wrap">
      <p class="rq-en">MERIT</p>
      <h2 id="h-merit">カットハウスひかりで<br class="sp-br">働くメリット</h2>
      <ul class="rq-merits">{merit_html}</ul>
    </div>
  </section>

  <section class="rq-sec rq-jobs-sec" id="jobs" aria-labelledby="h-jobs">
    <div class="wrap">
      <p class="rq-en">JOBS</p>
      <h2 id="h-jobs">募集している職種</h2>
      <ul class="rq-jobs">{cards}</ul>
    </div>
  </section>

  <section class="rq-sec rq-promise" aria-labelledby="h-promise">
    <div class="wrap">
      <p class="rq-en">PROMISE</p>
      <h2 id="h-promise">3つの思い</h2>
      <p class="rq-sec-lead">理・美容師さんが定年まで安心して楽しくやりがいを持って働ける職場を作らなければ、理・美容業界の未来がありません。<br class="pc-br">当社に入社するスタッフさんには、以下の3つの思いを持って職場環境を整えています。</p>
      <ol class="rq-promises">
        <li><span class="rq-no">1</span><h3>定年まで<br>安心して働ける職場</h3><ul><li>社会保険完備（雇用保険・労災保険・健康保険・厚生年金）</li><li>産休・育休の取得率100％</li><li>「いばらき健康経営推進事業所」に認定</li></ul></li>
        <li><span class="rq-no">2</span><h3>定年まで<br>ストレス少なく働ける職場</h3><ul><li>年齢・役職に関係なく、全員「さん」づけで呼ぶ社風</li><li>シャンプーや顔そりがないので、手荒れや腰の負担が少ない</li><li>ノルマや時間制限などのルールは一切なし</li></ul></li>
        <li><span class="rq-no">3</span><h3>定年まで<br>やりがいを見つけられる職場</h3><ul><li>スタッフのアイデアは大歓迎。自ら考え、自ら実践できる職場</li><li>年齢・性別・勤続年数に関係なく公正に評価</li><li>目標に向かって努力するスタッフを会社が全面的にバックアップ</li></ul></li>
      </ol>
    </div>
  </section>

  <section class="rq-sec rq-benefit" aria-labelledby="h-benefit">
    <div class="wrap">
      <p class="rq-en">BENEFITS</p>
      <h2 id="h-benefit">充実の福利厚生</h2>
      <div class="rq-bn-grid">
        <div class="rq-bn"><h3>社会保険完備</h3><p>雇用保険・健康保険・労災保険・厚生年金。理・美容業界では社会保険に加入していないお店が大半ですが、スタッフさんに安心して働いていただくため、当社は社会保険に加入しています。</p><p class="rq-bn-note">年収が130万円を超える見込みの場合は入社3ヶ月後から健康保険、厚生年金加入。雇用保険は全員加入（前職等ですでに加入していた場合を除き、入社3ヶ月後から加入）</p></div>
        <div class="rq-bn"><h3>「いばらき健康経営推進事業所」に認定</h3><p>法令遵守した定期健診はもちろん、メタボリック症候群などの可能性がある場合は、無料で保健師に相談でき、その後も定期的に健康改善に向けたサポートを受けられます。</p></div>
        <div class="rq-bn"><h3>産休・育休の取得率100％</h3><p>各店舗1人〜3人の必要最小限の人数で営業。指名制ではないので、通える範囲のどの店舗にも勤務でき、急な用事でも気兼ねなく休めます。過去2年間の産休・育休の取得率100％です。</p></div>
        <div class="rq-bn"><h3>充実の子育て支援</h3><ul><li>こども手当：1人2,000円支給（中学生以下の子供を扶養している場合）</li><li>子育て支援手当：上限1時間1,000円（18時以降・小学校3年生以下の児童を預けた場合）</li></ul></div>
        <div class="rq-bn rq-bn-wide"><h3>手当・補助が充実</h3><ul class="rq-bn-list"><li><b>パフォーマンス手当</b>1時間あたりの粗利益額と勤務時間に応じて歩合給を支給</li><li><b>健康増進手当</b>健康増進に関する取り組みに対して支給</li><li><b>通勤手当</b>交通費全額支給（規定有）</li><li><b>土日祝手当</b>時給に200円がプラス</li><li><b>残業手当</b>1日8時間、週40時間を超えた場合25％割り増しで支給</li><li><b>管理資格取得費用</b>全額補助（規定有）</li><li><b>研修補助</b>外部研修の参加費を半額補助（規定有）</li></ul></div>
      </div>
    </div>
  </section>

  <section class="rq-sec rq-voice" aria-labelledby="h-voice">
    <div class="wrap">
      <p class="rq-en">VOICE</p>
      <h2 id="h-voice">先輩スタッフの声</h2>
      <ul class="rq-voices">{voices}</ul>
    </div>
  </section>

  <section class="rq-sec rq-company" aria-labelledby="h-co">
    <div class="wrap">
      <p class="rq-en">COMPANY</p>
      <h2 id="h-co">会社について</h2>
      <div class="rq-co-grid">
        <div>
          <p class="rq-co-motto"><small>経営理念</small>「社会の喜びを創り出す。」</p>
          <p>お客様・社員さん・会社の誰もが幸せな人生を送ることができるために何ができるのか？を問い続け、自分たちの可能性と存在理由を表しながら社会に貢献したいと考えています。</p>
          <p><strong>店舗はすべて直営</strong>　個人事業主が多い業界で企業として経営しているメリットを最大限に活かすために、店舗はすべて直営で運営しています。社員さんの生活を守り、お客様の生活になくてはならない存在として、店舗が地域とともに共存共栄できるように努めています。</p>
          <dl class="rq-co-table">
            <div><dt>会社名</dt><dd>株式会社エイチ・エス・ケイ</dd></div>
            <div><dt>所在地</dt><dd>茨城県水戸市金町3丁目4-27</dd></div>
            <div><dt>設立</dt><dd>平成9年10月7日</dd></div>
            <div><dt>沿革</dt><dd>平成14年6月　ヘアカット専門店1号店開店</dd></div>
          </dl>
          <p class="rq-co-link"><a href="./#company">代表メッセージ・会社案内（動画）を見る ›</a></p>
        </div>
        <img src="assets/recruit/office.webp" alt="" width="900" height="600" loading="lazy">
      </div>
    </div>
  </section>
{entry_block("")}
</main>"""
    return page("", "採用情報｜カットハウスひかり", "カットハウスひかり（株式会社エイチ・エス・ケイ）の採用情報。茨城・栃木・千葉・福島でスタイリスト（正社員・パート）、アシスタント、受付・接客スタッフを募集中。", body, v)


def build_job(x, data, v):
    p = "../"
    badges = "".join(f"<li>{esc(b)}</li>" for b in x["badges"])
    lead = "".join(f"<span class=\"s\">{esc(t)}</span>" for t in x["lead"])
    rows = "".join(f'<div><dt>{esc(k)}</dt><dd>{rich(vv)}</dd></div>' for k, vv in x["rows"])
    iv = x["interview"]
    sched = "".join(f"<li><b>{esc(t.replace('：', ':'))}</b>{esc(a)}</li>" for t, a in iv["sched"])
    qa = "".join(f"<div class=\"rq-qa\"><p class=\"rq-q\">{esc(q)}</p><p>{esc(a)}</p></div>" for q, a in iv["qa"])
    others = "".join(job_card(o, p) for o in data["jobs"] if o["slug"] != x["slug"])
    tag_cls = "rq-type is-full" if x["type"] == "正社員" else "rq-type"
    body = f"""<main id="main">
  <nav class="crumbs wrap" aria-label="現在地"><a href="{p}./">ホーム</a><span aria-hidden="true">›</span><a href="{p}recruit.html">採用情報</a><span aria-hidden="true">›</span><span aria-current="page">{esc(x["title"])}（{esc(x["type"])}）</span></nav>

  <section class="rq-jhero" data-job="{x["slug"]}">
    <div class="wrap rq-jhero-grid">
      <div class="rq-jhero-photo"><img src="{p}assets/recruit/{x["photo"]}" alt="{esc(x["title"])}として働くスタッフ" width="400" height="565"></div>
      <div class="rq-jhero-copy">
        <span class="{tag_cls}">{esc(x["type"])}</span>
        <h1>{esc(x["title"])}<small>を募集しています！</small></h1>
        <p class="rq-jlead">{lead}</p>
        <ul class="rq-badges">{badges}</ul>
        <p class="rq-jcta"><a class="btn rx-apply" href="#entry">応募・相談する</a><a class="btn rq-ghost" href="#detail">募集要項を見る</a></p>
      </div>
    </div>
  </section>

  <section class="rq-sec" id="detail" aria-labelledby="h-detail">
    <div class="wrap rq-narrow">
      <p class="rq-en">DETAIL</p>
      <h2 id="h-detail">募集要項</h2>
      <dl class="rq-table">{rows}</dl>
    </div>
  </section>

  <section class="rq-sec rq-voice" id="voice" aria-labelledby="h-iv">
    <div class="wrap rq-narrow">
      <p class="rq-en">INTERVIEW</p>
      <h2 id="h-iv">先輩インタビュー</h2>
      <div class="rq-iv">
        <div class="rq-iv-prof">
          <img src="{p}assets/recruit/{x["sub"]}" alt="" width="340" height="210" loading="lazy">
          <p class="rq-iv-name">先輩スタッフ<small>{esc(x["title"])}（{esc(x["type"])}）</small></p>
          <dl class="rq-iv-dl"><div><dt>部署名</dt><dd>{esc(iv["dept"])}</dd></div><div><dt>勤続年数</dt><dd>{esc(iv["years"])}</dd></div><div><dt>資格</dt><dd>{esc(iv["license"])}</dd></div><div><dt>趣味</dt><dd>{esc(iv["hobby"])}</dd></div><div><dt>性格</dt><dd>{esc(iv["char"])}</dd></div></dl>
        </div>
        <div class="rq-iv-body">
          {qa}
          <div class="rq-sched"><p class="rq-q">ある1日のタイムスケジュール</p><ol>{sched}</ol></div>
        </div>
      </div>
    </div>
  </section>
{entry_block(p, x["title"] + "（" + x["type"] + "）")}
  <section class="rq-sec rq-others" aria-labelledby="h-others">
    <div class="wrap">
      <h2 id="h-others" class="rq-h-small">ほかの職種も募集しています</h2>
      <ul class="rq-jobs is-small">{others}</ul>
      <p class="center"><a class="btn btn-ghost" href="{p}recruit.html">採用情報トップへ</a></p>
    </div>
  </section>
</main>"""
    title = f'{x["title"]}（{x["type"]}）の求人｜カットハウスひかり 採用情報'
    desc = f'カットハウスひかりの{x["title"]}（{x["type"]}）募集要項。{x["card"][0]}、{x["card"][2]}。茨城・栃木・千葉・福島のヘアカット専門店。'
    return page(p, title, desc, body, v)


def main():
    with open(os.path.join(ROOT, "data", "recruit.json"), encoding="utf-8") as f:
        data = json.load(f)
    v = version()
    with open(os.path.join(ROOT, "recruit.html"), "w", encoding="utf-8") as f:
        f.write(build_top(data, v))
    os.makedirs(os.path.join(ROOT, "recruit"), exist_ok=True)
    for x in data["jobs"]:
        with open(os.path.join(ROOT, "recruit", x["slug"] + ".html"), "w", encoding="utf-8") as f:
            f.write(build_job(x, data, v))
    print(f"採用ページを作成しました（{len(data['jobs'])}職種、v={v}）")


if __name__ == "__main__":
    main()
