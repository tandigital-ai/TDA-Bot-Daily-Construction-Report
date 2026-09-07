// Key Store — quản lý API keys, round-robin, counters
// Lưu trong IndexedDB (key = "config") thông qua window.IDB
// Async load / debounced save.

async function loadConfig() {
  try {
    // Migration first: chuyển từ localStorage nếu có
    await window.IDB.migrateFromLocalStorage();
    const raw = await window.IDB.get("config");
    if (!raw) return defaultConfig();
    const cfg = raw;
    // Migration schema
    if (!cfg.providers) cfg.providers = {};
    if (!cfg.settings) cfg.settings = { temperature: 0.1, maxRetries: 3, chunkPerDay: true };
    if (!cfg.userPrompt) cfg.userPrompt = window.DEFAULT_USER_PROMPT_TEMPLATE;
    if (!cfg.lang) cfg.lang = "vi";
    for (const pid of Object.keys(window.PROVIDER_CATALOG)) {
      if (!cfg.providers[pid]) cfg.providers[pid] = { enabled: false, keys: [], models: [...(window.PROVIDER_CATALOG[pid].default_models || [])], defaultModel: (window.PROVIDER_CATALOG[pid].default_models || [])[0] || "", baseUrl: "", rrIndex: 0 };
    }
    return cfg;
  } catch (e) {
    console.warn("[KeyStore] Load lỗi, dùng default:", e);
    return defaultConfig();
  }
}

function defaultConfig() {
  const providers = {};
  for (const [pid, info] of Object.entries(window.PROVIDER_CATALOG)) {
    providers[pid] = {
      enabled: false,
      keys: [],
      models: [...(info.default_models || [])],
      defaultModel: (info.default_models || [])[0] || "",
      baseUrl: "",
      rrIndex: 0,
    };
  }
  return {
    providers,
    settings: { temperature: 0.1, maxRetries: 3, chunkPerDay: true },
    userPrompt: window.DEFAULT_USER_PROMPT_TEMPLATE,
    lang: "vi",
  };
}

// Debounce save để tránh ghi IDB liên tục khi user gõ nhanh
let _saveTimer = null;
let _pendingCfg = null;
function saveConfig(cfg) {
  _pendingCfg = cfg;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const toSave = _pendingCfg;
    _pendingCfg = null;
    _saveTimer = null;
    window.IDB.set("config", toSave).catch(e => console.warn("[KeyStore] save lỗi:", e));
  }, 250);
}

// Force flush ngay lập tức (dùng khi cần đảm bảo đã lưu, VD trước navigation)
function flushConfig() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
    const toSave = _pendingCfg;
    _pendingCfg = null;
    return window.IDB.set("config", toSave);
  }
  return Promise.resolve();
}

// Round-robin: chọn key kế tiếp cho provider, ưu tiên key enabled, tránh key vừa bị 429
function pickKey(cfg, providerId, skipIds = []) {
  const p = cfg.providers[providerId];
  if (!p || !p.keys || p.keys.length === 0) return null;
  const enabledKeys = p.keys.filter(k => k.enabled && !skipIds.includes(k.id));
  if (enabledKeys.length === 0) return null;
  const startIdx = (p.rrIndex || 0) % enabledKeys.length;
  const picked = enabledKeys[startIdx];
  p.rrIndex = (startIdx + 1) % enabledKeys.length;
  return picked;
}

function incrementKeyStat(cfg, providerId, keyId, field, delta = 1) {
  const p = cfg.providers[providerId];
  if (!p) return;
  const k = p.keys.find(x => x.id === keyId);
  if (!k) return;
  k[field] = (k[field] || 0) + delta;
  saveConfig(cfg);
}

function newKeyId() {
  return "k_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function maskKey(key) {
  if (!key) return "";
  if (key.length <= 10) return "•".repeat(key.length);
  return key.slice(0, 4) + "•".repeat(Math.max(4, key.length - 8)) + key.slice(-4);
}

window.KeyStore = { loadConfig, saveConfig, flushConfig, pickKey, incrementKeyStat, newKeyId, maskKey, defaultConfig };
