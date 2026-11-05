# Testar com outras pessoas: onde ficam os dados

## Resposta curta
**Você não precisa guardar os dados de ninguém.** Cada pessoa cria a conta e guarda os lançamentos no próprio aparelho, num banco de dados do navegador (IndexedDB). O site que você publica só entrega os arquivos do app, como qualquer página.

O que isso significa na prática:
- Você não vê, não guarda e não consegue vazar dado de ninguém. Isso também te livra de várias obrigações da LGPD.
- A "conta" vale **só naquele aparelho e naquele navegador**. Quem criar no computador não entra pelo celular com o mesmo login. (A tela de cadastro avisa isso.)
- Se a pessoa limpar os dados do navegador ou trocar de aparelho, perde tudo, a menos que tenha feito backup (Mais, Dados). O app lembra disso e mostra se o navegador protegeu o armazenamento.
- Você também não consegue recuperar a senha de ninguém. Quem esquecer apaga a conta e recomeça.

## Onde publicar para testarem (grátis)
| Opção | Vantagem | Observação |
| --- | --- | --- |
| Netlify Drop ou Netlify com GitHub | Arrasta a pasta e já tem link com HTTPS; lê o arquivo `_headers` | Crie conta grátis para o site não expirar |
| Cloudflare Pages | Grátis, rápido, lê o `_headers` | Boa para quando virar site de verdade |
| GitHub Pages | Já integrado ao repositório (o `deploy.yml` publica sozinho) | Não deixa configurar os cabeçalhos de segurança |

## Quando passar a precisar de servidor
Só quando você quiser que **a mesma conta funcione em mais de um aparelho** (ver os gastos no computador e no celular), receber lembretes ou importar direto do banco. Aí veja `docs/02-servidor-e-sincronizacao.md`. O caminho mais fácil é o Supabase.

## Pedindo feedback sem ver dados
- Peça prints com os valores ocultos (ícone do olho no topo).
- Ofereça o botão "Ver com dados de exemplo" na entrada: dá para conhecer o app sem cadastro e sem nenhum dado real.
