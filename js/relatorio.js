document.addEventListener('DOMContentLoaded', () => {

  const periodInput = document.getElementById('periodInput');
  const statsEl = document.getElementById('reportStats');
  const tbody = document.getElementById('reportTableBody');

  const now = new Date();
  periodInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  function updateSidebar() {
    const clients = STORE.getAll();
    const totals = STORE.totals();
    document.getElementById('clientCountPill').textContent = `${clients.length} cliente${clients.length === 1 ? '' : 's'}`;
    document.getElementById('sidebarSummary').textContent =
      clients.length ? `Você já fechou ${clients.length} cliente${clients.length === 1 ? '' : 's'}, somando ${STORE.formatBRL(totals.totalFechado)}.`
                     : 'Cadastre seu primeiro cliente para ver os números aqui.';
  }
  updateSidebar();

  function monthLabel(period) {
    const [y, m] = period.split('-').map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function getMonthClients(period) {
    return STORE.getAll().filter(c => (c.dataInicio || c.createdAt || '').slice(0, 7) === period);
  }

  function computeSummary(clients) {
    const acc = { totalFechado: 0, totalDev: 0, totalAgencia: 0, totalEu: 0, count: clients.length };
    clients.forEach(c => {
      const s = STORE.splitValues(c);
      acc.totalFechado += parseFloat(c.valor) || 0;
      acc.totalDev += s.dev;
      acc.totalAgencia += s.agencia;
      acc.totalEu += s.eu;
    });
    return acc;
  }

  function statusLabel(c) { return c.status === 'concluido' ? 'Concluído' : 'Em desenvolvimento'; }

  function render() {
    const period = periodInput.value;
    if (!period) return;
    const clients = getMonthClients(period);
    const s = computeSummary(clients);

    statsEl.innerHTML = `
      <div class="stat-card is-accent">
        <div class="stat-icon"><svg class="icon"><use href="#i-cash"/></svg></div>
        <div>
          <div class="stat-value">${STORE.formatBRL(s.totalFechado)}</div>
          <div class="stat-label">Vendido no período (entradas)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg class="icon"><use href="#i-report"/></svg></div>
        <div>
          <div class="stat-value">${STORE.formatBRL(s.totalDev + s.totalAgencia)}</div>
          <div class="stat-label">Total repassado (saídas)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg class="icon"><use href="#i-cash"/></svg></div>
        <div>
          <div class="stat-value">${STORE.formatBRL(s.totalEu)}</div>
          <div class="stat-label">Saldo final (sobra)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg class="icon"><use href="#i-users"/></svg></div>
        <div>
          <div class="stat-value">${s.count}</div>
          <div class="stat-label">Clientes fechados</div>
        </div>
      </div>
    `;

    if (!clients.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="report-empty">Nenhum cliente fechado em ${monthLabel(period)}.</td></tr>`;
    } else {
      tbody.innerHTML = clients.map(c => `
        <tr>
          <td>${c.empresa || 'Sem nome'}</td>
          <td>${c.tipoProjeto || '—'}</td>
          <td>${STORE.formatBRL(c.valor)}</td>
          <td>${statusLabel(c)}</td>
        </tr>`).join('');
    }
  }

  periodInput.addEventListener('change', render);
  render();

  document.getElementById('downloadPdfBtn').addEventListener('click', () => {
    const period = periodInput.value;
    const clients = getMonthClients(period);
    const s = computeSummary(clients);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let y = 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text('Relatório Mensal — Controle WebHub', 14, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(110);
    doc.text(`Período: ${monthLabel(period)}`, 14, y);
    y += 12;

    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Resumo financeiro', 14, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    [
      `Clientes fechados: ${s.count}`,
      `Valor total vendido (entradas): ${STORE.formatBRL(s.totalFechado)}`,
      `Repassado para devs (saída): ${STORE.formatBRL(s.totalDev)}`,
      `Repassado para a agência (saída): ${STORE.formatBRL(s.totalAgencia)}`,
      `Saldo final (sobra): ${STORE.formatBRL(s.totalEu)}`
    ].forEach(line => { doc.text(line, 14, y); y += 7; });
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Clientes do período', 14, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    if (!clients.length) {
      doc.text('Nenhum cliente fechado nesse período.', 14, y);
      y += 7;
    } else {
      clients.forEach((c, i) => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(`${i + 1}. ${c.empresa || 'Sem nome'} — ${STORE.formatBRL(c.valor)} — ${statusLabel(c)}${c.origem ? ' — via ' + c.origem : ''}`, 14, y);
        y += 7;
      });
    }

    doc.save(`relatorio-${period}.pdf`);
  });
});
