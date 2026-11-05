# Servidor e sincronização: abrir no computador e no celular, ao vivo, e funcionar offline

Este é o desenho que entrega o que você descreveu: **offline primeiro, com sincronização**.
O app continua guardando tudo no aparelho, num banco de dados do navegador (IndexedDB), e por isso abre sem internet. Quando há internet, ele envia as mudanças para o servidor e recebe as dos outros aparelhos da mesma conta.

```
Celular  ──┐                      ┌── Servidor (login + banco de dados)
           ├── sincroniza ──────► │   guarda uma cópia por usuário
Computador ┘   (só quando há net) └── avisa os outros aparelhos em tempo real
   ▲ cada aparelho tem a própria cópia local e funciona sem internet
```

## 1. Escolha um caminho

| | A. Supabase (recomendo para começar) | B. Firebase | C. Servidor próprio (Node + Postgres) |
|---|---|---|---|
| O que é | Banco Postgres pronto, com login, regras de acesso e tempo real | Banco de documentos do Google, com login e tempo real | Você escreve e mantém tudo |
| Esforço | Baixo | Baixo | Alto |
| Controle e SQL | Total, é Postgres de verdade | Menor, sem SQL | Total |
| Dados no Brasil | Dá para escolher a região de São Paulo | Há região em São Paulo, confira | Você escolhe a hospedagem |
| Para quem | Quer entregar rápido e aprender SQL | Quer o mais simples | Quer aprender backend a fundo |

Como você quer entender SQL, **A ou C** combinam mais com você. Os passos abaixo usam o A como exemplo; o C usa as mesmas ideias.

## 2. Passo a passo (caminho A)
1. Crie um projeto na região **São Paulo** (dados no Brasil simplificam a LGPD).
2. Ligue o login por **e-mail com confirmação**. Isso resolve de verdade o "e-mail real": a pessoa só entra depois de clicar no link que recebeu.
3. Crie as tabelas com regras de acesso por linha (RLS), para ninguém ver dado de outro:
```sql
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense','income')),
  description text not null,
  amount_cents integer not null check (amount_cents > 0),
  spent_on date not null,
  category text, payload jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.transactions enable row level security;
create policy "ler as minhas"     on public.transactions for select using (user_id = auth.uid());
create policy "criar as minhas"   on public.transactions for insert with check (user_id = auth.uid());
create policy "editar as minhas"  on public.transactions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "apagar as minhas"  on public.transactions for delete using (user_id = auth.uid());
create index on public.transactions (user_id, updated_at);
```
Repita para categorias, cartões, contas, metas, planos e regras (o modelo está em `docs/` e no relatório).
4. **Camada de dados no app.** Hoje tudo passa por `store()` (em `core/utils.js`). Troque o miolo dela por: gravar no aparelho (IndexedDB) e anotar a mudança numa fila ("outbox").
5. **Sincronizar** (função `sync()`):
   - Enviar: tudo da fila, com `updated_at`.
   - Receber: tudo que mudou no servidor depois da última sincronização (`updated_at > último`).
   - Conflito: vale o registro com `updated_at` mais novo (simples e suficiente para uso pessoal). Apagar é "marcar com `deleted_at`", nunca sumir de vez, para o outro aparelho ficar sabendo.
6. **Ao vivo:** assine o canal em tempo real da tabela; quando chegar um aviso, chame `sync()`. Sem internet, a fila espera e envia quando voltar (no evento `online`).
7. **Migração:** no primeiro login, ofereça "Enviar meus dados para a nuvem" (com consentimento) e envie o que já está no aparelho.
8. **Excluir conta** passa a apagar também no servidor (e nos backups no prazo da política).

## 3. Se escolher servidor próprio (caminho C)
- **Stack:** Node.js (Fastify ou Express) + PostgreSQL, atrás de HTTPS (Caddy ou Nginx).
- **Rotas mínimas:** cadastro, confirmação de e-mail, login, renovar sessão, `GET /sync?desde=...`, `POST /sync`, exportar meus dados, excluir conta.
- **Segurança:** senha com Argon2id (nunca o PBKDF2 do navegador sozinho), limite de tentativas por IP e por conta, validação de tudo que entra (biblioteca zod), consultas parametrizadas (nunca montar SQL com texto do usuário), cabeçalhos com helmet, CORS só para o seu domínio, segredos em variáveis de ambiente, logs **sem** dados pessoais.
- **Hospedagem:** Render, Railway, Fly.io ou uma VPS. Faça **backup diário criptografado** do banco e **teste restaurar**.
- **Sessão:** cookie `HttpOnly`, `Secure`, `SameSite=Lax`, ou token de curta duração com renovação.

## 4. LGPD quando há servidor (o que muda)
- [ ] Contrato (acordo de tratamento de dados) com quem hospeda o banco e envia os e-mails.
- [ ] Registro das operações de tratamento (quais dados, para quê, onde, por quanto tempo).
- [ ] Relatório de impacto à proteção de dados, se o risco for alto.
- [ ] Plano de resposta a incidentes (quem avisa, em que prazo, como comunicar usuários e a ANPD).
- [ ] Criptografia em trânsito (HTTPS) e em repouso (banco e backups).
- [ ] Controle de acesso: só você (e quem precisar) entra no painel; autenticação em duas etapas.
- [ ] Atualizar a Política de Privacidade (servidor, operadores, retenção, local dos dados) e pedir novo aceite.
- [ ] Direitos do titular funcionando no servidor: baixar meus dados, corrigir, excluir de verdade.
- [ ] **Continue sem pedir CPF.** O app já não pede (e apaga o CPF de cadastros antigos). Peça só o que o servidor realmente precisa.

## 5. Alternativa: criptografia ponta a ponta
O app criptografa tudo no aparelho com uma chave derivada da senha, e o servidor guarda só o texto cifrado. Ninguém, nem você, lê os dados.
Contra: quem esquecer a senha perde os dados; o servidor não consegue fazer buscas, relatórios nem IA com esses dados. Vale para quem faz questão de privacidade máxima.

## 6. Ordem de trabalho sugerida
1. Hospedar o app estático como está (docs/01).
2. Criar o projeto no servidor, tabelas e regras de acesso.
3. Login com confirmação de e-mail.
4. Camada de dados local (IndexedDB) com fila de envio.
5. `sync()` para enviar e receber.
6. Tempo real.
7. Migrar dados antigos e atualizar a política.
8. Testes com dois aparelhos, inclusive "criei offline em um e editei no outro".
