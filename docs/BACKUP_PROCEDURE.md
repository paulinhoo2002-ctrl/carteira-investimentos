# Backups LEGACY — contratos e procedimento do proprietário

Existem dois artefatos diferentes, com verificações próprias:

- **Backup financeiro do aplicativo:** JSON criptografado exportado pelo proprietário.
- **Backup de código-fonte:** ZIP criado por `scripts/backup/create-safe-source-backup.ps1`, com arquivos versionados e regras de exclusão. Não contém os dados financeiros locais.

Os dois podem usar o diretório aprovado `C:\Projetos\_backups\carteira-investimentos`, mas não substituem um ao outro. `npm test` executa `build:modern` no `pretest` e inclui suítes que verificam políticas de backup. O teste de dry-run do ZIP usa uma raiz temporária vazia; ele não abre nem exige o backup financeiro real do proprietário e não cria um ZIP. `verify:release` inclui `npm test`. A geração real do ZIP é uma operação separada.

## Exportar o backup financeiro

1. Abra o app em produção e entre com a conta proprietária.
2. Acesse **Configurações → Backup e restauração**.
3. Use **Exportar protegido**. Defina e confirme uma senha forte de pelo menos 12 caracteres; o app não pode recuperá-la.
4. O navegador baixa `carteira-investimentos-backup-protegido-AAAA-MM-DD-HH-mm.json`.
5. Guarde o arquivo e a senha em locais seguros e independentes. Não envie o arquivo nem a senha pelo chat.
6. Copie o arquivo, no seu computador, para `C:\Projetos\_backups\carteira-investimentos\`.
7. No PowerShell, crie o sidecar SHA-256 ao lado do arquivo, substituindo o nome pelo nome exato baixado:

```powershell
$file = 'C:\Projetos\_backups\carteira-investimentos\<nome-exato>.json'
$hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $([IO.Path]::GetFileName($file))" | Set-Content -LiteralPath "$file.sha256" -Encoding ascii
```

O sidecar fica como `<nome-exato>.json.sha256`. Ele detecta alterações posteriores no arquivo; sozinho, não prova que a senha está correta, que o conteúdo pode ser descriptografado ou que uma restauração funcionaria.

## O que o verificador certifica

`node scripts/maintenance/backup-verify.js` é um verificador local e somente leitura de **backups JSON financeiros**. Ele confere JSON, formato/manifesto quando legível, sidecar e idade. Arquivos `.zip` do backup de código-fonte não contam como backup financeiro; a ausência de JSON financeiro continua `BACKUP_MISSING`.

Para um JSON criptografado oficial, sem pedir ou guardar a senha, o verificador reconhece a estrutura do envelope e confere o SHA-256 externo, mas informa `WARN`: manifesto, autenticação AES-GCM, conteúdo e capacidade de recuperação permanecem sem verificação. Esse resultado não é `PASS` nem libera um gate que exige validação completa. O verificador não descriptografa dados reais, não restaura e não grava arquivos.

Um JSON desconhecido, inválido, vazio, sem sidecar ou com hash divergente nunca é aceito como backup válido. Um sidecar válido também não é prova de restauração. O teste real de restauração exige exercício separado, autorizado, com destino isolado.

## Limites operacionais

- A exportação financeira real é feita pelo proprietário no app; agentes não abrem nem exportam a carteira real nesta etapa.
- Não edite manualmente o backup, não sobrescreva cópias antigas e não use uma cópia sintética para satisfazer um gate real.
- O script de backup de código valida a raiz aprovada antes de criar um ZIP; não cria diretórios externos por conta própria.
- A existência de um script não prova que há agendamento, destino externo ou restauração testada.
