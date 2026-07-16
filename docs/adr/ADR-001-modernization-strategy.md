# ADR-001 - Estrategia de modernizacao do frontend

## Status

Proposto nesta PR.

## Contexto

- O legado ainda concentra escrita, sincronizacao e calculos financeiros.
- O frontend moderno ja opera em paginas readonly com contrato, bridge, adapter, runtime e controllers separados.
- As fases 185 a 189 mostraram que a leitura pode ser expandida com baixo risco quando a fonte de verdade permanece no legado.
- A principal restricao continua sendo protecao contra perda de dados e duplicacao de regra financeira.
- O service worker e o cache podem servir uma versao antiga do shell, entao a evolucao precisa continuar reversivel.

## Opcoes avaliadas

### Opcao A - Manter hibrido indefinidamente

- Beneficios: menor risco imediato, nenhuma ruptura na fonte de verdade, compatibilidade maxima.
- Riscos: modernizacao pode estagnar e a superficie nova fica limitada demais.
- Custo: baixo no curto prazo, alto se a duplicacao de navegacao virar padrao permanente.
- Complexidade: baixa para operacao, media para governanca.
- Impacto no usuario: experiencia continua consistente, mas sem evolucao funcional nova.
- Impacto nos dados: muito baixo.
- Testes necessarios: estabilidade de contratos readonly, host e shell.
- Rollback: simples, porque nada novo de escrita e introduzido.
- Compatibilidade: alta.
- Prazo aproximado em fases: indeterminado.

### Opcao B - Expandir readonly gradualmente

- Beneficios: permite evolucao incremental com risco controlado, preserva o legado e amplia a cobertura sem duplicar escrita.
- Riscos: schema drift se a fronteira readonly nao for atualizada, e excesso de derivacao visual sem fonte oficial.
- Custo: medio, porque exige contratos pequenos e testes de guardrail.
- Complexidade: media, mas controlada por fases curtas.
- Impacto no usuario: melhora a leitura moderna sem alterar o fluxo principal.
- Impacto nos dados: muito baixo enquanto continuar readonly.
- Testes necessarios: contrato, integracao, fallback, responsividade, acessibilidade e isolacao do legado.
- Rollback: simples, pois cada fase nova pode ser revertida sem tocar a fonte original.
- Compatibilidade: alta.
- Prazo aproximado em fases: curto e incremental.

### Opcao C - Iniciar escrita moderna controlada

- Beneficios: habilita fluxo novo no moderno e pode reduzir dependencia futura do legado.
- Riscos: maior chance de perda de dados, duplicacao de fonte de verdade, inconsistencias de sincronizacao e rollback mais dificil.
- Custo: alto, porque exige contrato de comando, autorizacao, idempotencia, auditoria e backup.
- Complexidade: alta.
- Impacto no usuario: pode melhorar a experiencia se der certo, mas aumenta risco operacional.
- Impacto nos dados: relevante e sensivel.
- Testes necessarios: comando versionado, duplicidade, rollback, compatibilidade com dados antigos, integracao completa e smoke de falha.
- Rollback: complexo se a escrita moderna virar uma segunda origem persistente.
- Compatibilidade: media, porque depende de migracao cuidadosa.
- Prazo aproximado em fases: maior que o readonly.

### Opcao D - Reescrever tudo

- Beneficios: simplifica a arquitetura final apenas se a reescrita sobreviver ao periodo de transicao.
- Riscos: risco maximo de perda de dados, regressao funcional e prazo alto demais para o contexto atual.
- Custo: muito alto.
- Complexidade: muito alta.
- Impacto no usuario: potencialmente grande, mas inseguro.
- Impacto nos dados: alto.
- Testes necessarios: praticamente a suite inteira em migração paralela.
- Rollback: dificil.
- Compatibilidade: baixa durante a transicao.
- Prazo aproximado em fases: longo demais para o risco aceito agora.

### Opcao E - Congelar modernizacao

- Beneficios: encerra a complexidade adicional e reduz a superficie nova.
- Riscos: perde o ganho das telas readonly ja entregues e adia qualquer melhora de experiencia.
- Custo: baixo para manutencao, alto em oportunidade perdida.
- Complexidade: baixa.
- Impacto no usuario: nenhuma evolucao nova.
- Impacto nos dados: muito baixo.
- Testes necessarios: apenas manutencao do legado e congelamento da camada moderna.
- Rollback: facil, mas usa uma decisao conservadora demais para o estado atual.
- Compatibilidade: alta.
- Prazo aproximado em fases: indefinido.

## Decisao

Adotar a **Opcao B - expandir readonly gradualmente**.

Motivo: o projeto ja possui fronteira readonly bem definida, contratos tipados, provider legados e paginas modernas prontas para leitura. Isso permite evolucao com risco baixo, sem abrir uma segunda fonte de verdade. A escrita moderna so deve existir em fase separada, com contrato proprio, idempotencia, autorizacao e rollback comprovados.

## Consequencias

### Passa a ser permitido

- Criar novas paginas modernas readonly quando houver fonte oficial clara no legado.
- Reaproveitar contract, bridge, adapter, runtime e controller sempre sem duplicar calculo financeiro.
- Documentar inventario, ADR e matriz antes de abrir qualquer fase com impacto maior.

### Continua proibido

- Escrita moderna sem contrato proprio.
- Calculo financeiro novo no React.
- Storage, Firebase, Auth, sync, backup, polling ou fetch externo dentro da fronteira moderna.
- Duplicar a fonte de verdade ou ler `S` diretamente no React.
- Criar justificativa financeira inventada.

### Criterios para futuras fases de escrita

- contrato de comando versionado;
- idempotencia;
- validacao;
- autorizacao;
- confirmacao explicita do usuario;
- log de auditoria;
- backup;
- rollback;
- compatibilidade com dados antigos;
- teste contra duplicidade;
- nenhuma escrita otimista sem confirmacao;
- legado continua fonte de verdade;
- uma unica operacao piloto;
- feature flag;
- sem exclusao;
- sem alteracao financeira irreversivel.

## Sinais de revisao da decisao

- aumento confirmado de risco de schema drift;
- demanda real por escrita moderna com beneficio maior que risco;
- necessidade de desativar a dependencia do legacy em uma area especifica;
- falha recorrente de manutencao das fronteiras readonly.

## Rollback

- Reverter apenas os documentos desta fase.
- Manter o codigo funcional atual intacto.
- Reavaliar a estrategia somente quando existir novo conjunto de evidencias.