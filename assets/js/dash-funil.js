/* Painel de funil com dados SINTÉTICOS gerados para demonstração. */
(function () {
  const { fmt, t, EN } = Charts;
  const R = Charts.rng(4242);
  const nz = (a) => 1 + (R() * 2 - 1) * a;
  const $ = (s) => document.querySelector(s);
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  const steps = t(
    ['Sessões', 'Leram o conteúdo', 'Clicaram no comparador', 'Iniciaram cadastro no parceiro', 'Concluíram o cadastro'],
    ['Sessions', 'Read the content', 'Clicked the comparison tool', 'Started partner sign-up', 'Completed sign-up']
  );
  // a chave do canal é o valor do filtro; o rótulo muda com o idioma
  const channels = {
    'Orgânico': { label: t('Orgânico', 'Organic'), share: .48, read: .58, click: .21, start: 1.0, conv: 1.0 },
    'Pago': { label: t('Pago', 'Paid'), share: .18, read: .41, click: .27, start: 1.05, conv: .95 },
    'Social': { label: 'Social', share: .14, read: .37, click: .12, start: .9, conv: .85 },
    'E-mail': { label: t('E-mail', 'Email'), share: .08, read: .66, click: .30, start: 1.1, conv: 1.15 },
    'Direto': { label: t('Direto', 'Direct'), share: .12, read: .55, click: .24, start: 1.0, conv: 1.05 },
  };
  const devices = { Mobile: { share: .72, start: .29 }, Desktop: { share: .28, start: .46 } };
  const MONTHS = t(['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
  const weeks = [];
  const d0 = new Date(2026, 7, 3);
  for (let i = 0; i < 12; i++) {
    const d = new Date(d0);
    d.setDate(d0.getDate() + i * 7);
    weeks.push(EN ? MONTHS[d.getMonth()] + ' ' + d.getDate() : String(d.getDate()).padStart(2, '0') + '/' + MONTHS[d.getMonth()]);
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
    [t('Melhores cartões sem anuidade', 'Best no-annual-fee credit cards'), .16, .0118],
    [t('Como sair das dívidas em 5 passos', 'How to get out of debt in 5 steps'), .13, .0042],
    [t('Conta digital: comparativo completo', 'Digital bank accounts compared'), .11, .0131],
    [t('Como aumentar o score de crédito', 'How to raise your credit score'), .10, .0035],
    [t('Empréstimo com garantia de imóvel', 'Home equity loans'), .07, .0164],
    [t('Investimentos para iniciantes', 'Investing for beginners'), .09, .0029],
    [t('Cartão de crédito para negativado', 'Credit cards for bad credit'), .06, .0152],
    [t('Simulador de financiamento de carro', 'Car loan calculator'), .05, .0110],
  ];

  const UP = '<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M4 1 7.5 7h-7z" fill="currentColor"/></svg>';
  const DOWN = '<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M4 7 .5 1h7z" fill="currentColor"/></svg>';
  const CRIT = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 .8 9.6 9H.4z" fill="currentColor"/></svg>';
  const delta = (v) => `<span class="k-delta ${v >= 0 ? 'up' : 'down'}">${v >= 0 ? UP : DOWN}${fmt.delta(v)}</span>`;

  const fCh = $('#f-canal'), fDv = $('#f-disp');
  Object.entries(channels).forEach(([key, c]) => fCh.add(new Option(c.label, key)));

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
    const ctx = t('últimas 6 semanas vs 6 anteriores', 'last 6 weeks vs prior 6');

    Charts.kpis($('#kpis'), [
      { label: t('Sessões em 12 semanas', 'Sessions in 12 weeks'), value: fmt.compact(tot[0]), delta: delta(s2 / s1 - 1), ctx, spark: wkS },
      { label: t('Cadastros concluídos', 'Completed sign-ups'), value: fmt.int(tot[4]), delta: delta(c2 / c1 - 1), ctx, spark: wkC },
      { label: t('Taxa de conversão', 'Conversion rate'), value: fmt.pct(rate, 2), delta: delta((c2 / s2) / (c1 / s1) - 1), ctx, spark: wkC.map((c, i) => c / wkS[i]) },
      {
        label: t('Maior perda após o clique', 'Biggest drop after the click'), value: fmt.pct(worst.loss, 0),
        ctx: worst.k === 3 ? t('de quem clica no comparador não inicia o cadastro', 'of people who click the comparison tool never start sign-up')
          : t('de quem inicia o cadastro não conclui', 'of people who start sign-up never finish'),
      },
    ]);

    $('#funnel').innerHTML = steps.map((st, k) => {
      const pct = (tot[k] / tot[0]) * 100, isWorst = k === worst.k;
      const sub = !k ? `<small>${t('Ponto de partida', 'Starting point')}</small>`
        : isWorst ? `<small>${CRIT}${t('Maior perda', 'Biggest drop')} · ${fmt.pct(1 - tot[k] / tot[k - 1], 0)} ${t('não seguem', 'drop off')}</small>`
        : `<small>${fmt.pct(tot[k] / tot[k - 1], 1)} ${t('da etapa anterior', 'of the previous step')}</small>`;
      return `<div class="f-row${isWorst ? ' worst' : ''}"><div class="f-name">${st}${sub}</div><div class="f-track"><span class="f-fill" style="--w:${Math.max(pct, 0.4).toFixed(2)}%"></span></div><div class="f-val">${fmt.int(tot[k])}</div></div>`;
    }).join('');

    // conversão por canal (respeita o filtro de dispositivo); com um canal filtrado, os demais viram contexto
    const chRates = Object.entries(channels).map(([key, c]) => {
      const x = rows.filter((r) => r.ch === key && (dv === 'todos' || r.dv === dv));
      return { key, c: c.label, r: sum(x.map((r) => r.v[4])) / sum(x.map((r) => r.v[0])), vol: sum(x.map((r) => r.v[4])) };
    }).sort((a, b) => b.r - a.r);
    Charts.hbar($('#ch-canal'), {
      labels: chRates.map((x) => x.c), values: chRates.map((x) => x.r), format: (v) => fmt.pct(v, 2), valueWidth: 60,
      colorFn: (v, i) => (ch !== 'todos' && chRates[i].key !== ch ? '--viz-context' : '--viz-focus'), label: t('Taxa de conversão por canal', 'Conversion rate by channel'),
      tipRows: (v, i) => [{ value: fmt.pct(v, 2), label: t('de conversão', 'conversion') }, { value: fmt.int(chRates[i].vol), label: t('cadastros', 'sign-ups') }],
    });
    Charts.table('#tv-canal', [t('Canal', 'Channel'), t('Conversão', 'Conversion'), t('Cadastros', 'Sign-ups')], chRates.map((x) => [x.c, fmt.pct(x.r, 2), fmt.int(x.vol)]));

    const meta = (c1 / 6) * 1.12;
    const signups = t('Cadastros', 'Sign-ups'), target = t('Meta', 'Target');
    Charts.line($('#ch-semana'), {
      labels: weeks, format: fmt.int, axisFormat: fmt.compact, height: 280, label: t('Cadastros por semana comparados à meta', 'Weekly sign-ups vs target'),
      series: [{ name: signups, values: wkC, color: '--viz-focus', area: true }, { name: target, values: weeks.map(() => meta), color: '--viz-context', dashed: true }],
      tipNote: (i) => (wkC[i] >= meta ? t('Acima', 'Above') : t('Abaixo', 'Below')) + t(' da meta em ', ' target by ') + fmt.pct(Math.abs(wkC[i] / meta - 1)),
    });
    Charts.table('#tv-semana', [t('Semana', 'Week'), signups, target], weeks.map((w, i) => [w, fmt.int(wkC[i]), fmt.int(meta)]));

    const avg = sum(pages.map((p) => p[1] * p[2]));
    const pg = pages.map(([title, sh, r]) => ({ title, s: tot[0] * sh, r: r * (rate / 0.0098), gap: Math.max(0, tot[0] * sh * (avg - r) * (rate / 0.0098)) }))
      .sort((a, b) => b.gap - a.gap);
    $('#tbl-pages').innerHTML = pg.map((p) => `<tr><td>${p.title}</td><td class="r">${fmt.compact(p.s)}</td><td class="r">${fmt.pct(p.r, 2)}</td><td class="r">${p.gap > 0 ? '+' + fmt.int(p.gap) : `<span class="muted">${t('acima da média', 'above average')}</span>`}</td></tr>`).join('');

    const mob = rows.filter((r) => r.dv === 'Mobile' && (ch === 'todos' || r.ch === ch));
    const desk = rows.filter((r) => r.dv === 'Desktop' && (ch === 'todos' || r.ch === ch));
    const st = (x) => sum(x.map((r) => r.v[3])) / sum(x.map((r) => r.v[2]));
    const mRate = st(mob), dRate = st(desk);
    const gain = sum(mob.map((r) => r.v[2])) * (dRate * 0.9 - mRate) * (sum(mob.map((r) => r.v[4])) / sum(mob.map((r) => r.v[3])));
    const lastMob = rows.filter((r) => r.dv === 'Mobile' && r.wi >= 9 && (ch === 'todos' || r.ch === ch));
    const prevMob = rows.filter((r) => r.dv === 'Mobile' && r.wi >= 6 && r.wi < 9 && (ch === 'todos' || r.ch === ch));
    const dropRecent = st(lastMob) / st(prevMob) - 1;
    const ins = [];
    ins.push(t(
      `No celular, só <b>${fmt.pct(mRate, 0)}</b> de quem clica no comparador inicia o cadastro no parceiro; no computador são <b>${fmt.pct(dRate, 0)}</b>. Como o celular concentra a maior parte das sessões, levar o mobile a 90% da taxa do desktop renderia cerca de <b>${fmt.int(gain)} cadastros a mais</b> no período.`,
      `On mobile, only <b>${fmt.pct(mRate, 0)}</b> of people who click the comparison tool start the partner sign-up; on desktop it is <b>${fmt.pct(dRate, 0)}</b>. Since mobile drives most sessions, bringing it to 90% of the desktop rate would add about <b>${fmt.int(gain)} sign-ups</b> in the period.`
    ));
    if (dropRecent < -0.03) ins.push(t(
      `Nas últimas 3 semanas, essa etapa piorou ${fmt.pct(-dropRecent)} no celular. Uma queda concentrada em poucas semanas costuma ter causa técnica: vale checar se o formulário do parceiro mudou antes de mexer em campanha.`,
      `In the last 3 weeks this step got ${fmt.pct(-dropRecent)} worse on mobile. A drop concentrated in a few weeks usually has a technical cause: check whether the partner’s form changed before touching campaigns.`
    ));
    if (ch === 'todos') {
      const em = chRates.find((x) => x.key === 'E-mail').r, so = chRates.find((x) => x.key === 'Social').r;
      ins.push(t(
        `E-mail converte ${fmt.pct(em, 2)}, a melhor taxa entre os canais, mas tem pouco volume. Social converte ${fmt.pct(so, 2)}: funciona melhor para alcance do que para cadastro.`,
        `Email converts at ${fmt.pct(em, 2)}, the best rate of any channel, but brings little volume. Social converts at ${fmt.pct(so, 2)}: better for reach than for sign-ups.`
      ));
    }
    ins.push(t(
      `“${pg[0].title}” tem muito tráfego e conversão abaixo da média. Um comparador no meio do texto é o teste mais barato para recuperar esses cadastros.`,
      `“${pg[0].title}” gets heavy traffic but converts below average. An in-article comparison widget is the cheapest test to recover those sign-ups.`
    ));
    $('#insights').innerHTML = ins.map((x) => `<li>${x}</li>`).join('');
  }
  fCh.addEventListener('change', render);
  fDv.addEventListener('change', render);
  render();
})();
