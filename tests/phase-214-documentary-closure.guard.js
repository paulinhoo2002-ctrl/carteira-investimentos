const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { execFileSync } = require('node:child_process');

const repoRoot = path.join(__dirname, '..');

function readUtf8WithoutBom(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf, false, `${relativePath} nao pode ter BOM`);
  const text = buffer.toString('utf8');
  for (const token of ['\uFFFD', '\u00C3', '\u00C2', '\u0153']) {
    assert.equal(text.includes(token), false, `${relativePath} nao pode conter mojibake ${token}`);
  }
  return text;
}

test('fase 214 encerrada documentalmente no roadmap', () => {
  const roadmap = readUtf8WithoutBom('docs/project-phases-roadmap.md');
  const doc = readUtf8WithoutBom('docs/phase-214-dashboard-dividends-readability.md');
  const indexedDist = execFileSync('git', ['ls-files', 'modern/dist'], { cwd: repoRoot, encoding: 'utf8' }).trim();

  assert.match(roadmap, /- fase atual: nenhuma;/);
  assert.match(roadmap, /- branch atual: main;/);
  assert.match(roadmap, /- PR atual: nenhuma;/);
  assert.match(roadmap, /- implementacao ativa: nenhuma;/);
  assert.match(roadmap, /- SHA-base: `cd98c8000bbd8d919e6eec0a448ff0f14e43baa1`;/);
  assert.match(roadmap, /- SHA final da Fase 214: `cd98c8000bbd8d919e6eec0a448ff0f14e43baa1`;/);
  assert.match(roadmap, /- PR funcional da Fase 214: `#213`;/);
  assert.match(roadmap, /- modo de merge da Fase 214: squash;/);
  assert.match(roadmap, /- branch oficial apos integracao: `main`;/);
  assert.match(roadmap, /- 204C, 210 e 212 nao autorizadas[.;]/);
  assert.match(roadmap, /- Fases 208 e 214 concluidas e nao fazem parte desta sequencia planejada\./);
  assert.match(roadmap, /intencao de reduzir o tamanho e o acoplamento do `index\.html` continua registrada apenas como intencao/i);

  assert.match(roadmap, /## 25\. Fase 214 - Dashboard enxuto e legibilidade de Dividendos/);
  assert.match(roadmap, /Estado final:/);
  assert.match(roadmap, /- SHA-base: `4c73ed85f1f602b89fc3f7fe1a42e3d34d0a2575`;/);
  assert.match(roadmap, /- PR funcional: `#213`;/);
  assert.match(roadmap, /- modo de merge: squash;/);
  assert.match(roadmap, /- SHA final na main: `cd98c8000bbd8d919e6eec0a448ff0f14e43baa1`;/);
  assert.match(roadmap, /- branch oficial apos integracao: `main`;/);
  assert.match(roadmap, /- titulo do commit final: `style: simplifica dashboard e melhora leitura de dividendos`;/);
  assert.match(roadmap, /- implementacao ativa: nenhuma;/);
  assert.match(roadmap, /- nenhuma formula financeira nova;/);
  assert.match(roadmap, /- nenhuma alteracao de schema;/);
  assert.match(roadmap, /- nenhuma alteracao de persistencia;/);
  assert.match(roadmap, /- nenhuma alteracao de Firebase\/Auth;/);
  assert.match(roadmap, /- nenhuma alteracao de sincronizacao;/);
  assert.match(roadmap, /- nenhuma alteracao de backups;/);
  assert.match(roadmap, /- nenhum deploy manual;/);
  assert.match(roadmap, /- `modern\/src` inalterado;/);
  assert.match(roadmap, /- `modern\/dist` fora do indice\./);

  assert.match(roadmap, /Resultado principal:/);
  assert.match(roadmap, /- bloco visual "Metas financeiras" removido somente do Dashboard;/);
  assert.match(roadmap, /- dados, calculos e tela especifica de Metas preservados;/);
  assert.match(roadmap, /- tela Dividendos com melhor legibilidade;/);
  assert.match(roadmap, /- fonte visivel minima de 10px em Dividendos;/);
  assert.match(roadmap, /- filtros de Periodo, Ativo e Tipo preservados;/);
  assert.match(roadmap, /- abas e visao geral preservadas;/);
  assert.match(roadmap, /- historico mensal preservado;/);
  assert.match(roadmap, /- ultimos 5 anos preservados;/);
  assert.match(roadmap, /- expansao de 5 em 5 anos preservada;/);
  assert.match(roadmap, /- Mostrar mais e Mostrar menos preservados;/);
  assert.match(roadmap, /- sem overflow horizontal em 390px, 768px, 1366px e 1920px;/);
  assert.match(roadmap, /- testes e builds aprovados\./);

  assert.match(roadmap, /Intencao futura nao autorizada:/);
  assert.match(roadmap, /Reduzir progressivamente o tamanho e o acoplamento do `index\.html` por extracoes pequenas/i);
  assert.match(roadmap, /- apenas intencao;/);
  assert.match(roadmap, /- sem fase numerada ou autorizada;/);
  assert.match(roadmap, /- nenhuma referencia a Fase 216 nesta PR\./);

  assert.match(roadmap, /Rollback:/);
  assert.match(roadmap, /git revert cd98c8000bbd8d919e6eec0a448ff0f14e43baa1/);

  assert.match(doc, /# Fase 214 - Dashboard enxuto e legibilidade de Dividendos/);
  assert.match(doc, /## Status final/);
  assert.match(doc, /## Objetivo/);
  assert.match(doc, /- fonte visivel minima de 10px em Dividendos;/);
  assert.match(doc, /## Escopo aplicado/);
  assert.match(doc, /## Fonte oficial/);
  assert.match(doc, /## Preservacao obrigatoria/);
  assert.match(doc, /## Acessibilidade/);
  assert.match(doc, /## Responsividade/);
  assert.match(doc, /## Performance/);
  assert.match(doc, /## Testes/);
  assert.match(doc, /## Rollback/);
  assert.match(doc, /## Intencao futura nao autorizada/);
  assert.match(doc, /## Conclusao Caveman/);
  assert.match(doc, /## Conclusao Impeccable/);
  assert.match(doc, /## Status final/);
  assert.match(doc, /- PR funcional: `#213`;/);
  assert.match(doc, /- SHA final na main: `cd98c8000bbd8d919e6eec0a448ff0f14e43baa1`;/);
  assert.match(doc, /- branch oficial apos integracao: `main`;/);
  assert.match(doc, /git revert cd98c8000bbd8d919e6eec0a448ff0f14e43baa1/);
  assert.match(doc, /Reduzir progressivamente o tamanho e o acoplamento do `index\.html` por extracoes pequenas/i);
  assert.match(doc, /nenhuma fase numerada ou autorizada para este objetivo nesta PR/);
  assert.match(doc, /Playwright validado em 390px, 768px, 1366px e 1920px;/);
  assert.match(doc, /sem overflow horizontal\./);

  assert.equal(indexedDist, '', 'modern/dist deve permanecer fora do indice');
});
