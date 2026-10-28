# Portfólio · Matheus Alves

Portfólio de análise de dados e engenharia de analytics, com cases escritos, painéis interativos e currículo para impressão.

**Site:** https://matheushalves-dados.github.io/

## Cases

| Case | O que mostra |
|---|---|
| [Painel de performance de shopping centers](projetos/shopping-performance.html) | KPIs do setor (venda/m², ocupação, inadimplência, custo de ocupação), filtro por shopping, sparklines e alerta de lojistas em risco |
| [Funil de conversão de um produto digital](projetos/funil-conversao.html) | Funil GA4 → BigQuery → dbt, recortes por canal e dispositivo, priorização de páginas |
| [Modernização da plataforma de dados](projetos/migracao-dados.html) | Migração de SSIS para GCP, dbt e Databricks: arquitetura, decisões, plano e métricas de sucesso |

Os painéis usam **dados sintéticos**, gerados de forma determinística no navegador. Nenhum dado de empresa foi usado.

## Como é feito

- HTML, CSS e JavaScript puros, sem build e sem dependências.
- Gráficos em SVG desenhados por uma biblioteca própria (`assets/js/charts.js`): tooltip, navegação por teclado e tabela equivalente em cada gráfico.
- Paleta dos gráficos validada para daltonismo e contraste nas seções claras e escuras.
- Responsivo do celular ao desktop, com currículo pronto para salvar em PDF (`cv.html`).
- Metadados para LinkedIn e buscadores: Open Graph, imagem de prévia, dados estruturados, sitemap.

## Estrutura

```
index.html                    página inicial
projetos/                     um arquivo por case
cv.html                       currículo (botão "Salvar em PDF")
404.html                      página de erro do GitHub Pages
assets/css/style.css          estilos e tokens de cor
assets/js/charts.js           gráficos em SVG, indicadores e tabelas
assets/js/data-shopping.js    dados sintéticos de shopping centers
assets/js/dash-shopping.js    lógica do painel de shopping
assets/js/dash-funil.js       dados e lógica do painel de funil
assets/js/home.js             prévias interativas da página inicial
assets/img/og.png             imagem de prévia para LinkedIn (1200×630)
robots.txt, sitemap.xml       indexação
```

## Publicar

Envie o conteúdo desta pasta para o repositório `matheushalves-dados.github.io` e ative o GitHub Pages em **Settings → Pages → Deploy from a branch → main / (root)**.

## Contato

matheus.alves.dados@gmail.com · [LinkedIn](https://www.linkedin.com/in/matheushalves/)
