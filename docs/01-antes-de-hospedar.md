# Antes de hospedar: checklist de segurança e LGPD

Siga na ordem. Marque cada item.

> **Atalho:** `node tools/personalizar.js --usuario=Gabrielgrc7 --repo=gfc --nome="Seu Nome" --email=seu@email.com` preenche nome, e-mail, usuário e repositório em todos os arquivos. Depois, `npm run check:release:strict` confere sozinho a maior parte desta lista (rede, dados pessoais, links, modo offline, política de segurança). Crie também um arquivo `.release-block.txt` (ele não vai para o GitHub) com termos que nunca podem aparecer no código, como seu nome completo e seu CPF, um por linha.

## 1. Repositório limpo (GitHub)
- [ ] Nenhuma fatura, extrato, CPF, e-mail ou senha reais no código nem no histórico (`git log -p | grep -i cpf`). Se algo vazou, troque o dado e reescreva o histórico (git filter-repo) ou crie o repositório do zero.
- [ ] `.gitignore` conferido (já bloqueia PDFs, OFX, CSV de teste e arquivos `.env`).
- [ ] Ative a verificação em duas etapas na sua conta do GitHub.
- [ ] Settings > Branches: proteja a `main` (exigir pull request e testes passando).
- [ ] Settings > Code security: ligue Dependabot e "secret scanning".
- [ ] Repositório privado enquanto estiver testando; público só quando tudo abaixo estiver feito.

## 2. Preencher o que só você sabe
- [ ] `src/js/core/config.js`: nome do responsável (pessoa ou empresa) e e-mail do encarregado de dados.
- [ ] Revisão da Política de Privacidade (`polHTML` em `features/privacy.js`) por um profissional de direito digital. Eu não sou advogado.
- [ ] Termos de uso: escreva e publique (o app ainda não tem).
- [ ] Se o app for para público geral, defina um canal para os usuários exercerem direitos da LGPD (e-mail do encarregado).

## 3. Hospedagem
Opções para site estático (grátis ou barato): GitHub Pages, Cloudflare Pages, Netlify, Vercel. Todas dão HTTPS.
- [ ] **HTTPS obrigatório.** Sem ele o app não instala no celular e a proteção de senha usa um método mais fraco.
- [ ] Domínio próprio (opcional): aponte o DNS para a hospedagem e ative HTTPS.
- [ ] **Cabeçalhos de segurança.** O arquivo `src/_headers` vale no Cloudflare Pages e no Netlify. O GitHub Pages **não deixa configurar cabeçalhos**: se for usar GitHub Pages, ponha o Cloudflare na frente (grátis) ou escolha Cloudflare Pages/Netlify para ter a CSP.
- [ ] Teste a CSP: abra o site, abra o console do navegador (F12) e veja se aparece algum bloqueio. Se o leitor de PDF reclamar, não relaxe a CSP: me avise.

## 4. Testar de verdade
- [ ] Celular Android e iPhone (Safari): instalar, criar conta, lançar, importar fatura, PIN.
- [ ] Computador: Chrome, Edge e Firefox.
- [ ] Modo avião: o app abre e funciona sem internet depois da primeira visita.
- [ ] Gire o celular, aumente a fonte do sistema, use o leitor de tela (acessibilidade).
- [ ] Limpe os dados do navegador e confirme que o app avisa sobre o backup.

## 5. Dados dos usuários
- [ ] Hoje os dados ficam só no navegador de cada pessoa: você não guarda nada e não tem o que vazar do seu lado. Mantenha isso até ter servidor.
- [ ] Diga isso na página (já está na política e no Início).
- [ ] Recomende backup periódico (Mais, Dados).

## 6. Depois de publicar
- [ ] Anote como atualizar: mude o código, `npm test`, push na `main`, o Actions publica. Aumente o `V` do `sw.js` quando mudar arquivos, para os aparelhos pegarem a versão nova.
- [ ] Reveja a política sempre que o app passar a tratar um dado novo (o app pede novo aceite quando você muda `POLICY_V`).
- [ ] Combine com um amigo uma "segunda leitura" do código antes de abrir ao público.

## O que muda quando houver servidor
Veja `docs/02-servidor-e-sincronizacao.md`. As obrigações da LGPD aumentam bastante.
