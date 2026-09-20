# Backup V249 — formato e recuperação

O backup V249 é um contêiner JSON local-first, portátil e versionado. Ele é
um arquivo de dados, não um script executável e não é criptografia, assinatura
ou autenticação.

## Contêiner

```json
{
  "manifest": {
    "backupFormat": "carteira-investimentos-backup",
    "backupVersion": "1.0",
    "appVersion": "...",
    "createdAt": "ISO-8601",
    "exportMode": "LOCAL_ONLY",
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

Na V249, a etapa de confirmação/restore real permanece bloqueada. O motor de
teste aplica somente em store isolado e suporta snapshot lógico, rollback,
roundtrip e idempotência. Falhas de checksum, versão futura, chaves perigosas,
IDs duplicados ou referências impossíveis falham fechado.

`UNKNOWN`, `null`, ausência e `UNSUPPORTED` não são convertidos em zero. O
preview classifica registros como `ADD`, `UNCHANGED`, `UPDATE`, `CONFLICT`,
`UNSUPPORTED` ou `SKIP`, sem writes durante análise.

O arquivo contém dados financeiros sensíveis e deve ser armazenado em local
seguro. Não há backup automático em nuvem nem serviço pago obrigatório.
