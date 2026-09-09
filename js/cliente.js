document.addEventListener('DOMContentLoaded', () => {

  const params = new URLSearchParams(window.location.search);
  const editingId = params.get('id');
  const isEdit = !!editingId;

  const form = document.getElementById('clientForm');
  const msgEl = document.getElementById('formMsg');
  const deleteBtn = document.getElementById('deleteBtn');
  const tipoPagamento = document.getElementById('tipoPagamento');
  const parcelasTitle = document.getElementById('parcelasTitle');
  const parcelasList = document.getElementById('parcelasList');
  const addParcelaBtn = document.getElementById('addParcela');
  const splitTotalEl = document.getElementById('splitTotal');

  const toast = document.getElementById('toast');
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  };

  function updateSidebar() {
    const clients = STORE.getAll();
    const totals = STORE.totals();
    document.getElementById('clientCountPill').textContent = `${clients.length} cliente${clients.length === 1 ? '' : 's'}`;
    document.getElementById('sidebarSummary').textContent =
      clients.length ? `Você já fechou ${clients.length} cliente${clients.length === 1 ? '' : 's'}, somando ${STORE.formatBRL(totals.totalFechado)}.`
                     : 'Cadastre seu primeiro cliente para ver os números aqui.';
  }
  updateSidebar();

  /* Opções adicionadas pelo menu Configurações entram depois das opções de fábrica. */
  function appendCustomOptions(selectEl, field) {
    STORE.getCustomOptions(field).forEach((value) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      selectEl.appendChild(opt);
    });
  }
  appendCustomOptions(form.tipoProjeto, 'tipoProjeto');
  appendCustomOptions(form.origem, 'origem');

  let parcelas = [];

  function renderParcelas() {
    if (!parcelas.length) {
      parcelasList.innerHTML = '<p class="field-hint">Nenhuma parcela cadastrada ainda.</p>';
      return;
    }
    parcelasList.innerHTML = parcelas.map((p, i) => `
      <div class="parcela-row" data-index="${i}">
        <input type="date" data-field="data" value="${p.data || ''}" aria-label="Data da parcela">
        <input type="number" min="0" step="0.01" data-field="valor" value="${p.valor || ''}" placeholder="Valor (R$)" aria-label="Valor da parcela">
        <label class="checkbox-field"><input type="checkbox" data-field="pago" ${p.pago ? 'checked' : ''}><span>Pago</span></label>
        <button type="button" class="icon-remove" data-remove aria-label="Remover parcela"><svg class="icon-sm"><use href="#i-trash"/></svg></button>
      </div>`).join('');

    parcelasList.querySelectorAll('.parcela-row').forEach(row => {
      const idx = parseInt(row.dataset.index, 10);
      row.querySelectorAll('[data-field]').forEach(input => {
        const field = input.dataset.field;
        const eventName = input.type === 'checkbox' ? 'change' : 'input';
        input.addEventListener(eventName, () => {
          parcelas[idx][field] = input.type === 'checkbox' ? input.checked : input.value;
        });
      });
      row.querySelector('[data-remove]').addEventListener('click', () => {
        parcelas.splice(idx, 1);
        renderParcelas();
      });
    });
  }

  function toggleParcelasVisibility() {
    const show = tipoPagamento.value === 'parcelado';
    parcelasTitle.hidden = !show;
    parcelasList.hidden = !show;
  }
  tipoPagamento.addEventListener('change', toggleParcelasVisibility);

  addParcelaBtn.addEventListener('click', () => {
    parcelas.push({ data: '', valor: '', pago: false });
    renderParcelas();
  });

  function updateSplitTotal() {
    const a = parseFloat(form.splitAgencia.value) || 0;
    const e = parseFloat(form.splitEu.value) || 0;
    const d = parseFloat(form.splitDev.value) || 0;
    const soma = a + e + d;
    const valor = parseFloat(form.valor.value) || 0;
    const parts = STORE.splitValues({ valor, splitAgencia: a, splitEu: e, splitDev: d });

    document.getElementById('splitAgenciaValue').textContent = STORE.formatBRL(parts.agencia);
    document.getElementById('splitEuValue').textContent = STORE.formatBRL(parts.eu);
    document.getElementById('splitDevValue').textContent = STORE.formatBRL(parts.dev);
    document.getElementById('splitAgenciaPct').textContent = `${a}%`;
    document.getElementById('splitEuPct').textContent = `${e}%`;
    document.getElementById('splitDevPct').textContent = `${d}%`;

    splitTotalEl.textContent = `Soma das porcentagens: ${soma}%`;
    splitTotalEl.className = 'split-total ' + (soma === 100 ? 'is-ok' : 'is-bad');
  }
  ['splitAgencia', 'splitEu', 'splitDev', 'valor'].forEach(name => {
    form[name].addEventListener('input', updateSplitTotal);
  });

  /* ===== Modo edição: carrega os dados do cliente ===== */
  let currentClient = STORE.blankClient();
  if (isEdit) {
    const existing = STORE.getById(editingId);
    if (!existing) {
      msgEl.textContent = 'Cliente não encontrado.';
      msgEl.style.color = '#ef5b5b';
    } else {
      currentClient = existing;
      document.getElementById('pageTitle').textContent = `Editar ${existing.empresa} | Controle WebHub`;
      document.getElementById('formTitle').textContent = existing.empresa || 'Editar cliente';
      form.empresa.value = existing.empresa || '';
      form.valor.value = existing.valor || '';
      form.tipoProjeto.value = existing.tipoProjeto || '';
      form.origem.value = existing.origem || '';
      form.devResponsavel.value = existing.devResponsavel || '';
      form.devPago.checked = !!existing.devPago;
      form.tipoPagamento.value = existing.tipoPagamento || 'avista';
      form.dataInicio.value = existing.dataInicio || '';
      form.prazoFinal.value = existing.prazoFinal || '';
      form.status.value = existing.status || 'desenvolvimento';
      form.splitAgencia.value = existing.splitAgencia ?? 20;
      form.splitEu.value = existing.splitEu ?? 40;
      form.splitDev.value = existing.splitDev ?? 40;
      parcelas = (existing.parcelas || []).map(p => ({ ...p }));
      deleteBtn.hidden = false;
    }
  }
  renderParcelas();
  toggleParcelasVisibility();
  updateSplitTotal();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const a = parseFloat(form.splitAgencia.value) || 0;
    const eu = parseFloat(form.splitEu.value) || 0;
    const d = parseFloat(form.splitDev.value) || 0;
    if (a + eu + d !== 100) {
      msgEl.textContent = 'A soma das porcentagens (agência + eu + dev) precisa dar exatamente 100%.';
      msgEl.style.color = '#ef5b5b';
      splitTotalEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const client = {
      ...currentClient,
      empresa: form.empresa.value.trim(),
      valor: parseFloat(form.valor.value) || 0,
      tipoProjeto: form.tipoProjeto.value.trim(),
      origem: form.origem.value,
      devResponsavel: form.devResponsavel.value.trim(),
      devPago: form.devPago.checked,
      tipoPagamento: form.tipoPagamento.value,
      dataInicio: form.dataInicio.value,
      prazoFinal: form.prazoFinal.value,
      status: form.status.value,
      splitAgencia: a,
      splitEu: eu,
      splitDev: d,
      parcelas: form.tipoPagamento.value === 'parcelado' ? parcelas.filter(p => p.data || p.valor) : []
    };

    STORE.upsert(client);
    showToast('Cliente salvo com sucesso!');
    setTimeout(() => { window.location.href = `cliente.html?id=${client.id}`; }, 500);
  });

  deleteBtn.addEventListener('click', () => {
    if (!confirm(`Excluir "${currentClient.empresa}"? Essa ação não pode ser desfeita.`)) return;
    STORE.remove(currentClient.id);
    window.location.href = 'clientes.html';
  });
});
