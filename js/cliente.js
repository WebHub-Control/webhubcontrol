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
  const clientePagoField = document.getElementById('clientePagoField');
  const devPagoField = document.getElementById('devPagoField');
  const splitSectionTitle = document.getElementById('splitSectionTitle');
  const splitRow = document.getElementById('splitRow');
  const splitDevField = document.getElementById('splitDevField');
  const splitBreakdown = document.getElementById('splitBreakdown');
  const splitDevCard = document.getElementById('splitDevCard');
  const financeDevRow = document.getElementById('financeDevRow');
  const submitBtn = document.getElementById('submitBtn');
  const SELF_DEV_NAME = 'ruan';

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
  appendCustomOptions(form.devResponsavel, 'devResponsavel');

  /* "Dev responsável" era texto livre antes de virar lista — se um cliente antigo tem um
     nome que não está (mais) na lista de opções, adiciona ele na hora pra não perder o
     dado nem deixar o campo em branco sem querer. */
  function ensureOptionExists(selectEl, value) {
    if (!value) return;
    const exists = Array.from(selectEl.options).some(o => o.value === value);
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      selectEl.appendChild(opt);
    }
  }

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
          updateFinance();
        });
      });
      row.querySelector('[data-remove]').addEventListener('click', () => {
        parcelas.splice(idx, 1);
        renderParcelas();
        updateFinance();
        updateSubmitLabel();
      });
    });
  }

  function toggleParcelasVisibility() {
    const show = tipoPagamento.value === 'parcelado';
    parcelasTitle.hidden = !show;
    parcelasList.hidden = !show;
    /* Parcelado controla "recebido" pelo check de cada parcela; à vista usa o
       checkbox único "Cliente já pagou". */
    clientePagoField.hidden = show;
  }
  tipoPagamento.addEventListener('change', () => { toggleParcelasVisibility(); updateFinance(); });

  addParcelaBtn.addEventListener('click', () => {
    parcelas.push({ data: '', valor: '', pago: false });
    renderParcelas();
    updateFinance();
    updateSubmitLabel();
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
    form[name].addEventListener('input', () => { updateSplitTotal(); updateFinance(); });
  });

  /* Dinheiro que já entrou/saiu de verdade — separado da divisão combinada acima. */
  function updateFinance() {
    const tempClient = {
      valor: parseFloat(form.valor.value) || 0,
      splitAgencia: parseFloat(form.splitAgencia.value) || 0,
      splitEu: parseFloat(form.splitEu.value) || 0,
      splitDev: parseFloat(form.splitDev.value) || 0,
      tipoPagamento: tipoPagamento.value,
      clientePago: form.clientePago.checked,
      devPago: form.devPago.checked,
      agenciaPaga: form.agenciaPaga.checked,
      parcelas: tipoPagamento.value === 'parcelado' ? parcelas : []
    };
    const f = STORE.financeiro(tempClient);

    document.getElementById('financeRecebido').textContent = STORE.formatBRL(f.recebido);
    document.getElementById('financeRecebidoHint').textContent =
      f.pendenteReceber > 0 ? `Falta receber ${STORE.formatBRL(f.pendenteReceber)}` : 'Total recebido';

    document.getElementById('financeDev').textContent = STORE.formatBRL(f.devRepassado);
    document.getElementById('financeDevHint').textContent =
      f.devPendente > 0 ? `Falta repassar ${STORE.formatBRL(f.devPendente)}` : 'Em dia';

    document.getElementById('financeAgencia').textContent = STORE.formatBRL(f.agenciaRepassada);
    document.getElementById('financeAgenciaHint').textContent =
      f.agenciaPendente > 0 ? `Falta repassar ${STORE.formatBRL(f.agenciaPendente)}` : 'Em dia';

    const saldoEl = document.getElementById('financeSaldo');
    saldoEl.textContent = STORE.formatBRL(f.meuSaldo);
    saldoEl.className = 'finance-row-value' + (f.meuSaldo < 0 ? ' is-negative' : '');
  }
  ['clientePago', 'devPago', 'agenciaPaga'].forEach(name => {
    form[name].addEventListener('change', updateFinance);
  });

  /* Quando o dev responsável é você mesmo (Ruan), não faz sentido ter uma cota de "dev"
     separada — some com aquele campo/checkbox/card e a divisão vira só agência + você.
     Qualquer % que já estivesse em "Dev" é somada em "Eu" pra não sumir dinheiro. */
  function isSelfDev() {
    return form.devResponsavel.value.trim().toLowerCase() === SELF_DEV_NAME;
  }
  function applyDevMode() {
    const self = isSelfDev();
    devPagoField.hidden = self;
    splitDevField.hidden = self;
    splitDevCard.hidden = self;
    financeDevRow.hidden = self;
    splitRow.classList.toggle('is-2col', self);
    splitBreakdown.classList.toggle('is-2col', self);
    splitSectionTitle.textContent = self
      ? 'Divisão do valor entre agência e você'
      : 'Divisão do valor entre agência, você e o dev';

    if (self) {
      const dev = parseFloat(form.splitDev.value) || 0;
      if (dev > 0) {
        form.splitEu.value = (parseFloat(form.splitEu.value) || 0) + dev;
        form.splitDev.value = 0;
      }
    }
    updateSplitTotal();
    updateFinance();
  }
  form.devResponsavel.addEventListener('change', applyDevMode);

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
      ensureOptionExists(form.devResponsavel, existing.devResponsavel);
      form.devResponsavel.value = existing.devResponsavel || '';
      form.devPago.checked = !!existing.devPago;
      form.clientePago.checked = !!existing.clientePago;
      form.agenciaPaga.checked = !!existing.agenciaPaga;
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
  applyDevMode();

  /* Botão diz "Salvar cliente" pra um cadastro novo, e "Salvar alterações" quando é edição
     e algo no formulário já mudou desde que a página carregou (comparando com o estado
     original do cliente). */
  function snapshotForm() {
    return JSON.stringify({
      empresa: form.empresa.value, valor: form.valor.value, tipoProjeto: form.tipoProjeto.value,
      origem: form.origem.value, devResponsavel: form.devResponsavel.value,
      devPago: form.devPago.checked, clientePago: form.clientePago.checked, agenciaPaga: form.agenciaPaga.checked,
      tipoPagamento: form.tipoPagamento.value, dataInicio: form.dataInicio.value, prazoFinal: form.prazoFinal.value,
      status: form.status.value, splitAgencia: form.splitAgencia.value, splitEu: form.splitEu.value,
      splitDev: form.splitDev.value, parcelas
    });
  }
  const initialSnapshot = isEdit ? snapshotForm() : null;
  function updateSubmitLabel() {
    const changed = isEdit && snapshotForm() !== initialSnapshot;
    submitBtn.textContent = changed ? 'Salvar alterações' : 'Salvar cliente';
  }
  form.addEventListener('input', updateSubmitLabel);
  form.addEventListener('change', updateSubmitLabel);
  updateSubmitLabel();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const a = parseFloat(form.splitAgencia.value) || 0;
    const eu = parseFloat(form.splitEu.value) || 0;
    const d = parseFloat(form.splitDev.value) || 0;
    if (a + eu + d !== 100) {
      msgEl.textContent = isSelfDev()
        ? 'A soma das porcentagens (agência + eu) precisa dar exatamente 100%.'
        : 'A soma das porcentagens (agência + eu + dev) precisa dar exatamente 100%.';
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
      clientePago: form.clientePago.checked,
      agenciaPaga: form.agenciaPaga.checked,
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
