/* FOL Stats: decrypts the nightly export in the browser and draws it with d3. */
(() => {
  'use strict';

  /* ---------- where the data lives ---------- */
  function sources() {
    const h = location.hostname;
    let owner = 'TomBlackroad', repo = 'fearsoflove';
    if (h.endsWith('.github.io')) { owner = h.split('.')[0]; repo = location.pathname.split('/').filter(Boolean)[0] || repo; }
    const list = ['data.json'];
    const q = new URLSearchParams(location.search);
    if (!q.has('local')) list.unshift(`https://raw.githubusercontent.com/${owner}/${repo}/stats-data/data.json`);
    return list;
  }

  // ISO 3166 alpha-2 -> numeric id used by world-atlas (generated with pycountry)
  const ISO = {"AW":"533","AF":"004","AO":"024","AI":"660","AX":"248","AL":"008","AD":"020","AE":"784","AR":"032","AM":"051","AS":"016","AQ":"010","TF":"260","AG":"028","AU":"036","AT":"040","AZ":"031","BI":"108","BE":"056","BJ":"204","BF":"854","BD":"050","BG":"100","BH":"048","BS":"044","BA":"070","BL":"652","BY":"112","BZ":"084","BM":"060","BO":"068","BR":"076","BB":"052","BN":"096","BT":"064","BW":"072","CF":"140","CA":"124","CH":"756","CL":"152","CN":"156","CI":"384","CM":"120","CD":"180","CG":"178","CK":"184","CO":"170","KM":"174","CV":"132","CR":"188","CU":"192","CW":"531","KY":"136","CY":"196","CZ":"203","DE":"276","DJ":"262","DM":"212","DK":"208","DO":"214","DZ":"012","EC":"218","EG":"818","ER":"232","EH":"732","ES":"724","EE":"233","ET":"231","FI":"246","FJ":"242","FK":"238","FR":"250","FO":"234","FM":"583","GA":"266","GB":"826","GE":"268","GG":"831","GH":"288","GN":"324","GM":"270","GW":"624","GQ":"226","GR":"300","GD":"308","GL":"304","GT":"320","GU":"316","GY":"328","HK":"344","HM":"334","HN":"340","HR":"191","HT":"332","HU":"348","ID":"360","IM":"833","IN":"356","IO":"086","IE":"372","IR":"364","IQ":"368","IS":"352","IL":"376","IT":"380","JM":"388","JE":"832","JO":"400","JP":"392","KZ":"398","KE":"404","KG":"417","KH":"116","KI":"296","KN":"659","KR":"410","KW":"414","LA":"418","LB":"422","LR":"430","LY":"434","LC":"662","LI":"438","LK":"144","LS":"426","LT":"440","LU":"442","LV":"428","MO":"446","MF":"663","MA":"504","MC":"492","MD":"498","MG":"450","MV":"462","MX":"484","MH":"584","MK":"807","ML":"466","MT":"470","MM":"104","ME":"499","MN":"496","MP":"580","MZ":"508","MR":"478","MS":"500","MU":"480","MW":"454","MY":"458","NA":"516","NC":"540","NE":"562","NF":"574","NG":"566","NI":"558","NU":"570","NL":"528","NO":"578","NP":"524","NR":"520","NZ":"554","OM":"512","PK":"586","PA":"591","PN":"612","PE":"604","PH":"608","PW":"585","PG":"598","PL":"616","PR":"630","KP":"408","PT":"620","PY":"600","PS":"275","PF":"258","QA":"634","RO":"642","RU":"643","RW":"646","SA":"682","SD":"729","SN":"686","SG":"702","GS":"239","SH":"654","SB":"090","SL":"694","SV":"222","SM":"674","SO":"706","PM":"666","RS":"688","SS":"728","ST":"678","SR":"740","SK":"703","SI":"705","SE":"752","SZ":"748","SX":"534","SC":"690","SY":"760","TC":"796","TD":"148","TG":"768","TH":"764","TJ":"762","TL":"626","TO":"776","TT":"780","TN":"788","TR":"792","TW":"158","TZ":"834","UG":"800","UA":"804","UY":"858","US":"840","UZ":"860","VA":"336","VC":"670","VE":"862","VG":"092","VI":"850","VN":"704","VU":"548","WF":"876","WS":"882","YE":"887","ZA":"710","ZM":"894","ZW":"716"};
  const NAME_ID = { Kosovo: 'XK', 'N. Cyprus': 'CY-N', Somaliland: 'SO-N' };
  const NOT_EUROPE = new Set(['MA', 'DZ', 'TN', 'LY', 'EG', 'SA', 'IQ', 'IR', 'SY', 'JO', 'LB', 'IL', 'PS', 'GL']);
  const NUM2A = Object.fromEntries(Object.entries(ISO).map(([a, n]) => [n, a]));
  const featCode = (f) => NUM2A[f.id] || NAME_ID[f.properties && f.properties.name] || '';

  // 5-level scale, same colours as the game
  const RATINGS = [
    [5, '🔥', 'Loved it', '#ef6a3a'],
    [4, '😍', 'Really liked it', '#e0a458'],
    [3, '🙂', "It's OK", '#c9b79c'],
    [2, '😕', 'Not really', '#8f8590'],
    [1, '🙈', 'Not for me', '#5f5663'],
  ];
  const KEY_VALUE = { fire: 5, like: 4, ok: 3, meh: 2, nope: 1, love: 5, deep: 4, fun: 4, pass: 2 }; // last four: the old 4-button scale

  const $ = (s) => document.querySelector(s);
  const fmt = (n) => (n == null || isNaN(n) ? '–' : n >= 10000 ? d3.format('.3~s')(n) : d3.format(',')(Math.round(n * 10) / 10));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '–');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = (op, k, v) => { try { return op === 'get' ? localStorage.getItem(k) : op === 'set' ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) { return null; } };

  let DATA = null, MOVIES = {}, SCENES = {}, WORLD = null, EUROPE = null;
  let range = { from: '', to: '' };
  let cardSort = { key: 'views', asc: false }, cardsAll = false;

  /* ---------- decrypt ---------- */
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function decrypt(file, pass) {
    if (file.daily) return file; // plain file (local testing)
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(file.salt), iterations: file.iter }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(file.iv) }, key, unb64(file.data));
    const stream = new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }

  async function fetchNewest() {
    const got = await Promise.all(sources().map((u) => fetch(u, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    const files = got.filter(Boolean);
    if (!files.length) return null;
    files.sort((a, b) => String(b.generated).localeCompare(String(a.generated)));
    return files[0];
  }

  async function unlock(pass, remember) {
    const msg = $('#gate-msg');
    msg.className = 'small'; msg.textContent = 'Fetching…';
    const file = await fetchNewest();
    if (!file) { msg.className = 'small err'; msg.textContent = 'No data yet. Run the "Refresh stats" workflow on GitHub (Actions tab), then reload.'; return false; }
    msg.textContent = 'Decrypting…';
    try { DATA = await decrypt(file, pass); }
    catch (e) { msg.className = 'small err'; msg.textContent = 'Wrong passphrase.'; store('del', 'fol-stats-pass'); return false; }
    if (remember) store('set', 'fol-stats-pass', pass);
    msg.textContent = '';
    await loadExtras();
    $('#gate').hidden = true; $('#dash').hidden = false; $('#lock').hidden = false;
    $('#updated').textContent = 'Updated ' + new Date(DATA.generated).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    initRange();
    return true;
  }

  async function loadExtras() {
    const j = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [movies, scenes, world, europe] = await Promise.all([j('../data/movies.json'), j('../data/scenes.json'), j('world-110m.json'), j('europe-50m.json')]);
    (movies || []).forEach((m) => { MOVIES[m.id] = m; });
    (scenes || []).forEach((s) => { SCENES[s.id] = s; });
    WORLD = world ? topojson.feature(world, world.objects.countries) : null;
    EUROPE = europe;
  }

  /* ---------- date range ---------- */
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const span = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5) + 1;
  const parisToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
  function firstDay() { return DATA.daily.length ? DATA.daily[0][0] : parisToday(); }

  function initRange() {
    const h = new URLSearchParams(location.hash.slice(1));
    const today = parisToday();
    if (h.get('from') && h.get('to')) range = { from: h.get('from'), to: h.get('to') };
    else presetRange(h.get('p') || '30', true);
    if (range.from > range.to) range = { from: range.to, to: range.from };
    $('#from').value = range.from; $('#to').value = range.to;
    $('#from').max = $('#to').max = today;
    $('#from').min = $('#to').min = firstDay();
    render();
  }

  function presetRange(p, silent) {
    const today = parisToday();
    range = p === 'all' ? { from: firstDay() < today ? firstDay() : today, to: today } : { from: addDays(today, -(Number(p) - 1)), to: today };
    range.preset = p;
    if (!silent) { $('#from').value = range.from; $('#to').value = range.to; history.replaceState(null, '', '#p=' + p); render(); }
  }

  function setCustom() {
    let a = $('#from').value, b = $('#to').value;
    if (!a || !b) return;
    if (a > b) [a, b] = [b, a];
    range = { from: a, to: b };
    history.replaceState(null, '', `#from=${a}&to=${b}`);
    render();
  }

  const inR = (r, R) => r[0] >= R.from && r[0] <= R.to;
  const pick = (table, R) => (DATA[table] || []).filter((r) => inR(r, R));
  function prevRange() { const n = span(range.from, range.to); return { from: addDays(range.from, -n), to: addDays(range.from, -1) }; }
  const sum = (rows, i) => rows.reduce((a, r) => a + (Number(r[i]) || 0), 0);
  function group(rows, keyFn, valIdx) {
    const m = new Map();
    rows.forEach((r) => { const k = keyFn(r); m.set(k, (m.get(k) || 0) + (Number(r[valIdx]) || 0)); });
    return [...m].sort((a, b) => b[1] - a[1]);
  }

  /* ---------- tooltip ---------- */
  const tip = $('#tip');
  function showTip(ev, html) {
    tip.innerHTML = html; tip.hidden = false;
    const x = ev.clientX, y = ev.clientY, w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x + 12)) + 'px';
    tip.style.top = (y - h - 12 < 8 ? y + 16 : y - h - 12) + 'px';
  }
  const hideTip = () => { tip.hidden = true; };
  function hover(sel, html) {
    sel.on('pointerenter pointermove', (ev, d) => showTip(ev, html(d))).on('pointerleave', hideTip);
  }
  document.addEventListener('scroll', hideTip, { passive: true });

  /* ---------- render ---------- */
  function render() {
    hideTip();
    document.querySelectorAll('#presets button').forEach((b) => b.classList.toggle('on', b.dataset.days === range.preset));
    const n = span(range.from, range.to);
    const P = prevRange();
    $('#range-note').textContent = `${fmtDay(range.from)} – ${fmtDay(range.to)} · ${n} day${n > 1 ? 's' : ''} · compared with ${fmtDay(P.from)} – ${fmtDay(P.to)}`;
    kpis(P);
    visitsChart();
    worldMap();
    europeMap();
    hoursHeat();
    depthChart();
    ratingsPanel();
    funnel();
    devices();
    features();
    sourcesList();
    toplist('#list-referrers', group(pick('referrers', range), (r) => r[1] || 'Direct or app', 2), 8);
    toplist('#list-langs', group(pick('languages', range), (r) => langName(r[1]), 3), 8);
    cardsTable();
    toplist('#list-jumps', group(pick('jumps', range), (r) => `${titleOf(r[1])} → ${titleOf(r[2])}`, 3), 10);
  }
  const fmtDay = (s) => new Date(s + 'T12:00:00Z').toLocaleDateString([], { day: 'numeric', month: 'short', year: s.slice(0, 4) === parisToday().slice(0, 4) ? undefined : 'numeric' });
  const titleOf = (id) => (MOVIES[id] ? MOVIES[id].title : id || '?');
  function langName(code) {
    if (!code) return 'Unknown';
    try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code; } catch (e) { return code; }
  }

  function kpis(P) {
    const cur = metrics(range), prev = metrics(P);
    const tiles = [
      ['Visits', cur.visits, prev.visits],
      ['Cards seen', cur.cards, prev.cards],
      ['Cards per visit', cur.perVisit, prev.perVisit, 1],
      ['Ratings', cur.ratings, prev.ratings],
      ['Median visit', cur.median, prev.median, 'min'],
      ['Rooms joined', cur.rooms, prev.rooms],
      ['Rounds finished', cur.rounds, prev.rounds],
      ['Countries', cur.countries, prev.countries],
    ];
    $('#kpis').innerHTML = tiles.map(([label, v, p, unit]) => {
      let delta = 'no earlier data';
      if (p > 0) { const ch = (v - p) / p; delta = `<span class="delta ${ch > 0.005 ? 'up' : ch < -0.005 ? 'down' : ''}">${ch > 0 ? '▲' : ch < 0 ? '▼' : '='} ${Math.abs(Math.round(ch * 100))}% vs before</span>`; }
      else if (v > 0 && p === 0) delta = '<span class="delta up">new</span>';
      else delta = `<span class="delta">${delta}</span>`;
      const val = unit === 'min' ? (v ? (v < 1 ? Math.round(v * 60) + ' s' : (Math.round(v * 10) / 10) + ' min') : '–') : unit === 1 ? (v ? v.toFixed(1) : '–') : fmt(v);
      return `<div class="kpi"><div class="label">${label}</div><div class="value">${val}</div>${delta}</div>`;
    }).join('');
  }
  function metrics(R) {
    const daily = pick('daily', R), visits = pick('visits', R);
    const lens = visits.map((v) => Number(v[3]) || 0).sort((a, b) => a - b);
    const nV = visits.length || sum(daily, 1);
    return {
      visits: nV, cards: sum(daily, 3), ratings: sum(daily, 4), rooms: sum(daily, 5), rounds: sum(daily, 6),
      perVisit: nV ? sum(daily, 3) / nV : 0,
      median: lens.length ? d3.median(lens) / 60 : 0,
      countries: new Set(pick('geo', R).map((g) => g[1]).filter(Boolean)).size,
    };
  }

  /* visits over time: bars per day, or per week for long ranges */
  function visitsChart() {
    const el = $('#ch-visits');
    const n = span(range.from, range.to), weekly = n > 120;
    const by = new Map(pick('daily', range).map((r) => [r[0], r]));
    const buckets = [];
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
      const key = weekly ? weekStart(d) : d;
      let b = buckets[buckets.length - 1];
      if (!b || b.key !== key) { b = { key, visits: 0, cards: 0, ratings: 0, rooms: 0 }; buckets.push(b); }
      const r = by.get(d);
      if (r) { b.visits += +r[1] || 0; b.cards += +r[3] || 0; b.ratings += +r[4] || 0; b.rooms += +r[5] || 0; }
    }
    $('#visits-sub').textContent = (weekly ? 'Per week' : 'Per day') + ' · tap a bar for details';
    const W = el.clientWidth || 600, H = W < 500 ? 180 : 220, m = { t: 10, r: 6, b: 24, l: 30 };
    const x = d3.scaleBand().domain(buckets.map((b) => b.key)).range([m.l, W - m.r]).paddingInner(buckets.length > 60 ? 0.1 : 0.2);
    const max = d3.max(buckets, (b) => b.visits) || 1;
    const y = d3.scaleLinear().domain([0, max]).nice(4).range([H - m.b, m.t]);
    const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Visits over time');
    svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('class', 'gridline').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y).attr('y2', y);
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('~s')).tickSize(0).tickPadding(6)).call((g) => g.select('.domain').remove());
    const every = Math.ceil(buckets.length / (W < 500 ? 5 : 9));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).tickValues(buckets.filter((_, i) => i % every === 0).map((b) => b.key)).tickFormat((k) => fmtDay(k)).tickSize(0).tickPadding(8))
      .call((g) => g.select('.domain').attr('stroke', 'var(--grid)'));
    const bw = x.bandwidth(), rad = Math.min(4, bw / 2);
    svg.append('g').selectAll('path').data(buckets.filter((b) => b.visits > 0)).join('path')
      .attr('fill', 'var(--accent)')
      .attr('d', (b) => roundTop(x(b.key), y(b.visits), bw, y(0) - y(b.visits), rad));
    // full-height hit areas
    hover(svg.append('g').selectAll('rect').data(buckets).join('rect').attr('x', (b) => x(b.key) - x.step() * x.paddingInner() / 2).attr('width', x.step()).attr('y', m.t).attr('height', H - m.b - m.t).attr('fill', 'transparent'),
      (b) => `<b>${weekly ? 'Week of ' : ''}${fmtDay(b.key)}</b><br>${fmt(b.visits)} visits · ${fmt(b.cards)} cards<br>${fmt(b.ratings)} ratings · ${fmt(b.rooms)} room joins`);
    el.replaceChildren(svg.node());
  }
  const weekStart = (s) => { const d = new Date(s + 'T00:00:00Z'); const wd = (d.getUTCDay() + 6) % 7; return addDays(s, -wd); };
  function roundTop(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.min(r, h, w / 2);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }

  /* ---------- maps ---------- */
  const ZERO = '#2c1a22', STROKE = '#14090d';
  function seqScale(max) {
    const s = d3.scaleSqrt().domain([0, Math.max(1, max)]).range([0.12, 1]);
    const ramp = d3.interpolateLab('#6e3b38', '#f6c886');
    return (v) => (v > 0 ? ramp(s(v)) : ZERO);
  }
  function countryVisits(R) { const m = new Map(); pick('geo', R).forEach((g) => { if (g[1]) m.set(g[1], (m.get(g[1]) || 0) + (+g[8] || 0)); }); return m; }
  const countryName = (cc) => { try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc); } catch (e) { return cc; } };

  function worldMap() {
    const el = $('#map-world');
    if (!WORLD) { el.innerHTML = '<p class="empty">Map file missing.</p>'; return; }
    const cv = countryVisits(range), max = d3.max([...cv.values()]) || 0, color = seqScale(max), total = d3.sum([...cv.values()]);
    const W = el.clientWidth || 600, H = Math.round(W * 0.5);
    const proj = d3.geoNaturalEarth1().fitExtent([[4, 4], [W - 4, H - 4]], { type: 'Sphere' });
    const path = d3.geoPath(proj);
    const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'World map of visits by country');
    svg.append('path').attr('d', path({ type: 'Sphere' })).attr('fill', '#1a0d12');
    hover(svg.append('g').selectAll('path').data(WORLD.features.filter((f) => f.id !== '010')).join('path')
      .attr('d', path).attr('fill', (f) => color(cv.get(featCode(f)) || 0)).attr('stroke', STROKE).attr('stroke-width', 0.5),
    (f) => { const cc = featCode(f), v = cv.get(cc) || 0; return `<b>${esc(f.properties.name)}</b><br>${v ? `${fmt(v)} visits · ${pct(v, total)}` : 'No visits'}`; });
    el.replaceChildren(svg.node());
    $('#world-legend').innerHTML = max ? `<span>1</span><span class="ramp" style="background:linear-gradient(90deg,${color(1)},${color(max)})"></span><span>${fmt(max)} visits</span>` : '';
    toplist('#list-countries', [...cv].sort((a, b) => b[1] - a[1]).map(([cc, v]) => [`${flag(cc)} ${countryName(cc)}`, v]), 12);
  }
  const flag = (cc) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '');

  function europeMap() {
    const el = $('#map-europe');
    if (!EUROPE) { el.innerHTML = '<p class="empty">Map file missing.</p>'; return; }
    const geo = pick('geo', range);
    const cv = countryVisits(range), color = seqScale(d3.max([...cv.values()]) || 0);
    const W = el.clientWidth || 600, H = Math.round(W * (W < 500 ? 0.95 : W < 900 ? 0.7 : 0.52));
    const proj = d3.geoAzimuthalEqualArea().rotate([-12, -52]).fitExtent([[0, 0], [W, H]], { type: 'MultiPoint', coordinates: [[-11, 35], [31, 35], [-20, 64], [40, 69], [10, 71], [10, 35.5]] });
    const path = d3.geoPath(proj);
    const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Map of Europe with visits by city');
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#1a0d12');
    hover(svg.append('g').selectAll('path').data(EUROPE.features).join('path')
      .attr('d', path).attr('fill', (f) => color(cv.get(featCode(f)) || 0)).attr('stroke', STROKE).attr('stroke-width', 0.6),
    (f) => { const v = cv.get(featCode(f)) || 0; return `<b>${esc(f.properties.name)}</b><br>${v ? fmt(v) + ' visits' : 'No visits'}`; });
    // cities
    const cities = new Map();
    geo.forEach((g) => {
      const lat = +g[6], lon = +g[7];
      if (!g[5] || !isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0)) return;
      const k = g[1] + '|' + g[5];
      const c = cities.get(k) || { city: g[5], cc: g[1], region: g[4], lat, lon, v: 0 };
      c.v += +g[8] || 0; cities.set(k, c);
    });
    const list = [...cities.values()].map((c) => Object.assign(c, { p: proj([c.lon, c.lat]) }))
      .filter((c) => c.p && c.p[0] >= 0 && c.p[0] <= W && c.p[1] >= 0 && c.p[1] <= H).sort((a, b) => b.v - a.v);
    const r = d3.scaleSqrt().domain([0, d3.max(list, (c) => c.v) || 1]).range([0, W < 500 ? 14 : 20]);
    hover(svg.append('g').selectAll('circle').data(list).join('circle')
      .attr('cx', (c) => c.p[0]).attr('cy', (c) => c.p[1]).attr('r', (c) => Math.max(4, r(c.v)))
      .attr('fill', 'var(--hot)').attr('fill-opacity', 0.85).attr('stroke', '#1a0d12').attr('stroke-width', 2),
    (c) => `<b>${esc(c.city)}</b> ${flag(c.cc)}<br>${esc(c.region || '')}${c.region ? '<br>' : ''}${fmt(c.v)} visits`);
    el.replaceChildren(svg.node());
    const euro = new Set(EUROPE.features.map(featCode).filter((c) => c && !NOT_EUROPE.has(c)));
    const regions = group(geo.filter((g) => g[4] && euro.has(g[1])), (g) => `${flag(g[1])} ${g[4]}`, 8);
    toplist('#list-regions', regions, 12, 'No visits from Europe in this range.');
  }

  /* weekday x hour heatmap */
  function hoursHeat() {
    const el = $('#ch-hours');
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
    pick('hours', range).forEach((r) => { const wd = (new Date(r[0] + 'T12:00:00Z').getUTCDay() + 6) % 7; grid[wd][+r[1]] += +r[2] || 0; });
    const cells = []; grid.forEach((row, d) => row.forEach((v, h) => cells.push({ d, h, v })));
    const max = d3.max(cells, (c) => c.v) || 0;
    if (!max) { el.innerHTML = '<p class="empty">No visits in this range.</p>'; return; }
    const W = el.clientWidth || 420, l = 32, top = 4, cw = (W - l) / 24, ch = Math.max(14, Math.min(24, cw * 1.3)), H = top + ch * 7 + 20;
    const color = seqScale(max);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Visits by weekday and hour');
    hover(svg.append('g').selectAll('rect').data(cells).join('rect')
      .attr('x', (c) => l + c.h * cw + 1).attr('y', (c) => top + c.d * ch + 1).attr('width', cw - 2).attr('height', ch - 2).attr('rx', 3)
      .attr('fill', (c) => (c.v ? color(c.v) : '#2a1820')),
    (c) => `<b>${days[c.d]} ${String(c.h).padStart(2, '0')}:00–${String(c.h + 1).padStart(2, '0')}:00</b><br>${fmt(c.v)} visits`);
    svg.append('g').selectAll('text').data(days).join('text').attr('class', 'lbl').attr('x', 0).attr('y', (_, i) => top + i * ch + ch / 2 + 4).text((d) => d);
    svg.append('g').selectAll('text').data([0, 6, 12, 18, 23]).join('text').attr('class', 'lbl').attr('text-anchor', 'middle')
      .attr('x', (h) => l + h * cw + cw / 2).attr('y', H - 4).text((h) => h + 'h');
    el.replaceChildren(svg.node());
  }

  /* simple horizontal bars */
  function hbars(el, rows, opts = {}) {
    if (!rows.length || !d3.sum(rows, (r) => r[1])) { el.innerHTML = `<p class="empty">${opts.empty || 'Nothing in this range.'}</p>`; return; }
    const W = el.clientWidth || 420, lw = opts.labelWidth || Math.min(150, W * 0.42), rh = 24, H = rows.length * rh + 4;
    const max = opts.max || d3.max(rows, (r) => r[1]) || 1;
    const x = d3.scaleLinear().domain([0, max]).range([0, W - lw - 56]);
    const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img');
    const g = svg.selectAll('g').data(rows).join('g').attr('transform', (_, i) => `translate(0,${i * rh + 2})`);
    g.append('text').attr('class', 'lbl').attr('x', lw - 8).attr('y', rh / 2 + 2).attr('text-anchor', 'end').style('font-size', '12px').style('fill', 'var(--ink)').text((r) => r[0]);
    g.append('rect').attr('x', lw).attr('y', 5).attr('height', rh - 12).attr('rx', 4).attr('width', (r) => Math.max(r[1] ? 3 : 0, x(r[1]))).attr('fill', (r) => r[2] || 'var(--accent)');
    g.append('text').attr('class', 'lbl').attr('x', (r) => lw + Math.max(3, x(r[1])) + 6).attr('y', rh / 2 + 2).text((r) => r[3] || fmt(r[1]));
    if (opts.tip) hover(g.append('rect').attr('width', W).attr('height', rh).attr('fill', 'transparent'), opts.tip);
    el.replaceChildren(svg.node());
  }

  function depthChart() {
    const vs = pick('visits', range);
    const B = [['0 cards', 0, 0], ['1–4', 1, 4], ['5–9', 5, 9], ['10–19', 10, 19], ['20–49', 20, 49], ['50+', 50, 1e9]];
    const rows = B.map(([label, a, b]) => [label, vs.filter((v) => +v[1] >= a && +v[1] <= b).length]);
    const total = vs.length;
    hbars($('#ch-depth'), rows.map((r) => [r[0], r[1], null, r[1] ? `${r[1]} · ${pct(r[1], total)}` : '0']), { labelWidth: 70, empty: 'No visits in this range.' });
  }

  function ratingsPanel() {
    const el = $('#ch-ratings');
    const counts = new Map(RATINGS.map((r) => [r[0], 0]));
    let old = 0;
    pick('ratings', range).forEach((r) => {
      const v = Number(r[3]) || KEY_VALUE[r[2]];
      if (!v) return;
      if (!Number(r[3])) old += +r[4] || 0;
      counts.set(v, counts.get(v) + (+r[4] || 0));
    });
    const total = d3.sum([...counts.values()]);
    if (!total) { el.innerHTML = '<p class="empty">No ratings in this range.</p>'; return; }
    const avg = d3.sum([...counts], ([v, n]) => v * n) / total;
    el.innerHTML = `<div class="rating-bar" aria-hidden="true">${RATINGS.map(([v, , , c]) => counts.get(v) ? `<i style="flex:${counts.get(v)};background:${c}"></i>` : '').join('')}</div>
      <div class="rating-rows">${RATINGS.map(([v, e, label, c]) => { const n = counts.get(v); return `<div class="rating-row"><span title="${label}">${e}</span><span class="track"><i style="width:${(n / total) * 100}%;background:${c}"></i></span><span class="n">${fmt(n)}</span><span class="p">${pct(n, total)}</span></div>`; }).join('')}</div>
      <p class="rating-avg">Average <b>${avg.toFixed(2)}</b> / 5 · ${pct(counts.get(5) + counts.get(4), total)} liked or loved${old ? ` <span class="small">· ${old} from the old 4-button scale, mapped</span>` : ''}</p>`;
  }

  function evCount(rows, test) { return rows.filter((r) => test(r[1])).reduce((a, r) => a + (+r[2] || 0), 0); }
  function funnel() {
    const ev = pick('events', range);
    const steps = [
      ['Opened Play with others', evCount(ev, (e) => e === 'room-dialog' || e === 'room-invite')],
      ['Shared the link', evCount(ev, (e) => e.startsWith('room-share/'))],
      ['Joined a room', evCount(ev, (e) => e === 'room-join')],
      ['Finished a round', evCount(ev, (e) => e === 'round-end')],
      ['Shared or saved a graph', evCount(ev, (e) => e === 'round-share' || e === 'round-save')],
    ];
    const first = steps[0][1] || d3.max(steps, (s) => s[1]);
    hbars($('#ch-funnel'), steps.map((s, i) => [s[0], s[1], d3.interpolateLab('#e0a458', '#ef6a3a')(i / 4), i && first ? `${fmt(s[1])} · ${pct(s[1], first)}` : fmt(s[1])]),
      { labelWidth: 170, empty: 'Nobody played together in this range.' });
  }

  function devices() {
    const rows = pick('devices', range);
    const screens = group(rows, (r) => r[1] || 'unknown', 4);
    const installed = rows.filter((r) => r[3] === 'true' || r[3] === '1').reduce((a, r) => a + (+r[4] || 0), 0);
    const total = sum(rows, 4);
    const os = group(rows, (r) => r[2] || 'Other', 4).slice(0, 4);
    const nice = { phone: '📱 Phone', tablet: '📟 Tablet', desktop: '💻 Desktop' };
    const data = screens.map(([k, v]) => [nice[k] || k, v, null, `${fmt(v)} · ${pct(v, total)}`]);
    if (total) data.push(['⬇️ Installed app', installed, '#c9b79c', `${fmt(installed)} · ${pct(installed, total)}`]);
    os.forEach(([k, v]) => data.push([k, v, '#8f8590', `${fmt(v)} · ${pct(v, total)}`]));
    hbars($('#ch-devices'), data, { labelWidth: 130, max: total, empty: 'No visits in this range.' });
  }

  function features() {
    const ev = pick('events', range);
    const F = [
      ['Opened Deeper', (e) => e === 'deeper'],
      ['Swiped', (e) => e.startsWith('swipe-')],
      ['Jumped to a related title', (e) => e.startsWith('related/')],
      ['Opened filters', (e) => e === 'filters-open'],
      ['Turned dares on', (e) => e.startsWith('filter-dares/') && !e.endsWith('/off')],
      ['Opened Similar titles', (e) => e === 'suggest-dialog'],
      ['Went to TMDB', (e) => e.startsWith('suggest-open/')],
      ['Watched the tutorial', (e) => e === 'tutorial'],
      ['Finished the deck', (e) => e === 'deck-end'],
    ];
    const rows = F.map(([label, t]) => [label, evCount(ev, t)]).sort((a, b) => b[1] - a[1]);
    hbars($('#ch-features'), rows, { labelWidth: 170 });
  }

  function toplist(sel, entries, limit, emptyText) {
    const el = $(sel);
    const list = entries.filter((e) => e[1] > 0);
    if (!list.length) { el.innerHTML = `<li class="none">${emptyText || 'Nothing in this range.'}</li>`; return; }
    const max = d3.max(list, (e) => e[1]), total = d3.sum(list, (e) => e[1]);
    el.innerHTML = list.slice(0, limit).map(([name, v]) => `<li><span class="name" title="${esc(name)}">${esc(name)}</span><span class="num">${fmt(v)} · ${pct(v, total)}</span><span class="bar"><i style="width:${(v / max) * 100}%"></i></span></li>`).join('')
      + (list.length > limit ? `<li class="none">+ ${list.length - limit} more</li>` : '');
  }

  /* tagged links */
  const prettyTag = (t) => (t.startsWith('invite-') ? `🔗 Room invite · ${t.slice(7)}` : `🏷️ ${t}`);
  function sourcesList() {
    const rows = pick('sources', range);
    const tagged = group(rows.filter((r) => r[1]), (r) => prettyTag(r[1]), 2);
    const untagged = rows.filter((r) => !r[1]).reduce((a, r) => a + (+r[2] || 0), 0);
    if (untagged && tagged.length) tagged.push(['Untagged (shared on, typed or bookmarked)', untagged]);
    toplist('#list-sources', tagged, 10, 'No tagged visits yet. Make a link below and share it.');
  }
  function gameUrl() {
    const path = location.pathname.replace(/stats\/?(index\.html)?$/, '');
    return location.origin + path;
  }
  $('#linkmaker').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tag = $('#lm-tag').value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '').slice(0, 32);
    const out = $('#lm-out');
    if (!tag) { out.textContent = 'Type a short name first.'; return; }
    const url = gameUrl() + '?from=' + tag;
    let copied = false;
    try { await navigator.clipboard.writeText(url); copied = true; } catch (err) { /* select it by hand */ }
    out.innerHTML = `${copied ? 'Copied: ' : 'Your link: '}<code>${esc(url)}</code>`;
  });

  /* cards table */
  function cardsTable() {
    const by = new Map();
    pick('cards', range).forEach((r) => {
      const c = by.get(r[1]) || { scene: r[1], title: r[2], type: r[3], views: 0, sec: 0, deeper: 0, quick: 0, rsum: 0, rn: 0 };
      c.views += +r[5] || 0; c.sec += +r[6] || 0; c.deeper += +r[7] || 0; c.quick += +r[8] || 0; by.set(r[1], c);
    });
    pick('ratings', range).forEach((r) => {
      const v = Number(r[3]) || KEY_VALUE[r[2]]; if (!v) return;
      const sc = SCENES[r[1]];
      const c = by.get(r[1]) || { scene: r[1], title: sc ? sc.movie : '', type: '', views: 0, sec: 0, deeper: 0, quick: 0, rsum: 0, rn: 0 };
      c.rsum += v * (+r[4] || 0); c.rn += +r[4] || 0; by.set(r[1], c);
    });
    const rows = [...by.values()].map((c) => Object.assign(c, {
      avgSec: c.views ? c.sec / c.views : 0, deeperP: c.views ? c.deeper / c.views : 0, quickP: c.views ? c.quick / c.views : 0, rating: c.rn ? c.rsum / c.rn : 0,
      name: titleOf(c.title),
    }));
    const cols = [['name', 'Card'], ['views', 'Views'], ['avgSec', 'Avg time'], ['rating', 'Rating'], ['rn', 'Rated'], ['deeperP', 'Deeper'], ['quickP', 'Skipped']];
    const k = cardSort.key;
    rows.sort((a, b) => (k === 'name' ? a.name.localeCompare(b.name) : a[k] - b[k]) * (cardSort.asc ? 1 : -1) || b.views - a.views);
    const shown = cardsAll ? rows : rows.slice(0, 25);
    const t = $('#tbl-cards');
    if (!rows.length) { t.innerHTML = '<tbody><tr><td class="empty">No cards seen in this range.</td></tr></tbody>'; $('#cards-more').hidden = true; return; }
    t.innerHTML = `<thead><tr>${cols.map(([key, label]) => `<th data-k="${key}" class="${key === k ? 'sorted' + (cardSort.asc ? ' asc' : '') : ''}">${label}</th>`).join('')}</tr></thead>
      <tbody>${shown.map((c) => {
        const sc = SCENES[c.scene];
        const sub = sc ? (sc.kind === 'dare' ? '🌶️ Dare' : sc.kind === 'wouldyou' ? '🌶️ Would you' : `Depth ${sc.depth}`) + ' · ' + esc((sc.prompt || '').replace(/\n.*/s, '').replace(/^(Dare|Truth): /, '').slice(0, 70)) + ((sc.prompt || '').length > 70 ? '…' : '') : esc(c.scene);
        return `<tr><td>${esc(c.name)}<span class="sub">${sub}</span></td><td>${fmt(c.views)}</td><td>${c.views ? Math.round(c.avgSec) + ' s' : '–'}</td><td>${c.rn ? c.rating.toFixed(1) : '–'}</td><td>${fmt(c.rn)}</td><td>${c.views ? pct(c.deeper, c.views) : '–'}</td><td>${c.views ? pct(c.quick, c.views) : '–'}</td></tr>`;
      }).join('')}</tbody>`;
    t.querySelectorAll('th').forEach((th) => th.addEventListener('click', () => {
      const key = th.dataset.k;
      cardSort = key === cardSort.key ? { key, asc: !cardSort.asc } : { key, asc: key === 'name' };
      cardsTable();
    }));
    const more = $('#cards-more');
    more.hidden = rows.length <= 25;
    more.textContent = cardsAll ? 'Show top 25' : `Show all ${rows.length}`;
  }

  /* ---------- wire up ---------- */
  $('#gate-form').addEventListener('submit', (e) => { e.preventDefault(); unlock($('#pass').value, $('#remember').checked); });
  $('#lock').addEventListener('click', () => { store('del', 'fol-stats-pass'); location.hash = ''; location.reload(); });
  $('#presets').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) presetRange(b.dataset.days); });
  $('#from').addEventListener('change', setCustom);
  $('#to').addEventListener('change', setCustom);
  $('#cards-more').addEventListener('click', () => { cardsAll = !cardsAll; cardsTable(); });
  let rt; let lastW = window.innerWidth;
  window.addEventListener('resize', () => { if (!DATA || window.innerWidth === lastW) return; lastW = window.innerWidth; clearTimeout(rt); rt = setTimeout(render, 200); });

  const saved = store('get', 'fol-stats-pass');
  if (saved) { $('#pass').value = saved; $('#remember').checked = true; unlock(saved, true); }
})();
