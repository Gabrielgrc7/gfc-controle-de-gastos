# Modos do Início e blocos (widgets)

A tela Início é feita de **blocos**. O menu da foto, em "Modo de visualização", escolhe quais aparecem:

| Modo | O que mostra |
| --- | --- |
| **Completa** | Os 10 blocos padrão, na ordem de sempre |
| **Simples** | Só o essencial: Total do mês, Receitas/despesas/saldo, Avisos, Para onde foi seu dinheiro (só a rosca) e Últimos lançamentos |
| **Personalizar** | A pessoa escolhe os blocos e a ordem, entre os 17 existentes (os 7 novos só aparecem aqui) |

O lembrete de backup, os "Primeiros passos" e o aviso de categorias a revisar **não são blocos**: aparecem em todos os modos.

## Por que esses 5 no Simples
São as cinco perguntas de quem abre o app: quanto gastei, quanto sobrou, tem algo vencendo ou estourando, para onde foi o dinheiro, o que lancei por último. Tudo que exige configuração (renda recorrente, cartões, sonhos) ou é análise (indicadores, dicas, renda comprometida) fica para a Completa ou para quem personalizar.

## Como funciona
- **`features/home-widgets.js`**: o catálogo `HOME_W` (id, título, descrição, se é padrão, se está no Simples ou se é extra) e as funções que montam os blocos novos. `HOME_BUILD` liga cada id à sua função.
- **`features/home-layout.js`**: escolhe a lista de ids do modo atual (`homeIds`), mostra, esconde e reordena os elementos (`applyHome`, que move os mesmos elementos, sem recriar), e tem a janela do menu e o editor (arrastar, setas, teclado, Desfazer).
- **`index.html`**: cada bloco tem um contêiner `<div class="hw" data-w="id">` dentro de `#home`.
- **Perfil da pessoa**: `prefs.homeMode` (`completa`, `simples` ou `custom`) e `prefs.homeCustom.order` (ids visíveis, em ordem). Ids desconhecidos ou repetidos são descartados ao ler (também ao restaurar um backup).

## Criar um bloco novo
1. Acrescente em `HOME_W` (`home-widgets.js`) o id, o título e a descrição, com `extra: 1`.
2. Ponha `<div class="hw" data-w="seu-id" id="w-seu-id" hidden></div>` dentro de `#home`, em `src/index.html`.
3. Escreva a função que devolve o HTML e registre em `HOME_BUILD`. Escape todo texto vindo do usuário com `esc()` e use as classes `wlv` e `wbig b` nos valores para o botão do olho (ocultar valores) funcionar.
4. Teste em `tests/g20_modos_inicio.js` (conteúdo, estado vazio, texto com HTML e valores extremos).
