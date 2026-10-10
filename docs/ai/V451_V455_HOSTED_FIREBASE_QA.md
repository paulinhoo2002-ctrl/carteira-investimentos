# V451–V455 — QA hospedado Firebase (registro sanitizado)

STATUS=RELATO_HISTORICO_NAO_REVALIDADO_NESTA_REVISAO
ESCOPO=QA_SINTETICO_HOSPEDADO

Este documento resume a evidência originalmente registrada na PR #474 sem publicar emails, UIDs, identificadores de projeto ou identificadores de aplicativo. Os resultados abaixo são históricos e não foram repetidos nesta revisão V459–V470.

## Registro histórico

- O relatório original descreveu o reaproveitamento de um projeto Firebase QA separado do projeto de produção e o uso de duas contas sintéticas.
- Foram relatados testes negativos de isolamento entre usuários, acesso anônimo e acesso administrativo não autorizado.
- Foram relatadas gravação, leitura após novo login e limpeza dos documentos sintéticos no ambiente QA.
- O relatório original afirmou que nenhuma operação foi feita no Firebase de produção e que nenhuma carteira real foi alterada.
- A configuração de produção e as regras de produção não foram alteradas nesta revisão.

## Limites desta cópia

- Esta cópia remove identificadores pessoais e técnicos que não são necessários para entender o resultado agregado.
- A remoção nesta nova documentação não apaga os valores presentes no histórico da PR #474. A PR deve permanecer marcada como substituída e não deve ser mesclada.
- A validação local da V459–V470 não acessou credenciais nem repetiu testes hospedados autenticados.
- Portanto, `HOSTED_QA_CURRENT=NOT_RETESTED`; a evidência histórica não é apresentada como certificação atual.

## Evidência local separada

Na revisão V459–V470, `npm.cmd run verify:release` passou na worktree da PR #474, SHA `a266da3cc87944726605b2fe6f3f55cc044d5487`. A suíte incluiu os testes locais de produto, modern, QA geral e V289. Isso não revalida autenticação hospedada nem altera o status histórico acima.

REAL_FINANCIAL_WRITES=0
REAL_IMPORT=false
REAL_RESTORE=false
PRODUCTION=false
MERGE=false
