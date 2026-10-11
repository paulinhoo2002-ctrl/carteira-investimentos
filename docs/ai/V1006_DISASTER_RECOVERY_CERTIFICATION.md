# V1006 — disaster recovery local com fixture sintética

Data: 2026-10-11
Base: `origin/main` `53d01ddb177cd6ad2fea48be1caea4366051e1b7`
Branch: `codex/v1006-disaster-recovery`

## Resultado

`CONDITIONAL_GO` para exportação portátil cifrada e recuperação sintética em processo limpo. `NO_GO` para declarar backup externo automatizado ou recuperação integral após perda real de dispositivo: nenhum destino independente foi conectado ou testado, e a importação da aplicação continua em prévia até confirmação explícita.

## Fluxo e proteção existentes

- O arquivo portátil é cifrado com AES-256-GCM. A chave é derivada de senha por PBKDF2/SHA-256 com 310.000 iterações; cada exportação usa salt de 16 bytes e IV de 12 bytes aleatórios. O envelope atual é versão 1; o backup interno declara schema 1.2 e manifesto com SHA-256.
- A verificação de formato, schema, domínio obrigatório, checksum e identidade do proprietário continua obrigatória. Senha incorreta ou ciphertext alterado falha fechado. A cifra não protege snapshots locais do IndexedDB.
- A aplicação oferece exportação manual de arquivo cifrado e prévia de importação. Não há upload externo, agenda independente nem retenção externa comprovados. IndexedDB mantém política local limitada; sua retenção não é retenção fora do dispositivo.
- Para uma cópia manual independente, o usuário pode guardar uma exportação cifrada em mídia ou armazenamento escolhido por ele e manter a senha separada. Esta recomendação descreve um procedimento manual; não comprova destino, upload, retenção ou recuperação desse serviço.

## Evidência sintética

`tests/backup-encryption.test.js` adiciona recuperação a partir de arquivo cifrado em subprocesso Node novo. O subprocesso não disponibiliza IndexedDB nem localStorage, decifra, valida manifesto/proprietário, executa prévia contra estado sintético vazio e aplica somente ao helper de armazenamento isolado em memória. O relatório compara SHA-256 canônico do estado de origem/restaurado, domínios requeridos, contagens e escrita simulada; nenhuma persistência da aplicação é chamada.

Também há teste negativo para proprietário diferente e conflito de identidade existente, confirmando que a prévia bloqueia e não altera o estado de entrada. Os testes existentes cobrem senha errada, ciphertext corrompido, formato incompatível, rollback, retenção local, isolamento por proprietário e integridade.

Validações locais neste branch/base:

- `node --test tests/backup-encryption.test.js`: 7/7 PASS.
- Suítes de backup, recuperação, segurança, lifecycle e integração: 53/53 PASS.
- Finanças e cobertura mensal: 82/82 PASS.
- `npm.cmd run build`: PASS; `git diff --check`: PASS antes do commit.
- npm ci, matriz completa, Browser/Playwright, Firebase remoto, Vercel e CI: não certificados nesta worktree até que dependências e SHA publicado estejam disponíveis.

## Retenção e riscos

Retenção automática atual aplica-se aos snapshots locais do navegador e não pode recuperar o único dispositivo. Arquivos portáteis manuais não têm versionamento ou retenção geridos pelo produto. Perda da senha torna o arquivo cifrado irrecuperável. O fluxo de prévia não prova restauração persistida no aplicativo; substituição real continua protegida por confirmação e não foi executada.

## Gates seguintes

Para certificar destino externo são necessários escolha/autorização do serviço, credenciais/OAuth quando aplicável, política de retenção e teste de upload/download com fixtures sintéticas. Para certificar restauração no produto é necessário gate humano específico para aplicar uma fixture sintética em ambiente QA isolado; nenhum dado financeiro real deve ser usado.

`REAL_FINANCIAL_WRITES=0`; `REAL_EXPORT=false`; `REAL_IMPORT=false`; `REAL_RESTORE=false`; `PRODUCTION=false`; `MERGE=false`.
