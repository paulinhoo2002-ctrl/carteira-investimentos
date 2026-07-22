# Component Library Plan

Sprint 3.2.2 -> Select oficial.

## Objetivo

Dar o passo seguinte da Component Library sem migrar tudo de uma vez.
Select entra agora porque e frequente, simples de validar e fecha um gap claro de consistencia nos filtros.

## Arquitetura

- `modern/src/styles.css`
  - tokens globais
  - aliases
  - reset/base
  - acessibilidade global
- `modern/src/components/Button/Button.tsx`
- `modern/src/components/Button/Button.css`
- `modern/src/components/Input/Input.tsx`
- `modern/src/components/Input/Input.css`
- `modern/src/components/Select/Select.tsx`
- `modern/src/components/Select/Select.css`

## Piloto Select oficial

### Fluxo piloto

- tela: `modern/src/features/reports/AssetsReadonlyPage.tsx`
- filtro: categoria
- filtro: ordenacao
- risco: baixo
- comportamento preservado: filtro local, refresh readonly, ordem visual e snapshot intactos
- Button e Input continuam no fluxo ja validado

### Select

- label obrigatoria
- helper text
- erro textual
- disabled
- required
- native HTML select
- sem dropdown custom
- sem readonly artificial
- sem mascara monetaria no componente base

## Regras

- tokens continuam como fonte unica em `modern/src/styles.css`
- componente novo ganha CSS proprio
- compatibilidade com legado continua obrigatoria
- sem dependencia nova
- sem redesign de tela
- sem migracao em massa
- CSS por componente continua o padrao

## Testes

- Select: label, helper, erro, aria-describedby, aria-invalid, disabled, required, native option rendering
- fluxo piloto: AssetsReadonlyPage usando Select sem mudar comportamento
- Button/Input continuam cobertos pela onda anterior

## Criterios de conclusao

- Select oficial pronto para uso
- fluxo piloto preservado
- testes verdes
- sem regressao visual ou funcional

## Proxima onda

- Badge
