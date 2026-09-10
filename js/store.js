/* Camada de dados do Controle WebHub — tudo salvo no localStorage do navegador.
   Sem back-end (o projeto é hospedado no GitHub Pages, que só serve arquivos estáticos). */
const STORE = (function () {
  const KEY = 'sp_clients_v1';

  function uid() {
    return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }

  function saveAll(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function getById(id) {
    return getAll().find(c => c.id === id) || null;
  }

  function blankClient() {
    return {
      id: uid(),
      empresa: '',
      valor: 0,
      tipoProjeto: '',
      origem: '',
      devResponsavel: '',
      devPago: false,
      clientePago: false,
      agenciaPaga: false,
      tipoPagamento: 'avista',
      dataInicio: '',
      prazoFinal: '',
      status: 'desenvolvimento',
      splitAgencia: 20,
      splitEu: 40,
      splitDev: 40,
      parcelas: [],
      createdAt: new Date().toISOString()
    };
  }

  function upsert(client) {
    const list = getAll();
    const idx = list.findIndex(c => c.id === client.id);
    if (idx >= 0) list[idx] = client;
    else list.push(client);
    saveAll(list);
    return client;
  }

  function remove(id) {
    saveAll(getAll().filter(c => c.id !== id));
  }

  /* ===== Opções personalizadas (Tipo de projeto / Origem do cliente) =====
     As opções de fábrica ficam fixas no HTML do formulário; estas aqui são as que o
     dono da conta adiciona pelo menu Configurações, sem precisar editar código. */
  const CUSTOM_OPTIONS_KEY = 'sp_custom_options_v1';

  function getAllCustomOptions() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_OPTIONS_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function getCustomOptions(field) {
    return getAllCustomOptions()[field] || [];
  }

  function addCustomOption(field, value) {
    value = (value || '').trim();
    if (!value) return false;
    const existing = getCustomOptions(field);
    if (existing.some(v => v.toLowerCase() === value.toLowerCase())) return false;
    const all = getAllCustomOptions();
    all[field] = [...existing, value];
    localStorage.setItem(CUSTOM_OPTIONS_KEY, JSON.stringify(all));
    return true;
  }

  function removeCustomOption(field, value) {
    const all = getAllCustomOptions();
    all[field] = getCustomOptions(field).filter(v => v !== value);
    localStorage.setItem(CUSTOM_OPTIONS_KEY, JSON.stringify(all));
  }

  /* ===== Cálculos financeiros ===== */
  function splitValues(client) {
    const valor = parseFloat(client.valor) || 0;
    return {
      agencia: valor * ((parseFloat(client.splitAgencia) || 0) / 100),
      eu: valor * ((parseFloat(client.splitEu) || 0) / 100),
      dev: valor * ((parseFloat(client.splitDev) || 0) / 100)
    };
  }

  /* Quanto do valor combinado já entrou de verdade (dinheiro na mão, não "fechado no papel").
     À vista: tudo ou nada, pelo check "Cliente já pagou". Parcelado: soma só as parcelas
     marcadas como pagas (pode ser parcial). */
  function valorRecebido(client) {
    if (client.tipoPagamento === 'parcelado') {
      return (client.parcelas || []).reduce((sum, p) => sum + (p.pago ? (parseFloat(p.valor) || 0) : 0), 0);
    }
    return client.clientePago ? (parseFloat(client.valor) || 0) : 0;
  }

  /* Situação financeira real de um cliente: quanto entrou, quanto já saiu (repassado pro
     dev/agência) e quanto sobra de fato "no banco" pra mim — diferente do splitValues, que
     é só a divisão combinada, sem olhar se alguém pagou alguma coisa ainda. */
  function financeiro(client) {
    const valorTotal = parseFloat(client.valor) || 0;
    const split = splitValues(client);
    const recebido = valorRecebido(client);
    const devRepassado = client.devPago ? split.dev : 0;
    const agenciaRepassada = client.agenciaPaga ? split.agencia : 0;
    return {
      valorTotal,
      recebido,
      pendenteReceber: valorTotal - recebido,
      devValor: split.dev,
      devRepassado,
      devPendente: split.dev - devRepassado,
      agenciaValor: split.agencia,
      agenciaRepassada,
      agenciaPendente: split.agencia - agenciaRepassada,
      euValor: split.eu,
      meuSaldo: recebido - devRepassado - agenciaRepassada
    };
  }

  function totals() {
    const list = getAll();
    const acc = {
      totalFechado: 0, totalDev: 0, totalAgencia: 0, totalEu: 0, count: list.length,
      totalRecebido: 0, totalPendenteReceber: 0,
      totalDevRepassado: 0, totalDevPendente: 0,
      totalAgenciaRepassada: 0, totalAgenciaPendente: 0,
      totalMeuSaldo: 0
    };
    list.forEach(c => {
      const s = splitValues(c);
      const f = financeiro(c);
      acc.totalFechado += parseFloat(c.valor) || 0;
      acc.totalDev += s.dev;
      acc.totalAgencia += s.agencia;
      acc.totalEu += s.eu;
      acc.totalRecebido += f.recebido;
      acc.totalPendenteReceber += f.pendenteReceber;
      acc.totalDevRepassado += f.devRepassado;
      acc.totalDevPendente += f.devPendente;
      acc.totalAgenciaRepassada += f.agenciaRepassada;
      acc.totalAgenciaPendente += f.agenciaPendente;
      acc.totalMeuSaldo += f.meuSaldo;
    });
    return acc;
  }

  function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  function formatBRL(value) {
    return (parseFloat(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  }

  /* Parcelas com data hoje ou vencidas que ainda não foram marcadas como pagas —
     usado pelo sino de notificações e pelo pop-up de cobrança. */
  function getDueCharges() {
    const today = new Date().toISOString().slice(0, 10);
    const due = [];
    getAll().forEach(c => {
      (c.parcelas || []).forEach((p, parcelaIndex) => {
        if (!p.pago && p.data && p.data <= today) {
          due.push({ clientId: c.id, empresa: c.empresa, valor: p.valor, data: p.data, parcelaIndex });
        }
      });
    });
    due.sort((a, b) => a.data.localeCompare(b.data));
    return due;
  }

  /* Controla quais cobranças já foram "vistas" (pop-up já mostrado / sino já aberto),
     pra não ficar repetindo a mesma notificação a cada refresh da página. */
  const SEEN_KEY = 'sp_notif_seen_v1';

  function chargeKey(item) {
    return `${item.clientId}::${item.parcelaIndex}::${item.data}`;
  }

  function getSeenCharges() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || []; }
    catch (e) { return []; }
  }

  function markChargesSeen(items) {
    const seen = new Set(getSeenCharges());
    items.forEach(i => seen.add(chargeKey(i)));
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  }

  return {
    getAll, getById, blankClient, upsert, remove,
    splitValues, valorRecebido, financeiro, totals, initials, formatBRL, formatDate, getDueCharges,
    chargeKey, getSeenCharges, markChargesSeen,
    getCustomOptions, addCustomOption, removeCustomOption
  };
})();
