/* Painel de shopping centers: lê ShoppingData e redesenha indicadores, gráficos e tabela a cada filtro. */
(function () {
  const { fmt } = Charts;
  const $ = (s) => document.querySelector(s);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const sel = $('#f-shop');
  ShoppingData.shops.forEach((s) => sel.add(new Option(s.name, s.id)));

  const UP = '<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M4 1 7.5 7h-7z" fill="currentColor"/></svg>';
  const DOWN = '<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M4 7 .5 1h7z" fill="currentColor"/></svg>';
  const CRIT = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 .8 9.6 9H.4z" fill="currentColor"/></svg>';
  const WARN = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

  /* Cor pela direção combinada com o que é bom (ocupação subir é bom, inadimplência subir é ruim) */
  function delta(v, goodWhenUp = true, unit = 'pct') {
    const flat = Math.abs(v) < 0.0005;
    const cls = flat ? 'flat' : (v > 0) === goodWhenUp ? 'up' : 'down';
    const txt = unit === 'pp' ? (v > 0 ? '+' : v < 0 ? '−' : '') + fmt.dec(Math.abs(v)) + ' p.p.' : fmt.delta(v);
    return `<span class="k-delta ${cls}">${flat ? '' : v > 0 ? UP : DOWN}${txt}</span>`;
  }

  function render() {
    const id = sel.value, d = ShoppingData.get(id);
    const sales = sum(d.cur), salesPrev = sum(d.prev);
    const vis = sum(d.visCur), visPrev = sum(d.visPrev);
    const spv = sales / vis, spvPrev = salesPrev / visPrev;
    const occNow = d.occ[11], occDelta = d.occ[11] - d.occ[0];
    const delNow = d.delinq[11], delDelta = d.delinq[11] - d.delinq[0];
    const vsPrev = 'vs ano anterior';

    Charts.kpis($('#kpis'), [
      { label: 'Vendas dos lojistas', value: fmt.brl(sales), delta: delta(sales / salesPrev - 1), ctx: vsPrev, spark: d.cur },
      { label: 'Venda por m² ao mês', value: fmt.brlFull(sales / d.abl / 12), delta: delta(sales / salesPrev - 1), ctx: vsPrev, spark: d.cur.map((v) => v / d.abl) },
      { label: 'Fluxo de visitantes', value: fmt.compact(vis), delta: delta(vis / visPrev - 1), ctx: vsPrev, spark: d.visCur },
      { label: 'Venda por visitante', value: 'R$ ' + fmt.int(spv), delta: delta(spv / spvPrev - 1), ctx: vsPrev, spark: d.cur.map((v, i) => v / d.visCur[i]) },
      { label: 'Taxa de ocupação', value: fmt.dec(occNow) + '%', delta: delta(occDelta, true, 'pp'), ctx: 'em 12 meses', spark: d.occ },
      { label: 'Inadimplência', value: fmt.dec(delNow) + '%', delta: delta(delDelta, false, 'pp'), ctx: 'em 12 meses', spark: d.delinq },
    ]);

    Charts.line($('#ch-sales'), {
      labels: d.months, format: fmt.brl, height: 300,
      label: 'Vendas mensais dos lojistas nos últimos 12 meses e nos 12 meses anteriores',
      series: [
        { name: 'Últimos 12 meses', values: d.cur, color: '--viz-focus', area: true },
        { name: '12 meses anteriores', values: d.prev, color: '--viz-context', dashed: true },
      ],
      tipNote: (i) => 'Variação: ' + fmt.delta(d.cur[i] / d.prev[i] - 1),
    });
    Charts.table('#tv-sales', ['Mês', 'Últimos 12 meses', '12 meses anteriores', 'Variação'],
      d.months.map((m, i) => [m, fmt.brl(d.cur[i]), fmt.brl(d.prev[i]), fmt.delta(d.cur[i] / d.prev[i] - 1)]));

    const segs = ShoppingData.segments.map((g) => {
      const c = sum(d.segAgg[g.name].cur), p = sum(d.segAgg[g.name].prev);
      return { name: g.name, yoy: c / p - 1, share: c / sales };
    }).sort((a, b) => b.yoy - a.yoy);
    Charts.hbar($('#ch-seg'), {
      labels: segs.map((s) => s.name), values: segs.map((s) => s.yoy), format: (v) => fmt.delta(v), valueWidth: 56,
      colorFn: (v) => (v >= 0 ? '--viz-focus' : '--viz-neg'), label: 'Variação de vendas por segmento',
      tipRows: (v, i) => [{ value: fmt.delta(v), label: 'vs 12 meses anteriores' }, { value: fmt.pct(segs[i].share), label: 'das vendas' }],
    });
    Charts.table('#tv-seg', ['Segmento', 'Variação', 'Participação'], segs.map((s) => [s.name, fmt.delta(s.yoy), fmt.pct(s.share)]));

    Charts.vbar($('#ch-vis'), {
      labels: d.months.map((m) => m.slice(0, 3)), tipLabels: d.months, values: d.visCur, format: fmt.compact, height: 260, unit: 'visitantes',
      colorFn: (v, i) => (i === 11 ? '--viz-focus' : '--viz-context'), labelIndex: 11, label: 'Fluxo mensal de visitantes',
    });
    Charts.table('#tv-vis', ['Mês', 'Visitantes'], d.months.map((m, i) => [m, fmt.int(d.visCur[i])]));

    // lojas em atenção: queda acima de 15% ou custo de ocupação acima de 16%
    const risky = d.stores.filter((s) => s.yoy < -0.15 || s.cost > 0.16)
      .map((s) => ({ ...s, both: s.yoy < -0.15 && s.cost > 0.16 }))
      .sort((a, b) => (b.both - a.both) || a.yoy - b.yoy);
    const both = risky.filter((s) => s.both).length;
    const showShop = id === 'todos';
    $('#th-shop').style.display = showShop ? '' : 'none';
    $('#tbl-stores').innerHTML = risky.slice(0, 8).map((s) => {
      const sig = s.both ? `<span class="pill crit">${CRIT}Queda e custo alto</span>`
        : s.yoy < -0.15 ? `<span class="pill warn">${WARN}Queda de vendas</span>` : `<span class="pill warn">${WARN}Custo de ocupação alto</span>`;
      return `<tr><td>${s.id}</td>${showShop ? `<td>${s.shop.replace('Shopping ', '')}</td>` : ''}<td>${s.segment}</td><td class="r">${fmt.brl(s.sales3)}</td><td class="r ${s.yoy < 0 ? 'down' : 'up'}">${fmt.delta(s.yoy)}</td><td class="r">${fmt.pct(s.cost)}</td><td>${sig}</td></tr>`;
    }).join('');
    $('#stores-count').textContent = `${risky.length} lojas sinalizadas, ${both} com os dois sinais ao mesmo tempo. Mostrando as 8 mais urgentes.`;

    const best = segs[0], worst = segs[segs.length - 1];
    const dezShare = d.cur[d.months.indexOf('dez/25')] / sales;
    const ins = [];
    ins.push(`<b>${best.name}</b> lidera o crescimento (${fmt.delta(best.yoy)}), enquanto <b>${worst.name}</b> ${worst.yoy < 0 ? 'recua' : 'cresce menos'} (${fmt.delta(worst.yoy)}) e ainda responde por ${fmt.pct(worst.share, 0)} das vendas. Vale revisar o mix antes da próxima rodada de renovação de contratos.`);
    ins.push(`Dezembro sozinho concentrou <b>${fmt.pct(dezShare, 0)} das vendas</b> do período. Campanha e reforço de operação para o Natal precisam ser decididos ainda em setembro.`);
    if (spv / spvPrev - 1 > 0.01) ins.push(`A venda por visitante subiu ${fmt.pct(spv / spvPrev - 1)}: o público está gastando mais por visita, com o fluxo ${vis / visPrev - 1 >= 0 ? 'crescendo menos que as vendas' : 'em queda'}.`);
    else ins.push(`A venda por visitante ficou em ${fmt.delta(spv / spvPrev - 1)}: o crescimento veio mais de fluxo do que de gasto por visita.`);
    if (occDelta < -0.5 && delDelta > 0.5) ins.push(`A ocupação caiu ${fmt.dec(Math.abs(occDelta))} p.p. e a inadimplência subiu ${fmt.dec(delDelta)} p.p. em 12 meses. É pressão sobre os lojistas: priorizar renegociação antes que vire vacância.`);
    if (both > 0) ins.push(`<b>${both} ${both === 1 ? 'loja combina' : 'lojas combinam'}</b> queda de vendas acima de 15% com custo de ocupação acima de 16%. São as primeiras candidatas a uma conversa com o comercial.`);
    else ins.push(`Nenhuma loja combina os dois sinais de risco, mas ${risky.length} têm pelo menos um. Vale acompanhar mês a mês para agir antes que o segundo sinal apareça.`);
    $('#insights').innerHTML = ins.map((t) => `<li>${t}</li>`).join('');
  }
  sel.addEventListener('change', render);
  render();
})();
