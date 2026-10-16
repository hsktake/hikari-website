/**
 * ホームページ アクセス集計（カットハウスひかり）
 *  - データ置き場：スプレッドシート（SS_ID）。人は直接さわらない
 *  - 集計：毎朝6時ごろ、Googleアナリティクス 4 の数字をスプレッドシートの各タブに書き込む（updateAll）
 *  - 表示：ウェブアプリ（doGet → Dashboard.html）。URL を開くとグラフ付きの画面
 *
 * このコードの元は GitHub の hsktake/hikari-website の tools/access_report.gs と tools/access_dashboard.html（Claude が管理）。
 * Apps Script の「サービス」に Google Analytics Data API（AnalyticsData v1beta）を追加しています。
 */
const SS_ID = '1ebLbFcPGZ5JQCqlUOQZTOJPvTJ8KSz5iMmKcknia7jw';
const PROPERTY = 'properties/559307576'; // GA4 プロパティ「カットハウスひかり ホームページ」
const START = '2026-10-01';               // 計測を始めた月
const TZ = 'Asia/Tokyo';

// 記録している動き（イベント名 → 表示名）
const EVENTS = [
  ['app_download', 'アプリDLボタン'],
  ['wait_status_click', '待ち状況を見た'],
  ['map_click', '地図を開いた'],
  ['tel_click', '電話をかけた'],
  ['recruit_contact', '採用の連絡'],
  ['instagram_click', 'Instagramへ'],
  ['search', '店舗検索'],
];
const CHANNELS = {
  'Organic Search': '検索（Google など）', 'Direct': '直接（ブックマーク・URL入力・アプリ内など）',
  'Organic Social': 'SNS（Instagram など）', 'Referral': 'ほかのサイトのリンク', 'Organic Maps': '地図アプリ',
  'Paid Search': '検索広告', 'Paid Social': 'SNS広告', 'Display': 'ディスプレイ広告', 'Email': 'メール',
  'Organic Video': '動画サイト', 'Unassigned': 'わからない', 'Cross-network': '広告（複数）'
};
const DEVICES = { mobile: 'スマホ', desktop: 'パソコン', tablet: 'タブレット', 'smart tv': 'テレビ' };
const REGIONS = {
  Ibaraki: '茨城県', Tochigi: '栃木県', Chiba: '千葉県', Fukushima: '福島県', Tokyo: '東京都', Saitama: '埼玉県',
  Gunma: '群馬県', Kanagawa: '神奈川県', Miyagi: '宮城県', Niigata: '新潟県', Osaka: '大阪府', Aichi: '愛知県',
  Yamagata: '山形県', Nagano: '長野県', Shizuoka: '静岡県', Hokkaido: '北海道', Fukuoka: '福岡県', Kyoto: '京都府'
};
const TOP_SECTIONS = ['ヒーロー', 'ヘアカタログ帯', '店舗を探す', '公式アプリ', 'メニュー', '予約からカットまで', 'Instagram', '会社案内', '採用情報'];

// ---------------------------------------------------------------- 自動更新（毎朝6時）
function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'updateAll') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('updateAll').timeBased().everyDays(1).atHour(6).inTimezone(TZ).create();
}

// ---------------------------------------------------------------- GA4 から読む
const ERRORS = [];
function run_(dims, mets, filter, limit, orderBys) {
  try {
    return runRaw_(dims, mets, filter, limit, orderBys);
  } catch (e) { // 1つの表が読めなくても、ほかの表は更新する
    ERRORS.push(dims.join(',') + '：' + e.message);
    return [];
  }
}
function runRaw_(dims, mets, filter, limit, orderBys) {
  const req = {
    dateRanges: [{ startDate: START, endDate: 'today' }],
    dimensions: dims.map(n => ({ name: n })),
    metrics: mets.map(n => ({ name: n })),
    limit: limit || 10000,
  };
  if (filter) req.dimensionFilter = filter;
  if (orderBys) req.orderBys = orderBys;
  const res = AnalyticsData.Properties.runReport(req, PROPERTY);
  return (res.rows || []).map(r =>
    (r.dimensionValues || []).map(v => v.value).concat((r.metricValues || []).map(v => Number(v.value))));
}
const eq_ = (field, value) => ({ filter: { fieldName: field, stringFilter: { value: value, matchType: 'EXACT' } } });
const inList_ = (field, values) => ({ filter: { fieldName: field, inListFilter: { values: values } } });
const and_ = (...f) => ({ andGroup: { expressions: f } });

function monthLabel_(ym) { return ym.slice(0, 4) + '年' + Number(ym.slice(4)) + '月'; }
function months_() { // 計測開始から今月まで（新しい順）
  const out = [], now = new Date();
  let y = Number(Utilities.formatDate(now, TZ, 'yyyy')), m = Number(Utilities.formatDate(now, TZ, 'M'));
  while (y * 100 + m >= Number(START.slice(0, 4)) * 100 + Number(START.slice(5, 7))) {
    out.push(String(y) + ('0' + m).slice(-2));
    m--; if (m === 0) { m = 12; y--; }
  }
  return out;
}
function shopLabel_(s) { return String(s).replace(/（.*$/, '').replace(/｜.*$/, '').trim(); }

// ページのパス → ページの種類（ホームページの main.js のコンテンツグループと同じ名前）
const PAGE_TYPES = [
  [/^(index\.html)?$/, 'トップ'], [/^shops\.html/, '店舗を探す'], [/^shop\//, '店舗ページ'],
  [/^haircut\.html/, 'ヘアカット'], [/^brow\.html/, '眉毛カット'], [/^facecare\.html/, 'フェイスケア'],
  [/^app\.html/, '公式アプリ'], [/^app-guide\.html/, 'アプリの使い方'], [/^news\.html/, 'お知らせ'],
  [/^recruit/, '採用情報'], [/^member\.html/, 'HiCARD会員'], [/^faq\.html/, 'よくあるご質問'],
  [/^contact\.html/, 'お問い合わせ'], [/^community\.html/, '地域とともに'], [/^group\.html/, 'グループのお店'],
  [/^(privacy|tokushoho)\.html/, '規約・表記'],
  [/^plus\//, 'グループ：カットスペースPLUS'], [/^delight\//, "グループ：Men's Cut & Self DELIGHT"],
  [/^mrcool\//, 'グループ：HAIR STUDIO MR.COOL'], [/^alpha\//, 'グループ：シャンプーカット アルファ'],
  [/^laladream\//, 'グループ：ララ・ドリーム 清原テクノ店'],
];
function pathOf_(url) { // URL かパスから、パスだけ（? と # は取る）
  return String(url || '').replace(/^https?:\/\/[^\/]+/, '').split('#')[0].split('?')[0] || '/';
}
function pageType_(path) {
  const rel = pathOf_(path).replace(/^\/hikari-website\//, '/').replace(/^\//, ''); // 本番前（GitHub Pages）の /hikari-website/ を外す
  for (let i = 0; i < PAGE_TYPES.length; i++) if (PAGE_TYPES[i][0].test(rel)) return PAGE_TYPES[i][1];
  return 'その他';
}
const GOAL_EVENTS = ['app_download', 'wait_status_click', 'map_click', 'tel_click', 'recruit_contact'];

// 来店までの流れ（ファネル）：GA4 の runFunnelReport（v1alpha。Apps Script のサービスにないので直接呼ぶ）
const FUNNEL_STEPS = ['ホームページに来た', '店舗を探した（店舗一覧・店舗ページを見た）', 'そのあと 待ち状況・地図・電話・アプリDL を押した'];
function funnel_(ym, usePathField) {
  const y = Number(ym.slice(0, 4)), m = Number(ym.slice(4));
  const first = Utilities.formatDate(new Date(y, m - 1, 1), TZ, 'yyyy-MM-dd');
  const lastD = new Date(y, m, 0), today = new Date();
  const last = Utilities.formatDate(lastD > today ? today : lastD, TZ, 'yyyy-MM-dd');
  const shopStep = usePathField
    ? { funnelFieldFilter: { fieldName: 'pagePath', stringFilter: { matchType: 'CONTAINS', value: '/shop' } } }
    : { funnelEventFilter: { eventName: 'page_view', funnelParameterFilterExpression: { funnelParameterFilter: { eventParameterName: 'page_location', stringFilter: { matchType: 'CONTAINS', value: '/shop' } } } } };
  const body = {
    dateRanges: [{ startDate: first < START ? START : first, endDate: last }],
    funnel: {
      isOpenFunnel: false,
      steps: [
        { name: FUNNEL_STEPS[0], filterExpression: { funnelEventFilter: { eventName: 'session_start' } } },
        { name: FUNNEL_STEPS[1], filterExpression: shopStep },
        { name: FUNNEL_STEPS[2], filterExpression: { orGroup: { expressions: ['wait_status_click', 'map_click', 'tel_click', 'app_download'].map(e => ({ funnelEventFilter: { eventName: e } })) } } },
      ],
    },
  };
  const res = UrlFetchApp.fetch('https://analyticsdata.googleapis.com/v1alpha/' + PROPERTY + ':runFunnelReport', {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
  });
  if (res.getResponseCode() !== 200) throw new Error('ファネル ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200));
  const t = JSON.parse(res.getContentText()).funnelTable || {};
  const mh = (t.metricHeaders || []).map(h => h.name);
  const iu = mh.indexOf('activeUsers');
  const out = FUNNEL_STEPS.map(() => 0);
  (t.rows || []).forEach(r => {
    const dv = r.dimensionValues || [];
    if (dv.length > 1 && dv[1].value !== 'RESERVED_TOTAL') return; // 内訳の行は使わない（合計だけ）
    const name = String(dv[0] && dv[0].value || '');
    const i = FUNNEL_STEPS.findIndex(s => name.indexOf(s) >= 0);
    if (i >= 0) out[i] = Number(r.metricValues[iu >= 0 ? iu : 0].value || 0);
  });
  return out;
}

// ---------------------------------------------------------------- まとめて更新
function updateAll() {
  // 毎朝の自動更新がまだなら、ここでオンにする
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'updateAll')) setupTrigger();
  const ss = SpreadsheetApp.openById(SS_ID);
  const months = months_();


  // 1) 月別の主な数字
  const base = run_(['yearMonth'], ['totalUsers', 'newUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'engagementRate']);
  const ev = run_(['yearMonth', 'eventName'], ['eventCount'], inList_('eventName', EVENTS.map(e => e[0])));
  const monthly = {};
  months.forEach(m => monthly[m] = { users: 0, newUsers: 0, sessions: 0, views: 0, dur: 0, eng: 0, ev: {} });
  base.forEach(r => { const o = monthly[r[0]]; if (o) Object.assign(o, { users: r[1], newUsers: r[2], sessions: r[3], views: r[4], dur: r[5], eng: r[6] }); });
  ev.forEach(r => { const o = monthly[r[0]]; if (o) o.ev[r[1]] = r[2]; });
  const mHead = ['月', '訪問者数', 'うち はじめての人', '訪問回数', 'ページ表示回数', '平均滞在時間（秒）', 'しっかり見た割合'].concat(EVENTS.map(e => e[1]));
  const mRows = months.map(m => {
    const o = monthly[m];
    return [monthLabel_(m), o.users, o.newUsers, o.sessions, o.views, Math.round(o.dur), o.eng].concat(EVENTS.map(e => o.ev[e[0]] || 0));
  });
  write_(ss, '月別', mHead, mRows, { pct: [7] });

  // 2) コンテンツ別（ページの種類）
  const cg = run_(['yearMonth', 'contentGroup'], ['screenPageViews', 'totalUsers', 'userEngagementDuration']);
  const cgRows = cg.filter(r => r[1] && r[1] !== '(not set)')
    .sort((a, b) => b[0].localeCompare(a[0]) || b[2] - a[2])
    .map(r => [monthLabel_(r[0]), r[1], r[2], r[3], r[2] ? Math.round(r[4] / r[2]) : 0]);
  write_(ss, 'コンテンツ別', ['月', 'コンテンツ', 'ページ表示回数', '訪問者数', '1回あたりの滞在（秒）'], cgRows);

  // 3) 店舗別（店舗ページの表示 ＋ 待ち状況・地図のクリック）
  const sp = run_(['yearMonth', 'pageTitle'], ['screenPageViews', 'totalUsers'], eq_('contentGroup', '店舗ページ'));
  const sc = run_(['yearMonth', 'customEvent:shop_name', 'eventName'], ['eventCount'], inList_('eventName', ['wait_status_click', 'map_click']));
  const shops = {};
  const key = (m, s) => m + '|' + s;
  sp.forEach(r => { const k = key(r[0], shopLabel_(r[1])); shops[k] = shops[k] || [r[0], shopLabel_(r[1]), 0, 0, 0, 0]; shops[k][2] += r[2]; shops[k][3] += r[3]; });
  sc.forEach(r => {
    if (!r[1] || r[1] === '(not set)') return;
    const k = key(r[0], shopLabel_(r[1])); shops[k] = shops[k] || [r[0], shopLabel_(r[1]), 0, 0, 0, 0];
    shops[k][r[2] === 'wait_status_click' ? 4 : 5] += r[3];
  });
  const sRows = Object.values(shops).sort((a, b) => b[0].localeCompare(a[0]) || b[2] - a[2]).map(r => [monthLabel_(r[0])].concat(r.slice(1)));
  write_(ss, '店舗別', ['月', '店舗', 'ページ表示回数', '訪問者数', '待ち状況を見た', '地図を開いた'], sRows);

  // 4) 流入元
  const ch = run_(['yearMonth', 'sessionDefaultChannelGroup'], ['sessions', 'totalUsers']);
  const chRows = ch.sort((a, b) => b[0].localeCompare(a[0]) || b[2] - a[2]).map(r => [monthLabel_(r[0]), CHANNELS[r[1]] || r[1], r[2], r[3]]);
  write_(ss, '流入元', ['月', 'どこから来たか', '訪問回数', '訪問者数'], chRows);

  // 5) トップのコーナー（トップを開いた回数のうち、そのコーナーまで見た割合）
  const topViews = {};
  cg.filter(r => r[1] === 'トップ').forEach(r => topViews[r[0]] = r[2]);
  const secRaw = run_(['yearMonth', 'customEvent:section_name'], ['eventCount'], and_(eq_('eventName', 'section_view'), eq_('contentGroup', 'トップ')));
  const sec = {};
  secRaw.forEach(r => sec[r[0] + '|' + r[1]] = r[2]);
  const secRows = [];
  months.forEach(m => TOP_SECTIONS.forEach(n => {
    const c = sec[m + '|' + n] || 0;
    secRows.push([monthLabel_(m), n, c, topViews[m] ? Math.min(1, c / topViews[m]) : 0]);
  }));
  write_(ss, 'トップのコーナー', ['月', 'コーナー', '見た回数', 'トップを開いた人のうち見た割合'], secRows, { pct: [4] });

  // 6) アプリのダウンロードボタンが押された場所
  const ad = run_(['yearMonth', 'contentGroup', 'customEvent:section_name', 'customEvent:store'], ['eventCount'], eq_('eventName', 'app_download'));
  const adRows = ad.sort((a, b) => b[0].localeCompare(a[0]) || b[4] - a[4]).map(r => [monthLabel_(r[0]), r[1], r[2], r[3], r[4]]);
  write_(ss, 'アプリDLの場所', ['月', 'ページ', '押された場所', 'ストア', '押された回数'], adRows);

  // 7) 店舗検索の言葉
  const st = run_(['yearMonth', 'searchTerm'], ['eventCount'], eq_('eventName', 'search'));
  const stRows = st.filter(r => r[1] && r[1] !== '(not set)').sort((a, b) => b[0].localeCompare(a[0]) || b[2] - a[2]).map(r => [monthLabel_(r[0]), r[1], r[2]]);
  write_(ss, '検索ワード', ['月', '検索された言葉', '回数'], stRows);

  // 8) 端末・地域・時間帯
  const dv = run_(['yearMonth', 'deviceCategory'], ['totalUsers']);
  const rg = run_(['yearMonth', 'region'], ['totalUsers']);
  const hr = run_(['yearMonth', 'hour'], ['sessions']);
  const dRows = [];
  dv.sort((a, b) => b[0].localeCompare(a[0]) || b[2] - a[2]).forEach(r => dRows.push([monthLabel_(r[0]), '端末', DEVICES[r[1]] || r[1], r[2]]));
  rg.sort((a, b) => b[0].localeCompare(a[0]) || b[2] - a[2]).forEach(r => dRows.push([monthLabel_(r[0]), '地域', REGIONS[r[1]] || r[1], r[2]]));
  hr.sort((a, b) => b[0].localeCompare(a[0]) || Number(a[1]) - Number(b[1])).forEach(r => dRows.push([monthLabel_(r[0]), '時間帯', Number(r[1]) + '時台', r[2]]));
  write_(ss, '端末・地域・時間帯', ['月', '種類', '内容', '人数・回数'], dRows);

  // 9) お客様の動き：入口のページ（最初に開いたページ）と、すぐ帰った割合
  const lp = run_(['yearMonth', 'landingPage'], ['sessions', 'engagedSessions']);
  const land = {};
  lp.forEach(r => {
    if (!r[1] || r[1] === '(not set)') return;
    const k = r[0] + '|' + pageType_(r[1]);
    land[k] = land[k] || [r[0], pageType_(r[1]), 0, 0];
    land[k][2] += r[2]; land[k][3] += r[3];
  });
  const lRows = Object.values(land).sort((a, b) => b[0].localeCompare(a[0]) || b[2] - a[2])
    .map(r => [monthLabel_(r[0]), r[1], r[2], Math.max(0, r[2] - r[3]), r[2] ? Math.max(0, r[2] - r[3]) / r[2] : 0]);
  write_(ss, '入口のページ', ['月', '最初に開いたページ', '訪問回数', 'すぐ帰った回数', 'すぐ帰った割合'], lRows, { pct: [5] });

  // 10) ページのつながり（前のページ → 次のページ）。前のページ＝同じサイト内の参照元（pageReferrer）
  const tr = run_(['yearMonth', 'hostName', 'pageReferrer', 'pagePath'], ['screenPageViews']);
  const link = {}, nextOf = {};
  tr.forEach(r => {
    const ref = String(r[2] || ''), mt = ref.match(/^https?:\/\/([^\/]+)/);
    if (!mt || mt[1] !== r[1]) return;                  // サイトの外から来た（＝入口）は入口のページの表で数える
    if (pathOf_(ref) === pathOf_(r[3])) return;          // 同じページの読み込み直しは数えない
    const from = pageType_(ref), to = pageType_(r[3]);
    const k = r[0] + '|' + from + '|' + to;
    link[k] = link[k] || [r[0], from, to, 0];
    link[k][3] += r[4];
    nextOf[r[0] + '|' + from] = (nextOf[r[0] + '|' + from] || 0) + r[4];
  });
  const tRows = Object.values(link).sort((a, b) => b[0].localeCompare(a[0]) || b[3] - a[3]).map(r => [monthLabel_(r[0]), r[1], r[2], r[3]]);
  write_(ss, 'ページのつながり', ['月', '前のページ', '次のページ', '回数'], tRows);

  // 11) 離脱：ページごとの「ここで終わった」（表示回数 − 次のページへ進んだ回数。目安）と、来店・連絡につながる動き
  const pv = run_(['yearMonth', 'pagePath'], ['screenPageViews']);
  const gv = run_(['yearMonth', 'pagePath', 'eventName'], ['eventCount'], inList_('eventName', GOAL_EVENTS));
  const ex = {};
  const exRow = (m, t) => (ex[m + '|' + t] = ex[m + '|' + t] || [m, t, 0, 0, 0]);
  pv.forEach(r => { exRow(r[0], pageType_(r[1]))[2] += r[2]; });
  gv.forEach(r => { exRow(r[0], pageType_(r[1]))[4] += r[3]; });
  const xRows = Object.values(ex).filter(r => r[2] > 0).map(r => {
    const next = Math.min(r[2], nextOf[r[0] + '|' + r[1]] || 0), end = r[2] - next;
    return [r[0], r[1], r[2], next, end, end / r[2], r[4]];
  }).sort((a, b) => b[0].localeCompare(a[0]) || b[2] - a[2]).map(r => [monthLabel_(r[0])].concat(r.slice(1)));
  write_(ss, '離脱', ['月', 'ページ', '表示回数', '次のページへ進んだ', 'ここで終わった', 'ここで終わった割合', '来店・連絡につながる動き'], xRows, { pct: [6] });

  // 12) 来店までの流れ（ファネル。人数）
  const fRows = [];
  months.slice(0, 12).forEach(m => {
    let f = null;
    try { f = funnel_(m, true); }
    catch (e1) {
      try { f = funnel_(m, false); } catch (e2) { ERRORS.push('来店までの流れ：' + e2.message); }
    }
    if (f) FUNNEL_STEPS.forEach((s, i) => fRows.push([monthLabel_(m), i + 1, s, f[i]]));
  });
  write_(ss, '来店までの流れ', ['月', '順番', '段階', '人数'], fRows);

  // 13) 更新情報（画面の「最終更新」）
  const info = ss.getSheetByName('更新情報') || ss.insertSheet('更新情報');
  info.clear();
  info.getRange(1, 1, 2, 2).setValues([
    ['最終更新', Utilities.formatDate(new Date(), TZ, 'yyyy/MM/dd HH:mm')],
    ['読めなかった表', ERRORS.join(' ／ ').slice(0, 500)]]);
}

// 表を書く（1行目は見出し）
function write_(ss, name, head, rows, opt) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  const data = [head].concat(rows);
  sh.getRange(1, 1, data.length, 1).setNumberFormat('@'); // 「2026年10月」が日付にならないように
  sh.getRange(1, 1, data.length, head.length).setValues(data);
  sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#EF7A00').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  if (rows.length) {
    if (head.length > 1) sh.getRange(2, 2, rows.length, head.length - 1).setNumberFormat('#,##0');
    ((opt && opt.pct) || []).forEach(c => sh.getRange(2, c, rows.length, 1).setNumberFormat('0%'));
  }
  sh.autoResizeColumns(1, head.length);
}

// ---------------------------------------------------------------- ウェブアプリ（表示）
function doGet() {
  // はじめて開いたとき（許可した直後）に、毎朝の自動更新をオンにする
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'updateAll')) setupTrigger();
  return HtmlService.createHtmlOutputFromFile('Dashboard')
    .setTitle('ホームページ アクセス集計｜カットハウスひかり')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// 画面から呼ぶ：スプレッドシートの数字をまとめて返す（まだ空のとき・「最新にする」のときは先に集計する）
function getData(force) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const mon = ss.getSheetByName('月別');
  if (force || !mon || mon.getLastRow() < 2) updateAll();
  const read = (name) => {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return [];
    return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues()
      .map(r => r.map(v => v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy/MM/dd HH:mm') : v));
  };
  const info = ss.getSheetByName('更新情報');
  const iv = info ? info.getRange(1, 2, 2, 1).getValues() : [[''], ['']];
  return {
    updated: iv[0][0] instanceof Date ? Utilities.formatDate(iv[0][0], TZ, 'yyyy/MM/dd HH:mm') : String(iv[0][0] || ''),
    errors: String(iv[1][0] || ''),
    events: EVENTS.map(e => e[1]),
    monthly: read('月別'),
    content: read('コンテンツ別'),
    shops: read('店舗別'),
    channels: read('流入元'),
    sections: read('トップのコーナー'),
    appdl: read('アプリDLの場所'),
    search: read('検索ワード'),
    dev: read('端末・地域・時間帯'),
    landing: read('入口のページ'),
    links: read('ページのつながり'),
    exits: read('離脱'),
    funnel: read('来店までの流れ'),
  };
}
