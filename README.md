# Controle WebHub

Painel pessoal para controle dos clientes fechados pela agência: valores, tipo de projeto, origem do cliente, dev responsável, status, parcelas e a divisão financeira entre agência, você e o dev.

## Como funciona

- **100% estático** (HTML, CSS e JavaScript puro) — sem back-end, sem build, sem instalação. Por isso pode ser hospedado direto no GitHub Pages.
- Os dados ficam salvos no **localStorage do navegador** (chave `sp_clients_v1`). Isso significa que:
  - Os dados são privados a cada navegador/computador onde o painel é aberto — não existe um banco compartilhado.
  - **Se você abrir o link no celular, o login funciona normalmente, mas os clientes cadastrados no computador não aparecem lá** — cada navegador/aparelho guarda os próprios dados, isolado dos outros. Cadastros feitos pelo celular também ficam só no celular. Não é uma sincronização entre dispositivos, é 100% local por navegador.
  - Limpar o cache/dados do site apaga os clientes cadastrados. Vale a pena exportar/anotar os dados importantes em outro lugar de vez em quando.
- **Layout responsivo:** o painel se adapta a celular e tablet (menu lateral vira uma coluna de ícones, cards e formulários empilham em uma coluna, tabelas ficam roláveis na horizontal).

## Páginas

- `login.html` — tela de entrada. Só acessa o painel quem estiver na lista de autorizados (veja "Login e acesso" abaixo).
- `index.html` — Dashboard: total fechado, repasse para devs, repasse para a agência, lucro líquido, gráfico de fechamentos por mês e divisão do valor total. Clicar nos três primeiros cards abre um detalhamento (lista de projetos, valores por dev, valores por cliente repassados à agência).
- `clientes.html` — lista de todos os clientes cadastrados, com busca.
- `cliente.html` — cadastro/edição de um cliente (a "aba" de cada cliente), incluindo origem do cliente, a divisão percentual (agência/eu/dev, editável por cliente, com o valor de cada parte já calculado na tela) e as parcelas de pagamento.
- `relatorio.html` — escolha um mês e baixe um PDF com o resumo financeiro do período (vendido, repassado, saldo, clientes fechados) e a lista de clientes daquele mês.
- `configuracoes.html` — trocar sua senha e ativar o modo escuro.

## Login e acesso

⚠️ **Importante sobre segurança:** como o site é 100% estático (sem servidor), esse login **não é uma proteção criptográfica de verdade** — quem souber mexer em código (abrir o F12 e olhar o JavaScript) consegue contornar. Ele serve para impedir que alguém que só tenha o link do site entre e mexa casualmente, não para proteger dados sigilosos de um atacante determinado.

- **Sistema fechado, uma conta só:** não existe cadastro nem pedido de acesso — só entra quem estiver na lista `AUTHORIZED_USERS` em `js/auth.js`, que hoje é só a sua conta.
- **Senha de fábrica:** `ruancardozo97@hotmail.com` / `trocar123`. **Troque assim que possível** pelo menu **Configurações** dentro do painel (não precisa mexer em código pra isso).
- A troca de senha pelo menu Configurações fica salva só no navegador/aparelho usado no momento. Se você usar outro navegador ou o celular, vale a senha antiga (a que está gravada em `js/auth.js`) até você trocar por lá também.
- A sessão fica salva no navegador (localStorage) até você clicar em "Sair" no topo do painel.

## Divisão do valor

Por padrão, cada cliente novo vem com **20% agência / 40% eu / 40% dev**, mas as três porcentagens são editáveis por cliente (só é preciso que a soma dê 100%). O dashboard soma automaticamente os valores de todos os clientes fechados, aplicando a porcentagem própria de cada um — e os cards de "Repassado para devs" e "Repassado para a agência" no dashboard, ao serem clicados, mostram esse cálculo aberto por dev/cliente.

## Publicar no GitHub Pages

1. Suba a pasta deste projeto (fisicamente chamada `Sistema Pessoal` — pode renomear se quiser, não afeta nada) para um repositório no GitHub.
2. No repositório, vá em **Settings → Pages**.
3. Em "Source", selecione a branch principal (ex: `main`) e a pasta raiz (`/`).
4. Salve — o GitHub gera uma URL do tipo `https://seu-usuario.github.io/nome-do-repo/`.

Nenhuma configuração adicional é necessária. O link gerado funciona normalmente em qualquer navegador, incluindo o do celular — veja a observação sobre localStorage em "Como funciona" acima.
