# Como contribuir

Obrigado por querer ajudar! Duas coisas valem ouro neste projeto: **correções** e **leitores de fatura de novos bancos**.

## Regra número 1: nunca envie dados pessoais
Não anexe faturas, extratos, prints com valores reais, CPF, nome, número de cartão ou e-mail. Em issues e pull requests, **troque todos os dados** por inventados antes de enviar.

## Configurar
```
npm install
npm test            # tudo deve passar
npm run format      # formata antes de enviar
```

## Pedir ou criar um leitor de fatura (novo banco)
1. Abra uma issue com o modelo **Novo banco** e cole as linhas de texto da fatura **com os dados trocados** (mantenha o formato: datas, "n/m" das parcelas, sinais de menos, linhas de IOF e totais).
2. Para criar o leitor, copie `parseNomad` em `src/js/features/import-pdf.js`, adapte a expressão regular e o total de conferência, e registre em `BANKS`. Inclua `detect` se der para reconhecer o banco pelo texto.
3. Escreva testes com uma fatura fictícia (veja `tests/g17_nomad.js`). A soma das compras precisa bater com o total informado na fatura.

## Criar um bloco novo para o Início
Veja `docs/07-modos-do-inicio.md`: são quatro passos (catálogo, contêiner no HTML, função que monta o bloco e testes).

## Código
- Um arquivo por funcionalidade em `src/js/features/`. Arquivo novo: coloque o nome em `src/js/order.json` e rode `npm run sync`.
- Todo texto vindo do usuário passa por `esc()` antes de ir para o HTML. Todo dado guardado passa por `store()`.
- Nada de chamadas de rede: o app promete que nada sai do aparelho (`npm run check:release` confere).
- Prettier manda no estilo (`npm run format`).

## Antes de abrir o pull request
`npm test` e `npm run check:release` precisam passar.
