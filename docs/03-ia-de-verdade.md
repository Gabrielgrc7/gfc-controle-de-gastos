# Assistente com IA de verdade (sem limites de frase)

Hoje o assistente entende frases por regras, no aparelho (`features/assistant-parser.js`). Ele é rápido, grátis e privado, mas só entende frases no formato que previmos.
Para entender qualquer frase ("paguei o conserto do carro, uns 400 e pouco, ontem à noite") use um modelo de linguagem. O app já tem o ponto de troca: **`AI.interpret(texto)`**.

## 1. Desenho
```
App (celular/PC)  ──►  SEU servidor  ──►  API do modelo (Anthropic)
 texto + contexto mínimo   confere login,      devolve um JSON
                           limita uso,         estruturado
                           guarda a chave
```
- **A chave da API fica só no servidor.** Nunca no JavaScript do app: quem abrir o código a roubaria.
- O servidor devolve ao app o **mesmo formato** que o analisador local devolve, e o app continua mostrando o cartão de confirmação. **A IA nunca grava nada sozinha.**

## 2. Contrato (o que `AI.interpret` devolve)
```json
{ "type": "drafts", "drafts": [ { "kind": "v", "inc": false, "bill": false, "desc": "Conserto do carro",
    "value": 400, "date": "2026-10-21", "cat": "Transporte", "forma": "Cartão de débito" } ] }
{ "type": "answer", "text": "Você gastou R$ 180,00 neste mês." }
{ "type": "unknown" }
```
`kind`: `v` (à vista), `p` (parcelado, com `pn` e `pt`), `r` (recorrente). Detalhes no comentário no topo de `assistant-parser.js`.

## 3. Como pedir ao modelo (esboço, não testado)
Use "uso de ferramentas" para forçar uma saída estruturada. No servidor:
```js
const r = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
  body: JSON.stringify({
    model: 'claude-haiku-5-5',            // barato e rápido; confira os nomes e preços atuais na documentação
    max_tokens: 600,
    system: 'Você ajuda a lançar gastos em português do Brasil. Hoje é ' + hoje + '. Categorias do usuário: ' + categorias.join(', ') + '. Se o texto não for sobre finanças, chame responder com uma mensagem curta. Nunca invente valores.',
    messages: [{ role: 'user', content: texto }],
    tools: [
      { name: 'registrar_lancamentos', description: 'Um ou mais lançamentos descritos pela pessoa.',
        input_schema: { type: 'object', required: ['lancamentos'], properties: { lancamentos: { type: 'array', items: { type: 'object',
          required: ['tipo','descricao','valor_centavos','data'],
          properties: { tipo: { enum: ['despesa','receita'] }, descricao: { type: 'string' }, valor_centavos: { type: 'integer' },
            data: { type: 'string', description: 'AAAA-MM-DD' }, categoria: { type: 'string' },
            forma: { enum: ['Cartão de crédito','Cartão de débito','Pix','Dinheiro','Boleto / débito automático','Outro'] },
            parcelas_total: { type: 'integer' }, parcela_atual: { type: 'integer' }, recorrente: { type: 'boolean' }, conta_a_pagar: { type: 'boolean' } } } } } } },
      { name: 'responder', description: 'Resposta curta quando não há o que lançar.',
        input_schema: { type: 'object', required: ['texto'], properties: { texto: { type: 'string' } } } }
    ],
    tool_choice: { type: 'any' }
  })
});
```
A resposta traz um bloco `tool_use` com o JSON. O servidor converte para o contrato da seção 2.

## 4. Para ficar "perfeito, redondinho"
1. **Híbrido:** tente primeiro o analisador local (grátis, instantâneo, funciona offline). Só chame a IA quando ele devolver `unknown`. Isso corta o custo e a latência.
2. **Valide a resposta da IA** com as mesmas regras do app (`cleanName`, valor entre 0 e 1 bilhão, data válida, categoria que exista). Descarte o que não passar.
3. **Confirmação sempre.** O cartão de confirmação já existe; não crie atalho que grave direto.
4. **Defesa contra "prompt injection":** o texto do usuário e o conteúdo de faturas são dados, nunca ordens. Não dê à IA ferramenta que apague ou envie dinheiro.
5. **Limites:** exige login; no máximo ~300 caracteres por mensagem; limite de mensagens por minuto e por dia por usuário; teto de gasto mensal na conta da API.
6. **Contexto mínimo:** envie só a mensagem, a data de hoje e os nomes das categorias. Não envie lançamentos, CPF, nome ou e-mail. Para perguntas ("quanto gastei com mercado?"), faça a IA devolver só os **parâmetros** (período, categoria) e deixe o app calcular a resposta com os dados locais.
7. **Teste com dados reais de frases:** o arquivo `tests/g4_assistant.js` tem milhares de frases com a resposta esperada. Use-o como conjunto de avaliação: rode a IA nessas frases e compare. Só troque de modelo ou de instrução se o resultado melhorar.
8. **Plano B:** se a API falhar ou não houver internet, volte ao analisador local e avise.
9. **Registro mínimo:** guarde só data, usuário e se deu certo. Não guarde o texto das mensagens.

## 5. LGPD com IA
- Enviar o texto a um provedor de IA é **compartilhar dados com um operador**. Atualize a Política de Privacidade (quem é, para quê, onde processa, por quanto tempo) e peça **consentimento específico** para ligar o assistente com IA (um botão "Usar IA", desligado por padrão).
- Verifique as condições do provedor para dados enviados pela API (retenção, uso para treino, transferência internacional) e registre o contrato.
- Avise na tela quando uma mensagem for enviada para fora do aparelho.
