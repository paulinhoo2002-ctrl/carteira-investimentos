# Estabilidade de Producao

Guia simples para reduzir risco de perda de dados, falhas de deploy e merges apressados.

## 1. Como validar producao

Antes de considerar uma versao pronta:

1. Atualize a branch `main` local com a remota.
2. Confirme que o projeto esta com `git status` limpo.
3. Rode:

```powershell
cmd /c npm run build
```

4. Abra o preview publicado.
5. Teste a tela alterada e os fluxos relacionados.
6. Confira o Console do navegador.
7. Confirme que nao apareceu erro vermelho novo.
8. Confirme que os dados exibidos batem com a carteira real.

## 2. Como fazer backup real dos dados

O backup real e o arquivo de exportacao da carteira, gerado dentro do proprio app.

Regras:

- exporte o backup antes de mexer em dados sensiveis;
- guarde o arquivo em local seguro;
- mantenha pelo menos uma copia anterior conhecida como boa;
- nao edite o arquivo manualmente;
- nao envie backup real para locais sem autorizacao.

Se houver troca de computador, limpeza do navegador, teste de importacao ou risco de perda de dados, faca backup antes.

## 3. Backup JSON x JSON de relatorio

Os dois arquivos podem ter formato JSON, mas servem para coisas diferentes.

### Backup JSON

- e o arquivo usado para restaurar a carteira;
- pode conter dados completos da conta local;
- e o arquivo principal para seguranca e recuperacao.

### JSON de relatorio

- e um export mais voltado para consulta, analise ou integracao;
- nao deve ser tratado como substituto do backup;
- pode nao conter tudo o que e necessario para restauracao.

Regra pratica:

- se a intencao e recuperar o app depois, use o backup JSON;
- se a intencao e consultar ou processar dados, use o JSON de relatorio.

## 4. Como criar tag de versao estavel

Antes da tag:

1. Confirme que a `main` esta atualizada.
2. Confirme que o build passou.
3. Confirme que nao ha arquivos pendentes.
4. Confirme que o PR foi revisado e aprovado.

Fluxo sugerido:

```powershell
git checkout main
git pull --ff-only origin main
git status
git tag -a vX.Y.Z-estavel -m "Versao estavel"
git push origin vX.Y.Z-estavel
```

Use a tag somente para uma versao que ja passou por validacao e nao depende de ajuste urgente.

## 5. Regras antes de qualquer novo PR

- criar branch separada;
- manter escopo pequeno;
- mudar somente o necessario;
- nao misturar documentacao, correcao e refatoracao grande;
- confirmar build antes de abrir PR;
- conferir se o diff esta limitado ao que foi pedido;
- evitar arquivos temporarios, backups soltos e duplicados;
- nao alterar dados financeiros sem necessidade;
- nao fazer merge direto sem revisao.

## 6. Checklist pre-merge

- [ ] Branch correta.
- [ ] Build passou.
- [ ] Diff limitado ao escopo.
- [ ] Sem alteracao em calculos financeiros.
- [ ] Sem alteracao em login/autorizacao.
- [ ] Sem alteracao em CSV/JSON fora do pedido.
- [ ] Sem alteracao em PDF Executivo, PDFs dos cards ou backup/restauracao, salvo se o PR for exatamente sobre isso.
- [ ] Console verificado no preview.
- [ ] Dados reais conferidos.
- [ ] Nada importante ficou fora do PR.

## 7. Checklist pos-deploy

Depois do merge e da publicacao:

- [ ] Abrir o site publicado.
- [ ] Confirmar que a versao nova carregou.
- [ ] Testar o fluxo alterado de ponta a ponta.
- [ ] Conferir se o console continua limpo.
- [ ] Validar mobile e desktop.
- [ ] Confirmar que o comportamento antigo continua funcionando.
- [ ] Registrar a tag de versao, se a entrega for estavel.
- [ ] Atualizar a documentacao, se necessario.

## 8. Regra de seguranca para manutencao

Se houver duvida entre publicar rapido e preservar estabilidade, a escolha padrao e parar, validar e fazer backup antes de seguir.
