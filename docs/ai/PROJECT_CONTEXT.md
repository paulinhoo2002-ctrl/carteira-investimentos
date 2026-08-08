# Project Context

## Objective
Personal investment portfolio control system.

## Architecture
- Legacy frontend: index.html (single page application)
- Modern frontend: modern/ directory (WIP, read-only)
- Core logic: finance-core.js (financial calculations), persistence-core.js (data persistence)
- Modules: portfolio-movement-contract.js, portfolio-movement-preview.js, etc.

## index.html (Legacy)
- Main application entry point
- Contains all UI logic, styles, and scripts for the legacy interface
- Uses vanilla JavaScript with some modular patterns
- Direct DOM manipulation

## modern/
- Experimental modern frontend (WIP)
- Currently read-only, not used in production
- Built with modern frameworks (not specified in legacy)

## Finance Core (finance-core.js)
- Contains all financial calculations and business logic
- Functions for: asset valuation, contribution processing, withdrawal calculations, dividend processing, etc.
- Pure JavaScript, no DOM dependencies

## Persistence Core (persistence-core.js)
- Handles data storage and retrieval
- Uses Firebase/firestore as backend
- Abstracts data operations for: wallet, assets, movements, goals, etc.

## Main Modules
- Asset management
- Contribution (aporte) processing
- Withdrawal (resgate) processing
- Dividend processing
- Goal tracking
- Report generation

## General Organization
- index.html: legacy UI
- finance-core.js: financial rules
- persistence-core.js: data layer
- Various contract/preview files for specific workflows
- Configuration: firebase.json, firestore.rules, manifest.json
- Scripts: package.json, package-lock.json

## Conventions
- Mobile-first responsive design
- Prefixing: rf_ for renda fixa, etc.
- Event-driven UI updates
- Direct Firebase calls in persistence layer

## Architectural Decisions
- Legacy monolithic index.html maintained for stability
- Incremental modernization via modern/ (separate, read-only)
- Financial rules isolated in finance-core.js for testability
- Persistence abstracted in persistence-core.js for backend swaps

## Render Flow
1. index.html loads
2. Initializes UI components
3. Loads user data via persistence-core.js
4. Renders initial state
5. User interactions trigger updates via DOM events
6. State changes persist to Firebase via persistence-core.js
7. UI updates reactively (via re-render or direct DOM manipulation)

## Global State S
- Not explicitly defined as a single object
- State distributed in DOM elements and Firebase
- persistence-core.js manages the canonical state in Firebase
- UI reflects Firebase state after each sync

## Persistence Rules
- All data stored in Firebase/firestore
- Collections: carteira, ativos, movimentacoes, proventos, metas, etc.
- Documents auto-generated with IDs
- Security rules in firestore.rules

## Critical Points
- Financial calculations must match persistence-core.js expectations
- UI changes must not alter financial rules (in finance-core.js)
- Firebase security rules protect data integrity
- Legacy index.html must remain compatible with existing data schemas
- Modern/ is experimental and not integrated with legacy flow
