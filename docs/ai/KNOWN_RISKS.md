# Registro de riscos

| Risco | Severidade | Estado | Mitigação |
|---|---|---|---|
| Duplicidade financeira | crítica | controlado | identidade, preview e dedupe |
| Evento público falso | alta | parcial | autoridade, conflito e MODE_A |
| Renda fixa stale exibida como live | alta | controlado | freshness/as-of explícitos |
| TWR/XIRR com fluxos incompletos | alta | aberto | tracking prospectivo |
| PDF/nota maliciosa | alta | controlado | limites, preview, fail-closed |
| Cloud write acidental | crítica | controlado | protected QA e cloud zero |
| Service Worker stale | média | conhecido | doctor, origem canônica e cache |
| Corrupção de cache derivado | média | controlado | schema, fallback e isolamento |
| Vazamento de dados privados | crítica | controlado | providers ticker-only e sem upload |
