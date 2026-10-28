# Como Acessar o Site — Guia Simples

## 3 formas de acesso

| Modo | Como abrir | Usa seus dados? | Precisa login? |
|------|-----------|-----------------|----------------|
| **TESTE** (sintético) | Duplo clique em `ABRIR-TESTE.bat` | Não — dados falsos | Não |
| **REAL local** | Duplo clique em `ABRIR-REAL.bat` | Sim — seus dados | Sim (Google) |
| **PRODUÇÃO** (Vercel) | `https://carteira-investimentos-delta.vercel.app` | Sim — seus dados | Sim (Google) |

---

## Corrigindo o erro "domínio não autorizado no Firebase"

Este erro acontece porque o domínio onde o app roda não está na lista de domínios permitidos do Firebase. **Correção em 2 minutos:**

### Passo a passo

1. Acesse **https://console.firebase.google.com**
2. Entre com sua conta Google
3. Selecione o projeto **carteira-de-investimento-16725**
4. Menu lateral esquerdo: **Authentication**
5. Aba superior: **Settings** (Configurações)
6. Role até **Authorized domains** (Domínios autorizados)
7. Clique **Add domain** (Adicionar domínio)
8. Adicione um por um:
   - `localhost`
   - `carteira-investimentos-delta.vercel.app`
   - Qualquer outro domínio Vercel que usar (ex: `carteira-investimentos.vercel.app`)
9. Clique **Add** e aguarde ~1 minuto
10. Tente o login novamente

### Domínios que o Firebase já autoriza por padrão

- `localhost` (mas às vezes precisa adicionar manualmente)
- `carteira-de-investimento-16725.firebaseapp.com`
- `carteira-de-investimento-16725.web.app`

### Por que acontece localmente?

O Firebase só aceita login Google de domínios cadastrados. Se você abre o app em `127.0.0.1:8080` mas só `localhost` está autorizado, dá erro. **Solução:** use `http://localhost:8080` em vez de `http://127.0.0.1:8080`, OU adicione `127.0.0.1` na lista.

---

## Uso vitalício (sem depender de nada externo)

O app funciona **100% offline** como PWA:

1. Abra o app no navegador
2. Menu do navegador → **Instalar aplicativo** (ou ícone de instalação na barra de endereço)
3. Vira um app independente no desktop/celular
4. Dados ficam no `localStorage` do navegador
5. Backup em nuvem (Firestore) é opcional — só se você quiser sync entre dispositivos

### Estratégia vitalícia recomendada

```
Uso diário:     PWA instalado (offline, rápido, sem login)
Backup:        Exportar backup criptografado 1x/mês → pasta _backups
Sync nuvem:    Firebase (opcional, para multi-dispositivo)
Recuperação:   Importar backup .json criptografado
```

---

## URLs de teste rápido

```
Teste (sintético, sem login):
http://localhost:8080/index.html?testMode=1&testReadOnly=1

Real (seus dados, com login):
http://localhost:8080/index.html

Produção:
https://carteira-investimentos-delta.vercel.app
```
