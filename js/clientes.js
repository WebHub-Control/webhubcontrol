document.addEventListener('DOMContentLoaded', () => {

  const grid = document.getElementById('clientGrid');
  const searchInput = document.getElementById('searchInput');
  let clients = STORE.getAll();

  function updateSidebar() {
    const totals = STORE.totals();
    document.getElementById('clientCountPill').textContent = `${clients.length} cliente${clients.length === 1 ? '' : 's'}`;
    document.getElementById('sidebarSummary').textContent =
      clients.length ? `Você já fechou ${clients.length} cliente${clients.length === 1 ? '' : 's'}, somando ${STORE.formatBRL(totals.totalFechado)}.`
                     : 'Cadastre seu primeiro cliente para ver os números aqui.';
  }

  function render(list) {
    if (!list.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <svg class="icon"><use href="#i-users"/></svg>
          <p>${clients.length ? 'Nenhum cliente encontrado para essa busca.' : 'Nenhum cliente cadastrado ainda.'}</p>
          <a href="cliente.html" class="btn btn-lime"><svg class="icon-sm"><use href="#i-plus"/></svg>Cadastrar cliente</a>
        </div>`;
      return;
    }
    grid.innerHTML = list.map(c => {
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
            <div class="client-card-role">${c.tipoProjeto || '—'} ${c.devResponsavel ? '• ' + c.devResponsavel : ''}${c.origem ? ' • ' + c.origem : ''}</div>
          </div>
          <div class="client-card-value">${STORE.formatBRL(c.valor)}</div>
          <div class="client-card-foot">
            <span class="status-pill ${isDone ? 'st-done' : 'st-dev'}">
              <span class="status-dot ${isDone ? 'st-done' : 'st-dev'}"></span>
              ${isDone ? 'Concluído' : 'Em dev.'}
            </span>
            <span class="field-hint">${c.devPago ? 'Dev pago' : 'Dev a pagar'}</span>
          </div>
        </div>
      </a>`;
    }).join('');
  }

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) { render(clients); return; }
    render(clients.filter(c =>
      (c.empresa || '').toLowerCase().includes(q) ||
      (c.devResponsavel || '').toLowerCase().includes(q) ||
      (c.tipoProjeto || '').toLowerCase().includes(q) ||
      (c.origem || '').toLowerCase().includes(q)
    ));
  });

  clients = [...clients].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  updateSidebar();
  render(clients);
});
