document.addEventListener('DOMContentLoaded', () => {

  function updateSidebar() {
    const clients = STORE.getAll();
    const totals = STORE.totals();
    document.getElementById('clientCountPill').textContent = `${clients.length} cliente${clients.length === 1 ? '' : 's'}`;
    document.getElementById('sidebarSummary').textContent =
      clients.length ? `Você já fechou ${clients.length} cliente${clients.length === 1 ? '' : 's'}, somando ${STORE.formatBRL(totals.totalFechado)}.`
                     : 'Cadastre seu primeiro cliente para ver os números aqui.';
  }
  updateSidebar();

  /* ===== Modo escuro ===== */
  const darkToggle = document.getElementById('darkModeToggle');
  darkToggle.checked = THEME.get() === 'dark';
  darkToggle.addEventListener('change', () => {
    THEME.set(darkToggle.checked ? 'dark' : 'light');
  });

  /* ===== Trocar senha ===== */
  const form = document.getElementById('passwordForm');
  const msgEl = document.getElementById('passwordMsg');

  /* Mostrar/ocultar senha */
  document.querySelectorAll('.password-toggle').forEach((btn) => {
    const input = document.getElementById(btn.dataset.target);
    const icon = btn.querySelector('use');
    btn.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      icon.setAttribute('href', showing ? '#i-eye' : '#i-eye-off');
      btn.setAttribute('aria-label', showing ? 'Mostrar senha' : 'Ocultar senha');
    });
  });

  /* Confirma em tempo real se as duas senhas digitadas são iguais */
  const matchHint = document.getElementById('passwordMatchHint');
  function checkMatch() {
    const confirmValue = form.confirmPassword.value;
    if (!confirmValue) { matchHint.textContent = ''; matchHint.className = 'field-match-hint'; return; }
    const ok = form.newPassword.value === confirmValue;
    matchHint.textContent = ok ? '✓ As senhas coincidem' : '✕ As senhas não coincidem';
    matchHint.className = 'field-match-hint ' + (ok ? 'is-ok' : 'is-bad');
  }
  form.newPassword.addEventListener('input', checkMatch);
  form.confirmPassword.addEventListener('input', checkMatch);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgEl.textContent = '';

    if (form.newPassword.value !== form.confirmPassword.value) {
      msgEl.textContent = 'As senhas não coincidem.';
      msgEl.style.color = '#ef5b5b';
      return;
    }

    await AUTH.changePassword(form.newPassword.value);
    msgEl.textContent = 'Senha atualizada com sucesso!';
    msgEl.style.color = '#1e8a4c';
    form.reset();
    document.querySelectorAll('.password-toggle').forEach((btn) => {
      document.getElementById(btn.dataset.target).type = 'password';
      btn.querySelector('use').setAttribute('href', '#i-eye');
      btn.setAttribute('aria-label', 'Mostrar senha');
    });
    checkMatch();
  });

  /* ===== Listas personalizadas (Tipo de projeto / Origem do cliente) =====
     As opções de fábrica ficam fixas no <select> de cliente.html; aqui só listamos
     (sem opção de remover) e permitimos adicionar/remover as extras do usuário. */
  const FACTORY_OPTIONS = {
    tipoProjeto: ['Site institucional', 'Identidade visual', 'Sistema', 'SaaS', 'Landing page', 'Manutenção'],
    origem: ['Formulário', 'WhatsApp', 'Instagram', 'Pessoal']
  };
  const CHIP_CONTAINERS = { tipoProjeto: 'chipsTipoProjeto', origem: 'chipsOrigem' };

  function renderChips(field) {
    const container = document.getElementById(CHIP_CONTAINERS[field]);
    const factory = FACTORY_OPTIONS[field].map(value => `<span class="option-chip">${value}</span>`);
    const custom = STORE.getCustomOptions(field).map(value => `
      <span class="option-chip is-custom">${value}<button type="button" data-remove="${encodeURIComponent(value)}" aria-label="Remover ${value}">×</button></span>
    `);
    container.innerHTML = factory.join('') + custom.join('');
    container.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        STORE.removeCustomOption(field, decodeURIComponent(btn.dataset.remove));
        renderChips(field);
      });
    });
  }
  renderChips('tipoProjeto');
  renderChips('origem');

  document.querySelectorAll('.option-add-form').forEach((optForm) => {
    const field = optForm.dataset.field;
    optForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = optForm.querySelector('input');
      if (STORE.addCustomOption(field, input.value)) {
        input.value = '';
        renderChips(field);
      }
      input.focus();
    });
  });
});
