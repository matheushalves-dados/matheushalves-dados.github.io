/* Dados SINTÉTICOS de shopping centers, gerados de forma determinística para demonstração. */
(function () {
  const R = Charts.rng(2026);
  const noise = (a) => (R() * 2 - 1) * a;
  const months = ['nov/25','dez/25','jan/26','fev/26','mar/26','abr/26','mai/26','jun/26','jul/26','ago/26','set/26','out/26'];
  const calMonth = [11,12,1,2,3,4,5,6,7,8,9,10];
  const season = {1:.86,2:.82,3:.92,4:.95,5:1.08,6:1.0,7:1.02,8:1.0,9:.97,10:1.03,11:1.12,12:1.48};
  const shops = [
    { id:'atlantico', name:'Shopping Atlântico', abl:62000, salesM2:1450, visitors:1.35e6, visGrowth:.03, occ:[95.2,95.8], delinq:[4.4,4.1], rent:180, offset:.02 },
    { id:'serra', name:'Shopping Serra', abl:48000, salesM2:1180, visitors:.95e6, visGrowth:-.012, occ:[91.6,89.4], delinq:[6.1,7.3], rent:140, offset:-.035 },
    { id:'lagoa', name:'Shopping Lagoa', abl:35000, salesM2:1620, visitors:.82e6, visGrowth:.05, occ:[97.0,97.5], delinq:[3.5,3.1], rent:210, offset:.04 },
  ];
  const segments = [
    { name:'Vestuário', share:.30, growth:-.04 },
    { name:'Alimentação', share:.18, growth:.11 },
    { name:'Saúde e beleza', share:.13, growth:.09 },
    { name:'Eletrônicos', share:.12, growth:-.02 },
    { name:'Casa e decoração', share:.10, growth:.01 },
    { name:'Lazer', share:.09, growth:.14 },
    { name:'Serviços', share:.08, growth:.06 },
  ];
  const data = {};
  shops.forEach((s) => {
    const seg = {};
    segments.forEach((g) => {
      const gr = g.growth + s.offset + noise(.02);
      const cur = calMonth.map((cm) => s.abl * s.salesM2 * g.share * season[cm] * (1 + noise(.035)));
      const prev = cur.map((v) => v / (1 + gr + noise(.025)));
      seg[g.name] = { cur, prev };
    });
    const visCur = calMonth.map((cm) => s.visitors * Math.pow(season[cm], .6) * (1 + noise(.03)));
    const visPrev = visCur.map((v) => v / (1 + s.visGrowth + noise(.02)));
    const occ = months.map((_, i) => s.occ[0] + (s.occ[1] - s.occ[0]) * (i / 11) + noise(.25));
    const delinq = months.map((_, i) => s.delinq[0] + (s.delinq[1] - s.delinq[0]) * (i / 11) + noise(.3));
    const stores = [];
    let n = 100;
    segments.forEach((g) => {
      const count = Math.max(3, Math.round(g.share * 40));
      for (let k = 0; k < count; k++) {
        n += 1 + Math.floor(R() * 6);
        const area = Math.round(g.name === 'Lazer' ? 400 + R() * 900 : 60 + R() * 380);
        const shock = R() < .16 ? -.18 - R() * .2 : noise(.08);
        const gr = g.growth + s.offset + shock;
        const sales3 = area * s.salesM2 * 3 * (0.75 + R() * 0.55) * (g.name === 'Lazer' ? .55 : 1);
        const prev3 = sales3 / (1 + gr);
        const cost = ((s.rent * (0.55 + R() * 0.45) * (g.name === 'Lazer' ? .5 : 1) + 30) * area * 3) / sales3;
        stores.push({ shop: s.name, id: 'Loja ' + n, segment: g.name, area, sales3, prev3, yoy: sales3 / prev3 - 1, cost });
      }
    });
    data[s.id] = { seg, visCur, visPrev, occ, delinq, stores, abl: s.abl, name: s.name };
  });

  function sumArr(arrs) { return arrs[0].map((_, i) => arrs.reduce((a, b) => a + b[i], 0)); }

  function get(id) {
    const ids = id === 'todos' ? shops.map((s) => s.id) : [id];
    const parts = ids.map((i) => data[i]);
    const segAgg = {};
    segments.forEach((g) => {
      segAgg[g.name] = { cur: sumArr(parts.map((p) => p.seg[g.name].cur)), prev: sumArr(parts.map((p) => p.seg[g.name].prev)) };
    });
    const cur = sumArr(Object.values(segAgg).map((s) => s.cur));
    const prev = sumArr(Object.values(segAgg).map((s) => s.prev));
    const abl = parts.reduce((a, p) => a + p.abl, 0);
    const w = parts.map((p) => p.abl / abl);
    const wavg = (key) => months.map((_, i) => parts.reduce((a, p, k) => a + p[key][i] * w[k], 0));
    return {
      months, cur, prev, segAgg, abl,
      visCur: sumArr(parts.map((p) => p.visCur)), visPrev: sumArr(parts.map((p) => p.visPrev)),
      occ: wavg('occ'), delinq: wavg('delinq'),
      stores: parts.flatMap((p) => p.stores),
      perShop: ids.map((i) => ({ name: data[i].name, abl: data[i].abl, sales: sumArr(segments.map((g) => data[i].seg[g.name].cur)).reduce((a, b) => a + b, 0) })),
    };
  }
  window.ShoppingData = { months, shops, segments, get };
})();
