# Component Library Plan

Sprint 3.2.1 -> piloto Button + Input.

## Objetivo

Criar a base inicial da Component Library sem migrar tudo de uma vez.
Button e Input entram primeiro porque aparecem muito, sao simples de validar e reduzem risco.

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

## Piloto Button + Input

### Fluxo piloto

- tela: `modern/src/features/reports/AssetsReadonlyPage.tsx`
- botao: atualizar ativos
- campo: busca por ticker ou nome
- risco: baixo
- comportamento preservado: filtro local, refresh readonly, ordem visual e snapshot intactos

### Button

- variantes: primary, secondary, ghost, danger, icon
- tamanhos: sm, md, lg
- estados: default, hover, focus-visible, active, disabled, loading
- contrato pequeno e previsivel
- icon-only exige nome acessivel

### Input

- label obrigatorio
- helper text
- erro textual
- prefixo e sufixo opcionais
- readonly e disabled distintos
- sem mascara monetaria no componente base

## Regras

- tokens continuam como fonte unica em `modern/src/styles.css`
- componente novo ganha CSS proprio
- compatibilidade com legado continua obrigatoria
- sem dependencia nova
- sem redesign de tela
- sem migracao em massa

## Testes

- Button: render, variantes, tamanhos, disabled, loading, aria-busy, icon-only
- Input: label, helper, erro, aria-describedby, aria-invalid, disabled, readonly, required
- fluxo piloto: AssetsReadonlyPage usando Button + Input sem mudar comportamento

## Criterios de conclusao

- Button e Input prontos para uso
- fluxo piloto preservado
- testes verdes
- sem regressao visual ou funcional

## Proxima onda

- Select
- Badge
