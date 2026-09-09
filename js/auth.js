/* Autenticação simples do Controle WebHub — sem back-end, então isso NÃO é uma proteção
   criptográfica de verdade (não protege dados sigilosos de alguém que saiba mexer em
   código). Serve para impedir uso casual/não autorizado por quem só tem o link do site.

   Sistema fechado: existe só UMA conta autorizada (a sua), fixa em AUTHORIZED_USERS
   abaixo. Não há tela de cadastro nem pedido de acesso — ninguém mais consegue entrar.

   Para trocar a senha manualmente editando o código (em vez de usar o menu
   Configurações do painel, que é o jeito normal):
   1. Abra login.html, aperte F12, rode: await hashPassword("a-senha-desejada")
   2. Copie o resultado e cole em passwordHash na lista AUTHORIZED_USERS abaixo.
   3. Salve e publique a atualização.

   Nota: a troca de senha feita pelo menu Configurações fica salva só no navegador/
   dispositivo usado no momento (veja changePassword abaixo) — em outro navegador ou
   celular, vale a senha que está gravada aqui no código até você trocar por lá também. */

const AUTHORIZED_USERS = [
  { email: 'ruancardozo97@hotmail.com', passwordHash: 'b0857a7c7d3178e44ca0d8836786ae18ee806f7625e589b98c5bad307813eaf6' }
  /* senha temporária de fábrica: "trocar123" — troque assim que possível pelo menu Configurações */
];

const AUTH_SESSION_KEY = 'sp_auth_session';
const PASSWORD_OVERRIDE_KEY = 'sp_password_overrides';

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
window.hashPassword = sha256;

function getOverrides() {
  try { return JSON.parse(localStorage.getItem(PASSWORD_OVERRIDE_KEY)) || {}; }
  catch (e) { return {}; }
}

const AUTH = {
  async login(email, password) {
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = AUTHORIZED_USERS.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!user) return false;

    const hash = await sha256(password);
    const overrides = getOverrides();
    const expectedHash = overrides[normalizedEmail] || user.passwordHash;
    if (expectedHash !== hash) return false;

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ email: user.email, at: Date.now() }));
    return true;
  },
  isLoggedIn() {
    return !!localStorage.getItem(AUTH_SESSION_KEY);
  },
  currentUser() {
    try { return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)); }
    catch (e) { return null; }
  },
  logout() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    window.location.href = 'login.html';
  },
  requireAuth() {
    if (!this.isLoggedIn()) window.location.href = 'login.html';
  },
  /* Troca a senha só no navegador atual — não altera o arquivo auth.js. Se a pessoa usar
     outro computador, precisa trocar de novo lá (ou o dono atualiza o hash no código). */
  async changePassword(newPassword) {
    const current = this.currentUser();
    if (!current) return false;
    const hash = await sha256(newPassword);
    const overrides = getOverrides();
    overrides[current.email.toLowerCase()] = hash;
    localStorage.setItem(PASSWORD_OVERRIDE_KEY, JSON.stringify(overrides));
    return true;
  }
};
