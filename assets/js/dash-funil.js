/* Painel de funil com dados SINTÉTICOS gerados para demonstração. */
(function () {
  const { fmt } = Charts;
  const R = Charts.rng(4242);
  const nz = (a) => 1 + (R() * 2 - 1) * a;
  const $ = (s) => document.querySelector(s);
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  const steps = ['Sessões', 'Leram o conteúdo', 'Clicaram no comparador', 'Iniciaram cadastro no parceiro', 'Concluíram o cadastro'];
  const channels = {
    'Orgânico': { share: .48, read: .58, click: .21, start: 1.0, conv: 1.0 },
    'Pago': { share: .18, read: .41, click: .27, start: 1.05, conv: .95 },
    'Social': { share: .14, read: .37, click: .12, start: .9, conv: .85 },
    'E-mail': { share: .08, read: .66, click: .30, start: 1.1, conv: 1.15 },
    'Direto': { share: .12, read: .55, click: .24, start: 1.0, conv: 1.05 },
  };
  const devices = { Mobile: { share: .72, start: .29 }, Desktop: { share: .28, start: .46 } };
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const weeks = [];
  const d0 = new Date(2026, 7, 3);
  for (let i = 0; i < 12; i++) {
    const d = new Date(d0);
    d.setDate(d0.getDate() + i * 7);
    weeks.push(String(d.getDate()).padStart(2, '0') + '/' + MONTHS[d.getMonth()]);
  }

  // linhas: canal x dispositivo x semana -> contagens por etapa
  const rows = [];
  Object.entries(channels).forEach(([ch, c]) => Object.entries(devices).forEach(([dv, d]) => weeks.forEach((w, i) => {
    const s = 210000 * Math.pow(1.012, i) * c.share * d.share * nz(.06);
    const read = s * c.read * nz(.03);
    const click = read * c.click * nz(.04);
    const start = click * d.start * c.start * nz(.05) * (i >= 9 && dv === 'Mobile' ? 0.93 : 1);
    const conv = start * .38 * c.conv * nz(.05);
    rows.push({ ch, dv, wi: i, v: [s, read, click, start, conv] });
  })));

  const pages = [
    ['Melhores cartões sem anuidade', .16, .0118], ['Como sair das dívidas em 5 passos', .13, .0042],
    ['Conta digital: comparativo completo', .11, .0131], ['Como aumentar o score de crédito', .10, .0035],
    ['Empréstimo com garantia de imóvel', .07, .0164], ['Investimentos para iniciantes', .09, .0029],
    ['Cartão de crédito para negativado', .06, .0152], ['Simulador de financiamento de carro', .05, .0110],
  ];

  const UP = '<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M4 1 7.5 7h-7z" fill="currentColor"/></svg>';
  const DOWN = '<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M4 7 .5 1h7z" fill="currentColor"/></svg>';
  const CRIT = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 .8 9.6 9H.4z" fill="currentColor"/></svg>';
  const delta = (v) => `<span class="k-delta ${v >= 0 ? 'up' : 'down'}">${v >= 0 ? UP : DOWN}${fmt.delta(v)}</span>`;

  const fCh = $('#f-canal'), fDv = $('#f-disp');
  Object.keys(channels).forEach((c) => fCh.add(new Option(c, c)));

  function render() {
    const ch = fCh.value, dv = fDv.value;
    const sel = rows.filter((r) => (ch === 'todos' || r.ch === ch) && (dv === 'todos' || r.dv === dv));
    const tot = steps.map((_, k) => sum(sel.map((r) => r.v[k])));
    const half = (a, b) => { const x = sel.filter((r) => r.wi >= a && r.wi < b); return [sum(x.map((r) => r.v[0])), sum(x.map((r) => r.v[4]))]; };
    const [s1, c1] = half(0, 6), [s2, c2] = half(6, 12);
    const rate = tot[4] / tot[0];
    const drops = tot.slice(1).map((v, k) => ({ k: k + 1, loss: 1 - v / tot[k] }));
    // maior perda depois do clique no comparador: as quedas de leitura e de clique são naturais em portal de conteúdo
    const worst = drops.filter((d) => d.k >= 3).reduce((a, b) => (b.loss > a.loss ? b : a));
    const wkS = weeks.map((_, i) => sum(sel.filter((r) => r.wi === i).map((r) => r.v[0])));
    const wkC = weeks.map((_, i) => sum(sel.filter((r) => r.wi === i).map((r) => r.v[4])));
    const ctx = 'últimas 6 semanas vs 6 anteriores';

    Charts.kpis($('#kpis'), [
      { label: 'Sessões em 12 semanas', value: fmt.compact(tot[0]), delta: delta(s2 / s1 - 1), ctx, spark: wkS },
      { label: 'Cadastros concluídos', value: fmt.int(tot[4]), delta: delta(c2 / c1 - 1), ctx, spark: wkC },
      { label: 'Taxa de conversão', value: fmt.pct(rate, 2), delta: delta((c2 / s2) / (c1 / s1) - 1), ctx, spark: wkC.map((c, i) => c / wkS[i]) },
      { label: 'Maior perda após o clique', value: fmt.pct(worst.loss, 0), ctx: ['', '', '', 'de quem clica no comparador não inicia o cadastro', 'de quem inicia o cadastro não conclui'][worst.k] },
    ]);

    $('#funnel').innerHTML = steps.map((st, k) => {
      const pct = (tot[k] / tot[0]) * 100, isWorst = k === worst.k;
      const sub = !k ? '<small>Ponto de partida</small>'
        : isWorst ? `<small>${CRIT}Maior perda · ${fmt.pct(1 - tot[k] / tot[k - 1], 0)} não seguem</small>`
        : `<small>${fmt.pct(tot[k] / tot[k - 1], 1)} da etapa anterior</small>`;
      return `<div class="f-row${isWorst ? ' worst' : ''}"><div class="f-name">${st}${sub}</div><div class="f-track"><span class="f-fill" style="--w:${Math.max(pct, 0.4).toFixed(2)}%"></span></div><div class="f-val">${fmt.int(tot[k])}</div></div>`;
    }).join('');

    // conversão por canal (respeita o filtro de dispositivo); com um canal filtrado, os demais viram contexto
    const chRates = Object.keys(channels).map((c) => {
      const x = rows.filter((r) => r.ch === c && (dv === 'todos' || r.dv === dv));
      return { c, r: sum(x.map((r) => r.v[4])) / sum(x.map((r) => r.v[0])), vol: sum(x.map((r) => r.v[4])) };
    }).sort((a, b) => b.r - a.r);
    Charts.hbar($('#ch-canal'), {
      labels: chRates.map((x) => x.c), values: chRates.map((x) => x.r), format: (v) => fmt.pct(v, 2), valueWidth: 60,
      colorFn: (v, i) => (ch !== 'todos' && chRates[i].c !== ch ? '--viz-context' : '--viz-focus'), label: 'Taxa de conversão por canal',
      tipRows: (v, i) => [{ value: fmt.pct(v, 2), label: 'de conversão' }, { value: fmt.int(chRates[i].vol), label: 'cadastros' }],
    });
    Charts.table('#tv-canal', ['Canal', 'Conversão', 'Cadastros'], chRates.map((x) => [x.c, fmt.pct(x.r, 2), fmt.int(x.vol)]));

    const meta = (c1 / 6) * 1.12;
    Charts.line($('#ch-semana'), {
      labels: weeks, format: fmt.int, axisFormat: fmt.compact, height: 280, label: 'Cadastros por semana comparados à meta',
      series: [{ name: 'Cadastros', values: wkC, color: '--viz-focus', area: true }, { name: 'Meta', values: weeks.map(() => meta), color: '--viz-context', dashed: true }],
      tipNote: (i) => (wkC[i] >= meta ? 'Acima' : 'Abaixo') + ' da meta em ' + fmt.pct(Math.abs(wkC[i] / meta - 1)),
    });
    Charts.table('#tv-semana', ['Semana', 'Cadastros', 'Meta'], weeks.map((w, i) => [w, fmt.int(wkC[i]), fmt.int(meta)]));

    const avg = sum(pages.map((p) => p[1] * p[2]));
    const pg = pages.map(([t, sh, r]) => ({ t, s: tot[0] * sh, r: r * (rate / 0.0098), gap: Math.max(0, tot[0] * sh * (avg - r) * (rate / 0.0098)) }))
      .sort((a, b) => b.gap - a.gap);
    $('#tbl-pages').innerHTML = pg.map((p) => `<tr><td>${p.t}</td><td class="r">${fmt.compact(p.s)}</td><td class="r">${fmt.pct(p.r, 2)}</td><td class="r">${p.gap > 0 ? '+' + fmt.int(p.gap) : '<span class="muted">acima da média</span>'}</td></tr>`).join('');

    const mob = rows.filter((r) => r.dv === 'Mobile' && (ch === 'todos' || r.ch === ch));
    const desk = rows.filter((r) => r.dv === 'Desktop' && (ch === 'todos' || r.ch === ch));
    const st = (x) => sum(x.map((r) => r.v[3])) / sum(x.map((r) => r.v[2]));
    const mRate = st(mob), dRate = st(desk);
    const gain = sum(mob.map((r) => r.v[2])) * (dRate * 0.9 - mRate) * (sum(mob.map((r) => r.v[4])) / sum(mob.map((r) => r.v[3])));
    const lastMob = rows.filter((r) => r.dv === 'Mobile' && r.wi >= 9 && (ch === 'todos' || r.ch === ch));
    const prevMob = rows.filter((r) => r.dv === 'Mobile' && r.wi >= 6 && r.wi < 9 && (ch === 'todos' || r.ch === ch));
    const ins = [];
    ins.push(`No celular, só <b>${fmt.pct(mRate, 0)}</b> de quem clica no comparador inicia o cadastro no parceiro; no computador são <b>${fmt.pct(dRate, 0)}</b>. Como o celular concentra a maior parte das sessões, levar o mobile a 90% da taxa do desktop renderia cerca de <b>${fmt.int(gain)} cadastros a mais</b> no período.`);
    const dropRecent = st(lastMob) / st(prevMob) - 1;
    if (dropRecent < -0.03) ins.push(`Nas últimas 3 semanas, essa etapa piorou ${fmt.pct(-dropRecent)} no celular. Uma queda concentrada em poucas semanas costuma ter causa técnica: vale checar se o formulário do parceiro mudou antes de mexer em campanha.`);
    if (ch === 'todos') ins.push(`E-mail converte ${fmt.pct(chRates.find((x) => x.c === 'E-mail').r, 2)}, a melhor taxa entre os canais, mas tem pouco volume. Social converte ${fmt.pct(chRates.find((x) => x.c === 'Social').r, 2)}: funciona melhor para alcance do que para cadastro.`);
    ins.push(`“${pg[0].t}” tem muito tráfego e conversão abaixo da média. Um comparador no meio do texto é o teste mais barato para recuperar esses cadastros.`);
    $('#insights').innerHTML = ins.map((t) => `<li>${t}</li>`).join('');
  }
  fCh.addEventListener('change', render);
  fDv.addEventListener('change', render);
  render();
})();
