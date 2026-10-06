# Backup V249 — formato e recuperação

O backup V249 é um contêiner JSON local-first, portátil e versionado. Ele é
um arquivo de dados, não um script executável e não é criptografia, assinatura
ou autenticação.

## Contêiner

```json
{
  "manifest": {
    "backupFormat": "carteira-investimentos-backup",
    "backupVersion": "1.2",
    "appVersion": "...",
    "createdAt": "ISO-8601",
    "exportMode": "LOCAL_ONLY",
    "contentInventory": [],
    "recordCounts": {},
    "schemaIdentifiers": {},
    "domains": [
      { "name": "assets", "version": 1, "count": 0, "required": true }
    ],
    "checksums": { "algorithm": "SHA-256", "payload": "..." }
  },
  "payload": { "state": {}, "config": {}, "metadata": {} }
}
```

## Contrato V324 (1.2)

O manifesto declara os domínios obrigatórios `portfolio`, `assets`,
`transactions`, `income`, `fixedIncome`, `goals`, `settings` e `performance`,
cada um com versão e contagem. Domínio ausente é `PARTIAL`; contagem, versão ou
identificador de schema incompatível bloqueia a prévia. `fixedIncome` conta os
eventos `rfEvents`; posições de renda fixa permanecem incluídas em `assets`.
Corporate Events continua shadow-only e não é persistido como domínio canônico.

O suplemento V76 de snapshots e fluxos é incluído em `performance`. Uma cópia
mensal é criada no primeiro carregamento elegível do mês, depois da hidratação
Firebase e quando a sincronização está estável; em dezembro também é criada uma
cópia anual. Se a nuvem ainda não carregou, há escrita pendente ou houve erro,
a captura aguarda uma nova tentativa após a hidratação/sincronização. Assim, um
cache local anterior à nuvem não pode marcar o período como concluído. A
elegibilidade é revalidada depois da leitura assíncrona do histórico e antes de
capturar o estado. O app
precisa ser aberto: não há execução em segundo plano garantida. As cópias ficam
no IndexedDB deste navegador, com retenção de 12 mensais; anuais, itens marcados
para recuperação, itens inválidos e a cópia
mensal válida mais recente são preservados. O navegador ainda pode remover
dados locais. Armazenamento externo e e-mail permanecem desabilitados.
Quando o período já possui cópia verificada, o resultado é `NOOP`, não `SAVED`.

Antes de usar uma entrada do IndexedDB para deduplicar um período ou planejar
retenção, o app recalcula o SHA-256 do payload e verifica o contrato do backup;
o campo `status` salvo no índice local não é autoridade. Um snapshot mensal com
payload inválido não suprime a cópia do período. A retenção protege a cópia
mensal válida mais recente e não remove entradas inválidas automaticamente.

O checksum é calculado sobre a serialização canônica do `payload`: chaves
ordenadas, registros identificáveis ordenados por identidade e UTF-8. O
manifest não participa do próprio checksum, evitando dependência circular.

## Autoridade e exclusões

Estado financeiro autoritativo, movimentações, proventos, posições manuais de
renda fixa e overrides são exportados quando presentes. Séries derivadas,
cache de mercado e diagnósticos são rebuildable ou metadata opcional. Tokens,
cookies, sessões, localStorage de autenticação, credenciais, secrets e estado
CDP são removidos e nunca fazem parte do arquivo.

Corporate Events continua `SHADOW_READ_ONLY`; uma restauração não realiza
eventos nem sobrescreve posição oficial. A autoridade manual de Renda Fixa é
preservada.

## Pipeline seguro

`FILE → PARSE → FORMAT DETECTION → VERSION CHECK → INTEGRITY CHECK →
STRUCTURAL VALIDATION → SEMANTIC VALIDATION → PREVIEW → DIFF → CONFLICT
ANALYSIS → USER CONFIRMATION → RESTORE`

Para o formato portátil V249, a etapa de confirmação/restore real permanece
bloqueada. O motor de teste aplica somente em store isolado e suporta snapshot
lógico, rollback, roundtrip e idempotência. No caminho legado de importação que
permanece habilitado, `applyBackupData` primeiro lê o estado e a configuração
atuais, gera, valida e guarda um backup manual local no IndexedDB; qualquer
falha nesse preflight cancela a restauração antes de `applyStorageTransaction`.
Esse snapshot é uma recuperação manual e não restaura os dados automaticamente.
Falhas da escrita ainda usam o rollback transacional existente. Falhas de
checksum, versão futura, chaves perigosas, IDs duplicados ou referências
impossíveis falham fechado.

`UNKNOWN`, `null`, ausência e `UNSUPPORTED` não são convertidos em zero. O
preview classifica registros como `ADD`, `UNCHANGED`, `UPDATE`, `CONFLICT`,
`UNSUPPORTED` ou `SKIP`, sem writes durante análise.

O arquivo contém dados financeiros sensíveis e deve ser armazenado em local
seguro. Não há backup automático em nuvem nem serviço pago obrigatório.
