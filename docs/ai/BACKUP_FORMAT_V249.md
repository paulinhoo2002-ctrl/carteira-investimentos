# Backup V249 / V323C — formato e recuperação

O backup V249 é um contêiner JSON local-first, portátil e versionado. Ele é
um arquivo de dados, não um script executável e não é criptografia, assinatura
ou autenticação.

## Contêiner

```json
{
  "manifest": {
    "format": "carteira-investimentos-backup",
    "backupFormat": "carteira-investimentos-backup",
    "backupVersion": "2.0",
    "schemaVersion": 2,
    "appVersion": "...",
    "createdAt": "ISO-8601",
    "exportMode": "LOCAL_ONLY",
    "domains": [{"name":"assets","version":"1","count":0,"required":true,"present":true}],
    "contentInventory": [],
    "recordCounts": {},
    "schemaIdentifiers": {},
    "checksums": { "algorithm": "SHA-256", "payload": "..." }
  },
  "payload": { "state": {}, "config": {}, "metadata": {} }
}
```

O checksum é calculado sobre a serialização canônica do `payload`: chaves
ordenadas, registros identificáveis ordenados por identidade e UTF-8. O
manifest não participa do próprio checksum, evitando dependência circular. O
checksum do manifesto protege os metadados e as declarações de domínio.

## Domínios e compatibilidade

`portfolio`, `assets`, `transactions`, `income`, `fixedIncome`, `goals` e
`settings` são obrigatórios. `fixedIncome` conta posições de renda fixa dentro
de `assets` e eventos em `rfEvents`; esses registros continuam nos seus campos
originais. Domínios opcionais só aparecem como presentes quando o store existe:
`corporateEvents` fica num campo de payload separado porque é cache público em
modo somente leitura; não vai para `civ5` nem vira ledger. `performance`
contém snapshots/fluxos V76 derivados, sem autoridade para alterar o ledger.
O campo `payload.runtime` só é emitido quando existe dado V76 persistido.
Ausência tem `present:false` e contagem `null`; domínio presente vazio tem
`present:true` e contagem `0`.

Quando `payload.config.divGoal` está presente, precisa ser número finito e não
negativo; texto inválido nunca é convertido silenciosamente em zero. Se qualquer
store V76 estiver persistido, ambos os stores devem estar presentes e passar na
validação estrutural e dos campos de cada registro antes do export/restore. Chave
persistida vazia, JSON/schema inválido, registro incompleto, data impossível,
metadado obrigatório inválido ou store complementar ausente aborta o backup em
vez de produzir snapshot vazio. A validação não normaliza nem substitui os
registros recebidos. Para stores V76 legados, o migrador existente preenche
`trackingStartDate:null` quando o campo não existe; registros e valores não são
alterados.

Backups completos V1.0/V1.1 passam pela migração explícita em memória. Se faltar
qualquer domínio obrigatório, o estado é `PARTIAL` e restore é bloqueado.
Schema futuro resulta em `UNSUPPORTED_FUTURE_SCHEMA`; tipo de ativo
desconhecido resulta em `UNSUPPORTED_TYPE`. Corrupção, incompatibilidade e
schema não suportado mantêm estados separados; nenhum é tratado como vazio.

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

Backups V2/V249/V323C permanecem em prévia somente na UI; o motor de teste
aplica apenas em store isolado e cobre snapshot lógico, rollback, roundtrip e
idempotência. A rota de compatibilidade legacy pode restaurar apenas após
manifesto completo validado, prévia refeita e confirmação explícita. Falhas de
checksum, versão futura, domínio ausente, tipo desconhecido, chaves perigosas,
IDs duplicados ou referências impossíveis falham fechado.

`UNKNOWN`, `null`, ausência e `UNSUPPORTED` não são convertidos em zero. O
preview classifica registros como `ADD`, `UNCHANGED`, `UPDATE`, `CONFLICT`,
`UNSUPPORTED` ou `SKIP`, sem writes durante análise.

O arquivo contém dados financeiros sensíveis e deve ser armazenado em local
seguro. Não há backup automático em nuvem nem serviço pago obrigatório.
