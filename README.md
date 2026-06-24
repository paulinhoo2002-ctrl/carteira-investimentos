# Carteira de Investimentos

Aplicativo web para organizar e acompanhar uma carteira de investimentos, com foco em patrimônio, ativos, aportes, dividendos, renda fixa, metas e conferência de dados.

O projeto funciona como aplicação estática e pode ser aberto localmente ou publicado na Vercel. Também possui recursos de PWA, armazenamento local e sincronização com Firebase/Google quando configurados.

## Principais funcionalidades

- Dashboard inicial com visão executiva da carteira.
- Cadastro e acompanhamento de ativos.
- Análise de desempenho, concentração e dados incompletos.
- Registro e histórico de aportes.
- Sugestão prudente de aporte na área Rebalancear.
- Metas de patrimônio e renda passiva.
- Consulta mensal, histórico e auditoria de dividendos.
- Patrimônio Inteligente, comparando valor aplicado e patrimônio atual.
- Renda Fixa Inteligente, com vencimentos e alertas de dados.
- Importações da B3 com revisão antes da gravação.
- Backup e restauração dos dados em JSON.
- Relatório auxiliar de IRPF e exportação CSV.
- PWA com controle de versão e aviso de atualização.

## Tecnologias

- HTML, CSS e JavaScript em arquivo principal único.
- LocalStorage para persistência local.
- Firebase Authentication e Firestore para login e sincronização, quando disponíveis.
- Service Worker e Web App Manifest para PWA.
- APIs de cotação usadas pelo próprio projeto.
- Node.js apenas para validação do build.

## Estrutura principal

```text
index.html       Aplicação, estilos e lógica principal
sw.js            Service worker e controle de cache
manifest.json    Configuração do PWA
api/             Funções de API do projeto
docs/            Manuais e documentação
scripts/         Scripts auxiliares e de backup externo
```

## Como rodar localmente

É possível abrir `index.html` diretamente no navegador:

```text
file:///C:/Projetos/carteira-investimentos/index.html
```

Para testar recursos de PWA e service worker, use um servidor local ou a versão publicada. Service workers não funcionam normalmente em páginas abertas por `file://`.

## Como validar o projeto

Na pasta do projeto, execute:

```powershell
cmd /c npm run build
```

O comando confirma a existência dos arquivos estáticos obrigatórios. Para considerar uma alteração concluída, faça também um teste visual nas principais telas e no celular.

## Dados e sincronização

- Os dados podem existir no armazenamento local do navegador.
- A limpeza dos dados do site pode apagar o LocalStorage.
- O Firebase pode sincronizar dados quando o usuário autorizado entra com Google.
- Um navegador, perfil ou computador diferente pode ter dados locais diferentes.
- Exporte um backup JSON antes de limpar cache, armazenamento ou trocar de computador.

## PWA e atualização

Quando aparecer **“Nova versão disponível”**, use **“Atualizar agora”** para ativar a versão nova. O processo atualiza os arquivos do aplicativo sem apagar os dados da carteira.

Se a interface parecer antiga, tente `Ctrl + F5`. Antes de limpar os dados do site ou remover manualmente o armazenamento, exporte um backup.

## Aviso sobre IRPF

O relatório de IRPF é uma ferramenta auxiliar de organização. Ele não substitui:

- informes oficiais das corretoras e instituições;
- notas de negociação;
- documentos fiscais;
- programa oficial da Receita Federal;
- orientação de contador ou profissional habilitado.

Confira todos os valores antes de utilizá-los em uma declaração.

## Documentação

- [Manual de uso](docs/MANUAL-USO.md)
- [Fluxo de desenvolvimento](docs/FLUXO-DESENVOLVIMENTO.md)
- [Backup e restauração](docs/BACKUP-RESTAURACAO.md)
- [Histórico de melhorias](docs/CHANGELOG.md)

