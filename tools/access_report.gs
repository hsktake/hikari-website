/**
 * ホームページ アクセス集計（カットハウスひかり）
 * Googleアナリティクス 4 の数字を、毎朝6時ごろ自動でこのスプレッドシートに書き込みます。
 * メニュー「アクセス集計」→「今すぐ更新」でもすぐ更新できます。
 *
 * このコードの元は GitHub の hsktake/hikari-website の tools/access_report.gs（Claude が管理）。
 * スプレッドシートの「拡張機能 → Apps Script」に貼ってあり、
 * 「サービス」に Google Analytics Data API（AnalyticsData）を追加しています。
 */
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

// ---------------------------------------------------------------- メニュー・自動更新
function onOpen() {
  SpreadsheetApp.getUi().createMenu('アクセス集計')
    .addItem('今すぐ更新', 'updateAll')
    .addItem('毎朝の自動更新をオンにする', 'setupTrigger')
    .addToUi();
}

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

// ---------------------------------------------------------------- まとめて更新
function updateAll() {
  // 毎朝の自動更新がまだなら、ここでオンにする（最初に1回「今すぐ更新」を押すだけでよいように）
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'updateAll')) setupTrigger();
  const ss = SpreadsheetApp.getActive();
  const months = months_();
  const thisM = months[0], lastM = months[1] || '';

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

  // 9) まとめ（グラフの元になる表。位置は固定）
  summary_(ss, months, monthly, cg, sRows, chRows, secRows, dv, stRows, thisM, lastM);
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

// ---------------------------------------------------------------- まとめ
const S = { // まとめシートの行の位置（グラフがこの位置を見ているので変えない）
  kpi: 6, kpiN: 8,
  trend: 17, trendN: 12,
  content: 32, contentN: 20,
  channel: 55, channelN: 10,
  shop: 68, shopN: 10,
  section: 81, sectionN: 9,
  device: 93, deviceN: 4,
  search: 100, searchN: 10,
};

function summary_(ss, months, monthly, cg, sRows, chRows, secRows, dv, stRows, thisM, lastM) {
  const sh = ss.getSheetByName('まとめ') || ss.insertSheet('まとめ', 0);
  const T = monthLabel_(thisM), L = lastM ? monthLabel_(lastM) : '';
  const put = (row, col, vals) => { if (vals.length) sh.getRange(row, col, vals.length, vals[0].length).setValues(vals); };
  const clear = (row, n, w) => sh.getRange(row, 1, n, w).clearContent();
  const title = (row, text, head) => { sh.getRange(row - 2, 1).setValue(text); put(row - 1, 1, [head]); };

  sh.getRange('A:A').setNumberFormat('@');
  sh.getRange(1, 1).setValue('ホームページ アクセス集計（カットハウスひかり）');
  sh.getRange(2, 1).setValue('最終更新：' + Utilities.formatDate(new Date(), TZ, 'yyyy年M月d日 H:mm') + '　※今月の数字は今日までの分です');
  sh.getRange(3, 1).setValue(ERRORS.length ? '※一部の表が読み込めませんでした：' + ERRORS.join(' ／ ').slice(0, 300) : '');

  // 今月と先月
  const t = monthly[thisM], l = lastM ? monthly[lastM] : null;
  const kpis = [['訪問者数', 'users'], ['訪問回数', 'sessions'], ['ページ表示回数', 'views'],
    ['アプリDLボタン', 'app_download'], ['待ち状況を見た', 'wait_status_click'], ['地図を開いた', 'map_click'],
    ['電話をかけた', 'tel_click'], ['採用の連絡', 'recruit_contact']];
  const val = (o, k) => !o ? '' : (k in o ? o[k] : (o.ev[k] || 0));
  title(S.kpi, '■ 今月と先月', ['項目', '今月（' + T + '）', '先月' + (L ? '（' + L + '）' : ''), '先月とくらべて']);
  clear(S.kpi, S.kpiN, 4);
  put(S.kpi, 1, kpis.map(k => {
    const a = val(t, k[1]), b = val(l, k[1]);
    return [k[0], a, b, b ? (a - b) / b : ''];
  }));
  sh.getRange(S.kpi, 2, S.kpiN, 2).setNumberFormat('#,##0');
  sh.getRange(S.kpi, 4, S.kpiN, 1).setNumberFormat('+0%;-0%;0%');

  // 月ごとの推移（古い順に12か月）
  title(S.trend, '■ 月ごとの推移（直近12か月）', ['月', '訪問者数', 'ページ表示回数', 'アプリDLボタン', '待ち状況を見た', '地図を開いた']);
  clear(S.trend, S.trendN, 6);
  put(S.trend, 1, months.slice(0, S.trendN).reverse().map(m => {
    const o = monthly[m];
    return [monthLabel_(m), o.users, o.views, o.ev.app_download || 0, o.ev.wait_status_click || 0, o.ev.map_click || 0];
  }));

  // 今月のコンテンツ別
  title(S.content, '■ 今月よく見られたページ（コンテンツ別）', ['コンテンツ', 'ページ表示回数', '訪問者数']);
  clear(S.content, S.contentN, 3);
  put(S.content, 1, cg.filter(r => r[0] === thisM && r[1] && r[1] !== '(not set)').sort((a, b) => b[2] - a[2]).slice(0, S.contentN).map(r => [r[1], r[2], r[3]]));

  // 今月の流入元
  title(S.channel, '■ 今月どこから来たか', ['どこから来たか', '訪問回数']);
  clear(S.channel, S.channelN, 2);
  put(S.channel, 1, chRows.filter(r => r[0] === T).slice(0, S.channelN).map(r => [r[1], r[2]]));

  // 今月の店舗ページ TOP10
  title(S.shop, '■ 今月よく見られた店舗 TOP10', ['店舗', 'ページ表示回数', '待ち状況を見た', '地図を開いた']);
  clear(S.shop, S.shopN, 4);
  put(S.shop, 1, sRows.filter(r => r[0] === T).slice(0, S.shopN).map(r => [r[1], r[2], r[4], r[5]]));

  // 今月 トップのコーナー
  title(S.section, '■ 今月 トップページの各コーナーまで見た割合', ['コーナー', '見た回数', '見た割合']);
  clear(S.section, S.sectionN, 3);
  put(S.section, 1, secRows.filter(r => r[0] === T).map(r => [r[1], r[2], r[3]]));
  sh.getRange(S.section, 3, S.sectionN, 1).setNumberFormat('0%');

  // 今月の端末
  title(S.device, '■ 今月の端末', ['端末', '訪問者数']);
  clear(S.device, S.deviceN, 2);
  put(S.device, 1, dv.filter(r => r[0] === thisM).sort((a, b) => b[2] - a[2]).slice(0, S.deviceN).map(r => [DEVICES[r[1]] || r[1], r[2]]));

  // 今月の店舗検索
  title(S.search, '■ 今月よく検索された言葉（店舗検索）', ['検索された言葉', '回数']);
  clear(S.search, S.searchN, 2);
  put(S.search, 1, stRows.filter(r => r[0] === T).slice(0, S.searchN).map(r => [r[1], r[2]]));
}
