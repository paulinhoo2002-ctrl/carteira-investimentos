# Importação de notas de corretagem

Fluxo obrigatório: arquivo → detecção → parsing → normalização → validação →
prévia → deduplicação → confirmação → ledger.

O suporte atual é completo para o modelo normalizado Inter, parcial para
movimentações B3 e desconhecido para XP/BTG até que fixtures sanitizados e
layout determinístico sejam validados. A identificação usa corretora, número,
data e fingerprint de conteúdo. Nota repetida é `EXACT_DUPLICATE_NOTE`; mesma
identidade com conteúdo diferente é conflito.

Taxas permanecem no nível da nota e não são distribuídas artificialmente por
operação. O modelo profissional é read-only nesta fase e não confirma escrita
sem prévia explícita.
