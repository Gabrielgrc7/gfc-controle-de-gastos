# Open Finance: como usar no GFC

## O que é
O Open Finance Brasil permite que **a própria pessoa autorize** que um app veja os dados dela em vários bancos (contas, cartões, faturas, transações). É assim que o Pierre importa gastos sozinho.

## O que você precisa saber antes
1. **Exige servidor.** Os dados não podem ser pedidos direto do navegador nem pelo app estático: as chaves precisam ficar em segurança num servidor seu. Então ele não é "puro offline": o servidor busca no banco, guarda e sincroniza com os aparelhos (docs/02).
2. **Participar sozinho é regulado.** Para falar direto com os bancos é preciso ser autorizado pelo Banco Central e passar por certificação. Para um projeto pequeno o caminho normal é usar um **agregador** que já faz isso.
3. **Agregadores no Brasil** (exemplos de empresas): [Pluggy](https://pluggy.ai), [Belvo](https://belvo.com), Quanto, Klavi, Tecnospeed. Confirme as condições atuais no site de cada um.
4. **Custo.** Relatos de desenvolvedores em fórum citam, para pequenos projetos, valores por mês na casa de alguns milhares de reais em alguns agregadores ([exemplo no TabNews](https://www.tabnews.com.br/GuilhermeVieira/estou-desenvolvendo-um-app-de-financas-pessoais-e-nao-consigo-pagar-o-open-finance-pluggy-r2-5k-mes-belvo-r6k-mes-tecnospeed-r1-5k-de-entrada-r540)). São relatos antigos e informais: peça orçamento.
5. **Alternativa gratuita para uso pessoal:** o Meu Pluggy, em que a própria pessoa conecta a conta e o seu app lê os dados dela. Serve para testar ou para uso próprio, mas cada usuário precisa criar a conta lá.

## Como funciona na prática (com agregador)
1. Você cria uma conta no agregador e recebe uma **chave secreta** (fica só no servidor).
2. O app abre o **widget de conexão** do agregador: a pessoa escolhe o banco, entra no site do banco e **autoriza**.
3. O agregador devolve um identificador da conexão ("item").
4. O seu servidor usa esse identificador para pedir **contas, cartões, faturas e transações**.
5. O servidor **converte** para o modelo do GFC:
   - transação de cartão vira despesa no crédito, com o mês da fatura vindo da própria fatura;
   - entrada na conta vira receita;
   - guarde o `id` externo para não duplicar quando buscar de novo.
6. O agregador avisa por **webhook** quando há transações novas; o servidor grava e os aparelhos sincronizam.
7. A categoria é sugerida pelas **regras que o app já aprendeu** e por palavras-chave (o `catOf`).

## LGPD no Open Finance
- Consentimento claro, separado e **revogável** (botão "Desconectar banco" que apaga os dados importados).
- Peça só os dados necessários e por prazo definido (o consentimento do Open Finance tem validade).
- Contrato com o agregador como operador e atualização da política.
- Nunca guarde a senha do banco (nem o agregador deve entregá-la: o login é no site do banco).
- Dados bancários são sensíveis na prática: criptografia em repouso, acesso mínimo e registro de quem acessou.

## O que dá para fazer **hoje, de graça e sem servidor**
Já funcionam no app: importar fatura em PDF, extrato OFX e CSV, e leitor genérico de PDF. Para muita gente isso entrega 80% do benefício sem custo nem risco.
