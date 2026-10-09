/* Shared synthetic data + helpers for the three Combust prototypes. */
(function () {
  const raw = [
    ['2026-02-08', 12480, 'Indian Oil', 9.2, 957, true, false],
    ['2026-02-27', 12852, 'HP Petrol Pump', 9.0, 936, true, false],
    ['2026-03-16', 13190, 'Shell', 8.4, 903, true, false],
    ['2026-04-03', 13548, 'Indian Oil', 9.6, 998, true, false],
    ['2026-04-24', 13931, 'BPCL', 9.1, 946, true, false],
    ['2026-05-12', 14262, 'Indian Oil', 8.2, 853, true, false],
    ['2026-05-30', 14640, 'Jio-bp', 9.5, 1007, true, true],
    ['2026-06-18', 15049, 'HP Petrol Pump', 9.4, 977, true, false],
    ['2026-07-04', 15371, 'Indian Oil', 7.6, 790, true, false],
    ['2026-07-23', 15760, 'Shell', 9.8, 1058, true, false],
    ['2026-08-09', 16118, 'Indian Oil', 8.7, 905, true, false],
    ['2026-08-29', 16526, 'BPCL', 10.1, 1051, true, false],
    ['2026-09-14', 16872, 'HP Petrol Pump', 8.0, 832, true, false],
    ['2026-09-21', 17010, 'Jio-bp', 3.0, 318, false, false],
    ['2026-10-02', 17262, 'Indian Oil', 6.5, 676, true, false],
    ['2026-10-08', 17640, 'HP Petrol Pump', 9.3, 967, true, false],
  ];
  const entries = raw.map((r, i) => ({ id: i, date: r[0], odo: r[1], station: r[2], litres: r[3], amount: r[4], full: r[5], missed: r[6] }));
  // mileage: distance since previous full fill / litres added since then; first entry has none; latest is pending
  let lastFullOdo = null, litresSince = 0;
  entries.forEach((e, i) => {
    e.cpl = e.amount / e.litres;
    e.pending = i === entries.length - 1;
    e.partial = !e.full;
    e.mileage = null;
    if (lastFullOdo !== null) litresSince += e.litres;
    if (e.full) {
      if (lastFullOdo !== null && !e.missed && !e.pending) e.mileage = (e.odo - lastFullOdo) / litresSince;
      lastFullOdo = e.odo; litresSince = 0;
    }
  });
  const rated = entries.filter((e) => e.mileage !== null);
  const avg = rated.reduce((s, e) => s + e.mileage, 0) / rated.length;
  const best = rated.reduce((a, b) => (b.mileage > a.mileage ? b : a));
  const stats = {
    avg, best,
    spent: entries.reduce((s, e) => s + e.amount, 0),
    km: entries[entries.length - 1].odo - entries[0].odo,
    litres: entries.reduce((s, e) => s + e.litres, 0),
    count: entries.length,
    latest: rated[rated.length - 1],
    delta: rated[rated.length - 1].mileage - rated[rated.length - 2].mileage,
    min: Math.min(...rated.map((e) => e.mileage)),
    max: Math.max(...rated.map((e) => e.mileage)),
  };
  // sector verdict: best / up (>= avg) / down
  const sector = (e) => (e.mileage === null ? 'none' : e.id === best.id ? 'best' : e.mileage >= avg ? 'up' : 'down');

  const f1 = (n) => n.toFixed(1);
  const f2 = (n) => n.toFixed(2);
  const int = (n) => Math.round(n).toLocaleString('en-IN');
  const money = (n) => Math.round(n).toLocaleString('en-IN');
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dshort = (d) => { const [y, m, dd] = d.split('-'); return `${+dd} ${MON[+m - 1]}`; };
  const dfull = (d) => { const [y, m, dd] = d.split('-'); return `${+dd} ${MON[+m - 1]} ${y}`; };
  const monthKey = (d) => d.slice(0, 7);
  const monthLabel = (k) => { const [y, m] = k.split('-'); return `${MONL[+m - 1]} ${y}`; };
  const groups = () => {
    const out = [];
    [...entries].sort((a, b) => b.date.localeCompare(a.date)).forEach((e) => {
      const k = monthKey(e.date); let g = out.find((x) => x.key === k);
      if (!g) out.push((g = { key: k, label: monthLabel(k), items: [] }));
      g.items.push(e);
    });
    out.forEach((g) => (g.spent = g.items.reduce((s, e) => s + e.amount, 0)));
    return out;
  };
  const code = (s) => s.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();

  const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const icons = {
    gauge: P('<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>'),
    list: P('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
    bars: P('<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9M13 17V5M8 17v-3"/>'),
    trend: P('<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>'),
    plus: P('<path d="M5 12h14M12 5v14"/>'),
    sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>'),
    moon: P('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
    upload: P('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
    gear: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>'),
    up: P('<path d="m5 12 7-7 7 7M12 19V5"/>'),
    down: P('<path d="m19 12-7 7-7-7M12 5v14"/>'),
    chev: P('<path d="m9 18 6-6-6-6"/>'),
    pencil: P('<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'),
    trash: P('<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
    swap: P('<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>'),
    search: P('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  };

  const qs = new URLSearchParams(location.search);
  const state = {
    page: qs.get('page') === 'entries' ? 'entries' : 'overview',
    theme: qs.get('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    embed: qs.has('embed'),
  };
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    document.querySelectorAll('[data-theme-btn]').forEach((b) => (b.innerHTML = state.theme === 'dark' ? icons.sun : icons.moon));
    document.querySelectorAll('[data-theme-btn]').forEach((b) => b.setAttribute('aria-label', state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'));
  }
  window.CB = { entries, stats, sector, f1, f2, int, money, dshort, dfull, groups, code, icons, state, applyTheme, MON };
})();
