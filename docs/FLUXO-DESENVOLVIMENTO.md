# Fluxo de Desenvolvimento

Este projeto usa Codex para edição e GitHub Desktop para operações Git.

## Regras

- Manter a branch `main` estável.
- Criar uma branch nova para cada melhoria ou correção.
- Não fazer alterações diretamente na `main`.
- Não usar comandos Git pelo Codex.
- Não alterar a pasta `.git`.
- Usar GitHub Desktop para branch, commit, push e Pull Request.
- Evitar misturar refatoração grande com funcionalidade nova.
- Alterar poucos arquivos por vez.
- Preservar cálculos financeiros e dados existentes.
- Rodar o build antes de considerar uma tarefa concluída.

## Fluxo recomendado

### 1. Atualizar a main

No GitHub Desktop:

1. Selecione a branch `main`.
2. Use **Fetch origin**.
3. Use **Pull origin**, se houver atualização.
4. Confirme que não existem alterações pendentes.

### 2. Criar a branch

Crie uma branch com nome relacionado à tarefa, por exemplo:

```text
melhoria-documentacao-projeto
fix-correcao-irpf
melhoria-cache-pwa
```

### 3. Alterar com Codex

Informe:

- branch esperada;
- objetivo;
- arquivos permitidos;
- áreas que não devem ser alteradas;
- testes obrigatórios;
- proibição de commit e push pelo Codex.

Em geral, prefira alterações em `index.html`. Altere `sw.js` somente quando a tarefa envolver PWA, cache ou service worker.

### 4. Validar

Execute:

```powershell
cmd /c npm run build
```

Além do build:

- abra o app;
- teste a tela alterada;
- teste desktop e celular;
- confira o Console do navegador;
- valide que telas relacionadas continuam abrindo.

O build atual confirma os arquivos estáticos essenciais, mas não substitui o teste visual e de execução.

### 5. Revisar no GitHub Desktop

Confira:

- branch correta;
- arquivos modificados;
- diferenças de código;
- ausência de arquivos temporários;
- ausência de credenciais, tokens ou dados pessoais.

### 6. Commit e push

No GitHub Desktop:

1. Escreva uma mensagem de commit objetiva.
2. Faça o commit na branch.
3. Use **Push origin**.

### 7. Pull Request e preview

1. Abra o Pull Request.
2. Confirme que o PR contém apenas os arquivos esperados.
3. Teste o preview da Vercel.
4. Verifique versão normal, aba anônima e celular.
5. Faça o merge somente após aprovação.

### 8. Pós-merge

1. Volte para `main`.
2. Atualize com o GitHub.
3. Rode o build.
4. Teste a versão publicada.
5. Remova branches antigas somente depois de confirmar o merge.

## Checklist antes do commit

- [ ] Branch nova e correta.
- [ ] Apenas arquivos esperados foram alterados.
- [ ] Nenhum dado real foi incluído no código.
- [ ] Nenhuma credencial foi alterada.
- [ ] Importação B3 preservada, salvo quando for o escopo.
- [ ] Firebase e autenticação preservados.
- [ ] Desktop testado.
- [ ] Mobile testado.
- [ ] Console sem erro crítico.
- [ ] `cmd /c npm run build` passou.

## Continuar em outro computador

1. Finalize e envie as alterações do primeiro computador pelo GitHub Desktop.
2. No segundo computador, abra o mesmo repositório no GitHub Desktop.
3. Use **Fetch origin**.
4. Selecione a branch correta.
5. Use **Pull origin**.
6. Confirme que o projeto está atualizado.
7. Rode o build.
8. Só então continue as alterações.

Os dados financeiros do navegador não são transferidos automaticamente pelo Git. Para levar a carteira a outro computador, use o backup JSON ou a sincronização Firebase autorizada.

## Publicação e PWA

Depois do merge:

- aguarde a publicação da Vercel;
- abra o endereço publicado;
- quando aparecer **Nova versão disponível**, clique em **Atualizar agora**;
- use `Ctrl + F5` se o navegador ainda mostrar conteúdo antigo;
- não limpe os dados do site sem exportar backup.

## Correções urgentes

Se o site apresentar tela preta:

1. Não limpe dados imediatamente.
2. Teste em outro navegador ou aba anônima.
3. Abra o Console e registre o primeiro erro.
4. Confirme se o problema é código, cache ou dados locais.
5. Faça uma correção pequena em branch separada.
6. Rode o build e teste antes de publicar.

