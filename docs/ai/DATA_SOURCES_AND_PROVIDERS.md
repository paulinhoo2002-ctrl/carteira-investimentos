# Fontes e providers

| Provider | Papel | Custo/token | Privado enviado? | Limitação |
|---|---|---|---|---|
| Yahoo Chart | preço/histórico | grátis, sem token | não | cobertura/frescor variáveis |
| CVM IPE | documentos/eventos oficiais | grátis | não | não estruturado |
| BCB SGS série 12 | CDI diário | grátis, sem token | não | não representa regras específicas de todo título |
| Brapi | fallback opcional | token opcional | ticker only | 401 sem token |
| B3 export | reconciliação do usuário | local | não | não é descoberta automática |

Providers oficiais/administradores de fundos continuam cobertura parcial. Cache
é local e falhas devem degradar para stale/manual, nunca zerar patrimônio.
