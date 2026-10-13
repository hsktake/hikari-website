# カットハウスひかり ホームページ（試作版）

株式会社エイチ・エス・ケイ「カットハウスひかり」の新しいホームページです。
GitHub Pages で公開しています。

## しくみ

- `main` ブランチに変更を入れると、GitHub Pages が自動で公開します（反映まで1〜2分）。
- サーバーやデータベースを持たない静的サイトです。

## ファイル

| ファイル | 役割 |
|---|---|
| `index.html` | トップページ |
| `style.css` | デザイン（色・文字・レイアウト） |
| `robots.txt` | 試作中は検索エンジンに載せない設定 |

## 本番（cut-hikari.com）へ切り替えるとき

1. `index.html` の `<meta name="robots" content="noindex, nofollow">` を削除
2. `robots.txt` を公開用に変更
3. リポジトリに `CNAME` ファイル（中身：`www.cut-hikari.com`）を追加
4. ドメイン管理会社で DNS を GitHub Pages に向ける（メール関連の設定は変更しない）
