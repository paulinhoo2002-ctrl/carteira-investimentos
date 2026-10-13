function settingsTab(){
  ensureWallets();
  const wallets=S.wallets;
  const activeW=activeWallet();
  const activeIdx=activeWalletIndex();
  const walletCount=wallets.length;
  const totalAssets=(S.assets||[]).length;
  const totalAportes=(S.aportes||[]).length;
  const totalProventos=(S.proventos||[]).length;
  const totalRf=(S.rfEvents||[]).length;
  const themeLabel=THEME==='light'?'Tema Claro':'Tema Escuro';
  const themeIcon=THEME==='light'?'🌤️':'🌙';
  const cloudLabel=FB.user?cloudStatusText():(FB.ready?'Local':'Offline');
  const cloudBadge=FB.user?(CloudSyncState.isDataConfirmed(cloudSyncState())?'ok':'warn'):(FB.ready?'off':'off');
  const userEmail=FB.user?FB.user.email:'';
  const userName=FB.user?(FB.user.displayName||FB.user.email||''):'';
  const pwaInstalled=!!PWA.installed;
  const canSec=canManageSecurity();
  const isTest=isLocalTestMode();
  return `<div class="premium-settings-page">
    <div class="premium-settings-header">
      <div>
        <div class="premium-settings-kicker">CONFIGURAÇÕES</div>
        <h2 class="premium-settings-title">Preferências e administração</h2>
        <h1 class="premium-settings-subtitle">Preferências, dados e administração da carteira.</h1>
      </div>
    </div>
    <div class="premium-settings-grid">
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="premium-settings-section">
          <div class="premium-settings-section-head">
            <div class="premium-settings-section-icon" style="background:rgba(167,139,250,.1);color:#a78bfa">📁</div>
            <div><h2 class="premium-settings-section-title">Conta e Carteira</h2><div class="premium-settings-section-sub">Gerenciar carteiras e conta conectada</div></div>
          </div>
          ${isTest ? `
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">Modo de teste local</div><div class="premium-settings-row-desc">Dados em memória. Sem Firebase, sem sync.</div></div>
            <span class="premium-settings-badge warn">Teste</span>
          </div>` : `
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">${esc(userName||'Sem conta')}</div><div class="premium-settings-row-desc">${FB.user?esc(userEmail):'Faça login para sincronizar na nuvem'}</div></div>
            ${FB.user ? `<span class="premium-settings-badge ok">Conectado</span>` : `<button class="btn bp" onclick="signInGoogle()" style="font-size:11px;min-height:34px;padding:0 10px">Entrar Google</button>`}
          </div>
          ${FB.user ? `
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">Nuvem</div><div class="premium-settings-row-desc">Status da sincronização</div></div>
            <span class="premium-settings-badge ${cloudBadge}">${esc(cloudLabel)}</span>
          </div>
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">Sincronizar agora</div><div class="premium-settings-row-desc">Enviar dados locais para a nuvem</div></div>
            <button class="btn bgh" onclick="uploadLocalToCloud(true)" aria-busy="${FB.syncInFlight?'true':'false'}" ${FB.syncInFlight?'disabled':''} style="font-size:11px;min-height:34px;padding:0 10px">${FB.syncInFlight?'⏳ Sincronizando...':'☁️ Enviar'}</button>
          </div>
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">Sair da conta</div><div class="premium-settings-row-desc">Desconectar do Google</div></div>
            <button class="btn bgh" onclick="signOutGoogle()" style="font-size:11px;min-height:34px;padding:0 10px">Sair</button>
          </div>` : ''}
          `}
          <div class="premium-settings-wallet-card">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <div><div class="premium-settings-wallet-name">${esc(activeW?.name||'Carteira')}</div><div class="premium-settings-wallet-meta">${walletCount} carteira${walletCount!==1?'s':''} · ${totalAssets} ativo${totalAssets!==1?'s':''} · ${totalAportes} aporte${totalAportes!==1?'s':''} · ${totalProventos} provento${totalProventos!==1?'s':''} · ${totalRf} renda fixa${totalRf!==1?'s':''}</div></div>
              <span class="premium-settings-badge info">Ativa</span>
            </div>
            ${walletCount>1 ? `
            <select class="inp" style="width:100%;min-height:38px;padding:6px 10px;margin-top:10px;font-size:12px" onchange="switchWallet(this.value)">
              ${wallets.map((w,i)=>`<option value="${esc(w.id)}" ${String(w.id)===String(activeW?.id)?'selected':''}>${esc(w.name)}${i===activeIdx?' ·':''}</option>`).join('')}
            </select>` : ''}
            <div class="premium-settings-wallet-actions">
              <button class="btn bgh" onclick="createWallet()">➕ Nova</button>
              <button class="btn bgh" onclick="duplicateWallet()">⧉ Duplicar</button>
              <button class="btn bgh" onclick="renameWallet()">✏️ Renomear</button>
              <button class="btn bgh" onclick="deleteWallet()">🗑️ Excluir</button>
            </div>
          </div>
        </div>

        <div class="premium-settings-section premium-settings-danger">
          <div class="premium-settings-section-head">
            <div class="premium-settings-section-icon">⚠️</div>
            <div><h2 class="premium-settings-section-title">Zona de risco</h2><div class="premium-settings-section-sub">Ações destrutivas — exigem confirmação</div></div>
          </div>
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">Resetar carteira ativa</div><div class="premium-settings-row-desc">Apagar todo o histórico, ativos e proventos desta carteira. Outras carteiras não são afetadas.</div></div>
            <button class="btn bgh" onclick="resetPortfolio(event)" aria-busy="${RESET_IN_FLIGHT?'true':'false'}" ${RESET_IN_FLIGHT?'disabled':''} style="font-size:11px;min-height:34px;padding:0 10px;border-color:rgba(248,113,113,.25);color:#fca5a5">${RESET_IN_FLIGHT?'⏳ Resetando...':'🧹 Reset'}</button>
          </div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="premium-settings-section ds-panel">
          <div class="premium-settings-section-head">
            <div class="premium-settings-section-icon ds-icon-container" style="background:rgba(96,165,250,.1);color:#60a5fa">🎨</div>
            <div><h2 class="premium-settings-section-title">Aparência</h2><div class="premium-settings-section-sub">Tema e preferências visuais</div></div>
          </div>
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">Tema</div><div class="premium-settings-row-desc">${esc(themeLabel)}</div></div>
            <button class="btn bgh ds-button ds-button--ghost" onclick="toggleTheme()" style="font-size:11px;min-height:34px;padding:0 10px">${esc(themeIcon)} Alternar</button>
          </div>
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">${S.hideValues?'Mostrar valores':'Ocultar valores'}</div><div class="premium-settings-row-desc">${S.hideValues?'Valores ocultos na carteira':'Valores visíveis normalmente'}</div></div>
            <div class="premium-settings-toggle ${S.hideValues?'on':''}" onclick="toggleHideValues()" role="switch" aria-label="${S.hideValues?'Mostrar valores':'Ocultar valores'}" aria-checked="${S.hideValues}" tabindex="0" onkeydown="if(event.key===' '||event.key==='Enter'){event.preventDefault();toggleHideValues()}"></div>
          </div>
        </div>

        ${isTest ? `
        <div class="premium-settings-section ds-panel">
          <div class="premium-settings-section-head">
            <div class="premium-settings-section-icon ds-icon-container" style="background:rgba(96,165,250,.1);color:#60a5fa">🧪</div>
            <div><h2 class="premium-settings-section-title">Ambiente de teste</h2><div class="premium-settings-section-sub">Fixture local em memória; não altera dados reais</div></div>
          </div>
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">Restaurar dados de teste</div><div class="premium-settings-row-desc">Reinicializa a fixture em memória com dados determinísticos.</div></div>
            ${isLocalTestReadOnlyMode()?'<span role="status">Bloqueado no modo somente leitura.</span>':'<button class="btn bgh ds-button ds-button--secondary" onclick="restoreLocalTestData()" style="font-size:11px;min-height:34px;padding:0 10px">🧪 Restaurar</button>'}
          </div>
        </div>` : ''}

        <div class="premium-settings-section">
          <div class="premium-settings-section-head">
            <div class="premium-settings-section-icon" style="background:rgba(52,211,153,.1);color:#34d399">💾</div>
            <div><h2 class="premium-settings-section-title">Dados e Backup</h2><div class="premium-settings-section-sub">Exportar, importar e restaurar dados</div></div>
          </div>
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">Exportar backup</div><div class="premium-settings-row-desc">Gera uma cópia restaurável em JSON; não é um relatório analítico.</div></div>
            <button class="btn bgh" onclick="exportBackup()" style="font-size:11px;min-height:34px;padding:0 10px">📤 Exportar</button>
          </div>
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">Importar backup</div><div class="premium-settings-row-desc">Selecione um arquivo JSON e revise antes de restaurar.</div></div>
            <button class="btn bgh" onclick="openBackupCenter()" style="font-size:11px;min-height:34px;padding:0 10px">📥 Importar</button>
          </div>
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">Centro de backup</div><div class="premium-settings-row-desc">Visualizar resumo e gerenciar importação/exportação.</div></div>
            <button class="btn bgh" onclick="openBackupCenter()" style="font-size:11px;min-height:34px;padding:0 10px">Abrir</button>
          </div>
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">Aportes e retiradas externas</div><div class="premium-settings-row-desc">Fluxos para medir performance, separados de compras e vendas.</div></div>
            <button class="btn bgh" onclick="openExternalFlow()" style="font-size:11px;min-height:34px;padding:0 10px">Registrar</button>
          </div>
        </div>

        ${canSec ? `
        <div class="premium-settings-section">
          <div class="premium-settings-section-head">
            <div class="premium-settings-section-icon" style="background:rgba(251,191,36,.1);color:#fbbf24">🔐</div>
            <div><h2 class="premium-settings-section-title">Segurança</h2><div class="premium-settings-section-sub">Controle de acesso ao aplicativo</div></div>
          </div>
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">Controle de acesso</div><div class="premium-settings-row-desc">Defina quem entra e quem mantém a carteira sincronizada.</div></div>
            <button class="btn bgh" onclick="openAccessSettings()" style="font-size:11px;min-height:34px;padding:0 10px">Configurar</button>
          </div>
        </div>` : ''}

        <div class="premium-settings-section ds-panel">
          <div class="premium-settings-section-head">
            <div class="premium-settings-section-icon ds-icon-container" style="background:rgba(148,163,184,.1);color:#94a3b8">ℹ️</div>
            <div><h2 class="premium-settings-section-title">Sobre</h2><div class="premium-settings-section-sub">Informações do aplicativo</div></div>
          </div>
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">${esc(APP_NAME)}</div><div class="premium-settings-row-desc">${esc(isTest?'Modo de teste local · dados em memória':'Dados locais + Google/Firebase')}</div></div>
          </div>
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">PWA</div><div class="premium-settings-row-desc">${pwaInstalled?'App instalado no dispositivo':'Instale como aplicativo para acesso rápido'}</div></div>
            ${pwaInstalled ? `<span class="premium-settings-badge ds-badge ds-badge--positive ok">Instalado</span>` : (PWA.prompt ? `<button class="btn bgh ds-button ds-button--ghost" onclick="installPWA()" style="font-size:11px;min-height:34px;padding:0 10px">📲 Instalar</button>` : `<span class="premium-settings-badge ds-badge ds-badge--info off">Indisponível</span>`)}
          </div>
          <div class="premium-settings-row">
            <div class="premium-settings-row-info"><div class="premium-settings-row-label">Atualizações</div><div class="premium-settings-row-desc">Verificar se há uma versão mais recente.</div></div>
            <button class="btn bgh ds-button ds-button--ghost" onclick="checkForAppUpdate({manual:true})" style="font-size:11px;min-height:34px;padding:0 10px">🔄 Verificar</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}
