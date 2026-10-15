#!/usr/bin/env python3
"""ホームページ管理シート（Googleスプレッドシート）の内容を、ページ本体（HTML）にも書き込む。

お客様の画面は main.js がページを開くたびにシートを読んで書き換えるので、すぐに変わる。
このスクリプトは、Google などの検索ロボットが読む「ページ本体」も同じ内容にするためのもの。
GitHub Actions（.github/workflows/sync-sheet.yml）が1日に数回自動で実行し、変わっていれば公開する。

使い方（リポジトリのいちばん上で）:
  python3 tools/sync_sheet.py            シートを読み、data/sheet/ に保存してから反映する
  python3 tools/sync_sheet.py --offline  シートは読まず、data/sheet/ に保存してある内容で反映する
                                          （ページを作り直したあとは必ずこれを実行する。build_*.py も中で実行する）

反映するもの
  店舗情報   → data/shops.json の営業時間・定休日・フェイスケア・閉店 → 店舗一覧・店舗ページ・フェイスケアの対応店舗
               ・グループのお店のホームページ（plus/ delight/ mrcool/ alpha/）
  料金       → 全ページの data-price="キー" の数字
  店舗の予定 → news.html の休業情報・営業時間変更情報、各店舗ページの「臨時休業・営業時間の変更」
  店舗数     → ヘッダーの「北関東に〇店舗」（閉店を除いた店舗の数）
"""
import csv
import datetime as dt
import glob
import html
import io
import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET_ID = "1RBR08sNvthcwJHfssDh8RFLwtZ-17URXR149_jYetzw"
SNAP = os.path.join(ROOT, "data", "sheet")
# タブの名前と、1行目（見出し）にあるはずの文字。違うタブが返ってきたときは使わない
TABS = {"店舗情報": "営業時間", "料金": "金額", "店舗の予定": "内容"}
JST = dt.timezone(dt.timedelta(hours=9))
WD = "月火水木金土日"  # Python の weekday() は月曜=0


def esc(s):
    return html.escape(str(s), quote=True)


# ---------- シートを読む ----------
def fetch(tab):
    url = (f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet="
           + urllib.parse.quote(tab))
    with urllib.request.urlopen(url, timeout=30) as r:
        text = r.read().decode("utf-8")
    if text.lstrip().startswith("<"):
        raise ValueError("CSV ではありません")
    return text


def read_tab(tab, offline):
    path = os.path.join(SNAP, tab + ".csv")
    text = None
    if not offline:
        try:
            text = fetch(tab)
            rows = list(csv.reader(io.StringIO(text)))
            if not rows or TABS[tab] not in ",".join(rows[0]):
                print(f"[{tab}] 見出しが違うので使いません")
                text = None
            else:
                os.makedirs(SNAP, exist_ok=True)
                with open(path, "w", encoding="utf-8", newline="") as f:
                    f.write(text)
        except Exception as e:  # 読めないときは保存してある内容で
            print(f"[{tab}] 読み込めませんでした: {e}")
            text = None
    if text is None:
        if not os.path.exists(path):
            return None
        with open(path, encoding="utf-8") as f:
            text = f.read()
    rows = list(csv.reader(io.StringIO(text)))
    head = rows[0] if rows else []
    body = [r for r in rows[1:] if any(v.strip() for v in r)]
    return head, body


def col(head, pattern, default):
    for i, h in enumerate(head):
        if re.search(pattern, h):
            return i
    return default


def cell(r, i):
    return r[i].strip() if 0 <= i < len(r) else ""


def to_date(s):
    m = re.search(r"(\d{4})\D+(\d{1,2})\D+(\d{1,2})", s or "")
    return dt.date(int(m[1]), int(m[2]), int(m[3])) if m else None


def fmt_day(d, with_year=False):
    return (f"{d.year}/" if with_year else "") + f"{d.month}/{d.day}（{WD[d.weekday()]}）"


# ---------- 店舗情報 → data/shops.json ----------
def hours_notes(h):
    m = re.match(r"^(\d{1,2}):(\d{2})〜(\d{1,2}):(\d{2})$", h)
    if not m:
        return []
    t = f"{int(m[3])}時" + (f"{int(m[4])}分" if m[4] != "00" else "")
    return [f"ご案内の目安の時刻が{t}以降となるチケットは購入できません。", f"混雑状況によって{t}より早く受付を終了する場合があります。"]


def apply_shop_info(tab):
    if not tab:
        return None
    head, rows = tab
    cC, cH, cD = col(head, "コード", 0), col(head, "営業時間", 2), col(head, "定休日", 3)
    cF, cS = col(head, "フェイス", 4), col(head, "状態", 5)
    info = {}
    for r in rows:
        code = cell(r, cC)
        if not code.isdigit():
            continue
        info[code.zfill(5)] = {"hours": cell(r, cH), "holiday": cell(r, cD),
                              "care": bool(re.search("あり|[○◯〇]", cell(r, cF))), "closed": "閉店" in cell(r, cS)}
    if len(info) < 10:
        print("[店舗情報] 行が少ないので使いません")
        return None
    path = os.path.join(ROOT, "data", "shops.json")
    with open(path, encoding="utf-8") as f:
        shops = json.load(f)
    changed = False
    for s in shops:
        x = info.get(s["code"])
        if not x:
            continue
        if x["hours"] and x["hours"] != s["hours"]:
            print(f'  {s["short"]} 営業時間 {s["hours"]} → {x["hours"]}')
            s["hours"] = x["hours"]
            s["hoursNotes"] = hours_notes(x["hours"])
            changed = True
        if x["holiday"] and x["holiday"] != s["holiday"]:
            print(f'  {s["short"]} 定休日 {s["holiday"]} → {x["holiday"]}')
            s["holiday"] = x["holiday"]
            changed = True
        if x["care"] != s["care"]:
            print(f'  {s["short"]} フェイスケア → {"あり" if x["care"] else "なし"}')
            s["care"] = x["care"]
            changed = True
        if x["closed"] != bool(s.get("closed")):
            print(f'  {s["short"]} → {"閉店" if x["closed"] else "営業中"}')
            if x["closed"]:
                s["closed"] = True
            else:
                s.pop("closed", None)
            changed = True
    if changed:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(shops, f, ensure_ascii=False, indent=1)
            f.write("\n")
    return sum(1 for s in shops if not s.get("closed"))


# ---------- 料金 ----------
def price_map(tab):
    if not tab:
        return {}
    head, rows = tab
    out = {}
    for r in rows:
        key, n = cell(r, 0), re.sub(r"[^\d]", "", cell(r, 2))
        if key and n:
            out[key] = f"{int(n):,}"
    return out


# ---------- 店舗の予定（main.js の planItems と同じ） ----------
def plan_items(tab, today):
    if not tab:
        return None
    head, rows = tab
    cS, cE, cShop = col(head, "^日付|開始", 0), col(head, "終了日|まで", -1), col(head, "店舗", 1)
    cK, cT, cW = col(head, "内容", 2), col(head, "時刻", 3), col(head, "理由", 4)
    items = []
    for r in rows:
        s = to_date(cell(r, cS))
        e = to_date(cell(r, cE)) if cE >= 0 else None
        shop, naiyo, why = cell(r, cShop), cell(r, cK), cell(r, cW)
        tm = re.search(r"(\d{1,2}):(\d{2})", cell(r, cT))
        if not s or not shop:
            continue
        if not e or e < s:
            e = s
        d = s
        while d <= e:
            if d >= today:
                items.append(plan_item(d, shop, naiyo, tm, why))
            d += dt.timedelta(days=1)
    items.sort(key=lambda it: it["s"])
    out, last = [], {}
    for it in items:
        k = (it["shop"], it["kind"], it["html"])
        p = last.get(k)
        if p:
            gap = (it["s"] - (p["e"] or p["s"])).days
            if gap == 0:
                continue
            if gap == 1 and it["kind"] == "休業":
                p["e"] = it["s"]
                continue
        last[k] = it
        out.append(it)
    return out


def plan_item(d, shop, naiyo, tm, why):
    all_ = shop == "全店舗"
    if not naiyo or re.search("休業|休み", naiyo):
        kind = "休業"
        h = "<strong>全店舗休業</strong>" if all_ else esc(shop)
        own = "<strong>全店舗休業</strong>" if all_ else "<strong>休業</strong>"
        if why:
            h += f"（{esc(why)}）"
            own += f"（{esc(why)}）"
    else:
        kind = "変更"
        t = f"{int(tm[1])}:{tm[2]}" if tm else ""
        if "定休日" in naiyo:
            body = f"{WD[d.weekday()]}曜ですが営業いたします。"
        elif "終了" in naiyo and t:
            body = f"{t}営業終了"
        elif "開始" in naiyo and t:
            body = f"{t}から営業"
        else:
            body = naiyo
        if why and "定休日" not in naiyo:
            body += f"（{why}）"
        h = ("<strong>全店舗</strong>" if all_ else esc(shop)) + "　" + esc(body)
        own = ("全店舗　" if all_ else "") + esc(body)
    return {"s": d, "e": None, "shop": shop, "kind": kind, "html": h, "own": own}


def day_label(g):
    e = g["e"]
    return f'{g["s"].year}/' + fmt_day(g["s"]) + (("〜" + fmt_day(e, e.year != g["s"].year)) if e else "")


def render_days(items):
    groups, by = [], {}
    for it in items:
        k = (it["s"], it["e"])
        if k not in by:
            by[k] = {"s": it["s"], "e": it["e"], "items": []}
            groups.append(by[k])
        by[k]["items"].append(it["html"])
    groups.sort(key=lambda g: (g["s"], 1 if g["e"] else 0))
    if not groups:
        return '<p class="nw-none">現在、予定はありません。</p>'
    return "".join(f'<div class="nw-day"><p class="nw-date">{day_label(g)}</p><ul>'
                   + "".join(f"<li>{h}</li>" for h in g["items"]) + "</ul></div>" for g in groups)


def shop_box(items, short):
    mine = [it for it in items if it["shop"] in (short, "全店舗")]
    if not mine:
        return None
    lis = "".join("<li><b>" + re.sub(r"^\d{4}/", "", day_label(it)) + f'</b><span>{it["own"]}</span></li>' for it in mine)
    return ('<p class="sps-h"><span aria-hidden="true">!</span>臨時休業・営業時間の変更</p><ul class="sps-list">' + lis
            + '</ul><a class="sps-more" href="../news.html#eigyo">ほかの店舗の情報も見る ›</a>')


def replace_div(src, start_tag, inner):
    """start_tag で始まる <div> の中身を inner に置きかえる（入れ子の div も数える）"""
    i = src.find(start_tag)
    if i < 0:
        return src
    j = i + len(start_tag)
    depth, k = 1, j
    for m in re.finditer(r"<div\b|</div>", src[j:]):
        depth += 1 if m.group(0) == "<div" else -1
        if depth == 0:
            k = j + m.start()
            break
    else:
        return src
    return src[:j] + inner + src[k:]


# ---------- まとめて反映 ----------
def html_files():
    files = glob.glob(os.path.join(ROOT, "*.html")) + glob.glob(os.path.join(ROOT, "shop", "*.html")) \
        + glob.glob(os.path.join(ROOT, "recruit", "*.html")) \
        + [os.path.join(ROOT, d, "index.html") for d in ("plus", "delight", "mrcool", "alpha")]
    return sorted(files)


def main():
    offline = "--offline" in sys.argv
    today = dt.datetime.now(JST).date()
    tabs = {t: read_tab(t, offline) for t in TABS}

    open_count = apply_shop_info(tabs["店舗情報"])
    for b in ("build_shops.py", "build_menu.py", "build_recruit.py", "build_brands.py"):
        subprocess.run([sys.executable, os.path.join(ROOT, "tools", b)], check=True, cwd=ROOT, stdout=subprocess.DEVNULL)

    prices = price_map(tabs["料金"])
    items = plan_items(tabs["店舗の予定"], today)
    with open(os.path.join(ROOT, "data", "shops.json"), encoding="utf-8") as f:
        short_of = {s["code"]: s["short"] for s in json.load(f)}

    for path in html_files():
        with open(path, encoding="utf-8") as f:
            src = f.read()
        out = src
        if prices:
            out = re.sub(r'(data-price="([\w-]+)"[^>]*>)([^<]*)(<)',
                         lambda m: m[1] + prices.get(m[2], m[3]) + m[4], out)
        if open_count:
            out = re.sub(r"(北関東に<strong>)\d+(</strong>店舗)", rf"\g<1>{open_count}\g<2>", out)
            out = re.sub(r"北関東に\d+店舗", f"北関東に{open_count}店舗", out)
        if items is not None and os.path.basename(path) == "news.html":
            for name, kind in (("休業", "休業"), ("営業時間変更", "変更")):
                out = replace_div(out, f'<div class="nw-list" data-sheet="{name}">',
                                  render_days([it for it in items if it["kind"] == kind]))
            out = re.sub(r'<p class="nw-upd">[^<]*</p>', f'<p class="nw-upd">{today:%Y.%m.%d}更新</p>', out)
        if items is not None and os.path.dirname(path).endswith("shop"):
            code = os.path.basename(path)[:-5]
            box = shop_box(items, short_of.get(code, ""))
            m = re.search(r'<div class="sp-sheet" data-shop="([^"]*)"( hidden)?>', out)
            if m:
                tag = f'<div class="sp-sheet" data-shop="{m[1]}"' + ("" if box else " hidden") + ">"
                out = out[:m.start()] + tag + out[m.end():]
                out = replace_div(out, tag, box or "")
        if out != src:
            with open(path, "w", encoding="utf-8") as f:
                f.write(out)
    print("シートの内容をページに反映しました" + ("（保存してある内容で）" if offline else ""))


if __name__ == "__main__":
    main()
