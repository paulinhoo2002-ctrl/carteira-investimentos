# Backup real do LEGACY — procedimento do proprietário (2026-10-10)

## Por que o backup-root está vazio
O LEGACY é uma SPA que **exporta backup via download do navegador** (botão "Exportar backup" na tela de configurações gera `carteira-investimentos-backup-AAAA-MM-DD-HH-mm.json` na pasta Downloads). O app **não grava** arquivos no disco — por design (sandbox do browser). O diretório aprovado `C:\Projetos\_backups\carteira-investimentos` está vazio simplesmente porque **nenhum backup exportado foi ainda copiado para lá**. Isso não é defeito; é fluxo manual documentado (docs/MANUAL-USO.md, seção Exportar).

## O que protege os dados hoje (honesto)
- **localStorage + IndexedDB** no navegador = fonte primária local do usuário.
- **Firestore (produção)** = sincronização em nuvem da conta autenticada do dono (projeto carteira-de-investimento-16725). Dados sincronizados sobrevivem a limpezas locais.
- **Backup exportado** = cópia independente portátil. **Única proteção contra perda da conta/nuvem.** Sem um backup exportado guardado, um problema na conta Google + limpeza local perderia tudo.

## Procedimento do proprietário (≤2 minutos, mensal ou antes de mudanças grandes)
1. Abrir o app em produção (https://carteira-investimentos-delta.vercel.app) e **fazer login**.
2. Ir em **Configurações → Exportar backup**. O navegador baixa `carteira-investimentos-backup-<data-hora>.json`.
3. Copiar o arquivo para `C:\Projetos\_backups\carteira-investimentos\`.
4. Gerar o hash sidecar para verificação automática (PowerShell):
   `Get-FileHash "C:\Projetos\_backups\carteira-investimentos\<arquivo>.json" -Algorithm SHA256 | ForEach-Object { "$($_.Hash.ToLower())  <arquivo>.json" | Set-Content "C:\Projetos\_backups\carteira-investimentos\<arquivo>.json.sha256" }`
5. O verificador pode ser agendado pelo proprietário depois de configurar uma tarefa local. A existência do script, por si só, não significa que há uma agenda ativa nem que notificações estão configuradas.

## O que a automação já faz (sem tocar nos seus dados)
- `scripts/maintenance/backup-verify.js`: valida manifest/schema/domínios/checksum do backup do aplicativo, SHA-256 externo no sidecar e idade <35d. Read-only — nunca deleta, move ou restaura.
- Não há workflow de backup agendado no repositório. A cópia IndexedDB do aplicativo é local ao navegador, oportunista e condicionada à sessão sincronizada aberta; não é armazenamento externo nem recuperação independente do dispositivo.
- Suítes sintéticas (npm test): backup/restore/rollback/idempotência/dedupe — 32 testes verdes, sem dados reais.

## Limite operacional

O documento descreve o procedimento manual e as capacidades locais existentes. Nenhuma agenda Hermes/Task Scheduler, OAuth de Drive, destino externo ou aviso foi verificado nesta revisão; portanto, backup automático fora do navegador permanece **NÃO CONFIGURADO**. Não execute o verificador contra a pasta padrão sem autorização específica para acessar artefatos financeiros locais.

## Limites por design (gates humanos)
- Exportar dados reais = só o dono (botão no app). O agente não exporta carteira real.
- Restauração real = só com autorização explícita e arquivo específico; o app pede confirmação dupla na importação.

## Retenção sugerida
Manter os últimos 3–6 backups mensais no root aprovado; o verificador avisa quando o mais recente passar de 35 dias.
