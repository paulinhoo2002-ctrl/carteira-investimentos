# Contrato operacional permanente — Carteira de Investimentos LEGACY

> Fonte versionada de decisões duráveis. Aplicável a Hermes, Codex e demais agentes que operem o LEGACY. Leia após `AGENTS.md`. Contratos técnicos específicos têm precedência no seu domínio. Relatórios históricos e conversas não substituem verificação do estado atual.

## 1. Identidade, autonomia e proteção

- Confirmar **PROJECT IDENTITY GATE** antes de qualquer trabalho: repositório `paulinhoo2002-ctrl/carteira-investimentos`, git root, origin, branch, HEAD, worktree, status e documentos de governança. `C:\Projetos\carteira-investimentos` é o checkout canônico a preservar; operações de implementação somente em worktree LEGACY isolada. Nunca alterar `carteira-2.0`, outras worktrees, unidade G: histórica ou outros projetos.
- **FULL SAFE** autoriza ler/editar código LEGACY, testes sintéticos, dependências de QA aprovadas, commits, push normal e Draft PRs. **Não** autoriza por si só merge, deploy manual, alteração Firebase de produção, OAuth, recursos pagos, acesso/exportação/importação/restauração de dados financeiros reais, nem Git destrutivo. Cada merge requer autorização humana específica da PR e do HEAD. Não contornar bloqueios do runtime.
- Nunca encerrar processo apenas pelo número de porta/PID. Confirmar CommandLine, ParentProcessId, identidade do emulador, rules e worktree imediatamente antes; processos de terceiros ou propriedade incerta exigem gate humano.
- Para tarefas extensas: fases independentes, testes focados antes de suíte ampla, checkpoint durável, `RESUME_FROM_PHASE` e próximo comando concreto. Não alegar trabalho em segundo plano nem execução após limite de sessão.

## 2. Finalidade do produto e eventos

- A carteira controla **ativos, compras, vendas, dividendos/proventos** e indicadores derivados (posição, quantidade, custos/preço médio, renda fixa, patrimônio, resultado/rentabilidade). Continuar suportando categorias de ativos existentes como ações, FIIs, ETFs e renda fixa.
- Não criar como funcionalidades principais aluguel de ações, empréstimos de ativos, trânsito de custódia ou movimentos administrativos. Classificações `NON_PORTFOLIO_INFO` e `IGNORED_FOR_CANONICAL_PORTFOLIO` são **candidatas**, sujeitas aos contratos reais e a testes; nunca excluir dados importados silenciosamente.
- Eventos que possam afetar propriedade, quantidade, direitos econômicos, custos ou impostos precisam ser preservados e classificados com cuidado. Ambiguidades permanecem em revisão; nunca fabricar compra/venda/provento, deduplicar sem evidência ou inflar reconciliação.
- Operações canônicas devem ser explicáveis pelo registro original/proveniência; importar notas da corretora requer prévia, classificação, detecção de duplicatas, resolução de conflitos e confirmação humana para qualquer aplicação em carteira real.

## 3. Semântica financeira protegida

- `UNKNOWN != ZERO`; `MISSING != ZERO`; `PARTIAL != COMPLETE`; `EXPECTED != RECEIVED`; `DECLARED != RECEIVED`; `NOT_TESTED != PASS`; `STALE != CURRENT`. Não coerir `null`, campo vazio ou preço ausente para zero confirmado; resultados e percentuais com cobertura insuficiente devem permanecer desconhecidos.
- Provento cadastrado **manualmente** e sem estado explícito equivale a `PAID` pelo contrato existente. `PENDING`, `CANCELLED`, `UNKNOWN`, `EXPECTED` e `DECLARED` explícitos não equivalem a recebimento.
- Comparações de renda passiva usam **somente recebidos**, meses consecutivos de calendário e cobertura suficiente para diferenciar mês sem dado de zero comprovado. Quando mês anterior é zero confirmado, percentual de crescimento não é definido.
- Preservar regras de custo e preço médio, taxas de venda, dedupe, eventos corporativos, renda fixa e histórico. Mudar fórmula ou schema só mediante defeito reproduzido, teste RED/GREEN, análise de compatibilidade e revisão adicional.

## 4. Autenticação, persistência e backup

- **Login Google ≠ backup.** Firebase Auth identifica o usuário; Firestore pode persistir/sincronizar dados, mas sincronização não é uma cópia independente recuperável. IndexedDB/browser também não é backup fora do dispositivo.
- Emulador Auth/Firestore com fixtures sintéticas **não** comprova automaticamente QA de Firebase hospedado. Para certificar uso diário, validar em projeto QA isolado e autorizado: login/logout, persistência após reload e nova sessão, proteção de rotas, duas identidades, isolamento de leitura/escrita por UID, regras negativas e recuperação de falhas. Não usar Preview ligado à produção para testes de escrita.
- Backups devem ter manifesto/formato suportado, identidade do proprietário, integridade e SHA-256, versionamento, retenção, destino independente, criptografia e recuperação testada. Nunca atribuir backup antigo sem owner scope a usuário atual automaticamente.
- Distinguir `BACKUP_CREATE`, `BACKUP_VERIFY` e `BACKUP_RESTORE_TEST`. **Script existente ≠ agenda ativa; backup-verify PASS ≠ restauração comprovada.** Confirmar agendamentos, entrega de alertas, cópias reais e armazenamento independente diretamente no ambiente, sem confiar apenas em relato histórico.
- Exportação real, OAuth Google Drive, conexão a storage externo, operações com dados pessoais e restore real requerem consentimento/gate próprios. Não registrar dados ou segredos nos logs. Restaurações automáticas usam somente fixtures sintéticas e destino isolado até autorização explícita.

## 5. Skills, modelos e execução eficiente

- A cada missão/fase relevante: descobrir modelos realmente acessíveis **no runtime ativo**; catálogo NVIDIA público é referência, não prova acesso. Escolher modelo por criticidade/custo (segurança e finanças requerem maior capacidade), registrar modelo usado e fallback real.
- Ordem normativa: **Superpowers primeiro → Ponytail full → Caveman → Skills especialistas mínimas por tarefa**, somente se encontradas e instruções lidas. Auditar `.agents/skills` e overlays locais sem presumir portabilidade; seguir `docs/ai/SKILLS_ROUTING.md`, `docs/ai/SKILLS.md` e `docs/ai/skills-routing.json`.
- `scripts/qa/select-skills.js` apenas aconselha. Não instala, executa nem concede autorização. Relatar Skills descobertas, consideradas, usadas/não usadas, justificativa e lacunas. Evitar carregar todo o catálogo ou duplicar grandes suítes verdes.

## 6. Definição de pronto e manutenção por anos

- A cada entrega registrar diff, testes executados **no SHA exato**, skips, CI do HEAD de PR versus CI da main, Vercel Preview versus Production, limitações e riscos. `VERCEL READY` ≠ aplicativo certificado; `COMPLETED_WITH_BLOCKERS` ≠ `PRODUCTION_READY=true`.
- Revisar PR antes de merge; não presumir que uma gravação local ou push aconteceu — verificar novo HEAD remoto e checks. Merges podem desencadear deploy automático e devem ser avaliados separadamente.
- Produto estável para uso diário exige autenticação/persistência hospedadas certificadas, isolamento, invariantes financeiros, backup realmente recuperável, rollback e ausência de bloqueadores críticos. Melhorias premium seguem em branches separadas para não bloquear uso estável.
- Planejar manutenção contínua: monitoramento e backups, revisão de alertas/dependências, atualização controlada, teste periódico de restauração, auditorias de segurança e arquitetura. Só declarar automações ativas mediante evidência da configuração e execução.
- Atualizar `PROJECT_STATE` com realidade atual, `PROJECT_MEMORY` com aprendizados duráveis e `NEXT_STEP` com próximo gate; não acumular relatórios contraditórios sem assinalar que são históricos.

## 7. Handoff mínimo verificável

`MISSION`, `PROJECT_IDENTITY_GATE`, `MODEL_AVAILABLE`, `MODEL_USED`, `SKILLS_DISCOVERED`, `SKILLS_USED`, `BRANCH`, `HEAD`, `FILES_CHANGED`, `TESTS`, `CI`, `VERCEL`, `BLOCKERS`, `GO_NO_GO`, `PRODUCTION_READY`, `NEXT_HUMAN_GATE`, `RESUME_FROM_PHASE`, `NEXT_COMMAND`, `MERGE=false`, `REAL_FINANCIAL_WRITES=0` (quando aplicável). Nunca transformar relatório de agente em evidência suficiente sem checar o repositório/ambiente.
