# V325 — UX productivity hardening (proposta)

Status: especificação pronta; implementação não autorizada. Preservar o frontend moderno somente leitura e o cânone visual aprovado.

## Escopo

1. Navegação somente leitura por `Ctrl+K`, com foco, teclado, Escape e rótulos acessíveis.
2. Sincronização entre rota, URL e histórico; voltar/avançar restaura a página sem duplicar fetch ou estado financeiro.
3. Lazy loading apenas após medir bundle e tempo de carregamento; registrar baseline antes/depois.
4. Estados de carregamento, vazio, indisponível, sem permissão e erro claramente distintos; desconhecido nunca vira vazio/zero.
5. Descrições textuais de gráficos, incluindo resumo acessível e alternativa tabular quando os dados permitem.

## Critérios de aceite

- Teclado e leitor de tela cobertos; sem regressão de foco/contraste.
- Back/forward, deep link e reload preservam rota sem alterar estado financeiro.
- Lazy loading reduz custo medido e não atrasa ações primárias.
- Estados vazios e indisponíveis não inventam dado nem sugerem sucesso.
- Validar viewports e rotas exigidos pelo cânone visual e guardar evidência sintética.
- Sem mudanças de fórmula, persistência, schema, writer ou contrato financeiro.
