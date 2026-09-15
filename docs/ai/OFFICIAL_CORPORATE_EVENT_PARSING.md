# V71 — parsing oficial de eventos corporativos

O pipeline `official-document-pipeline.js` executa, em modo read-only:

`documento oficial → hash → texto estruturado → parser → evidência revisável`.

O fetcher aceita apenas domínios oficiais allowlisted, valida redirecionamento,
content-type, tamanho máximo, timeout e SHA-256. PDF sem texto extraível não é
convertido automaticamente em evento confiável.

O parser reconhece dividendos, JCP, rendimentos de fundos, datas brasileiras,
valores monetários, parcelas e cancelamentos. Campos ausentes produzem
`PARSE_REVIEW_REQUIRED` ou confiança parcial. Palavra-chave isolada nunca cria
evento.

Cada resultado conserva documento, URL, hash, trecho de evidência e versão do
parser. Eventos entram no cache público local; o ledger realizado não é
chamado. Promoção financeira continua manual (`MODE_A`).

## V72 — famílias e corpus

O parser mantém um modelo único e expõe wrappers composáveis para aviso
acionário, JCP, distribuição FII e comunicado de administrador. O corpus local
em `tests/fixtures/official-events/` usa fixtures sintéticos pequenos para
regredir dividendo, JCP parcelado, distribuição FII e cancelamento. Parcelas
preservam o tipo do evento pai; ausência de identidade/valor/data suficiente
continua em revisão.
