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
function run_(dims, mets, filter, limit, orderBys, range) {
  try {
    return runRaw_(dims, mets, filter, limit, orderBys, range);
  } catch (e) { // 1つの表が読めなくても、ほかの表は更新する
    ERRORS.push(dims.join(',') + '：' + e.message);
    return [];
  }
}
function runRaw_(dims, mets, filter, limit, orderBys, range) {
  const req = buildReq_({ dims: dims, mets: mets, filter: filter, limit: limit, range: range });
  if (orderBys) req.orderBys = orderBys;
  return rows_(AnalyticsData.Properties.runReport(req, PROPERTY));
}
function buildReq_(s) {
  const req = {
    dateRanges: [s.range || { startDate: START, endDate: 'today' }],
    dimensions: (s.dims || []).map(n => ({ name: n })),
    metrics: s.mets.map(n => ({ name: n })),
    limit: s.limit || 10000,
  };
  if (s.filter) req.dimensionFilter = s.filter;
  return req;
}
function rows_(res) {
  return ((res && res.rows) || []).map(r =>
    (r.dimensionValues || []).map(v => v.value).concat((r.metricValues || []).map(v => Number(v.value))));
}
// まとめて読む（5つずつ batchRunReports。失敗したら1つずつ読んで、どれが読めないかを記録）
function batch_(specs) {
  const keys = Object.keys(specs), out = {};
  for (let i = 0; i < keys.length; i += 5) {
    const chunk = keys.slice(i, i + 5);
    try {
      const res = AnalyticsData.Properties.batchRunReports({ requests: chunk.map(k => buildReq_(specs[k])) }, PROPERTY);
      chunk.forEach((k, j) => out[k] = rows_((res.reports || [])[j]));
    } catch (e) {
      chunk.forEach(k => { const s = specs[k]; out[k] = run_(s.dims || [], s.mets, s.filter, s.limit, null, s.range); });
    }
  }
  return out;
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
// 「来店につながった訪問」＝この動きが1つでもあった訪問（成約率の分子）
const VISIT_GOALS = ['wait_status_click', 'map_click', 'tel_click', 'app_download'];
const ymd_ = (d) => Utilities.formatDate(d, TZ, 'yyyy-MM-dd');

// 来店までの流れ（ファネル）：GA4 の runFunnelReport（v1alpha。Apps Script のサービスにないので直接呼ぶ）
const FUNNEL_STEPS = ['ホームページに来た', '店舗を探した（店舗一覧・店舗ページを見た）', 'そのあと 待ち状況・地図・電話・アプリDL を押した'];
function funnel_(ym, usePathField) {
  const y = Number(ym.slice(0, 4)), m = Number(ym.slice(4));
  const first = Utilities.formatDate(new Date(y, m - 1, 1), TZ, 'yyyy-MM-dd');
  const lastD = new Date(y, m, 0), today = new Date();
  const last = Utilities.formatDate(lastD > today ? today : lastD, TZ, 'yyyy-MM-dd');
  return funnelFor_({ startDate: first < START ? START : first, endDate: last }, usePathField);
}
function funnelFor_(rg, usePathField) {
  const shopStep = usePathField
    ? { funnelFieldFilter: { fieldName: 'pagePath', stringFilter: { matchType: 'CONTAINS', value: '/shop' } } }
    : { funnelEventFilter: { eventName: 'page_view', funnelParameterFilterExpression: { funnelParameterFilter: { eventParameterName: 'page_location', stringFilter: { matchType: 'CONTAINS', value: '/shop' } } } } };
  const body = {
    dateRanges: [rg],
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
function updateAll(e) {
  // 毎朝の自動更新がまだなら、ここでオンにする
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'updateAll')) setupTrigger();
  const ss = SpreadsheetApp.openById(SS_ID);
  const months = months_();


  // 1) 月別の主な数字
  const base = run_(['yearMonth'], ['totalUsers', 'newUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'engagementRate']);
  const ev = run_(['yearMonth', 'eventName'], ['eventCount'], inList_('eventName', EVENTS.map(e => e[0])));
  const gs = run_(['yearMonth'], ['sessions'], inList_('eventName', VISIT_GOALS));
  const goalSes = {};
  gs.forEach(r => goalSes[r[0]] = r[1]);
  const monthly = {};
  months.forEach(m => monthly[m] = { users: 0, newUsers: 0, sessions: 0, views: 0, dur: 0, eng: 0, ev: {} });
  base.forEach(r => { const o = monthly[r[0]]; if (o) Object.assign(o, { users: r[1], newUsers: r[2], sessions: r[3], views: r[4], dur: r[5], eng: r[6] }); });
  ev.forEach(r => { const o = monthly[r[0]]; if (o) o.ev[r[1]] = r[2]; });
  const mHead = ['月', '訪問者数', 'うち はじめての人', '訪問回数', 'ページ表示回数', '平均滞在時間（秒）', 'しっかり見た割合'].concat(EVENTS.map(e => e[1]), ['来店につながった訪問', '成約率']);
  const mRows = months.map(m => {
    const o = monthly[m], g = Math.min(goalSes[m] || 0, o.sessions || 0);
    return [monthLabel_(m), o.users, o.newUsers, o.sessions, o.views, Math.round(o.dur), o.eng].concat(EVENTS.map(e => o.ev[e[0]] || 0), [g, o.sessions ? g / o.sessions : 0]);
  });
  write_(ss, '月別', mHead, mRows, { pct: [7, mHead.length] });

  // 1b) 今月の途中までを、先月の同じ日数と比べる（公平な比較）
  const now = new Date();
  const d = Number(Utilities.formatDate(now, TZ, 'd'));
  const y0 = Number(Utilities.formatDate(now, TZ, 'yyyy')), m0 = Number(Utilities.formatDate(now, TZ, 'M'));
  const prevLast = new Date(y0, m0 - 1, 0).getDate();
  const ranges = [
    ['今月', { startDate: ymd_(new Date(y0, m0 - 1, 1)), endDate: ymd_(now) }],
    ['先月の同じ期間', { startDate: ymd_(new Date(y0, m0 - 2, 1)), endDate: ymd_(new Date(y0, m0 - 2, Math.min(d, prevLast))) }],
  ];
  const cRows = ranges.map(([name, rg]) => {
    const b = run_([], ['totalUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagementRate'], null, null, null, rg)[0] || [0, 0, 0, 0, 0];
    const e = {};
    run_(['eventName'], ['eventCount'], inList_('eventName', EVENTS.map(x => x[0])), null, null, rg).forEach(r => e[r[0]] = r[1]);
    const g = (run_([], ['sessions'], inList_('eventName', VISIT_GOALS), null, null, rg)[0] || [0])[0];
    return [name, rg.startDate, rg.endDate, b[0], b[1], b[2], b[3], b[4], g, b[2] ? Math.min(1, g / b[2]) : 0].concat(EVENTS.map(x => e[x[0]] || 0));
  });
  write_(ss, '同じ期間の比較', ['期間', '開始', '終了', '訪問者数', 'うち はじめての人', '訪問回数', 'ページ表示回数', 'しっかり見た割合', '来店につながった訪問', '成約率'].concat(EVENTS.map(e => e[1])), cRows, { pct: [8, 10], text: [2, 3] });

  // 1c) 日別（グラフ用。計測開始から今日まで）
  const dy = run_(['date'], ['totalUsers', 'sessions', 'screenPageViews']);
  const dg = run_(['date'], ['sessions'], inList_('eventName', VISIT_GOALS));
  const dgm = {};
  dg.forEach(r => dgm[r[0]] = r[1]);
  const dRows0 = dy.sort((a, b) => a[0].localeCompare(b[0]))
    .map(r => [r[0].slice(0, 4) + '-' + r[0].slice(4, 6) + '-' + r[0].slice(6), r[1], r[2], r[3], dgm[r[0]] || 0]);
  write_(ss, '日別', ['日付', '訪問者数', '訪問回数', 'ページ表示回数', '来店につながった訪問'], dRows0, { text: [1] });

  // 1d) 曜日×時間帯（訪問回数）
  const wh = run_(['yearMonth', 'dayOfWeek', 'hour'], ['sessions']);
  const whRows = wh.sort((a, b) => b[0].localeCompare(a[0]) || Number(a[1]) - Number(b[1]) || Number(a[2]) - Number(b[2]))
    .map(r => [monthLabel_(r[0]), Number(r[1]), Number(r[2]), r[3]]);
  write_(ss, '曜日×時間帯', ['月', '曜日（0=日）', '時', '訪問回数'], whRows);

  // 2) コンテンツ別（ページの種類）
  const cg = run_(['yearMonth', 'contentGroup'], ['screenPageViews', 'totalUsers', 'userEngagementDuration']);
  const cgRows = cg.filter(r => r[1] && r[1] !== '(not set)')
    .sort((a, b) => b[0].localeCompare(a[0]) || b[2] - a[2])
    .map(r => [monthLabel_(r[0]), r[1], r[2], r[3], r[2] ? Math.round(r[4] / r[2]) : 0]);
  write_(ss, 'コンテンツ別', ['月', 'コンテンツ', 'ページ表示回数', '訪問者数', '1回あたりの滞在（秒）'], cgRows);

  // 3) 店舗別（店舗ページの表示 ＋ 待ち状況・地図のクリック）
  const sp = run_(['yearMonth', 'pageTitle', 'pagePath'], ['screenPageViews', 'totalUsers'], eq_('contentGroup', '店舗ページ'));
  const sc = run_(['yearMonth', 'customEvent:shop_name', 'eventName'], ['eventCount'], inList_('eventName', ['wait_status_click', 'map_click']));
  const shops = {};
  const key = (m, s) => m + '|' + s;
  sp.forEach(r => {
    const k = key(r[0], shopLabel_(r[1]));
    shops[k] = shops[k] || [r[0], shopLabel_(r[1]), 0, 0, 0, 0, ''];
    shops[k][2] += r[3]; shops[k][3] += r[4];
    const mc = String(r[2]).match(/shop\/(\d+)\.html/);
    if (mc) shops[k][6] = mc[1];
  });
  sc.forEach(r => {
    if (!r[1] || r[1] === '(not set)') return;
    const k = key(r[0], shopLabel_(r[1])); shops[k] = shops[k] || [r[0], shopLabel_(r[1]), 0, 0, 0, 0, ''];
    shops[k][r[2] === 'wait_status_click' ? 4 : 5] += r[3];
  });
  const sRows = Object.values(shops).sort((a, b) => b[0].localeCompare(a[0]) || b[2] - a[2]).map(r => [monthLabel_(r[0])].concat(r.slice(1)));
  write_(ss, '店舗別', ['月', '店舗', 'ページ表示回数', '訪問者数', '待ち状況を見た', '地図を開いた', '店舗コード'], sRows, { text: [7] });

  // 4) 流入元
  const ch = run_(['yearMonth', 'sessionDefaultChannelGroup'], ['sessions', 'totalUsers']);
  const chg = {};
  run_(['yearMonth', 'sessionDefaultChannelGroup'], ['sessions'], inList_('eventName', VISIT_GOALS)).forEach(r => chg[r[0] + '|' + r[1]] = r[2]);
  const chRows = ch.sort((a, b) => b[0].localeCompare(a[0]) || b[2] - a[2]).map(r => {
    const g = Math.min(chg[r[0] + '|' + r[1]] || 0, r[2]);
    return [monthLabel_(r[0]), CHANNELS[r[1]] || r[1], r[2], r[3], g, r[2] ? g / r[2] : 0];
  });
  write_(ss, '流入元', ['月', 'どこから来たか', '訪問回数', '訪問者数', '来店につながった訪問', '成約率'], chRows, { pct: [6] });

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
  // 毎朝の自動更新のときは、画面でよく使う期間（今月・先月）を先に集めておく（画面がすぐ開く）
  if (e && e.triggerUid) { try { prewarm_(); } catch (err) { /* 先読みできなくても画面はその場で集める */ } }
}

// 表を書く（1行目は見出し）
function write_(ss, name, head, rows, opt) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  const data = [head].concat(rows);
  sh.getRange(1, 1, data.length, 1).setNumberFormat('@'); // 「2026年10月」が日付にならないように
  ((opt && opt.text) || []).forEach(c => sh.getRange(1, c, data.length, 1).setNumberFormat('@')); // 日付の文字も文字のまま
  sh.getRange(1, 1, data.length, head.length).setValues(data);
  sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#EF7A00').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  if (rows.length) {
    if (head.length > 1) sh.getRange(2, 2, rows.length, head.length - 1).setNumberFormat('#,##0');
    ((opt && opt.pct) || []).forEach(c => sh.getRange(2, c, rows.length, 1).setNumberFormat('0%'));
  }
  sh.autoResizeColumns(1, head.length);
}

// ================================================================ 期間を指定して集計（画面から）
// 選んだ期間（rg）の数字を、その場で GA4 から集める。月ごとの表（スプレッドシート）とは別に、期間を自由に選べるようにするため
function collect_(rg) {
  const R = (o) => Object.assign({ range: rg }, o);
  const g = batch_({
    base: R({ mets: ['totalUsers', 'newUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'engagementRate'] }),
    ev: R({ dims: ['eventName'], mets: ['eventCount'], filter: inList_('eventName', EVENTS.map(e => e[0])) }),
    goal: R({ mets: ['sessions'], filter: inList_('eventName', VISIT_GOALS) }),
    daily: R({ dims: ['date'], mets: ['totalUsers', 'sessions', 'screenPageViews'] }),
    dailyGoal: R({ dims: ['date'], mets: ['sessions'], filter: inList_('eventName', VISIT_GOALS) }),
    content: R({ dims: ['contentGroup'], mets: ['screenPageViews', 'totalUsers', 'userEngagementDuration'] }),
    shopPv: R({ dims: ['pageTitle', 'pagePath'], mets: ['screenPageViews', 'totalUsers'], filter: eq_('contentGroup', '店舗ページ') }),
    shopEv: R({ dims: ['customEvent:shop_name', 'eventName'], mets: ['eventCount'], filter: inList_('eventName', ['wait_status_click', 'map_click']) }),
    ch: R({ dims: ['sessionDefaultChannelGroup'], mets: ['sessions', 'totalUsers'] }),
    chGoal: R({ dims: ['sessionDefaultChannelGroup'], mets: ['sessions'], filter: inList_('eventName', VISIT_GOALS) }),
    sec: R({ dims: ['customEvent:section_name'], mets: ['eventCount'], filter: and_(eq_('eventName', 'section_view'), eq_('contentGroup', 'トップ')) }),
    appdl: R({ dims: ['contentGroup', 'customEvent:section_name', 'customEvent:store'], mets: ['eventCount'], filter: eq_('eventName', 'app_download') }),
    search: R({ dims: ['searchTerm'], mets: ['eventCount'], filter: eq_('eventName', 'search') }),
    dev: R({ dims: ['deviceCategory'], mets: ['totalUsers'] }),
    region: R({ dims: ['region'], mets: ['totalUsers'] }),
    heat: R({ dims: ['dayOfWeek', 'hour'], mets: ['sessions'] }),
    landing: R({ dims: ['landingPage'], mets: ['sessions', 'engagedSessions'] }),
    links: R({ dims: ['hostName', 'pageReferrer', 'pagePath'], mets: ['screenPageViews'] }),
    pv: R({ dims: ['pagePath'], mets: ['screenPageViews'] }),
    pageGoal: R({ dims: ['pagePath', 'eventName'], mets: ['eventCount'], filter: inList_('eventName', GOAL_EVENTS) }),
  });
  const out = summary_(g);
  // ページの種類ごと
  out.content = g.content.filter(r => r[0] && r[0] !== '(not set)').sort((a, b) => b[1] - a[1]).map(r => [r[0], r[1], r[2], r[1] ? Math.round(r[3] / r[1]) : 0]);
  // 店舗
  const shops = {};
  const sh = (name) => (shops[name] = shops[name] || [name, 0, 0, 0, 0, '']);
  g.shopPv.forEach(r => { const o = sh(shopLabel_(r[0])); o[1] += r[2]; o[2] += r[3]; const mc = String(r[1]).match(/shop\/(\d+)\.html/); if (mc) o[5] = mc[1]; });
  g.shopEv.forEach(r => { if (!r[0] || r[0] === '(not set)') return; const o = sh(shopLabel_(r[0])); o[r[1] === 'wait_status_click' ? 3 : 4] += r[2]; });
  out.shops = Object.values(shops).sort((a, b) => b[1] - a[1]);
  // 流入元
  const chg = {};
  g.chGoal.forEach(r => chg[r[0]] = r[1]);
  out.channels = g.ch.sort((a, b) => b[1] - a[1]).map(r => { const x = Math.min(chg[r[0]] || 0, r[1]); return [CHANNELS[r[0]] || r[0], r[1], r[2], x, r[1] ? x / r[1] : 0]; });
  // トップのコーナー
  const topViews = (g.content.find(r => r[0] === 'トップ') || [0, 0])[1];
  const sec = {};
  g.sec.forEach(r => sec[r[0]] = r[1]);
  out.sections = TOP_SECTIONS.map(n => [n, sec[n] || 0, topViews ? Math.min(1, (sec[n] || 0) / topViews) : 0]);
  out.appdl = g.appdl.sort((a, b) => b[3] - a[3]);
  out.search = g.search.filter(r => r[0] && r[0] !== '(not set)').sort((a, b) => b[1] - a[1]);
  out.devices = g.dev.sort((a, b) => b[1] - a[1]).map(r => [DEVICES[r[0]] || r[0], r[1]]);
  out.regions = g.region.sort((a, b) => b[1] - a[1]).map(r => [REGIONS[r[0]] || r[0], r[1]]);
  out.heat = g.heat.map(r => [Number(r[0]), Number(r[1]), r[2]]);
  // 入口
  const land = {};
  g.landing.forEach(r => { if (!r[0] || r[0] === '(not set)') return; const t = pageType_(r[0]); land[t] = land[t] || [t, 0, 0]; land[t][1] += r[1]; land[t][2] += r[2]; });
  out.landing = Object.values(land).sort((a, b) => b[1] - a[1]).map(r => [r[0], r[1], Math.max(0, r[1] - r[2]), r[1] ? Math.max(0, r[1] - r[2]) / r[1] : 0]);
  // つながり・離脱
  const link = {}, nextOf = {};
  g.links.forEach(r => {
    const ref = String(r[1] || ''), mt = ref.match(/^https?:\/\/([^\/]+)/);
    if (!mt || mt[1] !== r[0] || pathOf_(ref) === pathOf_(r[2])) return;
    const from = pageType_(ref), to = pageType_(r[2]), k = from + '|' + to;
    link[k] = link[k] || [from, to, 0]; link[k][2] += r[3];
    nextOf[from] = (nextOf[from] || 0) + r[3];
  });
  out.links = Object.values(link).sort((a, b) => b[2] - a[2]);
  const ex = {};
  const exRow = (t) => (ex[t] = ex[t] || [t, 0, 0]);
  g.pv.forEach(r => { exRow(pageType_(r[0]))[1] += r[1]; });
  g.pageGoal.forEach(r => { exRow(pageType_(r[0]))[2] += r[2]; });
  out.exits = Object.values(ex).filter(r => r[1] > 0).map(r => { const next = Math.min(r[1], nextOf[r[0]] || 0), end = r[1] - next; return [r[0], r[1], next, end, end / r[1], r[2]]; }).sort((a, b) => b[3] - a[3]);
  // 来店までの流れ
  try { out.funnel = funnelFor_(rg, true); }
  catch (e1) { try { out.funnel = funnelFor_(rg, false); } catch (e2) { out.funnel = null; ERRORS.push('来店までの流れ：' + e2.message); } }
  return out;
}
// 主な数字・動き・日別（比べる期間はこれだけ読む）
function summary_(g) {
  const b = g.base[0] || [0, 0, 0, 0, 0, 0];
  const goal = Math.min((g.goal[0] || [0])[0], b[2] || 0);
  const ev = {};
  EVENTS.forEach(e => ev[e[1]] = 0);
  g.ev.forEach(r => { const e = EVENTS.find(x => x[0] === r[0]); if (e) ev[e[1]] = r[1]; });
  const dgm = {};
  g.dailyGoal.forEach(r => dgm[r[0]] = r[1]);
  const daily = g.daily.sort((a, c) => a[0].localeCompare(c[0])).map(r => [r[0].slice(0, 4) + '-' + r[0].slice(4, 6) + '-' + r[0].slice(6), r[1], r[2], r[3], dgm[r[0]] || 0]);
  return { kpi: { users: b[0], newUsers: b[1], sessions: b[2], views: b[3], dur: Math.round(b[4]), eng: b[5], goal: goal, cvr: b[2] ? goal / b[2] : 0 }, ev: ev, daily: daily };
}
function collectPrev_(rg) {
  const R = (o) => Object.assign({ range: rg }, o);
  return summary_(batch_({
    base: R({ mets: ['totalUsers', 'newUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'engagementRate'] }),
    ev: R({ dims: ['eventName'], mets: ['eventCount'], filter: inList_('eventName', EVENTS.map(e => e[0])) }),
    goal: R({ mets: ['sessions'], filter: inList_('eventName', VISIT_GOALS) }),
    daily: R({ dims: ['date'], mets: ['totalUsers', 'sessions', 'screenPageViews'] }),
    dailyGoal: R({ dims: ['date'], mets: ['sessions'], filter: inList_('eventName', VISIT_GOALS) }),
  }));
}

// 画面から呼ぶ：期間（start〜end）と、比べる期間（cs〜ce）の数字。同じ期間は6時間まで覚えておく（force で集め直し）
function getRangeData(start, end, cs, ce, force) {
  const ok = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
  if (![start, end, cs, ce].every(ok)) throw new Error('期間の指定が正しくありません');
  const key = ['r3', start, end, cs, ce].join('|');
  if (!force) { const c = cacheGet_(key); if (c) return c; }
  ERRORS.length = 0;
  const data = {
    range: { start: start, end: end }, cmp: { start: cs, end: ce },
    cur: collect_({ startDate: start, endDate: end }),
    prev: collectPrev_({ startDate: cs, endDate: ce }),
    errors: ERRORS.join(' ／ ').slice(0, 500),
    at: Utilities.formatDate(new Date(), TZ, 'yyyy/MM/dd HH:mm'),
  };
  cachePut_(key, data);
  return data;
}
// 画面から呼ぶ：月ごとの推移（スプレッドシート）と基本の情報。空のとき・force のときは先に集計
function getBase(force) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const mon = ss.getSheetByName('月別');
  if (force || !mon || mon.getLastRow() < 2) updateAll();
  const sh = ss.getSheetByName('月別');
  const monthly = sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues() : [];
  const info = ss.getSheetByName('更新情報');
  const iv = info ? info.getRange(1, 2, 2, 1).getValues() : [[''], ['']];
  return {
    updated: iv[0][0] instanceof Date ? Utilities.formatDate(iv[0][0], TZ, 'yyyy/MM/dd HH:mm') : String(iv[0][0] || ''),
    errors: String(iv[1][0] || ''),
    events: EVENTS.map(e => e[1]),
    monthly: monthly.map(r => r.map(v => v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy/MM/dd') : v)),
    today: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'),
    start: START,
    siteBase: 'https://hsktake.github.io/hikari-website/',
  };
}
// 朝の先読み（今月・先月）。画面の期間の決め方（Dashboard.html の periodOf）と同じ
function prewarm_() {
  const now = new Date();
  const y = Number(Utilities.formatDate(now, TZ, 'yyyy')), m = Number(Utilities.formatDate(now, TZ, 'M')), d = Number(Utilities.formatDate(now, TZ, 'd'));
  const prevLast = new Date(y, m - 1, 0).getDate();
  getRangeData(ymd_(new Date(y, m - 1, 1)), ymd_(now), ymd_(new Date(y, m - 2, 1)), ymd_(new Date(y, m - 2, Math.min(d, prevLast))), true);
  getRangeData(ymd_(new Date(y, m - 2, 1)), ymd_(new Date(y, m - 1, 0)), ymd_(new Date(y, m - 3, 1)), ymd_(new Date(y, m - 2, 0)), true);
}
// キャッシュ（1つ 100KB までなので分けて入れる）
function cachePut_(key, obj) {
  try {
    const c = CacheService.getUserCache(), s = JSON.stringify(obj), n = Math.ceil(s.length / 90000), o = {};
    if (n > 20) return;
    for (let i = 0; i < n; i++) o[key + '#' + i] = s.slice(i * 90000, (i + 1) * 90000);
    o[key] = String(n);
    c.putAll(o, 21600);
  } catch (e) { /* 覚えられなくても動く */ }
}
function cacheGet_(key) {
  try {
    const c = CacheService.getUserCache(), n = Number(c.get(key) || 0);
    if (!n) return null;
    const keys = [];
    for (let i = 0; i < n; i++) keys.push(key + '#' + i);
    const got = c.getAll(keys);
    if (keys.some(k => got[k] == null)) return null;
    return JSON.parse(keys.map(k => got[k]).join(''));
  } catch (e) { return null; }
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
    compare: read('同じ期間の比較'),
    daily: read('日別'),
    heat: read('曜日×時間帯'),
    today: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'),
    siteBase: 'https://hsktake.github.io/hikari-website/',
  };
}
