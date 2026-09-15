const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const dir=path.join(root,'docs','ai');
const required=['PROJECT_MEMORY.md','PROJECT_STATE.md','PRODUCT_VISION.md','ARCHITECTURE_DECISIONS.md','LESSONS_LEARNED.md','KNOWN_RISKS.md','OPEN_WORK.md','TOOLS_SKILLS_MODELS.md','QA_RUNTIME.md','FINANCIAL_INVARIANTS.md','DATA_SOURCES_AND_PROVIDERS.md','HANDOFF_PROTOCOL.md','MILESTONES.md','project-state.json'];
for(const f of required)if(!fs.existsSync(path.join(dir,f)))throw new Error(`MEMORY_FILE_MISSING:${f}`);
const state=JSON.parse(fs.readFileSync(path.join(dir,'project-state.json'),'utf8'));
const hex=/^[0-9a-f]{40}$/i;
if(!hex.test(state.git.currentFunctionalHead)||!hex.test(state.git.memoryUpdatedForHead))throw new Error('HEAD_INVALID');
if(state.git.currentFunctionalHead!==state.git.memoryUpdatedForHead)throw new Error('HEAD_FIELDS_CONFLICT');
if(state.financialBaseline.fingerprint.length!==64||!/^\d+$/.test(String(state.financialBaseline.financialCents)))throw new Error('BASELINE_INVALID');
if(!String(state.nextAction||'').trim()||!Array.isArray(state.openWork)||state.openWork.length===0)throw new Error('OPEN_WORK_OR_NEXT_ACTION_MISSING');
const memory=fs.readFileSync(path.join(dir,'PROJECT_MEMORY.md'),'utf8');const head=(memory.match(/CURRENT_HEAD_FUNCTIONAL=([0-9a-f]{40})/i)||[])[1];if(head!==state.git.currentFunctionalHead)throw new Error('MEMORY_HEAD_MISMATCH');
const stateMd=fs.readFileSync(path.join(dir,'PROJECT_STATE.md'),'utf8');const stateHead=(stateMd.match(/CURRENT_HEAD[\s\S]*?([0-9a-f]{40})/i)||[])[1];if(stateHead!==state.git.currentFunctionalHead)throw new Error('STATE_HEAD_MISMATCH');
for(const f of required){const s=fs.readFileSync(path.join(dir,f),'utf8');if(/AIza[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z]{20,}|-----BEGIN (RSA|OPENSSH|PRIVATE) KEY-----/.test(s))throw new Error(`SECRET_PATTERN:${f}`);}
console.log(JSON.stringify({ok:true,requiredFiles:required.length,head:state.git.currentFunctionalHead,baseline:state.financialBaseline,openWork:state.openWork.length}));
