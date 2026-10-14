#!/usr/bin/env python3
"""フェイスケアのページ（facecare.html）を作る。

使い方（リポジトリのいちばん上で）:  python3 tools/build_facecare.py
内容は旧フェイスケアサイト beauty-wellness-hub.com の掲載事実をもとに、このサイトのデザインに合わせて再構成。
対応店舗は data/shops.json の care（ヒゲ脱毛・光フェイシャルあり）から自動で並べる。
ページの外側（ヘッダー・フッター）は privacy.html と同じものを使う。
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


def shell():
    with open(os.path.join(ROOT, "privacy.html"), encoding="utf-8") as f:
        src = f.read()
    head = src[: src.index('<main id="main">')]
    foot = src[src.index('<footer class="site-footer">'):]
    head = re.sub(r"<title>.*?</title>", "<title>フェイスケア（ヒゲ脱毛・光フェイシャル・眉毛カット）｜カットハウスひかり</title>", head)
    head = re.sub(r'<meta name="description" content="[^"]*">',
                  '<meta name="description" content="カットハウスひかりのフェイスケア。ヒゲ脱毛（初回お試し1,000円）・光フェイシャル（初回お試し2,000円）・眉毛カット。都度払いで、ヘアカットのついでに気軽に。茨城・栃木・千葉・福島の対応店舗で受付中。">', head)
    return head, foot


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


def build():
    head, foot = shell()
    n, stores = store_list()
    body = f"""<main id="main">
  <section class="fc-hero">
    <div class="wrap fc-hero-grid">
      <div class="fc-hero-copy">
        <p class="fc-en">FACE CARE</p>
        <h1>髪も、肌も、髭も。<br><span>首から上のトータルケア</span></h1>
        <p class="fc-lead">{t("ヘアカットのついでに、|ヒゲと肌のお悩みも|まとめて。回数契約なしの|都度払いで、|気軽に始められます。")}</p>
        <ul class="fc-tabs">
          <li><a href="#beard"><b>ヒゲ脱毛</b><small>毎朝楽ちん生活へ</small></a></li>
          <li><a href="#facial"><b>光フェイシャル</b><small>シワ・たるみに</small></a></li>
          <li><a href="#brow"><b>眉毛カット</b><small>第一印象アップ</small></a></li>
        </ul>
      </div>
      <div class="fc-hero-photo"><img src="assets/facecare/hero.webp" alt="" width="900" height="696"></div>
    </div>
    <p class="wrap fc-caution"><span class="s">{ph("※ご来店前の|「シェービング・|ファンデーションの除去」を|お願いいたします。")}</span><span class="s">※効果には個人差がございます。</span></p>
  </section>

  <section class="fc-sec" id="beard" aria-labelledby="h-beard">
    <div class="wrap">
      <p class="fc-en">BEARD</p>
      <h2 id="h-beard">ヒゲ脱毛</h2>
      <div class="fc-price"><p><small>初回お試し</small><b>1,000</b>円</p><p class="fc-price-sub">{ph("通常料金 1回 3,500円（税込）・|都度払い")}</p></div>
      <div class="fc-intro">
        <img src="assets/facecare/beard-ba.webp" alt="ヒゲ脱毛のイメージ" width="560" height="620" loading="lazy">
        <div>
          <h3 class="fc-h3">いいこと色々、ヒゲ脱毛</h3>
          <ul class="fc-good">
            <li><b>{ph("ヒゲの悩みの|解消")}</b>{ph("毛質を変えて|理想の見た目に")}</li>
            <li><b>見た目爽やか</b>{ph("清潔感のある|若々しい印象に")}</li>
            <li><b>{ph("シェービング|コストをカット")}</b>{ph("浮いたお金は|好きなことに！")}</li>
            <li><b>{ph("自己処理の|手間から解放")}</b>{ph("毎朝の身支度が|楽ちんに♪")}</li>
          </ul>
        </div>
      </div>
      <h3 class="fc-h3 center-t">9つのおすすめポイント</h3>
      <ol class="fc-points">
        <li><b>短時間！</b>{t("施術時間は|最短約20分。空き時間・|外出のついでに|気軽にご来店|いただけます。")}<small>{ph("※初回のみ施術以外に|カウンセリング等の|お時間をいただきます。")}</small></li>
        <li><b>初回お試し1,000円！</b>{t("よりお求めやすく|施術を受けられます。")}</li>
        <li><b>契約なしの都度払い！</b>{t("○回パックなどの|回数制約はなく、|お支払いは都度払い。無理なく通えます。")}</li>
        <li><b>部位を選べる！</b>{t("頬だけ・鼻下だけなど、|気になるところだけの|部分脱毛もOK。薄くしたい方にも|おすすめです。")}</li>
        <li><b>最新脱毛機器（LPL脱毛）</b>{t("リーズナブルな価格ですが、|最新機器を使っています。")}</li>
        <li><b>肌に優しい低刺激！</b>{t("美容脱毛は|医療脱毛と比べて|低出力で熱が少なく、|その中でもLPL脱毛は|刺激が少ない|脱毛方法です。")}</li>
        <li><b>うぶ毛も照射OK！</b>{t("色素の薄いうぶ毛にも|効果を発揮します。")}</li>
        <li><b>最短2週間で照射可能！</b>{t("ヒゲの成長を促す|バルジ領域に|アプローチするため、|毛周期を気にせず|通えます。")}</li>
        <li><b>専門スタッフの確かな施術！</b>{t("厳しい研修をクリアした|専門スタッフが|担当します。")}</li>
      </ol>
      <div class="fc-lpl">
        <h3 class="fc-h3">{ph("次世代の光脱毛|「LPL脱毛」とは")}</h3>
        <ul><li>低エネルギーで刺激が少ない</li><li>{ph("毛周期関係なく照射可能|（最短で2週間）")}</li><li>うぶ毛・金髪にも効果あり</li><li>日焼けした肌でも照射可能</li></ul>
        <p class="fc-note">{ph("光脱毛は永久脱毛ではなく、|抑毛・減毛効果が期待できる|脱毛方法です。")}</p>
      </div>
      <h3 class="fc-h3 center-t">お客様の声<small>（Google口コミから抜粋）</small></h3>
      <ul class="fc-voices">
        <li><b>本当に効果あり！</b>{t("ヒゲ脱毛をやっていますが、|本当に効果があります。個人的に|濃い方だと|思っていましたが、|2・3回目で|目に見える効果が|出ました。ヒゲにお悩みの方には|オススメします！")}<small>2024/4/3　カットハウスひかり鮎川店</small></li>
        <li><b>肌のアドバイスも…</b>{t("スタッフさんが|親切・丁寧に|施術してくれ、|お肌ケアのアドバイスも|してくれるのも|嬉しいポイントです！料金もリーズナブルで|面倒な契約もなく、|都度払いがOKなのも|助かります！")}<small>2024/4/27　カットスペースPLUS</small></li>
        <li><b>気軽で本格的…</b>{t("気軽に本格的な|ヒゲ脱毛ができます。効果も非常に|満足しており、|ヘアカットと合わせて|利用させてもらっています。")}<small>2023/10/23　カットハウスひかりちはら台店</small></li>
      </ul>
    </div>
  </section>

  <section class="fc-sec fc-alt" id="facial" aria-labelledby="h-facial">
    <div class="wrap">
      <p class="fc-en">LIGHT FACIAL</p>
      <h2 id="h-facial">光フェイシャル</h2>
      <div class="fc-price"><p><small>初回お試し</small><b>2,000</b>円</p><p class="fc-price-sub">{ph("通常料金 1回 4,500円（税込）・|都度払い・約25分")}</p></div>
      <ul class="fc-worry">
        <li>最近肌の衰えを感じる…</li><li>シワ、たるみが気になる…</li><li>{ph("肌は気になり始めているけど、|対処方法がわからない…")}</li>
      </ul>
      <div class="fc-intro">
        <img src="assets/facecare/facial.webp" alt="光フェイシャルの施術のようす" width="718" height="546" loading="lazy">
        <div>
          <h3 class="fc-h3">光フェイシャルとは？</h3>
          <p>{t("肌に特殊な光線を照射し、|肌の悩み解消に|期待できる施術方法です。IPL（Intense Pulse Light）と|呼ばれる|フラッシュライトを|照射することで、|メラニン色素や|ヘモグロビンなどの|複数の色素に対して|効果を発揮。定期的におこなうことで|様々な肌トラブルに|アプローチします。")}</p>
          <ul class="fc-good is-small">
            <li><b>{ph("リフトアップ|効果を実感")}</b>{ph("コラーゲン生成が|促され、|肌のハリや|毛穴の開きに")}</li>
            <li><b>{ph("肌のトーン・|化粧ノリがUP")}</b>{ph("ターンオーバー促進で、|くすみや黒ずみに")}</li>
            <li><b>{ph("肌荒れ・|赤みを解消")}</b></li>
            <li><b>シワに効果あり</b></li>
          </ul>
        </div>
      </div>
      <div class="fc-ba">
        <figure><img src="assets/facecare/facial-before.webp" alt="光フェイシャル照射前" width="440" height="640" loading="lazy"><figcaption>BEFORE</figcaption></figure>
        <figure><img src="assets/facecare/facial-after.webp" alt="光フェイシャル照射後（4回目）" width="440" height="640" loading="lazy"><figcaption class="is-after">AFTER</figcaption></figure>
        <p class="fc-ba-note">40代 男性（照射4回目）<br><small>{ph("※肌質により、|効果には個人差がございます。")}</small></p>
      </div>
      <ul class="fc-three">
        <li><b>①気軽さ！</b>{t("サロンや|専門クリニックより|敷居が低く、|カットのついでに|施術できる！")}</li>
        <li><b>②低価格！</b>初回お試し2,000円</li>
        <li><b>③都度払い！</b>{t("回数契約がないので、|お試しができる！")}</li>
      </ul>
      <p class="fc-ladies"><span class="s">{ph("「自信」を持ちたい、|「好印象」を与えたい、|「若々しく」なりたい方に|おすすめ。")}</span><b class="s">女性の方もご利用いただけます。</b></p>
    </div>
  </section>

  <section class="fc-sec" id="brow" aria-labelledby="h-brow">
    <div class="wrap">
      <p class="fc-en">EYEBROW</p>
      <h2 id="h-brow">眉毛カット</h2>
      <p class="fc-sec-lead">{t("ヘアカットと一緒に|ご注文いただける|オプションです。髪型と眉毛のお悩みを|同時にマルっと解決！")}</p>
      <div class="fc-brow">
        <div class="fc-brow-ba">
          <figure><img src="assets/menu/brow-before.webp" alt="眉毛カット前" loading="lazy"><figcaption>BEFORE</figcaption></figure>
          <figure><img src="assets/menu/brow-after.webp" alt="眉毛カット後（スペシャルコース）" loading="lazy"><figcaption class="is-after">AFTER</figcaption></figure>
        </div>
        <table class="fc-course">
          <thead><tr><th>コース</th><th>お手入れ内容</th><th>料金</th></tr></thead>
          <tbody>
            <tr><th>スペシャル</th><td>{ph("全体の長さと|眉周りを整える")}</td><td><b>200円</b></td></tr>
            <tr><th>全体</th><td>{ph("全体の長さを|整える")}</td><td><b>100円</b></td></tr>
            <tr><th>部分</th><td>{ph("長い部分を|1〜2本切る程度")}</td><td><b>無料</b></td></tr>
          </tbody>
        </table>
      </div>
      <ol class="fc-steps-mini"><li>眉毛全体の長さを整えます</li><li>眉毛回りのムダ毛を処理します</li><li>{ph("バランスを見て、|眉毛の輪郭を整えます")}</li></ol>
      <p class="fc-note center-t">{t("※スペシャルコースの流れ。眉毛カットは|アプリからも|ご注文いただけます。")}</p>
    </div>
  </section>

  <section class="fc-sec fc-alt" id="fc-flow" aria-labelledby="h-fcflow">
    <div class="wrap">
      <p class="fc-en">FLOW</p>
      <h2 id="h-fcflow">ご利用の流れ</h2>
      <ol class="fc-flow">
        <li><span>01</span><b>受付</b>{ph("公式アプリ|または店舗で受付")}<small>{ph("※一部店舗は|店舗受付のみとなります。")}</small></li>
        <li><span>02</span><b>カウンセリング</b>{ph("脱毛・照射する|箇所を選べます")}<small>{ph("両頬のみや首のみ、|複数箇所など")}</small></li>
        <li><span>03</span><b>施術</b><span class="s">座ったまま、</span><span class="s">{ph("ヒゲ脱毛は最短20分・|光フェイシャルは最短25分")}</span><small>部位や範囲で異なります。</small></li>
      </ol>
      <p class="fc-next">次回のご来店は <b>2〜3週間後</b> がおすすめ</p>
      <div class="fc-pay"><p><b>お支払いは安心の都度払い</b>{ph("店舗で|現金・QR決済で|お支払いいただけます。")}</p></div>
      <p class="fc-note center-t"><span class="ph">※「カット」と</span><span class="ph">「脱毛・光フェイシャル」を</span><span class="ph">同じ日にご希望の場合は、</span><span class="ph"><a href="news.html#n20250530">こちらのお知らせ</a>を</span><span class="ph">ご確認ください。</span></p>
    </div>
  </section>

  <section class="fc-sec" id="fc-faq" aria-labelledby="h-fcfaq">
    <div class="wrap fc-narrow">
      <p class="fc-en">Q&amp;A</p>
      <h2 id="h-fcfaq">{ph("ヒゲ脱毛の|よくあるご質問")}</h2>
      <details class="qa"><summary><span class="q-mark" aria-hidden="true">Q</span><span class="q-text">永久脱毛ですか？</span></summary><div class="a-body"><span class="a-mark" aria-hidden="true">A</span><div><p>{t("光脱毛は永久脱毛ではなく、|抑毛・減毛効果が期待できる|脱毛方法です。繰り返し照射することで|毛根にダメージを与え、|徐々に毛が薄くなる|脱毛方法です。")}</p></div></div></details>
      <details class="qa"><summary><span class="q-mark" aria-hidden="true">Q</span><span class="q-text">何回くらいで効果がでますか？</span></summary><div class="a-body"><span class="a-mark" aria-hidden="true">A</span><div><p>{t("一般的に6回目から|効果を実感でき、|回数を重ねるごとに|自己処理が|どんどん楽になってきます。個人差はございますが、|15回〜20回で|ヒゲが気にならない|状態になります。")}</p></div></div></details>
      <details class="qa"><summary><span class="q-mark" aria-hidden="true">Q</span><span class="q-text">痛みはありますか？</span></summary><div class="a-body"><span class="a-mark" aria-hidden="true">A</span><div><p>{t("様々な脱毛方法の中でも、|刺激が少ないのが|光脱毛の特徴です。チクチクという|刺激は感じます。")}</p></div></div></details>
      <details class="qa"><summary><span class="q-mark" aria-hidden="true">Q</span><span class="q-text">途中解約はできますか？</span></summary><div class="a-body"><span class="a-mark" aria-hidden="true">A</span><div><p>{t("当店のヒゲ脱毛に|契約の縛りはございません。1回ずつ都度払いなので、|気軽にご利用ください。")}</p></div></div></details>
      <details class="qa"><summary><span class="q-mark" aria-hidden="true">Q</span><span class="q-text">こどもでも利用できますか？</span></summary><div class="a-body"><span class="a-mark" aria-hidden="true">A</span><div><p>{t("ヒゲが気になる|思春期のお子様にも|ご利用いただけます。未成年者の場合、|初回のみ|保護者さまの同意を|いただいております。")}</p></div></div></details>
      <p class="fc-consult"><b>ご相談・見学受付中！</b>{t("各店では|専任スタッフによる|相談・見学会を|実施しております。費用や脱毛効果については|もちろん、|以前他の脱毛サービスで|失敗したから心配…など|お気軽にご相談ください。")}</p>
    </div>
  </section>

  <section class="fc-sec fc-alt" id="fc-shops" aria-labelledby="h-fcshops">
    <div class="wrap">
      <p class="fc-en">SHOP</p>
      <h2 id="h-fcshops">{ph("ヒゲ脱毛・|光フェイシャルの|対応店舗")}</h2>
      <p class="fc-sec-lead">{t(str(n) + "店舗で受付中です。店名を押すと、|店舗ページ|（料金・地図・待ち状況）が|開きます。")}</p>
      <div class="fc-stores">{stores}</div>
      <p class="center"><a class="btn btn-main" href="shops.html">すべての店舗を探す</a></p>
    </div>
  </section>
</main>

"""
    with open(os.path.join(ROOT, "facecare.html"), "w", encoding="utf-8") as f:
        f.write(head + body + foot)
    print(f"フェイスケアのページを作成しました（対応{n}店舗）")


if __name__ == "__main__":
    build()
