# Changelog

Este projeto segue o padrão Keep a Changelog.
Versionamento baseado em Semantic Versioning.

## [1.4.0] - Certificacao de producao e fases 1-5

### Producao
- Versao 4483112 publicada na Vercel (PR #536, merged)
- Regras owner-only Firestore ao vivo
- Smoke anonimo: gate de login, zero valores financeiros expostos
- QA autenticado real: Dashboard, Patrimônio, Ativos, Dividendos, Renda Fixa carregando

### Backup e recuperacao (Fase 2)
- scripts/backup/verify-recovery.js: certificacao self-service (senha no terminal do dono)
- scripts/backup/verify-integrity.js: verificacao periodica (2 copias, SHA-256, staleness 30d)
- docs/BACKUP_RECOVERY_RUNBOOK.md: rotina mensal e criterios de certificacao

### Renda passiva (Fase 3)
- Auditoria M977 confirmou: projecao de renda ja existia na aba Metas (passiveIncomeGoalBlock + projCurrent) e na view Dividendos (passiveIncomeDividendSummaryBlock); commit 3065696 adicionou variavel morta e foi revertido (d80a330)
- Rotulos de honestidade mantidos: OBSERVADO / ESTIMADO / INDISPONIVEL

### Performance (Fase 4)
- xlsx (269KB, 26% carga fria) carregado sob demanda (ensureXLSX)
- Medicao real a frio: TTFB 16ms, DCL 272ms, 540KB rede

### Experiencia diaria (Fase 5)
- Acessibilidade: role/tabindex/onkeydown/aria-label em controles customizados
- Modo escuro e claro com data-theme
- Touch targets min-height:44px
- Navegacao mobile e desktop

### Governanca (Fase 6)
- PRs #534 e #535 fechadas (conteudo integrado na #536)
- Versao ajustada para 1.4.0

### Correcoes
- ESC do modal de movimentacao: fecha quando limpo, protege quando ha dados nao salvos
- Baseline do modal capturado diferido (draft snapshot), imune a rAF suspenso em abas background

## [1.0.0] - Primeira versao estavel

### Dashboard
- Resumo patrimonial
- Renda passiva
- Composicao da carteira
- Maiores altas e baixas

### Ativos
- Cadastro de ativos
- Edicao de lancamentos
- Exclusao de itens
- Organizacao por categoria
- Importacao de dados
- Exportacao de dados

### Dividendos
- Visao consolidada de proventos
- Historico mensal
- Filtros e agrupamentos
- Analise de recebimentos

### Relatorios
- Relatorios operacionais
- Relatorio PDF
- CSV e JSON

### Metas
- Meta de renda passiva
- Progresso da meta
- Acompanhamento da evolucao

### Diagnostico da Carteira
- Analise consultiva local
- Pontos fortes
- Pontos de atencao
- Proximas decisoes

### Backup
- Backup
- Restauracao
- Exportacao
- Importacao segura

### PWA
- Instalacao como aplicativo
- Cache versionado
- Funcionamento offline parcial

### Seguranca
- Persistencia controlada
- Regras de acesso
- Protecao dos dados locais

### UX
- Tema escuro e claro
- Layout responsivo
- Mobile refinado
- Cards, tabelas e modais consistentes

## [1.1.0] - Em desenvolvimento

### UX Premium
- Modal de edicao
- Preservacao do scroll
- Manutencao da categoria expandida
- Correcao da expansao das listas
- Toast moderno
- Melhorias de produtividade em andamento

## Proximas versoes planejadas

### 1.1.x
- Melhorias de UX

### 1.2.x
- Assistente inteligente da carteira

### 1.3.x
- Automacao e IA
