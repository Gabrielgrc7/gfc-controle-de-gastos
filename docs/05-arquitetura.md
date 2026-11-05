# Arquitetura e mapa de arquivos

O app é feito de HTML (telas), um CSS e **46 arquivos JavaScript**, um por funcionalidade. Eles são carregados na ordem de `src/js/order.json` e compartilham o mesmo escopo global (sem módulos), por isso a ordem importa: quem define vem antes de quem usa nos comandos que rodam ao carregar.

| Arquivo | O que faz |
| --- | --- |
| `js/core/config.js` | Constantes de configuração: versão da política de privacidade, dados do responsável (LGPD), formas de pagamento, categorias padrão e chaves apagadas ao excluir a conta. |
| `js/core/utils.js` | Ferramentas pequenas usadas em todo o app: atalho $, formatação de reais, escape de HTML, datas e somas. |
| `js/core/storage.js` | Banco de dados no aparelho. Os dados ficam no IndexedDB do navegador (o banco de dados que todo navegador já traz), guardados como pares chave → valor. O app lê e escreve numa memória rápida (cache) e grava no banco logo em seguida. Se o IndexedDB não existir, usa o localStorage; se nenhum dos dois funcionar, avisa que os dados são temporários. Também cuida de: aviso quando não consegue salvar, versão dos dados (migrações), pedido de armazenamento protegido e sincronização entre abas abertas ao mesmo tempo. |
| `js/core/crypto.js` | Embaralhamento irreversível de senha e PIN (PBKDF2 pela Web Crypto API). |
| `js/core/period.js` | O mês escolhido: leitura (mkey), filtro de lançamentos por mês (inMonth), setas de mês anterior e próximo. |
| `js/core/state.js` | Estado do app em memória (lançamentos, metas, cartões, conta logada) e carga e gravação dos dados do usuário. |
| `js/features/categories.js` | Categorias livres: criar, renomear, trocar cor, excluir, e sugestão de categoria por palavras-chave. |
| `js/features/rules.js` | Regras que o app aprende quando você corrige uma categoria, e a tela que lista essas regras. |
| `js/features/entries.js` | Lançamentos: formulário (despesa, receita, parcela, recorrência), gravação, geração mensal de parcelas, lixeira e desfazer. |
| `js/features/money-input.js` | Campo de valor estilo banco: só números, centavos entram primeiro. |
| `js/features/charts.js` | Gráficos do Início (rosca, barras, linha e semana) e o texto que aparece ao passar o mouse. |
| `js/features/history.js` | Aba Histórico: lista, busca, filtros, ordenação, editar, apagar, mudar categoria em lote e barra de seleção. |
| `js/features/dashboard.js` | Tela Início: totais, KPIs, avisos, insights, popups de categoria e receitas, primeiros passos e redesenho geral. |
| `js/features/month-picker.js` | Seletor de mês e ano (quadro com os 12 meses). |
| `js/features/calendar.js` | Aba Agenda: calendário do mês com os pontos de cada dia e os detalhes do dia. |
| `js/features/reports.js` | Relatórios: resumo, comparativo mês a mês e maiores gastos. |
| `js/features/commitments.js` | Compromissos: parcelamentos, recorrentes, contas a pagar, assinaturas detectadas e cobranças atípicas. |
| `js/features/commit-rate.js` | Renda comprometida: quanto da renda do mês já está tomado por despesas recorrentes e por parcelas (e quanto sobra), mais os próximos meses. Aparece na tela Início e responde no assistente ("quanto da minha renda está comprometida?"). |
| `js/features/home-widgets.js` | Catálogo de blocos (widgets) da tela Início: os 10 padrão, que formam o modo Completa, e 7 extras para o modo Personalizar. Cada bloco tem um id, um título, uma descrição e (quando é montado por código) uma função que devolve o HTML dele. |
| `js/features/home-layout.js` | Modo de visualização do Início: Completa (todos os blocos), Simples (só o essencial) ou Personalizar (a pessoa escolhe quais blocos aparecem e em que ordem, e pode acrescentar blocos novos). Fica no menu da foto, entre Configurações e Tema. A escolha é gravada no perfil (prefs.homeMode e prefs.homeCustom). |
| `js/features/cards.js` | Cartões: limite, fechamento, vencimento, cálculo da fatura de cada compra. |
| `js/features/accounts.js` | Contas e saldos. |
| `js/features/goals.js` | Sonhos (metas de economia). |
| `js/features/trash.js` | Lixeira com 30 dias de prazo. |
| `js/features/limits.js` | Limite do mês e limite por categoria. |
| `js/features/import-pdf.js` | Importar fatura em PDF (Nubank e Nomad; o app reconhece a Nomad sozinho) e a tela de conferência. |
| `js/features/import-files.js` | Importar extrato OFX ou CSV, leitor genérico de PDF e lista em texto. |
| `js/features/export-backup.js` | Exportar CSV, backup, restaurar e apagar tudo. |
| `js/features/validation.js` | Validação do cadastro: o mínimo para funcionar (e-mail com formato válido e senha com 6 ou mais caracteres). |
| `js/features/profile.js` | Foto, nome e troca de senha. |
| `js/features/auth.js` | Cadastro, login, sessão, bloqueio por tentativas e encerramento por inatividade. |
| `js/features/pin-lock.js` | Bloqueio por PIN. |
| `js/features/privacy.js` | Política de Privacidade, consentimento, baixar meus dados e excluir conta (LGPD). |
| `js/features/navigation.js` | Navegação: abas, subabas, páginas de configurações, folha de lançamento e menu da conta. |
| `js/features/render-hooks.js` | Ponto único que atualiza a tela atual depois de qualquer mudança. |
| `js/features/preferences.js` | Preferências: regime de caixa e dicas. |
| `js/features/theme.js` | Tema claro e escuro e ocultar valores. |
| `js/features/tips-hints.js` | Ícones, descrições ao passar o mouse e dicas no alto de cada tela. |
| `js/features/welcome.js` | Animação de boas-vindas depois do login. |
| `js/features/tutorial.js` | Tutorial guiado: escurece a tela, destaca um item por vez, explica e (em alguns passos) exige que a pessoa toque no item destacado ou role a tela. Pode ser pulado a qualquer momento (botão "Pular" ou tecla Esc). Começa sozinho depois que a conta é criada e pode ser revisto em Mais, Sobre e ajuda. |
| `js/features/data-status.js` | Mostra onde os dados ficam (e quanto espaço usam), avisa quando não foi possível salvar e lembra de fazer backup. |
| `js/features/demo.js` | Modo de exemplo: abre o app com dados fictícios, sem cadastro, para qualquer pessoa conhecer o GFC em segundos. Os dados ficam numa área separada (u:demo:), são sempre refeitos ao entrar e apagados ao sair. Nada disso é uma conta. |
| `js/features/assistant-parser.js` | Assistente: entende frases em português e responde perguntas (roda no aparelho; ponto de troca por outra IA: AI.interpret). |
| `js/features/assistant-ui.js` | Assistente: balão de chat, cartões de confirmação e gravação. |
| `js/features/pwa.js` | Registra o service worker (app instalável e que abre sem internet) quando o site é servido por HTTPS (ou em localhost, para testar o modo offline no computador). |
| `js/main.js` | Início do app: abre o banco de dados do aparelho, aplica o tema salvo e entra direto se houver sessão. |

## Como acrescentar uma funcionalidade
1. Crie `src/js/features/minha-coisa.js` com um comentário no topo dizendo o que ela faz.
2. Coloque o nome (sem `.js`) em `src/js/order.json`, antes de `main`.
3. Rode `npm run sync` para o `index.html` listar o arquivo novo.
4. Se precisar de telas novas, ponha só a marcação no `index.html` e o visual em `css/styles.css`.
5. Escreva um grupo de testes em `tests/gNN_nome.js` e rode `npm test`.

## Regras da casa
- Valores em reais ficam como número com centavos arredondados; na tela, sempre `brl()`.
- Todo texto vindo do usuário passa por `esc()` antes de ir para o HTML.
- Todo dado guardado passa por `store()` (`core/storage.js`): ele escreve no banco do aparelho e avisa se não conseguir. Para mudar o formato dos dados, aumente `SCHEMA_VERSION` e escreva a migração.
- Nada novo grava dado pessoal sem passar pela Política de Privacidade (`features/privacy.js`).
- Para mudar o comportamento de uma função existente, edite a função; evite "embrulhar" de novo (o app ainda tem alguns embrulhos antigos em `navigation.js` e `render-hooks.js`).

## Limites conhecidos da organização atual
- Os arquivos compartilham variáveis globais. O próximo passo natural é migrar para módulos ES (`import`/`export`) com Vite.
- Ainda há estilos escritos direto em atributos `style=""` no HTML. Eles devem virar classes no CSS aos poucos.
- Falta teste em navegador de verdade (Playwright) e em celular: os testes atuais rodam num navegador simulado (jsdom).
