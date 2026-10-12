# Regression Checklist

Use esta checklist para validar o sistema apos qualquer alteracao.

## Regras de execucao
- Pare imediatamente se aparecer tela branca, tela preta ou erro vermelho no console.
- Teste primeiro no desktop e depois no mobile.
- Marque cada item como `OK`, `Falhou` ou `Nao testado`.
- Registre observacoes curtas quando houver qualquer comportamento estranho.

## Comandos obrigatorios
- `npm run build`
- Verificar o console do navegador
- Validar desktop
- Validar mobile
- Verificar backup/exportacao antes de mudancas maiores

## Ordem sugerida de testes

| Ordem | Area | Status | Observacoes |
|---|---|---|---|
| 1 | Dashboard |  |  |
| 2 | Cadastro / edicao basica |  |  |
| 3 | Ativos |  |  |
| 4 | Dividendos |  |  |
| 5 | Renda Fixa |  |  |
| 6 | Backup / exportacao |  |  |
| 7 | Nota de Corretagem |  |  |
| 8 | Sugestao de aporte |  |  |
| 9 | IA / Assistente |  |  |
| 10 | Responsividade / mobile |  |  |
| 11 | Login / Firebase, se aplicavel |  |  |
| 12 | Console sem erros |  |  |
| 13 | Build |  |  |

## Checklist detalhada

### 1. Dashboard
- [ ] Abrir a Home/Dashboard sem erros.
- [ ] Verificar se os cards principais carregam corretamente.
- [ ] Confirmar que os dados resumidos fazem sentido.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 2. Cadastro / edicao basica
- [ ] Abrir um modal ou formulario de cadastro/edicao.
- [ ] Confirmar que salvar e cancelar funcionam.
- [ ] Verificar se os campos obrigatorios estao coerentes.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 3. Ativos
- [ ] Abrir a aba Ativos.
- [ ] Confirmar que categorias e listas carregam.
- [ ] Verificar se filtros e acoes continuam funcionais.
- [ ] Testar expansao e recolhimento dos blocos.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 4. Dividendos
- [ ] Abrir a aba Dividendos.
- [ ] Confirmar se os cards e historicos aparecem corretamente.
- [ ] Testar filtros e abas internas.
- [ ] Verificar se o historico mensal continua legivel.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 5. Renda Fixa
- [ ] Abrir a aba Renda Fixa.
- [ ] Confirmar leitura de titulos, vencimentos e totais.
- [ ] Verificar botoes, cards e mensagens de apoio.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 6. Backup / exportacao
- [ ] Abrir a area de backup ou exportacao.
- [ ] Confirmar que o fluxo abre corretamente.
- [ ] Gerar backup sem erro.
- [ ] Confirmar que o arquivo exportado parece valido.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 7. Nota de Corretagem
- [ ] Abrir o modal de importacao de nota.
- [ ] Selecionar um PDF valido.
- [ ] Confirmar leitura e previsualizacao.
- [ ] Confirmar importacao sem quebrar a tela.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 8. Sugestao de aporte
- [ ] Abrir a area de sugestao/rebalanceamento.
- [ ] Confirmar que a analise aparece sem quebrar o layout.
- [ ] Testar acoes auxiliares e mensagens consultivas.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 9. IA / Assistente
- [ ] Abrir a aba IA/Assistente.
- [ ] Confirmar que os cards de analise carregam.
- [ ] Testar acoes inline e expansoes leves.
- [ ] Verificar mensagens quando houver dados insuficientes.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 10. Responsividade / mobile
- [ ] Testar a aplicacao em largura de celular.
- [ ] Confirmar que nao ha overflow lateral.
- [ ] Confirmar que menus e tabelas continuam utilizaveis.
- [ ] Testar mais de uma largura de tela.

### 11. Login / Firebase, se aplicavel
- [ ] Confirmar login ou estado de autenticacao, se a tela estiver disponivel.
- [ ] Verificar se a sincronizacao Firebase nao apresenta erro.
- [ ] Confirmar que a interface continua carregando normalmente.

### 12. Console sem erros
- [ ] Abrir o console do navegador.
- [ ] Confirmar ausencia de erros vermelhos.
- [ ] Confirmar que avisos conhecidos nao viraram erro funcional.

### 13. Build
- [ ] Rodar `npm run build`.
- [ ] Confirmar que o build passa sem falhas.
- [ ] Confirmar que os arquivos obrigatorios continuam presentes.

## Observacoes
- Se um item falhar, registrar a tela, a acao executada e a mensagem do console.
- Use esta checklist como roteiro fixo antes de qualquer commit ou publicacao.
