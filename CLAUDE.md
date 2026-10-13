# このリポジトリでの作業ルール

- 会社のホームページ（カットハウスひかり）。オーナーはコードを書かない。Claude が修正して `main` に push し、GitHub Pages の公開まで完了させる。
- push 後は公開URL（https://hsktake.github.io/hikari-website/）で表示を確認してから報告する。
- 静的サイトのみ（HTML/CSS/最小限のJS）。パスワード・APIキー・個人情報はリポジトリに置かない（Public リポジトリ）。
- 料金は店舗ごとに異なるため、金額を書かず店舗ページへ案内する。事実が不明な情報（店舗の地名など）は作らない。
- 動画は100MB制限があるため YouTube 等の埋め込みにする。
- 本番切り替え（noindex 削除・CNAME 追加）はオーナーの指示があるまで行わない。
- デザイン：ナチュラル系（グレージュ #7B736B、和紙色 #F6F4F1、セージ #A3AE91）。書体：Shippori Mincho（和文）、Cormorant Garamond（英字）、Great Vibes（筆記体）、Zen Kaku Gothic New（店舗情報など細かい文字）。
- 店舗データは shops-data.js。写真は試作用に Unsplash を直接参照（本番前に自社写真へ差し替え）。CSP で外部読み込み先を限定しているので、新しい外部サービスを使うときは各HTMLの CSP も更新する。
