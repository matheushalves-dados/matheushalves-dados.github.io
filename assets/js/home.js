/* Página inicial: prévia do painel, prévia do case 1, cópia do e-mail e destaque da seção no menu. */
(function () {
  const { fmt, t } = Charts;
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  const box = document.getElementById('hero-chart');
  if (box) {
    const btns = document.querySelectorAll('#hero-seg button');
    const render = (id) => {
      const d = ShoppingData.get(id);
      const s = sum(d.cur), p = sum(d.prev);
      document.getElementById('hero-sales').textContent = fmt.brl(s);
      const dl = document.getElementById('hero-delta');
      dl.textContent = fmt.delta(s / p - 1);
      dl.className = s >= p ? 'up' : 'down';
      document.getElementById('hero-occ').textContent = fmt.dec(d.occ[11]) + '%';
      Charts.line(box, {
        labels: d.months, format: fmt.brl, height: 230,
        label: t('Vendas mensais do shopping selecionado nos últimos 12 meses e nos 12 meses anteriores', 'Monthly sales for the selected mall, last 12 months vs prior 12 months'),
        series: [
          { name: t('Últimos 12 meses', 'Last 12 months'), values: d.cur, color: '--viz-focus', area: true },
          { name: t('12 meses anteriores', 'Prior 12 months'), values: d.prev, color: '--viz-context', dashed: true },
        ],
      });
    };
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      render(b.dataset.id);
    }));
    render('atlantico');
  }

  const c1 = document.getElementById('case1-chart');
  if (c1) {
    const d = ShoppingData.get('todos');
    const segs = ShoppingData.segments
      .map((g) => ({ n: g.name, v: sum(d.segAgg[g.name].cur) / sum(d.segAgg[g.name].prev) - 1 }))
      .sort((a, b) => b.v - a.v);
    Charts.hbar(c1, {
      labels: segs.map((s) => s.n), values: segs.map((s) => s.v), format: (v) => fmt.delta(v),
      rowHeight: 32, valueWidth: 56, colorFn: (v) => (v >= 0 ? '--viz-focus' : '--viz-neg'),
      label: t('Variação de vendas por segmento, últimos 12 meses contra os 12 anteriores', 'Sales change by category, last 12 months vs prior 12 months'),
    });
  }

  // copia o e-mail; se o navegador bloquear a área de transferência, seleciona o endereço para Ctrl+C
  document.querySelectorAll('[data-copy]').forEach((b) => {
    const lbl = b.querySelector('span'), orig = lbl.textContent;
    const say = (msg) => { lbl.textContent = msg; setTimeout(() => { lbl.textContent = orig; }, 2400); };
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        say(t('E-mail copiado', 'Email copied'));
      } catch (e) {
        const range = document.createRange();
        range.selectNodeContents(document.querySelector('.mail'));
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(range);
        say(t('Selecionado: use Ctrl+C', 'Selected: press Ctrl+C'));
      }
    });
  });

  const links = [...document.querySelectorAll('.nav a[href^="#"]')];
  const targets = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && targets.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => {
          if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    targets.forEach((tg) => io.observe(tg));
  }
})();
