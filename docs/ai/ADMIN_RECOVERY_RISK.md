# Risco de lockout administrativo — Firestore/Firebase (documentação, sem implementação)

Status: **documento apenas**. Nenhuma escrita de produção, nenhuma mudança de
registry de autorização, nenhuma regra deployada. Este arquivo NÃO faz parte do
domínio fiscal; existe para registrar o risco operacional identificado durante
as missões IR2026/auth-demo (P22 da missão LEGACY_IR2026_FISCAL_OPENING).

## CURRENT_ADMIN_DEPENDENCY

- Admin do projeto Firebase/Firestore (`carteira-de-investimento-16725`) e do
  projeto Vercel amarrados a **uma única conta Google** (paulinhoo2002@gmail.com).
- A mesma conta é o owner do repositório GitHub e do canal de deploy.
- Registry de autorização hospedado (`authorizedUsers`) é imutável para
  clientes (regras fail-closed); mutação exige caminho admin = a mesma conta.

## RECOVERY_GAP

- Perda de acesso à conta Google (2FA, comprometimento, bloqueio) ⇒ perda
  simultânea de: console Firestore (dados financeiros), deploys Vercel,
  GitHub (código) e do único caminho de mutação de autorização.
- Backup real dos dados hospedados: **AUSENTE** (export pendente — já
  registrado no estado do projeto). Lockout sem backup = perda permanente de
  dados financeiros.
- Não há segundo owner, não há runbook de recuperação, não há credenciais de
  emergência em cofre.

## ADMIN_RECOVERY_V1 — design (proposal only)

Design mínimo que elimina lockout permanente de e-mail único:

1. `PRIMARY_OWNER` = conta atual (paulinhoo2002@gmail.com), MFA obrigatório.
2. `SECONDARY_RECOVERY_OWNER` = segunda conta Google pessoal do dono com papéis:
   GCP/Firebase `Owner` (ou no mínimo `datastore.viewer` + export), Vercel `Owner`,
   GitHub `Owner` (ou org com ≥2 owners). Nomeada em runbook, nunca no repo.
3. `RECOVERY_RUNBOOK` (versão local criptografada, fora do Git): passos de
   acesso de emergência, rota GCP support com evidências de domínio,
   checklist de revogação de acessos comprometidos.
4. `BACKUP_PRECONDITION` = nenhum cambio de IAM antes do primeiro export
   completo + restore verificado (suite backup-restore).
5. Invariantes: registry de autorização permanece fail-closed; nenhum
   processo de recuperação escreve dados financeiros; auditoria de qualquer
   uso do SECONDARY_RECOVERY_OWNER.

Status: **DESIGN_ONLY**. Nada implementado; nenhuma escrita de produção.

## SAFE_RECOVERY_DESIGN_PROPOSAL (a executar só sob autorização explícita)

1. **Backup antes de tudo**: export completo do Firestore (via app/console)
   e verificação de restaurabilidade (o projeto já possui suite
   backup-restore). Sem backup, qualquer mudança de IAM é risco.
2. **Segundo owner no projeto GCP/Firebase** (papel Owner/Editor) para uma
   conta Google secundária do próprio dono, com MFA; mínimo: conta
   backup-only com permissão de export de dados.
3. **Owner secundário no Vercel** e no GitHub (ou organization com ≥2 owners).
4. **Runbook de recuperação** versionado (passo a passo de lockout: rota GCP
   support, evidências de propriedade, chaves de emergência em cofre
   local criptografado — nunca no repo).
5. **Registry de autorização**: manter fail-closed; qualquer adição de admin
   extra via caminho admin documentado e auditado, nunca via client.

Nenhum destes passos foi executado nesta missão. Fonte de verdade do estado
hospedado permanece o quadro PROJECT_STATE/NEXT_STEP do repo.
