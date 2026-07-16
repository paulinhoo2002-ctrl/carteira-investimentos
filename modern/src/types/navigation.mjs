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
    title: 'Renda fixa readonly',
    description: 'Consulta somente leitura da renda fixa da carteira, com leitura segura do snapshot.',
    hint: 'Leitura dedicada',
  },
  {
    id: 'provents',
    label: 'Proventos',
    title: 'Proventos e renda mensal',
    description: 'Consulta somente leitura de proventos e renda mensal, com snapshot validado e congelado.',
    hint: 'Leitura readonly atual',
  },
  {
    id: 'contributions',
    label: 'Aportes',
    title: 'Aportes e sugestao explicavel',
    description: 'Consulta somente leitura de aportes e sugestao explicavel produzida pelo legado.',
    hint: 'Leitura readonly dedicada',
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
