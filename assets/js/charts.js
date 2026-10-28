/* Biblioteca mínima de gráficos em SVG, sem dependências.
   Cores e superfícies vêm das variáveis CSS do contêiner, então o mesmo gráfico funciona em seções claras e escuras. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  // idioma vem do atributo lang da página: pt-BR (padrão) ou en
  const EN = (document.documentElement.lang || '').toLowerCase().startsWith('en');
  const LOC = EN ? 'en-US' : 'pt-BR';
  const t = (pt, en) => (EN ? en : pt);

  function tokens(node) {
    const cs = getComputedStyle(node);
    const get = (v) => cs.getPropertyValue(v).trim();
    return { get, color: (c) => (c && c.startsWith('--') ? get(c) : c) };
  }
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null && attrs[k] !== '') e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function label(parent, x, y, str, attrs) {
    const t = el('text', Object.assign({ x, y }, attrs), parent);
    t.textContent = str;
    return t;
  }
  function niceMax(v) {
    if (v <= 0) return 1;
    const raw = v / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    const step = (n <= 1 ? 1 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 3 ? 3 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 6 ? 6 : n <= 8 ? 8 : 10) * p;
    return step * 4;
  }
  function compact(v) {
    const a = Math.abs(v);
    const f = (x) => x.toLocaleString(LOC, { maximumFractionDigits: 1 });
    if (a >= 1e9) return f(v / 1e9) + t(' bi', 'B');
    if (a >= 1e6) return f(v / 1e6) + t(' mi', 'M');
    if (a >= 1e3) return f(v / 1e3) + t(' mil', 'K');
    return Math.round(v).toLocaleString(LOC);
  }
  const dec = (v, d = 1) => v.toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d });
  const sign = (r) => (r > 0 ? '+' : r < 0 ? '−' : '');
  const fmt = {
    brl: (v) => 'R$ ' + compact(v),
    brlFull: (v) => 'R$ ' + Math.round(v).toLocaleString(LOC),
    int: (v) => Math.round(v).toLocaleString(LOC),
    dec,
    compact,
    pct: (v, d = 1) => dec(v * 100, d) + '%',
    delta: (v, d = 1) => {
      const r = Math.round(v * 100 * 10 ** d) / 10 ** d;
      return sign(r) + dec(Math.abs(r), d) + '%';
    },
    pp: (v) => {
      const r = Math.round(v * 10) / 10;
      return sign(r) + dec(Math.abs(r)) + t(' p.p.', ' pp');
    },
  };
  const textWidth = (s, px) => String(s).length * px;

  /* Barra com ponta arredondada de 4px no lado do dado e reta na linha de base */
  function barPath(x, y, w, h, side) {
    const r = Math.max(0, Math.min(4, w / 2, h / 2));
    if (side === 'right') return `M${x} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x}Z`;
    if (side === 'left') return `M${x + w} ${y}H${x + r}Q${x} ${y} ${x} ${y + r}V${y + h - r}Q${x} ${y + h} ${x + r} ${y + h}H${x + w}Z`;
    return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`;
  }

  /* Tooltip único: o valor vem primeiro, o nome da série depois, com chave em traço curto */
  let tt;
  function tipEl() {
    if (!tt) {
      tt = document.createElement('div');
      tt.className = 'tt';
      tt.setAttribute('role', 'status');
      tt.setAttribute('aria-live', 'polite');
      document.body.appendChild(tt);
    }
    return tt;
  }
  function showTip(spec, x, y) {
    const t = tipEl();
    t.replaceChildren();
    if (spec.title) {
      const h = document.createElement('div');
      h.className = 'tt-title';
      h.textContent = spec.title;
      t.appendChild(h);
    }
    (spec.rows || []).forEach((r) => {
      const row = document.createElement('div');
      row.className = 'tt-row';
      if (r.color) {
        const k = document.createElement('i');
        k.className = 'tt-key' + (r.dashed ? ' dashed' : '');
        k.style.setProperty('--k', r.color);
        row.appendChild(k);
      }
      const v = document.createElement('b');
      v.textContent = r.value;
      row.appendChild(v);
      if (r.label) {
        const s = document.createElement('span');
        s.textContent = r.label;
        row.appendChild(s);
      }
      t.appendChild(row);
    });
    if (spec.note) {
      const n = document.createElement('div');
      n.className = 'tt-note';
      n.textContent = spec.note;
      t.appendChild(n);
    }
    t.classList.add('on');
    const w = t.offsetWidth, h = t.offsetHeight;
    let left = x + 14, top = y - h - 12;
    if (left + w > window.innerWidth - 8) left = x - w - 14;
    if (left < 8) left = 8;
    if (top < 8) top = y + 18;
    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }
  function hideTip() { if (tt) tt.classList.remove('on'); }

  function legend(container, items) {
    const lg = document.createElement('div');
    lg.className = 'legend';
    items.forEach((it) => {
      const s = document.createElement('span');
      const k = document.createElement('i');
      k.className = 'lg-key' + (it.dashed ? ' dashed' : '');
      k.style.setProperty('--k', it.color);
      s.appendChild(k);
      s.appendChild(document.createTextNode(it.name));
      lg.appendChild(s);
    });
    container.appendChild(lg);
  }

  function mount(container, draw) {
    container._draw = draw;
    const render = () => {
      container.replaceChildren();
      container._draw(container.clientWidth || 600, tokens(container));
    };
    render();
    if (!container._ro && 'ResizeObserver' in window) {
      let last = container.clientWidth;
      container._ro = new ResizeObserver(() => {
        const w = container.clientWidth;
        if (Math.abs(w - last) > 4) { last = w; render(); }
      });
      container._ro.observe(container);
    }
    return { render };
  }

  /* Liga hover, toque e foco de teclado a uma marca, com área de acerto maior que a marca */
  function hover(hit, mark, onShow) {
    const on = () => { if (mark) mark.classList.add('hot'); onShow(); };
    const off = () => { if (mark) mark.classList.remove('hot'); hideTip(); };
    hit.addEventListener('pointerenter', on);
    hit.addEventListener('pointerdown', on);
    hit.addEventListener('pointerleave', off);
    if (mark) { mark.addEventListener('focus', on); mark.addEventListener('blur', off); }
  }

  /* Linhas: {labels, series:[{name, values, color, dashed, area}], format, height, tipNote(i)} */
  function line(container, o) {
    container.classList.add('chart');
    return mount(container, (W, T) => {
      const series = o.series, n = o.labels.length;
      const f = o.format || compact, af = o.axisFormat || f;
      if (series.length > 1) legend(container, series.map((s) => ({ name: s.name, color: T.color(s.color), dashed: s.dashed })));
      const focus = series[0];
      const endText = o.endLabel === false || W < 420 ? '' : f(focus.values[n - 1]);
      const max = niceMax(Math.max(...series.flatMap((s) => s.values)) * 1.04);
      const min = o.min != null ? o.min : 0;
      const ticks = [0, 1, 2, 3, 4].map((g) => min + ((max - min) * g) / 4);
      const H = o.height || 260;
      const m = { l: Math.max(...ticks.map((v) => textWidth(af(v), 6.6))) + 14, r: endText ? textWidth(endText, 7.4) + 16 : 12, t: 14, b: 30 };
      const iw = Math.max(40, W - m.l - m.r), ih = H - m.t - m.b;
      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.label || '', tabindex: 0 }, container);
      const x = (i) => m.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
      const y = (v) => m.t + ih - ((v - min) / (max - min)) * ih;

      ticks.forEach((v, g) => {
        const yy = Math.round(y(v)) + 0.5;
        el('line', { x1: m.l, x2: m.l + iw, y1: yy, y2: yy, stroke: T.get(g === 0 ? '--viz-axis' : '--viz-grid'), 'stroke-width': 1 }, svg);
        label(svg, m.l - 10, yy + 4, af(v), { 'text-anchor': 'end', class: 'tick' });
      });
      // rótulos do eixo x: o último sempre aparece; os demais só entram se não colidirem
      const lw = Math.max(...o.labels.map((l) => textWidth(l, 6.4))) + 10;
      const span = (i) => {
        const a = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
        const x1 = a === 'start' ? x(i) : a === 'end' ? x(i) - lw : x(i) - lw / 2;
        return { i, a, x1, x2: x1 + lw };
      };
      const lastSpan = span(n - 1);
      const k = Math.max(1, Math.ceil(lw / (iw / Math.max(1, n - 1))));
      const shown = [];
      for (let i = 0; i < n - 1; i += k) {
        const s = span(i);
        const prev = shown[shown.length - 1];
        if (prev && s.x1 < prev.x2) continue;
        shown.push(s);
      }
      while (shown.length && shown[shown.length - 1].x2 > lastSpan.x1) shown.pop();
      shown.push(lastSpan);
      shown.forEach((s) => label(svg, x(s.i), H - 8, o.labels[s.i], { 'text-anchor': s.a, class: 'tick' }));

      [...series].reverse().forEach((s) => {
        const c = T.color(s.color);
        const d = s.values.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join('');
        if (s.area) el('path', { d: d + `L${x(n - 1).toFixed(1)} ${y(min)}L${x(0).toFixed(1)} ${y(min)}Z`, fill: c, 'fill-opacity': 0.1 }, svg);
        el('path', { d, fill: 'none', stroke: c, 'stroke-width': 2, 'stroke-dasharray': s.dashed ? '4 4' : '', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      });

      const surf = T.get('--surface');
      const lx = x(n - 1), ly = y(focus.values[n - 1]);
      el('circle', { cx: lx, cy: ly, r: 4, fill: T.color(focus.color), stroke: surf, 'stroke-width': 2 }, svg);
      if (endText) label(svg, lx + 10, ly + 4, endText, { class: 'end-label' });

      const guide = el('line', { y1: m.t, y2: m.t + ih, stroke: T.get('--viz-text'), 'stroke-width': 1, opacity: 0 }, svg);
      const dots = series.map((s) => el('circle', { r: 4, fill: T.color(s.color), stroke: surf, 'stroke-width': 2, opacity: 0 }, svg));
      const hit = el('rect', { x: m.l - 8, y: 0, width: iw + 16, height: H, fill: 'transparent' }, svg);
      let cur = n - 1;
      const show = (i) => {
        cur = i;
        const gx = Math.round(x(i)) + 0.5;
        guide.setAttribute('x1', gx); guide.setAttribute('x2', gx); guide.setAttribute('opacity', 0.6);
        dots.forEach((dt, k) => { dt.setAttribute('cx', x(i)); dt.setAttribute('cy', y(series[k].values[i])); dt.setAttribute('opacity', 1); });
        const r = svg.getBoundingClientRect();
        showTip({
          title: (o.tipLabels || o.labels)[i],
          rows: series.map((s) => ({ color: T.color(s.color), dashed: s.dashed, value: f(s.values[i]), label: s.name })),
          note: o.tipNote ? o.tipNote(i) : '',
        }, r.left + x(i), r.top + y(focus.values[i]));
      };
      const hide = () => { hideTip(); guide.setAttribute('opacity', 0); dots.forEach((dt) => dt.setAttribute('opacity', 0)); };
      const idxAt = (clientX) => {
        const r = svg.getBoundingClientRect();
        return Math.max(0, Math.min(n - 1, Math.round(((clientX - r.left - m.l) / iw) * (n - 1))));
      };
      hit.addEventListener('pointermove', (e) => show(idxAt(e.clientX)));
      hit.addEventListener('pointerdown', (e) => show(idxAt(e.clientX)));
      hit.addEventListener('pointerleave', hide);
      svg.addEventListener('focus', () => show(cur));
      svg.addEventListener('blur', hide);
      svg.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          show(Math.max(0, Math.min(n - 1, cur + (e.key === 'ArrowRight' ? 1 : -1))));
        } else if (e.key === 'Escape') hide();
      });
    });
  }

  /* Barras horizontais, aceita negativos: {labels, values, format, colorFn(v,i), tipRows(v,i)} */
  function hbar(container, o) {
    container.classList.add('chart');
    return mount(container, (W, T) => {
      const n = o.labels.length, rowH = o.rowHeight || 34, barH = Math.min(20, rowH - 12);
      const f = o.format || compact;
      const valW = W < 400 ? Math.min(o.valueWidth || 60, 50) : o.valueWidth || 60;
      const labelW = Math.min(o.labelWidth || 150, Math.max(...o.labels.map((l) => textWidth(l, 7))) + 14, W * 0.4);
      const H = rowH * n;
      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.label || '' }, container);
      const minV = Math.min(0, ...o.values), maxV = Math.max(0, ...o.values);
      const x0 = labelW + (minV < 0 ? valW : 0), x1 = W - (maxV > 0 ? valW : 0);
      const span = (maxV - minV) || 1;
      const sx = (v) => x0 + ((v - minV) / span) * (x1 - x0);
      const zero = Math.round(sx(0)) + 0.5;
      el('line', { x1: zero, x2: zero, y1: 0, y2: H, stroke: T.get('--viz-axis'), 'stroke-width': 1 }, svg);
      o.labels.forEach((lb, i) => {
        const v = o.values[i], yy = i * rowH + (rowH - barH) / 2;
        label(svg, labelW - 12, yy + barH / 2 + 4.5, lb, { 'text-anchor': 'end', class: 'cat' });
        const a = Math.min(sx(0), sx(v)), w = Math.max(1.5, Math.abs(sx(v) - sx(0)));
        const c = T.color(o.colorFn ? o.colorFn(v, i) : o.color || '--viz-focus');
        const hit = el('rect', { x: 0, y: i * rowH, width: W, height: rowH, fill: 'transparent' }, svg);
        const bar = el('path', { d: barPath(a, yy, w, barH, v < 0 ? 'left' : 'right'), fill: c, class: 'mark', tabindex: 0, role: 'img', 'aria-label': `${lb}: ${f(v)}` }, svg);
        label(svg, v < 0 ? a - 8 : a + w + 8, yy + barH / 2 + 4.5, f(v), { 'text-anchor': v < 0 ? 'end' : 'start', class: 'val' });
        hover(hit, bar, () => {
          const b = bar.getBoundingClientRect();
          showTip({ title: lb, rows: o.tipRows ? o.tipRows(v, i) : [{ value: f(v) }] }, v < 0 ? b.left : b.right, b.top + b.height / 2);
        });
      });
    });
  }

  /* Colunas: {labels, values, format, colorFn(v,i), labelIndex, tipLabels} */
  function vbar(container, o) {
    container.classList.add('chart');
    return mount(container, (W, T) => {
      const H = o.height || 240, f = o.format || compact, af = o.axisFormat || f, n = o.values.length;
      const max = niceMax(Math.max(...o.values) * 1.04);
      const ticks = [0, 1, 2, 3, 4].map((g) => (max * g) / 4);
      const m = { l: Math.max(...ticks.map((v) => textWidth(af(v), 6.6))) + 14, r: 4, t: 24, b: 30 };
      const iw = W - m.l - m.r, ih = H - m.t - m.b;
      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.label || '' }, container);
      ticks.forEach((v, g) => {
        const yy = Math.round(m.t + ih - (v / max) * ih) + 0.5;
        el('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, stroke: T.get(g === 0 ? '--viz-axis' : '--viz-grid'), 'stroke-width': 1 }, svg);
        label(svg, m.l - 10, yy + 4, af(v), { 'text-anchor': 'end', class: 'tick' });
      });
      const band = iw / n, bw = Math.min(24, band * 0.62);
      const every = band < 30 ? 2 : 1;
      o.values.forEach((v, i) => {
        const h = Math.max(1, (v / max) * ih), xx = m.l + i * band + (band - bw) / 2, yy = m.t + ih - h;
        const c = T.color(o.colorFn ? o.colorFn(v, i) : o.color || '--viz-focus');
        const hit = el('rect', { x: m.l + i * band, y: m.t, width: band, height: ih, fill: 'transparent' }, svg);
        const bar = el('path', { d: barPath(xx, yy, bw, h, 'top'), fill: c, class: 'mark', tabindex: 0, role: 'img', 'aria-label': `${(o.tipLabels || o.labels)[i]}: ${f(v)}` }, svg);
        if ((n - 1 - i) % every === 0) label(svg, xx + bw / 2, H - 8, o.labels[i], { 'text-anchor': 'middle', class: 'tick' });
        if (o.labelIndex === i) label(svg, xx + bw / 2, yy - 8, f(v), { 'text-anchor': 'middle', class: 'val' });
        hover(hit, bar, () => {
          const b = bar.getBoundingClientRect();
          showTip({ title: (o.tipLabels || o.labels)[i], rows: [{ value: f(v), label: o.unit || '' }] }, b.right, b.top);
        });
      });
    });
  }

  /* Sparkline de 12 pontos: linha no cinza de contexto, ponto atual no destaque */
  function spark(container, values) {
    container.classList.add('spark');
    return mount(container, (W, T) => {
      const H = 32, n = values.length, pad = 5;
      const lo = Math.min(...values), hi = Math.max(...values);
      const x = (i) => pad + (i * (W - pad * 2)) / (n - 1);
      const y = (v) => pad + (H - pad * 2) * (1 - (hi === lo ? 0.5 : (v - lo) / (hi - lo)));
      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' }, container);
      el('path', { d: values.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(''), fill: 'none', stroke: T.get('--viz-context'), 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      el('circle', { cx: x(n - 1), cy: y(values[n - 1]), r: 3.5, fill: T.get('--viz-focus'), stroke: T.get('--surface'), 'stroke-width': 2 }, svg);
    });
  }

  /* Cartões de indicador: rótulo, valor, variação com sinal e sparkline */
  function kpis(container, items) {
    container.querySelectorAll('.kpi-spark').forEach((s) => s._ro && s._ro.disconnect());
    container.replaceChildren();
    items.forEach((k) => {
      const d = document.createElement('div');
      d.className = 'kpi';
      d.innerHTML = `<p class="kpi-label"></p><p class="kpi-value"></p><p class="kpi-delta">${k.delta || ''}<span class="kpi-ctx"></span></p>`;
      d.querySelector('.kpi-label').textContent = k.label;
      d.querySelector('.kpi-value').textContent = k.value;
      d.querySelector('.kpi-ctx').textContent = k.ctx || '';
      container.appendChild(d);
      if (k.spark) {
        const s = document.createElement('div');
        s.className = 'kpi-spark';
        d.appendChild(s);
        spark(s, k.spark);
      }
    });
  }

  /* Tabela equivalente ao gráfico, dentro de um <details> */
  function table(target, head, rows) {
    const box = typeof target === 'string' ? document.querySelector(target) : target;
    if (!box) return;
    box.replaceChildren();
    const s = document.createElement('summary');
    s.textContent = t('Ver dados em tabela', 'View data as a table');
    box.appendChild(s);
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    const tb = document.createElement('table');
    tb.className = 'data';
    const hr = tb.createTHead().insertRow();
    head.forEach((h, i) => { const th = document.createElement('th'); th.textContent = h; if (i) th.className = 'r'; hr.appendChild(th); });
    const body = tb.createTBody();
    rows.forEach((r) => { const tr = body.insertRow(); r.forEach((c, i) => { const td = tr.insertCell(); td.textContent = c; if (i) td.className = 'r'; }); });
    wrap.appendChild(tb);
    box.appendChild(wrap);
  }

  /* Gerador determinístico para dados sintéticos reproduzíveis */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  window.Charts = { line, hbar, vbar, spark, kpis, table, fmt, compact, rng, EN, t };
})();
