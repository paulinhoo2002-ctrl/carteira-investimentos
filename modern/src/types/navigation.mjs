export const MODERN_PAGES = [
  {
    id: 'overview',
    label: 'Visao geral',
    title: 'Visao geral',
    description: 'Painel de entrada da base moderna. A navegacao e local e ainda nao se conecta ao legado.',
    hint: 'Shell inicial em demonstracao',
  },
  {
    id: 'assets',
    label: 'Ativos',
    title: 'Ativos',
    description: 'Consulta somente leitura dos ativos da carteira, com filtros e distribuicao visual.',
    hint: 'Lista readonly atual',
  },
  {
    id: 'fixed-income',
    label: 'Renda fixa',
    title: 'Renda fixa',
    description: 'Espaco preparado para os blocos de renda fixa sem leitura de dados reais.',
    hint: 'Painel futuro',
  },
  {
    id: 'provents',
    label: 'Proventos',
    title: 'Proventos',
    description: 'Tela reservada para proventos, historico e recebimentos da carteira moderna.',
    hint: 'Recebimentos futuros',
  },
  {
    id: 'contributions',
    label: 'Aportes',
    title: 'Aportes',
    description: 'Area de apoio para aportes e entradas futuras sem regras financeiras nesta fase.',
    hint: 'Fluxo em preparacao',
  },
  {
    id: 'reports',
    label: 'Relatorios',
    title: 'Previa somente leitura de Relatorios',
    description: 'Snapshot somente leitura controlado por adaptador explicito, sem escrita ou acesso ao legado.',
    hint: 'Snapshot de leitura segura',
  },
  {
    id: 'settings',
    label: 'Configuracoes',
    title: 'Configuracoes',
    description: 'Pagina de preferencias da base moderna, sem persistencia ou integracao externa.',
    hint: 'Preferencias locais',
  },
];

export const OVERVIEW_CARDS = [
  {
    label: 'Patrimonio',
    value: 'Nao conectado',
    hint: 'Dados ainda nao migrados',
  },
  {
    label: 'Renda mensal',
    value: 'Em preparacao',
    hint: 'Sem calculos reais',
  },
  {
    label: 'Rentabilidade',
    value: 'Nao conectado',
    hint: 'Base isolada apenas',
  },
  {
    label: 'Proximo aporte',
    value: 'Dados ainda nao migrados',
    hint: 'Fluxo futuro',
  },
];
