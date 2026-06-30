# Carteira de Investimentos

## 1. Visao do produto

Carteira de Investimentos e uma aplicacao web de uso diario para controle e analise de carteira, com foco em decisao rapida, leitura clara e baixo atrito.

O produto nasceu para uso pessoal, mas a arquitetura e o desenho funcional seguem padrao SaaS para permitir evolucao futura para outros investidores sem reescrever a base.

## 2. Objetivo

Entregar uma visao objetiva do patrimonio e da qualidade da carteira em poucos segundos, respondendo perguntas como:

- quanto tenho;
- quanto ganho;
- como estou na meta;
- o que esta forte;
- o que esta fraco.

O sistema nao existe apenas para registrar ativos. Ele atua como um painel financeiro pessoal de apoio a decisao.

## 3. Publico-alvo

O produto atende, principalmente, o investidor pessoa fisica brasileiro com perfil de longo prazo:

- patrimonio entre R$ 50 mil e R$ 5 milhoes;
- conhecimento intermediario ou avancado;
- uso frequente de desktop e mobile;
- carteira com foco em:
  - acoes;
  - FIIs;
  - ETFs;
  - BDRs;
  - exterior;
  - renda fixa;
  - cripto (expansao futura).

## 4. Principios do produto

- interface simples;
- poucos cliques;
- mobile first;
- performance;
- PWA;
- dados claros;
- visual moderno e profissional;
- leitura rapida;
- apoio a decisao, nao exibicao ornamental.

## 5. Funcionalidades atuais

O sistema atual contempla:

- Dashboard com resumo patrimonial, renda passiva e destaques da carteira;
- aba Patrimonio;
- aba Ativos com analises, agrupamentos e detalhes de ativos;
- aba Movimentacoes / Aportes com cadastro, edicao e exclusao de lancamentos;
- aba Dividendos com visao consolidada, historico mensal e recebedores;
- aba Renda Fixa;
- aba Rentabilidade;
- aba Rebalancear / apoio de aporte;
- aba Metas;
- aba Diagnostico / analise consultiva local;
- aba Relatorios;
- aba IRPF;
- aba Auditoria;
- importacao B3 com conferencia;
- importacao de nota em PDF;
- backup e restauracao;
- exportacao e relatorios;
- PWA com cache versionado;
- tema escuro e tema claro premium;
- suporte a mobile refinado;
- sincronizacao com nuvem / Firebase.

## 6. Roadmap

O produto deve evoluir de forma controlada. Prioridades futuras naturais:

1. manter estabilidade e integridade do estado atual;
2. melhorias pontuais de UX e legibilidade;
3. aperfeicoar diagnosticos e recomendacoes locais;
4. ampliar consistencia visual entre telas;
5. evoluir para suporte multi-carteira ou multi-usuario, se necessario;
6. expandir classes de ativos quando fizer sentido para o uso real.

Nao ha plano de refatoracao grande sem necessidade clara.

## 7. Requisitos nao funcionais

- performance boa em desktop e mobile;
- funcionamento offline / PWA quando disponivel;
- consistencia visual entre telas;
- baixa chance de erro em calculos;
- preservacao de dados;
- compatibilidade com navegadores modernos;
- experiencia confiavel em conexao lenta;
- atualizacoes seguras e pequenas;
- manutencao simples.

## 8. Tecnologias utilizadas

- HTML unico com JavaScript embutido;
- CSS customizado com temas escuro e claro;
- armazenamento local no navegador;
- Firebase para sincronizacao;
- importacao de dados e notas;
- PWA com manifest e service worker;
- geracao de relatorios e recursos de exportacao.

## 9. Organizacao do projeto

Estrutura atual do reposititorio:

- `index.html`: aplicacao principal, estilos, markup e logica;
- `api/`: integracoes auxiliares;
- `docs/`: documentacao de apoio;
- `scripts/`: rotinas de suporte;
- `sw.js`: cache e PWA;
- `manifest.json`: metadados do app;
- `firestore.rules`: regras de seguranca;
- `.firebaserc` e `firebase.json`: configuracoes Firebase;
- arquivos de icone e assets estaticos.

## 10. Convencoes para futuras implementacoes

- preferir mudancas pequenas e verificaveis;
- evitar refatoracao ampla sem necessidade;
- preservar calculos e historico;
- nao alterar formato dos dados sem justificativa forte;
- manter compatibilidade com mobile;
- manter o layout premium e consistente;
- evitar dependencia nova sem beneficio claro;
- documentar impacto visual e funcional de cada fase.

## 11. Papel do produto

Carteira de Investimentos e uma ferramenta de decisao financeira pessoal de longo prazo.

Ela deve ser usada para:

- acompanhar patrimonio;
- entender renda passiva;
- identificar concentracao e risco;
- monitorar metas;
- revisar rentabilidade;
- consultar relatorios e auditorias;
- manter disciplina de investimento.

