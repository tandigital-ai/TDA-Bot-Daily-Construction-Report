// AI Client — gọi provider, retry, JSON repair, xoay key
// Trả về array các dòng đã parse

async function callProvider({ providerId, cfg, systemPrompt, userPrompt, model, onLog }) {
  const provider = window.PROVIDER_CATALOG[providerId];
  if (!provider) throw new Error("Provider không tồn tại: " + providerId);
  const pCfg = cfg.providers[providerId];
  if (!pCfg || pCfg.keys.length === 0) throw new Error("Provider chưa có API key: " + provider.name);

  const maxRetries = cfg.settings.maxRetries || 3;
  const skipIds = [];
  let lastErr = null;

  for (let attempt = 0; attempt < maxRetries + 1; attempt++) {
    const key = window.KeyStore.pickKey(cfg, providerId, skipIds);
    if (!key) throw new Error(`Hết key khả dụng cho ${provider.name} sau ${attempt} lần thử. Lỗi cuối: ${lastErr?.message || "?"}`);

    onLog && onLog(`[${provider.name}] Thử key "${key.label}" (attempt ${attempt + 1})`);
    const req = provider.build({
      model: model || pCfg.defaultModel,
      systemPrompt,
      userPrompt,
      key: key.value,
      temperature: cfg.settings.temperature,
      baseUrl: pCfg.baseUrl,
    });

    const t0 = performance.now();
    try {
      const res = await fetch(req.url, {
        method: "POST",
        headers: req.headers,
        body: JSON.stringify(req.body),
      });
      const dt = Math.round(performance.now() - t0);
      key.latency = dt;

      if (res.status === 429 || res.status === 503) {
        window.KeyStore.incrementKeyStat(cfg, providerId, key.id, "errors");
        skipIds.push(key.id);
        lastErr = new Error(`HTTP ${res.status} (quota/rate limit)`);
        onLog && onLog(`  ⚠️ ${lastErr.message} — xoay sang key khác`);
        continue;
      }
      if (!res.ok) {
        const errText = await res.text();
        window.KeyStore.incrementKeyStat(cfg, providerId, key.id, "errors");
        lastErr = new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
        onLog && onLog(`  ❌ ${lastErr.message}`);
        // Nếu là 401/403 → key sai, skip
        if (res.status === 401 || res.status === 403) skipIds.push(key.id);
        continue;
      }

      const json = await res.json();
      const text = provider.parse(json);
      if (!text) {
        lastErr = new Error("AI trả về rỗng");
        onLog && onLog(`  ⚠️ ${lastErr.message} — retry`);
        continue;
      }

      window.KeyStore.incrementKeyStat(cfg, providerId, key.id, "calls");
      onLog && onLog(`  ✅ ${dt}ms, ${text.length} chars`);
      return { text, key, latency: dt };
    } catch (e) {
      lastErr = e;
      onLog && onLog(`  ❌ ${e.message}`);
      window.KeyStore.incrementKeyStat(cfg, providerId, key.id, "errors");
    }
  }
  throw lastErr || new Error("Không gọi được AI");
}

// Cố parse JSON từ text (chấp nhận có markdown fence hoặc text thừa)
function extractJson(text) {
  if (!text) return null;
  let t = text.trim();
  // Bỏ markdown fence
  const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) t = fenceMatch[1].trim();
  // Tìm { hoặc [ đầu tiên
  const firstBrace = t.indexOf("{");
  const firstBracket = t.indexOf("[");
  let start = -1;
  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);
  if (start === -1) return null;
  t = t.slice(start);
  // Tìm } hoặc ] cuối cùng
  const lastBrace = t.lastIndexOf("}");
  const lastBracket = t.lastIndexOf("]");
  const end = Math.max(lastBrace, lastBracket);
  if (end === -1) return null;
  t = t.slice(0, end + 1);
  try {
    return JSON.parse(t);
  } catch (e) {
    // Thử fix trailing comma
    t = t.replace(/,(\s*[}\]])/g, "$1");
    try { return JSON.parse(t); } catch { return null; }
  }
}

// Chunk raw text theo "Kế hoạch thi công ngày ..." — mỗi ngày là 1 request
function chunkByDay(rawText) {
  const lines = rawText.split(/\r?\n/);
  const chunks = [];
  let current = [];
  const dayRegex = /Kế hoạch thi công ngày/i;
  for (const line of lines) {
    if (dayRegex.test(line) && current.length > 0) {
      chunks.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) chunks.push(current.join("\n"));
  // Loại chunk không có "Kế hoạch thi công ngày"
  return chunks.filter(c => dayRegex.test(c));
}

// Xử lý toàn bộ raw text: chunk → gọi AI từng chunk → gộp
async function normalizeRawData({ rawText, providerId, cfg, model, onProgress, onLog }) {
  const chunks = cfg.settings.chunkPerDay ? chunkByDay(rawText) : [rawText];
  if (chunks.length === 0) throw new Error("Không phát hiện ngày nào trong dữ liệu (thiếu 'Kế hoạch thi công ngày ...')");

  onLog && onLog(`📦 Chia thành ${chunks.length} chunk (mỗi chunk = 1 ngày)`);
  const allRows = [];
  const errors = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    onProgress && onProgress({ current: i + 1, total: chunks.length, chunk });
    onLog && onLog(`\n▶️ Chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

    const userPrompt = cfg.userPrompt.replace("{{RAW_DATA}}", chunk);

    let parsed = null;
    let attempts = 0;
    const maxParseAttempts = 2;

    while (attempts < maxParseAttempts && !parsed) {
      attempts++;
      try {
        const { text } = await callProvider({
          providerId, cfg, systemPrompt: window.LOCKED_SYSTEM_PROMPT,
          userPrompt: attempts === 1 ? userPrompt : userPrompt + "\n\n⚠️ Chỉ trả JSON hợp lệ, không markdown.",
          model, onLog,
        });
        parsed = extractJson(text);
        if (!parsed) {
          onLog && onLog(`  ⚠️ AI trả không phải JSON hợp lệ, retry parse (${attempts}/${maxParseAttempts})`);
        }
      } catch (e) {
        errors.push({ chunk: i + 1, error: e.message });
        onLog && onLog(`  ❌ Chunk ${i + 1} thất bại: ${e.message}`);
        break;
      }
    }

    if (parsed) {
      const rows = Array.isArray(parsed) ? parsed : (parsed.rows || parsed.data || []);
      onLog && onLog(`  ✅ ${rows.length} dòng`);
      for (const r of rows) {
        allRows.push(normalizeRow(r));
      }
    } else if (!errors.find(e => e.chunk === i + 1)) {
      errors.push({ chunk: i + 1, error: "AI không trả JSON hợp lệ" });
    }
  }

  return { rows: allRows, errors, chunkCount: chunks.length };
}

// Đảm bảo mỗi row có đủ 14 trường và giá trị hợp lệ
function normalizeRow(r) {
  return {
    date: String(r.date || ""),
    shift: String(r.shift || ""),
    period: String(r.period || ""),
    task_description: String(r.task_description || ""),
    task_type: String(r.task_type || ""),
    area: String(r.area || ""),
    ward: String(r.ward || ""),
    street: String(r.street || ""),
    vehicle_id: String(r.vehicle_id || ""),
    vehicle_type: String(r.vehicle_type || ""),
    trips: r.trips === null || r.trips === undefined || r.trips === "" ? null : Number(r.trips),
    worker: String(r.worker || ""),
    note: String(r.note || ""),
    status: String(r.status || "Kế hoạch"),
  };
}

// Test key: gọi 1 request ngắn, đo latency
async function testKey({ providerId, cfg, keyId, model }) {
  const provider = window.PROVIDER_CATALOG[providerId];
  const pCfg = cfg.providers[providerId];
  const key = pCfg.keys.find(k => k.id === keyId);
  if (!key) throw new Error("Không tìm thấy key");
  const req = provider.build({
    model: model || pCfg.defaultModel,
    systemPrompt: "You are a helpful assistant. Respond in JSON only.",
    userPrompt: "Reply with exactly this JSON and nothing else: {\"ok\":true}",
    key: key.value,
    temperature: 0.1,
    baseUrl: pCfg.baseUrl,
  });
  const t0 = performance.now();
  const res = await fetch(req.url, { method: "POST", headers: req.headers, body: JSON.stringify(req.body) });
  const dt = Math.round(performance.now() - t0);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 150)}`);
  }
  const json = await res.json();
  const text = provider.parse(json);
  return { ok: true, latency: dt, sample: text.slice(0, 100) };
}

// Fetch models list từ provider
async function fetchModels({ providerId, cfg, keyValue }) {
  const provider = window.PROVIDER_CATALOG[providerId];
  const pCfg = cfg.providers[providerId];
  let url;
  const headers = { "Content-Type": "application/json" };

  if (providerId === "gemini") {
    url = provider.models_endpoint.replace("{KEY}", keyValue);
  } else if (providerId === "custom") {
    if (!pCfg.baseUrl) throw new Error("Custom provider cần Base URL");
    url = provider.getModelsEndpoint(pCfg);
    headers["Authorization"] = `Bearer ${keyValue}`;
  } else {
    url = provider.models_endpoint;
    if (provider.modelsAuth === "bearer") {
      headers["Authorization"] = `Bearer ${keyValue}`;
    }
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 150)}`);
  }
  const json = await res.json();
  return provider.parseModelsList(json);
}

window.AIClient = { callProvider, normalizeRawData, testKey, fetchModels, extractJson, chunkByDay };
