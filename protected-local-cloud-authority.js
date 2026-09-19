(function initProtectedLocalCloudAuthority(globalScope){
  'use strict';

  const VERSION = 'local-cloud-authority-v2';
  const SCHEMA_VERSION = 2;
  const HASH_RE = /^[0-9a-f]{64}$/;
  const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  const STATUS = Object.freeze({
    CLOUD_AUTHORITATIVE: 'CLOUD_AUTHORITATIVE',
    LOCAL_AUTHORITATIVE: 'LOCAL_AUTHORITATIVE',
    CONFLICT: 'CONFLICT',
    INVALID_PROTECTED_MARKER: 'INVALID_PROTECTED_MARKER',
  });

  function stable(value){
    if(Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if(value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
  }

  function comparable(value = {}){
    return {
      wallets:Array.isArray(value.wallets) ? value.wallets : [],
      assets:Array.isArray(value.assets) ? value.assets : [],
      aportes:Array.isArray(value.aportes) ? value.aportes : [],
      proventos:Array.isArray(value.proventos) ? value.proventos : [],
      rfEvents:Array.isArray(value.rfEvents) ? value.rfEvents : [],
      goals:value.goals && typeof value.goals === 'object' ? value.goals : {},
    };
  }

  const SHA256_K = Object.freeze([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ]);
  const rotateRight = (value, bits) => (value >>> bits) | (value << (32 - bits));
  function fingerprintHash(value){
    const input = new TextEncoder().encode(String(value));
    const bitLength = input.length * 8;
    const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
    const bytes = new Uint8Array(paddedLength);
    bytes.set(input);
    bytes[input.length] = 0x80;
    const view = new DataView(bytes.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
    view.setUint32(paddedLength - 4, bitLength >>> 0, false);
    const h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const w = new Uint32Array(64);
    for(let offset = 0; offset < paddedLength; offset += 64){
      for(let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
      for(let i = 16; i < 64; i++){
        const s0 = rotateRight(w[i-15],7) ^ rotateRight(w[i-15],18) ^ (w[i-15] >>> 3);
        const s1 = rotateRight(w[i-2],17) ^ rotateRight(w[i-2],19) ^ (w[i-2] >>> 10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
      }
      let [a,b,c,d,e,f,g,hh] = h;
      for(let i = 0; i < 64; i++){
        const s1 = rotateRight(e,6) ^ rotateRight(e,11) ^ rotateRight(e,25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + s1 + ch + SHA256_K[i] + w[i]) >>> 0;
        const s0 = rotateRight(a,2) ^ rotateRight(a,13) ^ rotateRight(a,22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (s0 + maj) >>> 0;
        hh=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
      }
      h[0]=(h[0]+a)>>>0; h[1]=(h[1]+b)>>>0; h[2]=(h[2]+c)>>>0; h[3]=(h[3]+d)>>>0;
      h[4]=(h[4]+e)>>>0; h[5]=(h[5]+f)>>>0; h[6]=(h[6]+g)>>>0; h[7]=(h[7]+hh)>>>0;
    }
    return h.map(part => part.toString(16).padStart(8,'0')).join('');
  }

  function fingerprintState(state){ return fingerprintHash(stable(comparable(state))); }
  function fingerprintCloud(cloud){ return fingerprintState(cloud); }

  function isFingerprint(value){ return typeof value === 'string' && HASH_RE.test(value); }

  function readMarker(raw){
    if(raw == null || raw === '') return null;
    let marker;
    try{ marker = typeof raw === 'string' ? JSON.parse(raw) : raw; }catch{ return { invalid:true, reason:'MALFORMED_JSON' }; }
    const valid = marker && marker.version === VERSION
      && marker.schemaVersion === SCHEMA_VERSION
      && marker.status === 'PROTECTED_LOCAL_DIVERGENCE'
      && isFingerprint(marker.baseCloudFingerprint)
      && isFingerprint(marker.currentLocalFingerprint)
      && typeof marker.operationId === 'string' && marker.operationId.trim().length > 0
      && typeof marker.timestamp === 'string' && ISO_UTC_RE.test(marker.timestamp);
    return valid ? Object.freeze(marker) : { invalid:true, reason:'INVALID_SCHEMA' };
  }

  function createMarker({ baseCloudFingerprint = '', currentLocalFingerprint = '', operationId = '', reason = '', now = () => new Date().toISOString() } = {}){
    if(!isFingerprint(baseCloudFingerprint) || !isFingerprint(currentLocalFingerprint)) throw new Error('PROTECTED_MARKER_REQUIRES_HASH_FINGERPRINTS');
    if(!String(operationId||'').trim()) throw new Error('PROTECTED_MARKER_REQUIRES_OPERATION_ID');
    const nowValue=now();
    const timestamp=nowValue instanceof Date ? nowValue.toISOString() : String(nowValue);
    if(!ISO_UTC_RE.test(timestamp)) throw new Error('PROTECTED_MARKER_REQUIRES_ISO_TIMESTAMP');
    return Object.freeze({ schemaVersion:SCHEMA_VERSION, version:VERSION, status:'PROTECTED_LOCAL_DIVERGENCE', baseCloudFingerprint, currentLocalFingerprint, operationId:String(operationId), timestamp, reason:String(reason || '') });
  }

  function decide({ marker = null, localFingerprint = '', cloudFingerprint = '', legacyProtected = false } = {}){
    const parsedMarker=readMarker(marker);
    if(parsedMarker?.invalid) return { status:STATUS.INVALID_PROTECTED_MARKER, reason:parsedMarker.reason };
    if(parsedMarker?.version === VERSION && parsedMarker.status === 'PROTECTED_LOCAL_DIVERGENCE'){
      if(parsedMarker.currentLocalFingerprint !== localFingerprint){
        return { status:STATUS.INVALID_PROTECTED_MARKER, reason:'LOCAL_FINGERPRINT_MISMATCH' };
      }
      if(parsedMarker.baseCloudFingerprint === cloudFingerprint) return { status:STATUS.LOCAL_AUTHORITATIVE, reason:'PROTECTED_LOCAL_DIVERGENCE' };
      return { status:STATUS.CONFLICT, reason:'CLOUD_CHANGED_WHILE_LOCAL_DIVERGED' };
    }
    if(legacyProtected) return { status:STATUS.LOCAL_AUTHORITATIVE, reason:'LEGACY_PROTECTED_TARGET_RECOGNIZED_READ_ONLY' };
    return { status:STATUS.CLOUD_AUTHORITATIVE, reason:'NO_PROTECTED_LOCAL_DIVERGENCE' };
  }

  const api = Object.freeze({ VERSION, SCHEMA_VERSION, STATUS, stable, comparable, fingerprintHash, fingerprintState, fingerprintCloud, isFingerprint, readMarker, createMarker, decide });
  if(globalScope) globalScope.ProtectedLocalCloudAuthority = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
