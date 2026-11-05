/* core/config.js
   Constantes de configuração: versão da política de privacidade, dados do responsável (LGPD), formas de pagamento, categorias padrão e chaves apagadas ao excluir a conta. */

const POLICY_V = '2026-11-03',
  PAL = 16,
  IDLE = 15 * 60 * 1000;

const CFG = {
  controlador: 'Gabriel Euflausino Garcia',
  contato: 'gabrielgarciaez@gmail.com',
};

const FORMAS = [
  'Cartão de crédito',
  'Cartão de débito',
  'Pix',
  'Dinheiro',
  'Boleto / débito automático',
  'Outro',
];

const DEF = [
  ['Alimentação', 0],
  ['Transporte', 1],
  ['Moradia', 2],
  ['Saúde', 3],
  ['Lazer', 4],
  ['Educação', 5],
  ['Compras', 6],
  ['Contas', 7],
  ['Outros', 8],
  ['Supermercado', 9],
  ['Cuidados pessoais', 10],
  ['Assinaturas', 11],
  ['A revisar', 12],
];

const WIPE = [
  'gastos:items',
  'gastos:budgets',
  'gastos:catlim',
  'gastos:cats',
  'gastos:plans',
  'gastos:prefs',
  'gastos:cards',
  'gastos:goals',
  'gastos:rules',
  'gastos:trash',
  'gastos:accts',
];
