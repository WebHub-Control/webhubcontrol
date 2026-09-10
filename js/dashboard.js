document.addEventListener('DOMContentLoaded', () => {

  const clients = STORE.getAll();
  const totals = STORE.totals();

  document.getElementById('clientCountPill').textContent = `${clients.length} cliente${clients.length === 1 ? '' : 's'}`;
  document.getElementById('statTotalFechado').textContent = STORE.formatBRL(totals.totalFechado);

  /* Os 3 cards abaixo mostram dinheiro que já entrou/saiu de verdade (não o combinado
     "no papel") — por isso usam os totais "reais" do STORE, com uma linha pequena
     avisando quanto ainda falta receber/repassar. */
  document.getElementById('statTotalRecebido').textContent = STORE.formatBRL(totals.totalRecebido);
  document.getElementById('statRecebidoSub').textContent =
    totals.totalPendenteReceber > 0 ? `${STORE.formatBRL(totals.totalPendenteReceber)} a receber` : 'Tudo recebido';

  document.getElementById('statTotalDev').textContent = STORE.formatBRL(totals.totalDevRepassado);
  document.getElementById('statDevSub').textContent =
    totals.totalDevPendente > 0 ? `${STORE.formatBRL(totals.totalDevPendente)} pendente` : 'Tudo em dia';

  document.getElementById('statTotalAgencia').textContent = STORE.formatBRL(totals.totalAgenciaRepassada);
  document.getElementById('statAgenciaSub').textContent =
    totals.totalAgenciaPendente > 0 ? `${STORE.formatBRL(totals.totalAgenciaPendente)} pendente` : 'Tudo em dia';

  document.getElementById('statTotalEu').textContent = STORE.formatBRL(totals.totalMeuSaldo);
  document.getElementById('sidebarSummary').textContent =
    clients.length ? `Você já fechou ${clients.length} cliente${clients.length === 1 ? '' : 's'}, somando ${STORE.formatBRL(totals.totalFechado)}.`
                   : 'Cadastre seu primeiro cliente para ver os números aqui.';

  /* ===== Meses fechados por mês (baseado na data de início, com "mês-mm" tipo 2026-03) ===== */
  function monthKeyOf(c) { return (c.dataInicio || c.createdAt || '').slice(0, 7); }

  function monthTotalsFor(keys) {
    return keys.map(key => clients
      .filter(c => monthKeyOf(c) === key)
      .reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0));
  }

  function labelFor(key, withYear) {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const base = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return withYear ? `${base}/${String(y).slice(2)}` : base;
  }

  /* Últimos 6 meses (visão rápida do dashboard) */
  const now = new Date();
  const recentKeys = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    recentKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const recentLabels = recentKeys.map(k => labelFor(k, false));
  const recentTotals = monthTotalsFor(recentKeys);

  /* Todo o histórico com dados — do primeiro cliente cadastrado até o mês atual, sem perder
     nada quando o ano vira (o rótulo mostra o ano nesse caso, pra não confundir meses repetidos). */
  function getFullHistoryKeys() {
    const keys = clients.map(monthKeyOf).filter(Boolean);
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    keys.push(nowKey);
    keys.sort();
    const [minY, minM] = keys[0].split('-').map(Number);
    const [maxY, maxM] = keys[keys.length - 1].split('-').map(Number);
    const all = [];
    let y = minY, m = minM;
    while (y < maxY || (y === maxY && m <= maxM)) {
      all.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return all;
  }

  if (typeof Chart !== 'undefined') {
    new Chart(document.getElementById('monthlyChart'), {
      type: 'bar',
      data: {
        labels: recentLabels,
        datasets: [{
          data: recentTotals,
          backgroundColor: '#d7fb3d',
          borderRadius: 8,
          maxBarThickness: 42
        }]
      },
      options: {
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => STORE.formatBRL(ctx.parsed.y) } } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v) => 'R$ ' + v }, grid: { color: '#eef0f3' } },
          x: { grid: { display: false } }
        },
        maintainAspectRatio: false
      }
    });

    /* ===== Modal com o histórico completo (todos os meses com dados, ano incluso) ===== */
    const chartModalOverlay = document.getElementById('chartModalOverlay');
    let expandedChart = null;

    function openChartModal() {
      const keys = getFullHistoryKeys();
      const labels = keys.map(k => labelFor(k, true));
      const values = monthTotalsFor(keys);

      if (expandedChart) expandedChart.destroy();
      chartModalOverlay.classList.add('open');
      expandedChart = new Chart(document.getElementById('monthlyChartExpanded'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{ data: values, backgroundColor: '#d7fb3d', borderRadius: 8, maxBarThickness: 42 }]
        },
        options: {
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => STORE.formatBRL(ctx.parsed.y) } } },
          scales: {
            y: { beginAtZero: true, ticks: { callback: (v) => 'R$ ' + v }, grid: { color: '#eef0f3' } },
            x: { grid: { display: false } }
          },
          maintainAspectRatio: false
        }
      });
    }
    function closeChartModal() { chartModalOverlay.classList.remove('open'); }

    document.getElementById('expandChartBtn').addEventListener('click', openChartModal);
    document.getElementById('monthlyChartWrap').addEventListener('click', openChartModal);
    document.getElementById('chartModalClose').addEventListener('click', closeChartModal);
    chartModalOverlay.addEventListener('click', (e) => { if (e.target === chartModalOverlay) closeChartModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeChartModal(); });

    /* ===== Donut: divisão agência / eu / devs ===== */
    const splitData = [totals.totalAgencia, totals.totalEu, totals.totalDev];
    const splitColors = ['#5b8def', '#15161a', '#d7fb3d'];
    new Chart(document.getElementById('splitChart'), {
      type: 'doughnut',
      data: { labels: ['Agência', 'Eu', 'Devs'], datasets: [{ data: splitData, backgroundColor: splitColors, borderWidth: 0 }] },
      options: { cutout: '72%', plugins: { legend: { display: false } }, maintainAspectRatio: false }
    });
  }

  document.getElementById('donutTotal').textContent = STORE.formatBRL(totals.totalFechado).replace(',00', '');
  document.getElementById('splitLegend').innerHTML = `
    <div class="legend-item"><span class="legend-dot" style="background:#5b8def"></span>Agência<strong>${STORE.formatBRL(totals.totalAgencia)}</strong></div>
    <div class="legend-item"><span class="legend-dot" style="background:#15161a"></span>Eu<strong>${STORE.formatBRL(totals.totalEu)}</strong></div>
    <div class="legend-item"><span class="legend-dot" style="background:#d7fb3d"></span>Devs<strong>${STORE.formatBRL(totals.totalDev)}</strong></div>
  `;

  /* ===== Status dos projetos (em desenvolvimento x concluído) ===== */
  const emDesenvolvimento = clients.filter(c => c.status === 'desenvolvimento').length;
  const concluidos = clients.filter(c => c.status === 'concluido').length;
  const total = clients.length || 1;
  document.getElementById('statusBreakdown').innerHTML = `
    <div class="target-row">
      <div class="target-icon"><svg class="icon-sm"><use href="#i-chart"/></svg></div>
      <div class="target-info">
        <div class="target-top"><span>Em desenvolvimento</span><strong>${emDesenvolvimento}</strong></div>
        <div class="target-track"><div class="target-fill" style="width:${(emDesenvolvimento / total) * 100}%;background:#f5a623"></div></div>
      </div>
    </div>
    <div class="target-row">
      <div class="target-icon"><svg class="icon-sm"><use href="#i-chart"/></svg></div>
      <div class="target-info">
        <div class="target-top"><span>Concluídos</span><strong>${concluidos}</strong></div>
        <div class="target-track"><div class="target-fill" style="width:${(concluidos / total) * 100}%;background:#2fbf6a"></div></div>
      </div>
    </div>
  `;

  /* ===== Clientes recentes ===== */
  const recent = [...clients].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 4);
  const grid = document.getElementById('recentClients');
  if (!recent.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg class="icon"><use href="#i-users"/></svg>
        <p>Nenhum cliente cadastrado ainda.</p>
        <a href="cliente.html" class="btn btn-lime"><svg class="icon-sm"><use href="#i-plus"/></svg>Cadastrar cliente</a>
      </div>`;
  } else {
    grid.innerHTML = recent.map(c => {
      const isDone = c.status === 'concluido';
      return `
      <a class="client-card" href="cliente.html?id=${c.id}">
        <div class="client-card-avatar-wrap">
          <div class="client-avatar">${STORE.initials(c.empresa)}</div>
          <span class="client-card-arrow"><svg><use href="#i-arrow-up-right"/></svg></span>
        </div>
        <div class="client-card-body">
          <div>
            <div class="client-card-name">${c.empresa || 'Sem nome'}</div>
            <div class="client-card-role">${c.tipoProjeto || '—'}</div>
          </div>
          <div class="client-card-value">${STORE.formatBRL(c.valor)}</div>
          <div class="client-card-foot">
            <span class="status-pill ${isDone ? 'st-done' : 'st-dev'}">
              <span class="status-dot ${isDone ? 'st-done' : 'st-dev'}"></span>
              ${isDone ? 'Concluído' : 'Em dev.'}
            </span>
          </div>
        </div>
      </a>`;
    }).join('');
  }

  /* ===== Modal de detalhamento (clique nos cards de total/devs/agência) ===== */
  const modalOverlay = document.getElementById('detailModalOverlay');
  const modalTitle = document.getElementById('detailModalTitle');
  const modalBody = document.getElementById('detailModalBody');

  function openModal(title, bodyHTML) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHTML;
    modalOverlay.classList.add('open');
  }
  function closeModal() { modalOverlay.classList.remove('open'); }
  document.getElementById('detailModalClose').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  function statusLabel(c) { return c.status === 'concluido' ? 'Concluído' : 'Em desenvolvimento'; }
  const emptyMsg = '<p class="report-empty">Nenhum cliente cadastrado ainda.</p>';

  document.getElementById('statCardFechado').addEventListener('click', () => {
    if (!clients.length) { openModal('Projetos fechados', emptyMsg); return; }
    const rows = clients.map(c => `
      <div class="modal-row">
        <div class="modal-row-info"><strong>${c.empresa || 'Sem nome'}</strong><span>${c.tipoProjeto || '—'} • ${statusLabel(c)}</span></div>
        <div class="modal-row-value">${STORE.formatBRL(c.valor)}</div>
      </div>`).join('');
    openModal('Projetos fechados', `
      <div class="modal-group">${rows}</div>
      <div class="modal-total-row"><span>Total</span><span>${STORE.formatBRL(totals.totalFechado)}</span></div>`);
  });

  document.getElementById('statCardRecebido').addEventListener('click', () => {
    if (!clients.length) { openModal('Recebido dos clientes', emptyMsg); return; }
    const rows = clients.map(c => {
      const f = STORE.financeiro(c);
      const situacao = f.pendenteReceber <= 0 ? 'Total recebido' : (f.recebido > 0 ? 'Recebido parcial' : 'Nada recebido ainda');
      return `
        <div class="modal-row">
          <div class="modal-row-info"><strong>${c.empresa || 'Sem nome'}</strong><span>${situacao} • total ${STORE.formatBRL(f.valorTotal)}</span></div>
          <div class="modal-row-value">${STORE.formatBRL(f.recebido)}</div>
        </div>`;
    }).join('');
    openModal('Recebido dos clientes', `
      <div class="modal-group">${rows}</div>
      <div class="modal-total-row"><span>Total recebido</span><span>${STORE.formatBRL(totals.totalRecebido)}</span></div>
      ${totals.totalPendenteReceber > 0 ? `<div class="modal-total-row"><span>Ainda falta receber</span><span>${STORE.formatBRL(totals.totalPendenteReceber)}</span></div>` : ''}`);
  });

  document.getElementById('statCardDev').addEventListener('click', () => {
    if (!clients.length) { openModal('Repassado para devs', emptyMsg); return; }
    const byDev = {};
    clients.forEach(c => {
      const name = c.devResponsavel && c.devResponsavel.trim() ? c.devResponsavel.trim() : 'Sem dev definido';
      const f = STORE.financeiro(c);
      if (!byDev[name]) byDev[name] = { repassado: 0, pendente: 0, clients: [] };
      byDev[name].repassado += f.devRepassado;
      byDev[name].pendente += f.devPendente;
      byDev[name].clients.push({ c, f });
    });
    const groupsHTML = Object.keys(byDev)
      .sort((a, b) => byDev[b].repassado - byDev[a].repassado)
      .map(name => {
        const g = byDev[name];
        const rows = g.clients.map(({ c, f }) => `
          <div class="modal-row">
            <div class="modal-row-info"><strong>${c.empresa || 'Sem nome'}</strong><span>${c.devPago ? 'Pago' : 'A pagar'} • cota ${STORE.formatBRL(f.devValor)}</span></div>
            <div class="modal-row-value">${STORE.formatBRL(f.devRepassado)}</div>
          </div>`).join('');
        return `<div class="modal-group"><div class="modal-group-title">${name} — ${STORE.formatBRL(g.repassado)}${g.pendente > 0 ? ` (${STORE.formatBRL(g.pendente)} pendente)` : ''}</div>${rows}</div>`;
      }).join('');
    openModal('Repassado para devs', groupsHTML + `<div class="modal-total-row"><span>Total repassado</span><span>${STORE.formatBRL(totals.totalDevRepassado)}</span></div>
      ${totals.totalDevPendente > 0 ? `<div class="modal-total-row"><span>Pendente</span><span>${STORE.formatBRL(totals.totalDevPendente)}</span></div>` : ''}`);
  });

  document.getElementById('statCardAgencia').addEventListener('click', () => {
    if (!clients.length) { openModal('Repassado para a agência', emptyMsg); return; }
    const rows = clients.map(c => {
      const f = STORE.financeiro(c);
      return `
        <div class="modal-row">
          <div class="modal-row-info"><strong>${c.empresa || 'Sem nome'}</strong><span>${c.agenciaPaga ? 'Pago' : 'A pagar'} • ${c.splitAgencia}% de ${STORE.formatBRL(c.valor)}</span></div>
          <div class="modal-row-value">${STORE.formatBRL(f.agenciaRepassada)}</div>
        </div>`;
    }).join('');
    openModal('Repassado para a agência', `
      <div class="modal-group">${rows}</div>
      <div class="modal-total-row"><span>Total repassado</span><span>${STORE.formatBRL(totals.totalAgenciaRepassada)}</span></div>
      ${totals.totalAgenciaPendente > 0 ? `<div class="modal-total-row"><span>Pendente</span><span>${STORE.formatBRL(totals.totalAgenciaPendente)}</span></div>` : ''}`);
  });

  document.getElementById('statCardSaldo').addEventListener('click', () => {
    if (!clients.length) { openModal('Lucro líquido (saldo real)', emptyMsg); return; }
    const rows = clients.map(c => {
      const f = STORE.financeiro(c);
      return `
        <div class="modal-row">
          <div class="modal-row-info"><strong>${c.empresa || 'Sem nome'}</strong><span>Recebido ${STORE.formatBRL(f.recebido)} − dev ${STORE.formatBRL(f.devRepassado)} − agência ${STORE.formatBRL(f.agenciaRepassada)}</span></div>
          <div class="modal-row-value">${STORE.formatBRL(f.meuSaldo)}</div>
        </div>`;
    }).join('');
    openModal('Lucro líquido (saldo real)', `
      <div class="modal-group">${rows}</div>
      <div class="modal-total-row"><span>Saldo total</span><span>${STORE.formatBRL(totals.totalMeuSaldo)}</span></div>`);
  });
});
