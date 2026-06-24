# Backup e Restauração

Os dados financeiros exigem cuidado. Antes de limpar navegador, trocar de computador ou testar importações, crie um backup.

## O que o backup do app inclui

O arquivo JSON pode incluir:

- carteiras locais;
- ativos;
- aportes e operações;
- dividendos e proventos;
- metas;
- dados de renda fixa;
- preferências relevantes;
- metadados do aplicativo e da exportação.

O backup não deve conter senha da conta Google.

## Exportar backup

1. Abra o aplicativo.
2. Acesse **Configurações**.
3. Abra **Backup e restauração**.
4. Revise o resumo da carteira atual.
5. Clique em **Exportar backup**.
6. Guarde o arquivo JSON em local seguro.

O nome esperado segue este padrão:

```text
carteira-investimentos-backup-AAAA-MM-DD-HH-mm.json
```

## Conferir o arquivo

Antes de depender do backup:

- confirme que o arquivo foi baixado;
- confira se o tamanho é maior que zero;
- mantenha a extensão `.json`;
- não edite manualmente sem necessidade;
- guarde uma cópia adicional em outro local.

## Importar backup

1. Exporte um backup dos dados atuais.
2. Abra **Configurações > Backup e restauração**.
3. Clique em **Selecionar arquivo**.
4. Escolha o JSON.
5. Confira a prévia:
   - ativos;
   - aportes;
   - dividendos;
   - renda fixa;
   - carteiras;
   - data do backup.
6. Confirme somente se os dados estiverem corretos.

A importação substitui os dados atuais da carteira ativa. Ela não deve acontecer apenas ao selecionar o arquivo; existe uma confirmação antes da gravação.

## Restaurar em outro computador

1. No computador original, exporte o backup.
2. Transfira o JSON por meio seguro.
3. Abra o app no novo computador.
4. Se houver dados novos no navegador de destino, exporte-os antes.
5. Importe o arquivo.
6. Recarregue a interface, se necessário.
7. Confira ativos, aportes, dividendos, metas e renda fixa.

Se a sincronização Firebase estiver ativa, confira qual conjunto de dados será considerado antes de continuar editando.

## Antes de testar importação B3

- Exporte o backup atual.
- Use a tela de revisão.
- Não confirme linhas classificadas como **Revisar** sem análise.
- Confira possíveis duplicidades.
- Depois da importação, revise totais e quantidades.
- Se o resultado estiver incorreto, restaure o backup anterior.

## Cache e navegador

### Ctrl + F5

O atalho força a atualização dos arquivos visuais sem ter como objetivo apagar o LocalStorage. Use quando a interface parecer antiga.

### Nova versão disponível

O aviso informa que um service worker mais recente está pronto. Clique em **Atualizar agora** depois de terminar edições abertas.

### Limpar dados do site

Essa ação pode apagar:

- LocalStorage;
- IndexedDB;
- cache;
- preferências locais;
- dados não sincronizados.

Antes de usar **Clear site data**:

1. Exporte um backup.
2. Confirme que o arquivo existe.
3. Confirme se o Firebase está sincronizado, quando aplicável.
4. Só então faça a limpeza.

### Remover service worker

Para diagnóstico:

1. Exporte backup.
2. Abra as ferramentas do navegador.
3. Vá em **Application > Service Workers**.
4. Clique em **Unregister**.
5. Atualize a página.

Remover o service worker não deveria apagar o LocalStorage, mas evite combinar essa ação com limpeza geral do site sem backup.

## Backup externo do projeto

Os scripts da pasta `scripts/` podem copiar os arquivos do projeto para o Google Drive. Esse backup protege o código, a documentação e os recursos do projeto.

Ele é diferente do backup JSON:

- backup do projeto: protege arquivos de desenvolvimento;
- backup JSON do app: protege dados da carteira no navegador.

Para proteção completa, mantenha os dois.

## Recomendações de segurança

- Não sobrescreva um backup antigo importante.
- Mantenha cópias com datas diferentes.
- Não envie o JSON para pessoas não autorizadas.
- O arquivo pode conter informações financeiras pessoais.
- Não misture dados de teste com a carteira real.
- Teste restauração somente com backup disponível.

## Em caso de erro

1. Não continue registrando dados.
2. Não limpe o navegador.
3. Registre a mensagem de erro.
4. Exporte o que ainda estiver acessível.
5. Compare com o último backup válido.
6. Restaure somente após conferir a prévia.

