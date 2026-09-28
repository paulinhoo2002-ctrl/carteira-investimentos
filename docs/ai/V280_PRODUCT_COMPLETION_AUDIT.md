# V280 — Auditoria de conclusão funcional do produto

**Status:** auditoria documental concluída; nenhuma implementação de produto foi iniciada.
**Base:** `origin/main` em `e3a295833e7ac5227b86b7f88deab41e82679a4e`, com a documentação V279A2/V279B nesta branch.
**Escopo:** conclusão funcional, integridade dos dados, workflows, estados e prontidão. O redesenho visual permanece congelado como referência.

## Resumo executivo

O produto tem uma base funcional ampla: carteira e classes de ativos, proventos, renda fixa, metas, relatórios somente leitura, importações com confirmação explícita em fluxos legados, mecanismos de backup e uma base de histórico/performance com estados de prontidão. Isso não equivale a certificação de conclusão ponta a ponta. A auditoria foi estática e documental; não executou jornadas no navegador nem revalidou os números históricos de testes.

Foi encontrado um bloqueador de integridade na superfície Rentabilidade: o gráfico legado `rentabilityHistory()` reconstrói posições passadas usando preços atuais disponíveis em `S.assets`, e os benchmarks apresentados pelo fluxo legado podem ser gerados por `RENT_BENCH`/`rentBenchSeries()` a partir de taxas anuais fixas. O fato de existir uma série de snapshots V248 não prova que esse gráfico consuma essas avaliações datadas. A tela e os contratos de histórico, portanto, podem divergir. Não se deve chamar essa série de retorno histórico/benchmark real nem expor como métrica disponível até haver avaliação e benchmark datados e alinhados. A correção fica para a missão de produto seguinte; nada foi alterado no runtime.

Outras lacunas são de fechamento e prova: o Import Center é explicitamente simulado, cobertura XP/BTG depende de fixtures legítimos, restore do backup V249 permanece em preview, readiness de TWR/XIRR depende de dados reais por carteira, e uma certificação completa das jornadas autenticadas/desktop/mobile não foi feita nesta auditoria. Essas limitações devem aparecer como indisponível, parcial ou pendente — nunca como zero, sucesso ou suporte completo por inferência.

## Escopo, evidência e limitações

Fontes principais: contratos e documentação canônica em `docs/ai/`, `index.html`, módulos puros de relatórios/importação/performance, e testes direcionados por domínio. Foram examinados 24 domínios/superfícies descritos na matriz irmã. Não foram lidos arquivos de `local-imports`, arquivos de archive em massa ou projetos de referência; não houve browser QA, chamada a serviços externos, importação, restore, escrita financeira/fiscal nem teste de produção. Referências históricas a resultados de testes não são resultados desta execução.

Um teste existente ou handler encontrado demonstra contrato/cobertura estática, não que toda ação esteja operacional em todos os estados de autenticação, largura e dados. “Sem ação morta confirmada” é uma conclusão estática, não certificação de jornada.

## Contratos que não podem regredir

- `UNKNOWN != ZERO`; `PARTIAL != COMPLETE`; `STALE != FRESH`; `ESTIMATE != RECEIVED`.
- `ENGINE_AVAILABLE != DATA_READY`; carteira e fluxos permanecem wallet-scoped.
- Compra, venda, provento, taxa e imposto não viram aporte/retirada externo por inferência.
- Nenhuma interpolação ou cotação atual retroprojetada pode ser apresentada como histórico real.
- Nenhuma escrita financeira/fiscal implícita; confirmação explícita, preview e rollback continuam necessários.
- Patrimônio responde “o que possuo e quanto vale”; Rentabilidade responde “como o portfólio performou”. Não duplicar métricas sem contexto distinto.
- V279B `VISUAL_CANON_V2=FROZEN_REFERENCE`. Só corrigir defeito visual comprovadamente bloqueante para uso; redesenho abrangente é fase posterior.

## Forças e dívida funcional observada

**Forças:** há módulos puros/read-only para relatórios e import center; contratos explícitos de cash flow externo; distinção de valores aplicado/bruto/líquido em renda fixa; estados de proveniência/freshness em superfícies de dados; readiness de performance que pode bloquear métrica real; confirmação explícita em fluxos legados de importação; testes de domínio para backup, autenticação, offline, proventos, IRPF e workflows.

**Dívida:** a Rentabilidade legado não está claramente isolada do histórico sintético descrito acima; import center não conclui ingestão real; alguns brokers não têm amostras saneadas; restore V249 não executa escrita; diversas áreas têm testes unitários/estáticos mas não uma jornada completa atual demonstrada; cobertura e frescor variam entre fontes; suporte móvel e acessibilidade não foram certificados neste trabalho. Existem fluxos com autoridade local/cloud e estados de sessão que exigem cobertura explícita, não suposição.

## Auditoria por domínio

Ver [PRODUCT_COMPLETION_MATRIX.md](PRODUCT_COMPLETION_MATRIX.md) para cada superfície, contrato de dados/escrita, estados, testes existentes e lacuna. Em alto nível:

| Domínio | Estado evidenciado | Lacuna que impede declarar conclusão |
|---|---|---|
| Dashboard | Composição de carteira e indicadores existentes | Fonte e data de cada métrica devem permanecer explícitas; jornada completa não revalidada |
| Ativos / detalhes | Posições, ações e detalhe de ativo existentes | Comprovar todas as ações, estados parciais e persistência ponta a ponta |
| Dividendos | Recebidos e estimados têm distinções contratuais | Cobertura/proveniência e reconciliação de fontes não são universalmente completas |
| Renda fixa | Valores aplicados/brutos/líquidos e fontes são distintos | Freshness/cobertura por instrumento; IPCA+ exato não pode ser alegado sem suporte |
| Patrimônio | Histórico e snapshots têm fundação | Não misturar saldo atual com rentabilidade; lacunas de histórico precisam permanecer visíveis |
| Rentabilidade | Motor/datamodel datado existe em parte do sistema | Gráfico legado com preço atual retroprojetado/benchmark de taxa fixa: P0 |
| Aportes, transações, metas | Workflows e testes de domínio existem | Jornada real, validação, edição/cancelamento e recuperação requerem certificação por fluxo |
| Relatórios / análise / rebalanceamento | Modelos read-only e estados de dados incompletos | Não sugerir precisão/execução que os dados e autoridade não sustentam |
| Importação | Pipeline e parsers limitados existem; center é simulação | Fechar fluxo real suportado e fixtures; XP/BTG continua bloqueado sem evidência |
| Eventos corporativos | Parsing/preview e proteção contra aplicação automática | Identidade, cobertura e aplicação financeira permanecem limitadas |
| IRPF | UI, inteligência de custo e testes existem | Validação contábil/legal independente; campos incompletos devem exigir revisão |
| Backup/portabilidade | Export seguro e preview V249 | Restore moderno real não está habilitado; decisão de autoridade e teste de recuperação faltam |
| Auditoria, integridade, freshness | Monitoramento e centro read-only existem | Não transformar sinalização em correção automática; provar lifecycle em runtime |
| Auth, sessão, offline/cloud | Gates e contratos existem | Matriz atual de jornadas autenticadas/offline e conflitos não foi executada |

## Ações, estados e definição de “completo”

O inventário estático de handlers não apontou nome de ação primária sem implementação; isso não elimina a necessidade de verificar cada caminho visível com dados ausentes, validação inválida, falha de rede, read-only, conflito e sucesso. Para cada workflow financeiro, definir: pré-condições, autoridade, preview, confirmação, persistência esperada, idempotência/deduplicação, erro recuperável, cancelamento e evidência pós-ação. Nenhum fluxo é “completo” se o botão existe mas não há resultado observável ou se a UI comunica sucesso antes da persistência.

Estados mínimos por superfície: carregando; vazio explicável; parcial; desconhecido; desatualizado; bloqueado por permissão; erro recuperável; sucesso com origem/data. Para estimativas, indicar que são estimativas. Para histórico insuficiente, mostrar requisito ausente e não substituir por zero.

## P0 — Rentabilidade e série temporal confiável

Evidência estática encontrada em `index.html`:

- `RENT_BENCH` guarda constantes anuais para benchmarks.
- `rentBenchSeries()` deriva uma curva mensal por composição matemática dessas constantes.
- `rentabilityHistory()` reconstrói posições históricas e usa o mapa de preços atuais dos ativos para valorar os períodos anteriores.
- A tela legado usa esse resultado no gráfico, enquanto a superfície V248 documenta que benchmark histórico exige série alinhada e não usa preço atual/benchmark estático como histórico.
- `tests/rentability-visual-canon.test.js` verifica nomes/estrutura visual, não semântica temporal nem proveniência. O teste do motor histórico datado é uma base útil, mas não prova que o gráfico legado o consuma.

**Impacto:** uma curva derivada de cotação atual ou taxa fixa pode ser interpretada como retorno/benchmark histórico observado.
**Gate:** métricas reais ficam indisponíveis até a UI consumir valuations datadas e fluxos externos confiáveis, com benchmark datado e alinhado quando comparado. Sem cobertura completa, explicitar indisponibilidade/parcialidade; não interpolar, projetar ou retroprojetar.
**Aceite para V281:** testes com datas e valores conhecidos; mudar preço atual sem alterar histórico não muda a série passada; benchmark sem observações datadas alinhadas retorna unavailable; cobertura parcial não vira série completa; UX mapeia os requisitos ausentes. Preservar distinção `ENGINE_AVAILABLE`/`DATA_READY`.

## Outras áreas que requerem fechamento

- **Importação:** manter center de simulação enquanto a ingestão real não estiver explicitamente autorizada e certificada. Fechar primeiro fluxos B3/Inter com evidência e dedupe; fixtures de XP/BTG devem ser reais, sanitizadas e fornecidas legitimamente. Não declarar cobertura a partir de exemplos sintéticos.
- **TWR/XIRR e patrimônio histórico:** o motor puro não prova prontidão da carteira; requer snapshots confiáveis, identidade da carteira, datas econômicas e fluxos externos classificados. Falta de wallet ID permanece bloqueante.
- **Backup/restore:** export e validação de preview são capacidades distintas de restore. Qualquer implementação precisa validar integralmente antes da escrita, preservar backup/hash, requerer confirmação explícita e testar rollback.
- **Renda fixa, proventos e eventos:** preservar valores e datas com semântica própria; fonte ausente ou stale não deve ser substituída por estimativa sem rótulo.
- **IRPF:** não certificar exatidão legal pelo teste de UI; requer proveniência de custo/histórico e revisão explícita onde faltar evidência.
- **Auth/offline/cloud:** executar matriz de estados com navegador isolado e dados sintéticos; sem credenciais/estado autenticado do usuário em artefatos.

## Plano de conclusão funcional

1. **V281 — Integridade temporal da Rentabilidade (P0):** corrigir consumo de série e bloqueio de benchmark; sem redesign.
2. **V282 — Fechamento dos workflows centrais:** contrato de cada ação, validação, confirmação, persistência, erro/cancelamento e testes E2E isolados.
3. **V283 — Ingestão e reconciliação:** concluir apenas fontes suportadas; fixtures saneadas para novos brokers; dedupe e origem.
4. **V284 — Histórico/performance/reporting:** conectar valuations, cash flows confiáveis, wallet identity e datas; manter TWR/XIRR bloqueados onde faltar requisito.
5. **V285 — Domínios complementares:** renda fixa, proventos, metas, rebalanceamento e eventos com estados/proveniência completos.
6. **V286 — Recuperação, sessão e offline:** decisão explícita sobre restore V249, rollback e jornadas de autoridade local/cloud.
7. **V287–V289 — Regressão funcional e certificação:** desktop/mobile, acessibilidade, falhas, autenticação isolada e prontidão de release; reusar testes verdes somente quando SHA/arquivos forem idênticos.
8. **V290+ — Consolidação visual:** após a fundação funcional, usar o canon congelado para implementação visual por fatias.

Dependência central: não certificar relatórios/performance antes de fechar qualidade/proveniência do dado que os alimenta. A ordem acima não é ranking numérico; é sequência de risco e pré-requisito.

## Critério global de produto funcionalmente completo

Cada ação primária visível tem contrato e jornada testada; todas as escritas são autorizadas, previewadas quando material, idempotentes ou deduplicadas e verificáveis após reload; dados possuem origem/data/freshness; dados ausentes/parciais permanecem honestos; métricas temporais usam evidência temporal real; import/export/restore têm limites explícitos e recuperação validada; auth/offline/conflitos têm estados reproduzíveis; não existem referências operacionais quebradas. Testes unitários isolados são necessários, mas não substituem E2E de jornadas críticas. Certificação visual completa é uma etapa posterior e não pode mascarar bloqueador de integridade.

## Estado visual

`VISUAL_CANON_V2=FROZEN_REFERENCE`. O audit V279B conserva direção visual e prioridades; V280 não altera tokens, layout, telas, imagens ou código. Só defeito comprovadamente impeditivo de compreensão/uso entra em correção urgente, sem redesign global. Próxima implementação visual ampla continua adiada até os bloqueadores funcionais P0 estarem fechados.

## Próxima missão

`V281_HISTORICAL_RETURN_TRUTH_REPAIR` — reparar a semântica temporal do gráfico legado e integrar o contrato de série datada/readiness existente; manter gráficos e comparações indisponíveis quando as evidências não satisfizerem requisitos. Esta missão ainda não foi iniciada nem autorizada por este documento.
