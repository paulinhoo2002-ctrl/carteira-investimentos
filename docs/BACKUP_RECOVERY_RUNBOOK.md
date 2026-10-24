# Runbook — Backup e Recuperação (M911-M920)

## Estado atual
- Backup protegido real: `C:/Projetos/_backups/carteira-investimentos/carteira-investimentos-backup-protegido-2026-10-17-19-57.json` (543 KB, AES-GCM + PBKDF2 310k SHA-256)
- Cópia redundante: `.../redundant/` (mesmo conteúdo, sidecars independentes)
- Snapshots das regras Firestore: `firestore.rules.hosted.snapshot.2026-10-23` + sidecars
- Última verificação completa: 24/10/2026 — INTEGRITY_CHECK=PASS (2 cópias, 8/8)

## Rotina (mensal ou após cada exportação nova)

### 1) Verificar integridade (30s, sem senha)
```bash
node scripts/backup/verify-integrity.js
```
- PASS = todos os sidecars SHA-256 conferem nas DUAS cópias + backup com menos de 30 dias.
- FAIL = algo mudou/corrompeu: NÃO apague nada — investigue antes de regenerar.

### 2) Certificar recuperação REAL (2 min, uma vez por linha de backup; exige a senha)
```bash
node scripts/backup/verify-recovery.js
```
- Você digita a senha NO SEU TERMINAL (nunca compartilhe com agentes/chat).
- A ferramenta: valida sidecar → trabalha numa CÓPIA descartável → deriva a chave (PBKDF2 310k) → AES-GCM autentica → valida estrutura (contagens, SEM valores) → imprime `REAL_RECOVERY_CERTIFIED=YES`.
- Senha errada ou arquivo adulterado: aborta sem alterar nada (`DESCRYPT FALHOU`).
- **O que isso prova:** os dados são RECUPERÁVEIS (senha + arquivo + formato funcionam de ponta a ponta), não apenas íntegros.
- **O que NÃO faz:** não restaura na carteira — a restauração real continua sendo sua decisão explícita, pelo próprio app (Configurações → Restaurar), de preferência após um backup novo.

## Critérios de certificação
| Estado | Significado |
|---|---|
| INTEGRITY_VERIFIED | Sidecars conferem (arquivo é o que foi exportado) |
| REAL_RECOVERY_CERTIFIED | Ferramenta descriptografou + validou payload com a senha real |
| RECOVERY_NOT_CERTIFIED | Nenhum dos dois acima |

## Regras de ouro
1. A senha do backup existe SÓ na sua cabeça — Hermes nunca pede nem recebe.
2. Backup novo antes de QUALQUER restauração real.
3. Restauração de verdade: destino descartável primeiro, carteira de produção depois (e só você).
4. Nunca aperte o sidecar `.sha256` junto com o arquivo ao regenerar — o par precisa viajar junto.
5. Se esquecer a senha: o backup é irrecuperável por design (zero backdoor). Exporte novo backup imediatamente e guarde a senha em local seguro.
