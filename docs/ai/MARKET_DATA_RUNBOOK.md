# Runbook de dados de mercado

## Caminho atual

O adaptador `market-data-providers.js` usa Yahoo Chart como caminho público
read-only para cotações e histórico de dividendos. As requisições levam somente
o ticker (`TICKER.SA`). O coletor mencionado em registros antigos como
`tools/qa/v69-public-data-report.js` não existe na superfície atual; essa é uma
referência histórica, não um comando operacional. O QA atual fica em
`scripts/qa/`. Não combine respostas públicas com dados financeiros locais nem
grave relatórios sem uma tarefa e autorização específicas.

Brapi permanece adaptador estruturado opcional: o endpoint vivo testado exigiu
token e deve ser configurado apenas localmente, sem segredo no repositório.
CVM, documentos de emissores/fundos e B3 continuam fontes de validação, com B3
como reconciliação opcional.

## Operação segura

1. Use somente um coletor presente e documentado em `scripts/qa/`; atualmente
   não há coletor V69 operacional neste repositório.
2. Se uma tarefa autorizada usar dados do provedor, verifique timestamp,
   provedor, cobertura e falhas antes de interpretar o dado.
3. Não trate histórico Yahoo como confirmação oficial universal; preserve a
   proveniência e reconcilie eventos relevantes.
4. Eventos públicos ficam separados do ledger realizado.
5. Em falha, timeout ou resposta inválida, mantenha o último dado com indicação
   de desatualização e não escreva na carteira.

## Limites conhecidos

Yahoo Chart fornece cotações e eventos históricos quando disponíveis, mas não é
fonte oficial completa para anúncios futuros, JCP ou correções. Esses casos
exigem validação oficial ou reconciliação manual. Brapi pode ampliar cobertura
quando o usuário configurar um token gratuito localmente.

