/**
 * HSK-COUNT（ホームページのアクセス集計・カットハウスひかり）
 *  - データ置き場：スプレッドシート「HSK-COUNT管理」（SS_ID）。タブは 使い方・月別・更新情報 だけ。人は直接さわらない
 *  - 集計：毎朝6時ごろ、Googleアナリティクス 4 の月ごとの数字を「月別」に書き、今月・先月を先に集めておく（updateAll）
 *          期間ごとの数字（店舗別・流入元など）は、画面で期間を選んだときにその場で集める（getRangeData）
 *  - 表示：ウェブアプリ（doGet → Dashboard.html）
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
  // お問い合わせフォーム（お客様からの声の入口。HSK-VOICE で見る）は、ホームページの数字にいっさい入れない（オーナー指示 2026-11-17）
  // 社内テスト（notrack.html で「テストで数える」にした端末）も入れない。テストの回数は getTests で別に見る
  req.dimensionFilter = s.filter ? and_(s.filter, NOT_FORM) : NOT_FORM;
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
const NOT_OURS = ['お問い合わせフォーム', '社内テスト']; // ホームページの数字に入れないコンテンツグループ
const NOT_FORM = { notExpression: inList_('contentGroup', NOT_OURS) };

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
  return String(url || '').replace(/^https?:\/\/[^\/]+/, '').replace(/^[a-z0-9-]+(\.[a-z0-9-]+)+(?=\/)/i, '').split('#')[0].split('?')[0] || '/';
}
function pageType_(path) {
  const rel = pathOf_(path).replace(/^\/hikari-website(\/|$)/, '/').replace(/^\//, ''); // 「/hikari-website」（最後の / なし）も同じ // 本番前（GitHub Pages）の /hikari-website/ を外す
  for (let i = 0; i < PAGE_TYPES.length; i++) if (PAGE_TYPES[i][0].test(rel)) return PAGE_TYPES[i][1];
  return 'その他';
}
const GOAL_EVENTS = ['app_download', 'wait_status_click', 'map_click', 'tel_click', 'recruit_contact'];
// 「来店につながった訪問」＝この動きが1つでもあった訪問（お店に向かった割合の分子）
const VISIT_GOALS = ['wait_status_click', 'map_click', 'tel_click', 'app_download'];
const ymd_ = (d) => Utilities.formatDate(d, TZ, 'yyyy-MM-dd');

// ---------------------------------------------------------------- サイト（画面の「サイト」で切り替え）
// ひかりのページの種類（main.js の GROUPS と同じ）。グループのお店は ga.js のコンテンツグループ「グループ：店名」
const HIKARI_GROUPS = ['トップ', '店舗を探す', '店舗ページ', 'ヘアカット', '眉毛カット', 'フェイスケア', '公式アプリ', 'アプリの使い方', 'お知らせ',
  '採用情報', 'HiCARD会員', 'よくあるご質問', 'お問い合わせ', '地域とともに', 'グループのお店', '規約・表記', 'その他'];
const SITES = [
  { key: 'hikari', name: 'カットハウスひかり' },
  { key: 'plus', name: 'カットスペースPLUS', group: 'グループ：カットスペースPLUS' },
  { key: 'delight', name: "Men's Cut & Self DELIGHT", group: "グループ：Men's Cut & Self DELIGHT" },
  { key: 'mrcool', name: 'HAIR STUDIO MR.COOL', group: 'グループ：HAIR STUDIO MR.COOL' },
  { key: 'alpha', name: 'シャンプーカット アルファ', group: 'グループ：シャンプーカット アルファ' },
  { key: 'laladream', name: 'ララ・ドリーム 清原テクノ店', group: 'グループ：ララ・ドリーム 清原テクノ店' },
  { key: 'all', name: 'すべてのサイトの合計' },
];
const OWN_HOSTS = ['hsktake.github.io', 'localhost', '(not set)', ''];
function siteFilter_(site) {
  if (!site || site === 'hikari') return inList_('contentGroup', HIKARI_GROUPS);
  if (site === 'all') return null;
  if (String(site).indexOf('host:') === 0) return eq_('hostName', String(site).slice(5)); // 計測の1行を入れたほかのサイト
  const s = SITES.find(x => x.key === site);
  return s && s.group ? eq_('contentGroup', s.group) : inList_('contentGroup', HIKARI_GROUPS);
}
function withSite_(filter, sf) { return sf ? (filter ? and_(filter, sf) : sf) : filter; }
// 計測しているサイトの一覧（決まったサイト＋計測の1行を入れたほかのドメイン）
function sites_() {
  const list = SITES.map(s => ({ key: s.key, name: s.name }));
  try {
    const hosts = runRaw_(['hostName'], ['sessions'], null, 50, null, { startDate: '90daysAgo', endDate: 'today' });
    hosts.filter(r => OWN_HOSTS.indexOf(r[0]) < 0).sort((a, b) => b[1] - a[1])
      .forEach(r => list.splice(list.length - 1, 0, { key: 'host:' + r[0], name: r[0] }));
  } catch (e) { /* 一覧が読めなくても決まったサイトは出す */ }
  return list;
}

// 来店までの流れ（ファネル）：GA4 の runFunnelReport（v1alpha。Apps Script のサービスにないので直接呼ぶ）
const FUNNEL_STEPS = ['ホームページに来た', '店舗を探した（店舗一覧・店舗ページを見た）', 'そのあと 待ち状況・地図・電話・アプリDL を押した'];
function funnelFor_(rg, usePathField, keepForm) {
  const shopStep = usePathField
    ? { funnelFieldFilter: { fieldName: 'pagePath', stringFilter: { matchType: 'CONTAINS', value: '/shop' } } }
    : { funnelEventFilter: { eventName: 'page_view', funnelParameterFilterExpression: { funnelParameterFilter: { eventParameterName: 'page_location', stringFilter: { matchType: 'CONTAINS', value: '/shop' } } } } };
  const body = {
    dateRanges: [rg],
    funnel: {
      isOpenFunnel: false,
      steps: [
        // お問い合わせフォーム・社内テストだけの訪問は入れない（読めないときは入れたままで集める）
        { name: FUNNEL_STEPS[0], filterExpression: keepForm ? { funnelEventFilter: { eventName: 'session_start' } }
          : { andGroup: { expressions: [{ funnelEventFilter: { eventName: 'session_start' } }, { notExpression: { funnelFieldFilter: { fieldName: 'contentGroup', inListFilter: { values: NOT_OURS } } } }] } } },
        { name: FUNNEL_STEPS[1], filterExpression: shopStep },
        { name: FUNNEL_STEPS[2], filterExpression: { orGroup: { expressions: ['wait_status_click', 'map_click', 'tel_click', 'app_download'].map(e => ({ funnelEventFilter: { eventName: e } })) } } },
      ],
    },
  };
  const res = UrlFetchApp.fetch('https://analyticsdata.googleapis.com/v1alpha/' + PROPERTY + ':runFunnelReport', {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
  });
  if (res.getResponseCode() !== 200 && !keepForm) return funnelFor_(rg, usePathField, true);
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
  const mHead = ['月', '訪問者数', 'うち はじめての人', '訪問回数', 'ページ表示回数', '平均滞在時間（秒）', 'しっかり見た割合'].concat(EVENTS.map(e => e[1]), ['来店につながった訪問', 'お店に向かった割合']);
  const mRows = months.map(m => {
    const o = monthly[m], g = Math.min(goalSes[m] || 0, o.sessions || 0);
    return [monthLabel_(m), o.users, o.newUsers, o.sessions, o.views, Math.round(o.dur), o.eng].concat(EVENTS.map(e => o.ev[e[0]] || 0), [g, o.sessions ? g / o.sessions : 0]);
  });
  write_(ss, '月別', mHead, mRows, { pct: [7, mHead.length] });

  // ほかの集計（店舗別・流入元など）は、画面で期間を選んだときにその場で GA4 から集める（getRangeData）。
  // スプレッドシートに置くのは「月別」と「更新情報」だけ（2026-11-20 整理）

  // 2) 更新情報（画面の「最終更新」）
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
function collect_(rg, site) {
  const sf = siteFilter_(site);
  const R = (o) => { const x = Object.assign({ range: rg }, o); x.filter = withSite_(x.filter, sf); return x; };
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
  g.landing.forEach(r => {
    if (!r[0] || r[0] === '(not set)') return;
    let t = pageType_(r[0]);
    if (t === 'その他') t = 'その他（' + String(r[0]).slice(0, 40) + '）'; // わからないページは実際のアドレスを出す
    land[t] = land[t] || [t, 0, 0]; land[t][1] += r[1]; land[t][2] += r[2];
  });
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
  // 来店までの流れは、店舗ページのあるカットハウスひかりだけ
  if (!site || site === 'hikari' || site === 'all') {
    try { out.funnel = funnelFor_(rg, true); }
    catch (e1) { try { out.funnel = funnelFor_(rg, false); } catch (e2) { out.funnel = null; ERRORS.push('来店までの流れ：' + e2.message); } }
  } else out.funnel = null;
  out.tracked = tracked_(rg);
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
function collectPrev_(rg, site) {
  const sf = siteFilter_(site);
  const R = (o) => { const x = Object.assign({ range: rg }, o); x.filter = withSite_(x.filter, sf); return x; };
  const g = batch_({
    base: R({ mets: ['totalUsers', 'newUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'engagementRate'] }),
    ev: R({ dims: ['eventName'], mets: ['eventCount'], filter: inList_('eventName', EVENTS.map(e => e[0])) }),
    goal: R({ mets: ['sessions'], filter: inList_('eventName', VISIT_GOALS) }),
    daily: R({ dims: ['date'], mets: ['totalUsers', 'sessions', 'screenPageViews'] }),
    dailyGoal: R({ dims: ['date'], mets: ['sessions'], filter: inList_('eventName', VISIT_GOALS) }),
  });
  const out = summary_(g);
  return out;
}

// 画面から呼ぶ：期間（start〜end）と、比べる期間（cs〜ce）の数字。同じ期間は6時間まで覚えておく（force で集め直し）
function getRangeData(start, end, cs, ce, force, site) {
  const ok = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
  if (![start, end, cs, ce].every(ok)) throw new Error('期間の指定が正しくありません');
  site = String(site || 'hikari').slice(0, 120);
  const key = ['r10', site, start, end, cs, ce].join('|');
  if (!force) { const c = cacheGet_(key); if (c) return c; }
  ERRORS.length = 0;
  const data = {
    range: { start: start, end: end }, cmp: { start: cs, end: ce },
    site: site,
    cur: collect_({ startDate: start, endDate: end }, site),
    prev: collectPrev_({ startDate: cs, endDate: ce }, site),
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
    ssUrl: 'https://docs.google.com/spreadsheets/d/' + SS_ID + '/edit',
    gaUrl: 'https://analytics.google.com/analytics/web/#/' + PROPERTY.replace('properties/', 'p') + '/reports/intelligenthome',
    sites: sites_(),
    qr: listLinks_(),
    goBase: GO_BASE,
    dests: DESTS,
  };
}
// 朝の先読み（今月・先月）。画面の期間の決め方（Dashboard.html の periodOf）と同じ
function prewarm_() {
  const now = new Date();
  const y = Number(Utilities.formatDate(now, TZ, 'yyyy')), m = Number(Utilities.formatDate(now, TZ, 'M')), d = Number(Utilities.formatDate(now, TZ, 'd'));
  const prevLast = new Date(y, m - 1, 0).getDate();
  getRangeData(ymd_(new Date(y, m - 1, 1)), ymd_(now), ymd_(new Date(y, m - 2, 1)), ymd_(new Date(y, m - 2, Math.min(d, prevLast))), true, 'hikari');
  getRangeData(ymd_(new Date(y, m - 2, 1)), ymd_(new Date(y, m - 1, 0)), ymd_(new Date(y, m - 3, 1)), ymd_(new Date(y, m - 2, 0)), true, 'hikari');
}
// ================================================================ QR・リンク（登録して追跡）
// 登録先は「ホームページ管理シート」の「リンク・QR」タブ（go.html がここを見て移動するので公開シート。個人情報は書かない）
const MGMT_ID = '1RBR08sNvthcwJHfssDh8RFLwtZ-17URXR149_jYetzw';
const LINK_TAB = 'リンク・QR';
const LINK_HEAD = ['ID', '名前', '種類', '行き先', '作成日', '状態'];
const GO_BASE = 'https://hsktake.github.io/hikari-website/go.html?l='; // 本番切り替え後も github.io からの転送で動く
// 行き先の候補（サイト内はパス。go.html が目印 utm_* を付けて移動する）
const DESTS = [
  ['', 'トップページ'], ['shops.html', '店舗を探す'], ['app.html', '公式アプリ'], ['app.html#dl', '公式アプリ（ダウンロード）'],
  ['haircut.html', 'ヘアカット'], ['brow.html', '眉毛カット'], ['facecare.html', 'フェイスケア'], ['recruit.html', '採用情報'],
  ['news.html', 'お知らせ'], ['member.html', 'HiCARD会員'], ['plus/', 'カットスペースPLUS'], ['delight/', "Men's Cut & Self DELIGHT"],
  ['mrcool/', 'HAIR STUDIO MR.COOL'], ['alpha/', 'シャンプーカット アルファ'], ['laladream/', 'ララ・ドリーム 清原テクノ店'],
];
function linkSheet_() {
  const ss = SpreadsheetApp.openById(MGMT_ID);
  let sh = ss.getSheetByName(LINK_TAB);
  if (!sh) {
    sh = ss.insertSheet(LINK_TAB);
    sh.getRange(1, 1, 1, LINK_HEAD.length).setValues([LINK_HEAD]).setFontWeight('bold').setBackground('#EF7A00').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange('A1').setNote('集計画面の「QR・リンクを作る」で自動で書かれます（直接さわらなくて大丈夫です）');
  }
  return sh;
}
function listLinks_() {
  try {
    const ss = SpreadsheetApp.openById(MGMT_ID), sh = ss.getSheetByName(LINK_TAB);
    if (!sh || sh.getLastRow() < 2) return [];
    return sh.getRange(2, 1, sh.getLastRow() - 1, LINK_HEAD.length).getDisplayValues()
      .filter(r => r[0]).map(r => ({ id: r[0], name: r[1], kind: r[2], dest: r[3], created: r[4], status: r[5] || '使う' })).reverse();
  } catch (e) { return []; }
}
function checkDest_(dest) {
  dest = String(dest || '').trim();
  if (DESTS.some(d => d[0] === dest)) return dest;
  if (/^https:\/\/[^\s"'<>]+$/i.test(dest) && dest.length <= 500) return dest;
  throw new Error('行き先は一覧から選ぶか、https:// で始まるURLを入れてください');
}
// 画面から呼ぶ：新しく作る
function addLink(name, kind, dest) {
  name = String(name || '').trim().slice(0, 40);
  if (!name) throw new Error('名前を入れてください');
  kind = kind === 'リンク' ? 'リンク' : 'QR';
  dest = checkDest_(dest);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = linkSheet_();
    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0])) : [];
    let id = '';
    do { id = Array.from({ length: 5 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join(''); } while (ids.indexOf(id) >= 0);
    sh.getRange(sh.getLastRow() + 1, 1, 1, LINK_HEAD.length).setNumberFormat('@')
      .setValues([[id, name, kind, dest, Utilities.formatDate(new Date(), TZ, 'yyyy/MM/dd'), '使う']]);
    return { id: id, list: listLinks_() };
  } finally { lock.releaseLock(); }
}
// 画面から呼ぶ：行き先を変える／止める・再開する
function updateLink(id, dest, status) {
  const sh = linkSheet_();
  const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0])) : [];
  const i = ids.indexOf(String(id));
  if (i < 0) throw new Error('見つかりませんでした');
  if (dest !== null && dest !== undefined) sh.getRange(i + 2, 4).setNumberFormat('@').setValue(checkDest_(dest));
  if (status === '使う' || status === '止める') sh.getRange(i + 2, 6).setValue(status);
  return listLinks_();
}
// 画面から呼ぶ：QR・リンクを削除する（シートの行を消す。印刷済みのQRは「見つかりませんでした」になる）
function deleteLink(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = linkSheet_();
    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0])) : [];
    const i = ids.indexOf(String(id));
    if (i < 0) throw new Error('見つかりませんでした');
    sh.deleteRow(i + 2);
    return listLinks_();
  } finally { lock.releaseLock(); }
}
// 期間中の数字：サイト内の行き先＝目印（utm_campaign＝ID）の付いた訪問、外部の行き先＝go.html でのクリック
function tracked_(rg) {
  const g = batch_({
    camp: { range: rg, dims: ['sessionCampaignName'], mets: ['sessions', 'totalUsers'], filter: inList_('sessionMedium', ['qr', 'link']) },
    campGoal: { range: rg, dims: ['sessionCampaignName'], mets: ['sessions'], filter: and_(inList_('sessionMedium', ['qr', 'link']), inList_('eventName', VISIT_GOALS)) },
    go: { range: rg, dims: ['pagePathPlusQueryString'], mets: ['eventCount'], filter: eq_('eventName', 'link_click') },
  });
  const goal = {};
  g.campGoal.forEach(r => goal[r[0]] = r[1]);
  const go = {};
  g.go.forEach(r => { const m = String(r[0]).match(/[?&]l=([a-z0-9]+)/i); if (m) go[m[1]] = (go[m[1]] || 0) + r[1]; });
  return {
    camp: g.camp.filter(r => r[0] && r[0] !== '(not set)').map(r => [r[0], r[1], r[2], Math.min(goal[r[0]] || 0, r[1])]),
    go: Object.keys(go).map(k => [k, go[k]]),
  };
}

// 画面から呼ぶ：社内テストの読み取り（notrack.html で「テストで数える」にした端末。go.js がページ名「QRテスト：ID」で qr_test を送る）
// recent＝リアルタイム（いまから30分以内。1分ほどで出る）、week＝過去7日（数時間〜1日おくれて出る）
// zzCheckTests はスクリプトエディタから動作を確かめる用（実行ログに結果が出る）
function zzCheckTests() { console.log(JSON.stringify(getTests())); }
function getTests() {
  const idOf = t => { const m = String(t).match(/QRテスト：([a-z0-9]+)/i); return m ? m[1] : ''; };
  const out = { recent: {}, week: {}, at: Utilities.formatDate(new Date(), TZ, 'HH:mm') };
  try {
    // リアルタイムでは「ページ名」と「イベント名」を一緒に使えないので、ページ名「QRテスト：ID」の表示回数で数える
    const rt = AnalyticsData.Properties.runRealtimeReport({
      dimensions: [{ name: 'unifiedScreenName' }, { name: 'minutesAgo' }], metrics: [{ name: 'screenPageViews' }],
      limit: 10000, // 絞りこみはここでせず、ページ名を下で見分ける（リアルタイムの絞りこみで「QRテスト：」が一致しなかったため）
    }, PROPERTY);
    rows_(rt).forEach(r => {
      const id = idOf(r[0]); if (!id) return;
      const o = out.recent[id] || (out.recent[id] = { n: 0, min: 99 });
      o.n += r[2]; o.min = Math.min(o.min, Number(r[1]));
    });
  } catch (e) { out.err = 'リアルタイム：' + String(e.message || e).slice(0, 120); }
  try {
    const wk = AnalyticsData.Properties.runReport({
      dateRanges: [{ startDate: '6daysAgo', endDate: 'today' }], dimensions: [{ name: 'pageTitle' }], metrics: [{ name: 'eventCount' }],
      dimensionFilter: eq_('eventName', 'qr_test'), limit: 1000,
    }, PROPERTY);
    rows_(wk).forEach(r => { const id = idOf(r[0]); if (id) out.week[id] = (out.week[id] || 0) + r[1]; });
  } catch (e) { out.err = (out.err ? out.err + ' ／ ' : '') + '7日：' + String(e.message || e).slice(0, 120); }
  return out;
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
  const out = HtmlService.createHtmlOutputFromFile('Dashboard')
    .setTitle('HSK-COUNT｜ホームページのアクセス集計')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  try { out.setFaviconUrl(HSK_COUNT_ICON + '#.png'); } catch (e) { /* アイコンが付けられなくても画面は出す */ }
  return out;
}
/** タブ・ホーム画面のアイコン（ほかの HSK アプリと同じ：オレンジ地に白い絵＋HSK-COUNT）。消さないでください */
const HSK_COUNT_ICON = 'data:image/png;base64,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';

