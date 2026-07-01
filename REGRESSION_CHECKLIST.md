# Regression Checklist

Use esta checklist para validar o sistema após qualquer alteração.

## Regras de execução
- Pare imediatamente se aparecer tela branca, tela preta ou erro vermelho no console.
- Teste primeiro no desktop e depois no mobile.
- Marque cada item como `OK`, `Falhou` ou `Não testado`.
- Registre observações curtas quando houver qualquer comportamento estranho.

## Comandos obrigatórios
- `npm run build`
- Verificar o console do navegador
- Validar desktop
- Validar mobile

## Ordem sugerida de testes

| Ordem | Área | Status | Observações |
|---|---|---|---|
| 1 | Dashboard |  |  |
| 2 | Ativos |  |  |
| 3 | Modal de edição de ativo |  |  |
| 4 | Dividendos |  |  |
| 5 | Renda Fixa |  |  |
| 6 | Sugestão de aporte |  |  |
| 7 | IA / Assistente |  |  |
| 8 | Configurações |  |  |
| 9 | Menu mobile |  |  |
| 10 | Console sem erros |  |  |
| 11 | Build |  |  |

## Checklist detalhada

### 1. Dashboard
- [ ] Abrir a Home/Dashboard sem erros.
- [ ] Verificar se os cards principais carregam corretamente.
- [ ] Confirmar que os dados resumidos fazem sentido.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 2. Ativos
- [ ] Abrir a aba Ativos.
- [ ] Confirmar que categorias e listas carregam.
- [ ] Verificar se filtros e ações continuam funcionais.
- [ ] Testar expansão e recolhimento dos blocos.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 3. Modal de edição de ativo
- [ ] Abrir o modal de edição.
- [ ] Confirmar foco inicial no primeiro campo.
- [ ] Testar salvar.
- [ ] Testar cancelar.
- [ ] Testar fechar no X, ESC e clique fora.
- [ ] Confirmar que a categoria e o scroll são preservados.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 4. Dividendos
- [ ] Abrir a aba Dividendos.
- [ ] Confirmar se os cards e históricos aparecem corretamente.
- [ ] Testar filtros e abas internas.
- [ ] Verificar se o histórico mensal continua legível.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 5. Renda Fixa
- [ ] Abrir a aba Renda Fixa.
- [ ] Confirmar leitura de títulos, vencimentos e totais.
- [ ] Verificar botões, cards e mensagens de apoio.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 6. Sugestão de aporte
- [ ] Abrir a área de sugestão/rebalanceamento.
- [ ] Confirmar que a análise aparece sem quebrar o layout.
- [ ] Testar ações auxiliares e mensagens consultivas.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 7. IA / Assistente
- [ ] Abrir a aba IA/Assistente.
- [ ] Confirmar que os cards de análise carregam.
- [ ] Testar ações inline e expansões leves.
- [ ] Verificar mensagens quando houver dados insuficientes.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 8. Configurações
- [ ] Abrir Configurações.
- [ ] Testar preferências visuais e opções disponíveis.
- [ ] Confirmar que o menu/cabeçalho continua acessível.
- [ ] Testar desktop.
- [ ] Testar mobile.

### 9. Menu mobile
- [ ] Abrir o menu mobile.
- [ ] Confirmar que os itens principais ficam acessíveis.
- [ ] Verificar se o menu não cobre conteúdo importante.
- [ ] Testar navegação entre as áreas principais.
- [ ] Testar em mais de uma largura de tela.

### 10. Console sem erros
- [ ] Abrir o console do navegador.
- [ ] Confirmar ausência de erros vermelhos.
- [ ] Confirmar que avisos conhecidos não viraram erro funcional.

### 11. Build
- [ ] Rodar `npm run build`.
- [ ] Confirmar que o build passa sem falhas.
- [ ] Confirmar que os arquivos obrigatórios continuam presentes.

## Observações
- Se um item falhar, registrar a tela, a ação executada e a mensagem do console.
- Use esta checklist como roteiro fixo antes de qualquer commit ou publicação.
