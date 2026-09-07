// Key Store — quản lý API keys, round-robin, counters
// Lưu trong localStorage với namespace kh_tc_v1

const STORAGE_KEY = "kh_tc_v1_config";

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig();
    const cfg = JSON.parse(raw);
    // Migration: đảm bảo có đủ providers
    if (!cfg.providers) cfg.providers = {};
    if (!cfg.settings) cfg.settings = { temperature: 0.1, maxRetries: 3, chunkPerDay: true };
    if (!cfg.userPrompt) cfg.userPrompt = window.DEFAULT_USER_PROMPT_TEMPLATE;
    for (const pid of Object.keys(window.PROVIDER_CATALOG)) {
      if (!cfg.providers[pid]) cfg.providers[pid] = { enabled: false, keys: [], models: [], defaultModel: "", baseUrl: "", rrIndex: 0 };
    }
    return cfg;
  } catch (e) {
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

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// Round-robin: chọn key kế tiếp cho provider, ưu tiên key enabled, tránh key vừa bị 429
function pickKey(cfg, providerId, skipIds = []) {
  const p = cfg.providers[providerId];
  if (!p || !p.keys || p.keys.length === 0) return null;
  const enabledKeys = p.keys.filter(k => k.enabled && !skipIds.includes(k.id));
  if (enabledKeys.length === 0) return null;
  // Round robin qua danh sách enabled
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

window.KeyStore = { loadConfig, saveConfig, pickKey, incrementKeyStat, newKeyId, maskKey, defaultConfig };
