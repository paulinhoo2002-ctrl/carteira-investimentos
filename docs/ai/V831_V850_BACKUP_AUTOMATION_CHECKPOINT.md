# V831–V850 — checkpoint de backup e recuperação

Data: 2026-10-10  
Repositório: `paulinhoo2002-ctrl/carteira-investimentos`  
Worktree: `C:\Projetos\carteira-investimentos.worktrees\v831-v850-backup-automation`  
Branch: `codex/v831-v850-backup-automation`  
Base: `efc9778e57f17e3778a69f4214301cacef670153`

## Escopo executado

- Auditoria do manifesto `backup-portability.js`, chamadas na UI, snapshots IndexedDB e `scripts/maintenance/backup-verify.js`.
- Snapshots IndexedDB agora carregam um escopo derivado por SHA-256 do UID autenticado. Listagem, deduplicação e retenção são limitadas ao proprietário; novas versões não sobrescrevem arquivos anteriores.
- Backups com escopo exigem identidade correspondente para validação e prévia de restauração. O fluxo de exportação e o backup de segurança pré-restauração exigem sessão autorizada e estado cloud sincronizado/estável.
- O verificador CLI aceita apenas JSON reconhecido e suportado pelo contrato do app, valida o manifest e o checksum interno, e exige sidecar SHA-256 externo correspondente. É somente leitura.
- Procedimento/documentação corrigidos para distinguir capacidade do script de agenda realmente configurada.

## Evidência local

- Suíte focal V249/V267/V324/V831/V592/restore: 54/54 PASS.
- `npm run test:ui`: 303/303 PASS; `npm run test:local-synthetic`: 44/44 PASS; `npm run test:qa-harness`: 5/5 PASS; `npm run test:backup-restore`: 9/9 PASS; `npm run build`: PASS; sintaxe e `git diff --check`: PASS.
- `npm run test:modern`: 719 PASS, 9 arquivos não carregaram por `Cannot find module 'react'`; classificados como bloqueio de dependência. `qa:all` e `verify:release` pararam em `build:modern` porque `vite` não está instalado.
- Fixtures cobrem duas contas sintéticas no mesmo período, retenção de 12 pontos, rejeição de proprietário diferente/ausente, duplicata exata, sidecar ausente/divergente, JSON arbitrário, corrupção e backup válido.
- Nenhum diretório real de backups foi listado ou lido; nenhuma exportação/restauração foi realizada.
- Dependências npm ausentes nesta worktree. `npm ci` não foi executado; `AGENTS.md` exige autorização humana específica para instalação. Builds/testes dependentes de React/Vite/Playwright seguem pendentes até essa autorização ou CI equivalente.

## Estado e limites

- A aplicação possui snapshot IndexedDB local oportunista, condicionado a sessão autenticada autorizada e sincronização estável. Isso não é armazenamento externo nem automação independente do dispositivo.
- Não foi verificada nem configurada agenda Hermes/Task Scheduler, Drive, OAuth, notificação, armazenamento pago ou workflow agendado.
- Snapshots locais antigos sem escopo de proprietário permanecem intactos e não são mostrados na listagem filtrada por usuário; atribuir propriedade automaticamente seria inseguro. Arquivos exportados antigos sem escopo continuam no fluxo legado de importação, sujeito à confirmação existente.
- Pode ter ocorrido sobrescrita histórica de snapshots mensais entre contas; não inspecionamos IndexedDB real e não é possível quantificar esse risco nesta missão.
- `REAL_EXPORT=NOT_PERFORMED`, `REAL_RESTORE=NOT_PERFORMED`, `PRODUCTION_WRITES=0`, `MERGE=false`.

## Próxima ação

1. Observar CI e Preview do SHA publicado e repetir os gates locais bloqueados quando as dependências estiverem disponíveis/autorizadas.
2. Manter gates humanos para primeiro export real, OAuth/Drive, acesso a arquivos financeiros, escrita Firebase, restore/migração real e merge.
