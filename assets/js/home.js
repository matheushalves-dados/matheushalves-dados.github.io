/* Página inicial: prévia do painel, prévia do case 1, cópia do e-mail e destaque da seção no menu. */
(function () {
  const { fmt } = Charts;
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
        label: 'Vendas mensais do shopping selecionado nos últimos 12 meses e nos 12 meses anteriores',
        series: [
          { name: 'Últimos 12 meses', values: d.cur, color: '--viz-focus', area: true },
          { name: '12 meses anteriores', values: d.prev, color: '--viz-context', dashed: true },
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
      label: 'Variação de vendas por segmento, últimos 12 meses contra os 12 anteriores',
    });
  }

  // copia o e-mail; se o navegador bloquear a área de transferência, seleciona o endereço para Ctrl+C
  document.querySelectorAll('[data-copy]').forEach((b) => {
    const lbl = b.querySelector('span'), orig = lbl.textContent;
    const say = (t) => { lbl.textContent = t; setTimeout(() => { lbl.textContent = orig; }, 2400); };
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        say('E-mail copiado');
      } catch (e) {
        const mail = document.querySelector('.mail');
        const range = document.createRange();
        range.selectNodeContents(mail);
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(range);
        say('Selecionado: use Ctrl+C');
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
    targets.forEach((t) => io.observe(t));
  }
})();
