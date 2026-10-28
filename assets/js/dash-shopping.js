/* Painel de shopping centers: lê ShoppingData e redesenha indicadores, gráficos e tabela a cada filtro. */
(function () {
  const { fmt, t } = Charts;
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
    const flat = Math.abs(v) < (unit === 'pp' ? 0.05 : 0.0005);
    const cls = flat ? 'flat' : (v > 0) === goodWhenUp ? 'up' : 'down';
    return `<span class="k-delta ${cls}">${flat ? '' : v > 0 ? UP : DOWN}${unit === 'pp' ? fmt.pp(v) : fmt.delta(v)}</span>`;
  }

  function render() {
    const id = sel.value, d = ShoppingData.get(id);
    const sales = sum(d.cur), salesPrev = sum(d.prev);
    const vis = sum(d.visCur), visPrev = sum(d.visPrev);
    const spv = sales / vis, spvPrev = salesPrev / visPrev;
    const occNow = d.occ[11], occDelta = d.occ[11] - d.occ[0];
    const delNow = d.delinq[11], delDelta = d.delinq[11] - d.delinq[0];
    const vsPrev = t('vs ano anterior', 'vs prior year');
    const in12 = t('em 12 meses', 'over 12 months');

    Charts.kpis($('#kpis'), [
      { label: t('Vendas dos lojistas', 'Tenant sales'), value: fmt.brl(sales), delta: delta(sales / salesPrev - 1), ctx: vsPrev, spark: d.cur },
      { label: t('Venda por m² ao mês', 'Sales per m² per month'), value: fmt.brlFull(sales / d.abl / 12), delta: delta(sales / salesPrev - 1), ctx: vsPrev, spark: d.cur.map((v) => v / d.abl) },
      { label: t('Fluxo de visitantes', 'Foot traffic'), value: fmt.compact(vis), delta: delta(vis / visPrev - 1), ctx: vsPrev, spark: d.visCur },
      { label: t('Venda por visitante', 'Sales per visitor'), value: 'R$ ' + fmt.int(spv), delta: delta(spv / spvPrev - 1), ctx: vsPrev, spark: d.cur.map((v, i) => v / d.visCur[i]) },
      { label: t('Taxa de ocupação', 'Occupancy rate'), value: fmt.dec(occNow) + '%', delta: delta(occDelta, true, 'pp'), ctx: in12, spark: d.occ },
      { label: t('Inadimplência', 'Delinquency'), value: fmt.dec(delNow) + '%', delta: delta(delDelta, false, 'pp'), ctx: in12, spark: d.delinq },
    ]);

    const last12 = t('Últimos 12 meses', 'Last 12 months'), prev12 = t('12 meses anteriores', 'Prior 12 months');
    Charts.line($('#ch-sales'), {
      labels: d.months, format: fmt.brl, height: 300,
      label: t('Vendas mensais dos lojistas nos últimos 12 meses e nos 12 meses anteriores', 'Monthly tenant sales, last 12 months vs prior 12 months'),
      series: [
        { name: last12, values: d.cur, color: '--viz-focus', area: true },
        { name: prev12, values: d.prev, color: '--viz-context', dashed: true },
      ],
      tipNote: (i) => t('Variação: ', 'Change: ') + fmt.delta(d.cur[i] / d.prev[i] - 1),
    });
    Charts.table('#tv-sales', [t('Mês', 'Month'), last12, prev12, t('Variação', 'Change')],
      d.months.map((m, i) => [m, fmt.brl(d.cur[i]), fmt.brl(d.prev[i]), fmt.delta(d.cur[i] / d.prev[i] - 1)]));

    const segs = ShoppingData.segments.map((g) => {
      const c = sum(d.segAgg[g.name].cur), p = sum(d.segAgg[g.name].prev);
      return { name: g.name, yoy: c / p - 1, share: c / sales };
    }).sort((a, b) => b.yoy - a.yoy);
    Charts.hbar($('#ch-seg'), {
      labels: segs.map((s) => s.name), values: segs.map((s) => s.yoy), format: (v) => fmt.delta(v), valueWidth: 56,
      colorFn: (v) => (v >= 0 ? '--viz-focus' : '--viz-neg'), label: t('Variação de vendas por segmento', 'Sales change by category'),
      tipRows: (v, i) => [{ value: fmt.delta(v), label: t('vs 12 meses anteriores', 'vs prior 12 months') }, { value: fmt.pct(segs[i].share), label: t('das vendas', 'of sales') }],
    });
    Charts.table('#tv-seg', [t('Segmento', 'Category'), t('Variação', 'Change'), t('Participação', 'Share of sales')], segs.map((s) => [s.name, fmt.delta(s.yoy), fmt.pct(s.share)]));

    Charts.vbar($('#ch-vis'), {
      labels: d.months.map((m) => m.slice(0, 3)), tipLabels: d.months, values: d.visCur, format: fmt.compact, height: 260, unit: t('visitantes', 'visitors'),
      colorFn: (v, i) => (i === 11 ? '--viz-focus' : '--viz-context'), labelIndex: 11, label: t('Fluxo mensal de visitantes', 'Monthly foot traffic'),
    });
    Charts.table('#tv-vis', [t('Mês', 'Month'), t('Visitantes', 'Visitors')], d.months.map((m, i) => [m, fmt.int(d.visCur[i])]));

    // lojas em atenção: queda acima de 15% ou custo de ocupação acima de 16%
    const risky = d.stores.filter((s) => s.yoy < -0.15 || s.cost > 0.16)
      .map((s) => ({ ...s, both: s.yoy < -0.15 && s.cost > 0.16 }))
      .sort((a, b) => (b.both - a.both) || a.yoy - b.yoy);
    const both = risky.filter((s) => s.both).length;
    const showShop = id === 'todos';
    $('#th-shop').style.display = showShop ? '' : 'none';
    $('#tbl-stores').innerHTML = risky.slice(0, 8).map((s) => {
      const sig = s.both ? `<span class="pill crit">${CRIT}${t('Queda e custo alto', 'Decline and high cost')}</span>`
        : s.yoy < -0.15 ? `<span class="pill warn">${WARN}${t('Queda de vendas', 'Sales decline')}</span>` : `<span class="pill warn">${WARN}${t('Custo de ocupação alto', 'High occupancy cost')}</span>`;
      return `<tr><td>${s.id}</td>${showShop ? `<td>${s.shop}</td>` : ''}<td>${s.segment}</td><td class="r">${fmt.brl(s.sales3)}</td><td class="r ${s.yoy < 0 ? 'down' : 'up'}">${fmt.delta(s.yoy)}</td><td class="r">${fmt.pct(s.cost)}</td><td>${sig}</td></tr>`;
    }).join('');
    $('#stores-count').textContent = t(
      `${risky.length} lojas sinalizadas, ${both} com os dois sinais ao mesmo tempo. Mostrando as 8 mais urgentes.`,
      `${risky.length} stores flagged, ${both} with both signals at once. Showing the 8 most urgent.`
    );

    const best = segs[0], worst = segs[segs.length - 1];
    const decShare = d.cur[ShoppingData.decIndex] / sales;
    const spvUp = spv / spvPrev - 1, visUp = vis / visPrev - 1;
    const ins = [];
    ins.push(t(
      `<b>${best.name}</b> lidera o crescimento (${fmt.delta(best.yoy)}), enquanto <b>${worst.name}</b> ${worst.yoy < 0 ? 'recua' : 'cresce menos'} (${fmt.delta(worst.yoy)}) e ainda responde por ${fmt.pct(worst.share, 0)} das vendas. Vale revisar o mix antes da próxima rodada de renovação de contratos.`,
      `<b>${best.name}</b> leads growth (${fmt.delta(best.yoy)}), while <b>${worst.name}</b> ${worst.yoy < 0 ? 'is shrinking' : 'grows the least'} (${fmt.delta(worst.yoy)}) and still accounts for ${fmt.pct(worst.share, 0)} of sales. Worth revisiting the tenant mix before the next round of lease renewals.`
    ));
    ins.push(t(
      `Dezembro sozinho concentrou <b>${fmt.pct(decShare, 0)} das vendas</b> do período. Campanha e reforço de operação para o Natal precisam ser decididos ainda em setembro.`,
      `December alone brought in <b>${fmt.pct(decShare, 0)} of sales</b> for the period. Holiday campaigns and staffing need to be decided by September.`
    ));
    if (spvUp > 0.01) ins.push(t(
      `A venda por visitante subiu ${fmt.pct(spvUp)}: o público está gastando mais por visita, com o fluxo ${visUp >= 0 ? 'crescendo menos que as vendas' : 'em queda'}.`,
      `Sales per visitor rose ${fmt.pct(spvUp)}: shoppers are spending more per visit, while foot traffic is ${visUp >= 0 ? 'growing slower than sales' : 'declining'}.`
    ));
    else ins.push(t(
      `A venda por visitante ficou em ${fmt.delta(spvUp)}: o crescimento veio mais de fluxo do que de gasto por visita.`,
      `Sales per visitor came in at ${fmt.delta(spvUp)}: growth came from more visits rather than higher spend per visit.`
    ));
    if (occDelta < -0.5 && delDelta > 0.5) ins.push(t(
      `A ocupação caiu ${fmt.dec(Math.abs(occDelta))} p.p. e a inadimplência subiu ${fmt.dec(delDelta)} p.p. em 12 meses. É pressão sobre os lojistas: priorizar renegociação antes que vire vacância.`,
      `Occupancy fell ${fmt.dec(Math.abs(occDelta))} pp and delinquency rose ${fmt.dec(delDelta)} pp in 12 months. Tenants are under pressure: prioritize renegotiation before it turns into vacancy.`
    ));
    if (both > 0) ins.push(t(
      `<b>${both} ${both === 1 ? 'loja combina' : 'lojas combinam'}</b> queda de vendas acima de 15% com custo de ocupação acima de 16%. São as primeiras candidatas a uma conversa com o comercial.`,
      `<b>${both} ${both === 1 ? 'store combines' : 'stores combine'}</b> a sales decline above 15% with occupancy cost above 16%. They are the first candidates for a conversation with the leasing team.`
    ));
    else ins.push(t(
      `Nenhuma loja combina os dois sinais de risco, mas ${risky.length} têm pelo menos um. Vale acompanhar mês a mês para agir antes que o segundo sinal apareça.`,
      `No store shows both risk signals, but ${risky.length} show at least one. Track them monthly to act before the second signal appears.`
    ));
    $('#insights').innerHTML = ins.map((x) => `<li>${x}</li>`).join('');
  }
  sel.addEventListener('change', render);
  render();
})();
