// Tab quản lý AI Providers & API Keys
const { useState: useStateP, useEffect: useEffectP, useMemo: useMemoP, useRef: useRefP } = React;

function ProvidersTab({ cfg, setCfg, t }) {
  const [expanded, setExpanded] = useStateP(new Set(["gemini", "groq"]));
  const [showKeyId, setShowKeyId] = useStateP(new Set());
  const [testing, setTesting] = useStateP({});
  const [fetchingModels, setFetchingModels] = useStateP({});
  const fileInputRef = useRefP(null);

  const save = (nextCfg) => {
    window.KeyStore.saveConfig(nextCfg);
    setCfg({ ...nextCfg });
  };

  const toggleExpand = (pid) => {
    const s = new Set(expanded);
    if (s.has(pid)) s.delete(pid); else s.add(pid);
    setExpanded(s);
  };

  const addKey = (pid) => {
    const c = { ...cfg };
    if (!c.providers[pid].keys) c.providers[pid].keys = [];
    c.providers[pid].keys.push({
      id: window.KeyStore.newKeyId(),
      label: "Key " + (c.providers[pid].keys.length + 1),
      value: "",
      enabled: true,
      calls: 0, errors: 0, latency: 0,
    });
    save(c);
  };

  const updateKey = (pid, kid, field, value) => {
    const c = { ...cfg };
    const k = c.providers[pid].keys.find(x => x.id === kid);
    if (k) { k[field] = value; save(c); }
  };

  const deleteKey = (pid, kid) => {
    if (!confirm("Xóa key này?")) return;
    const c = { ...cfg };
    c.providers[pid].keys = c.providers[pid].keys.filter(k => k.id !== kid);
    save(c);
  };

  const toggleShowKey = (kid) => {
    const s = new Set(showKeyId);
    if (s.has(kid)) s.delete(kid); else s.add(kid);
    setShowKeyId(s);
  };

  const handleTest = async (pid, kid) => {
    setTesting({ ...testing, [kid]: "loading" });
    try {
      const res = await window.AIClient.testKey({ providerId: pid, cfg, keyId: kid });
      setTesting({ ...testing, [kid]: { ok: true, latency: res.latency } });
      setTimeout(() => setTesting(t => { const n = {...t}; delete n[kid]; return n; }), 4000);
    } catch (e) {
      setTesting({ ...testing, [kid]: { ok: false, err: e.message } });
      setTimeout(() => setTesting(t => { const n = {...t}; delete n[kid]; return n; }), 6000);
    }
  };

  const handleFetchModels = async (pid) => {
    const key = cfg.providers[pid].keys.find(k => k.enabled && k.value);
    if (!key) { alert("Cần ít nhất 1 key enabled để fetch models"); return; }
    setFetchingModels({ ...fetchingModels, [pid]: true });
    try {
      const models = await window.AIClient.fetchModels({ providerId: pid, cfg, keyValue: key.value });
      const c = { ...cfg };
      c.providers[pid].models = models;
      if (!models.includes(c.providers[pid].defaultModel)) {
        c.providers[pid].defaultModel = models[0] || "";
      }
      save(c);
      alert(`✅ Đã load ${models.length} model từ ${window.PROVIDER_CATALOG[pid].name}`);
    } catch (e) {
      alert("❌ Lỗi fetch models: " + e.message);
    } finally {
      setFetchingModels({ ...fetchingModels, [pid]: false });
    }
  };

  const updateProvider = (pid, field, value) => {
    const c = { ...cfg };
    c.providers[pid][field] = value;
    save(c);
  };

  const addCustomModel = (pid) => {
    const name = prompt("Tên model:");
    if (!name) return;
    const c = { ...cfg };
    if (!c.providers[pid].models.includes(name)) {
      c.providers[pid].models.push(name);
      save(c);
    }
  };

  const removeModel = (pid, mname) => {
    const c = { ...cfg };
    c.providers[pid].models = c.providers[pid].models.filter(m => m !== mname);
    if (c.providers[pid].defaultModel === mname) c.providers[pid].defaultModel = c.providers[pid].models[0] || "";
    save(c);
  };

  const handleExport = () => {
    const clone = JSON.parse(JSON.stringify(cfg));
    // Mask key values by default? User có thể muốn giữ để backup → không mask.
    const blob = new Blob([JSON.stringify(clone, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kh_tc_config_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!imported.providers) throw new Error("File config không hợp lệ");
      save(imported);
      alert("✅ Đã nhập cấu hình");
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    }
    e.target.value = "";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("tab_providers")}</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý AI Providers, API Keys, và Models. Keys chỉ lưu trong trình duyệt của bạn.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="text-xs px-3 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700">💾 {t("export_config")}</button>
          <button onClick={() => fileInputRef.current?.click()} className="text-xs px-3 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700">📂 {t("import_config")}</button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(window.PROVIDER_CATALOG).map(([pid, pInfo]) => {
          const pCfg = cfg.providers[pid];
          const isExpanded = expanded.has(pid);
          const keyCount = pCfg?.keys?.length || 0;
          const enabledKeys = pCfg?.keys?.filter(k => k.enabled).length || 0;

          return (
            <div key={pid} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div
                onClick={() => toggleExpand(pid)}
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 select-none"
              >
                <span className="text-slate-400 text-sm">{isExpanded ? "▼" : "▶"}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-slate-800">{pInfo.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {keyCount} keys ({enabledKeys} bật) · {pCfg?.models?.length || 0} models
                    {pCfg?.defaultModel && <span> · Default: <span className="font-mono text-blue-700">{pCfg.defaultModel}</span></span>}
                  </div>
                </div>
                {enabledKeys > 0 && <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded">Hoạt động</span>}
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-4">
                  {/* Base URL cho custom */}
                  {pid === "custom" && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Base URL (OpenAI-compatible endpoint)</label>
                      <input
                        value={pCfg.baseUrl}
                        onChange={e => updateProvider(pid, "baseUrl", e.target.value)}
                        placeholder="https://api.example.com/v1"
                        className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 font-mono"
                      />
                      <div className="text-[11px] text-slate-500 mt-1">Endpoint kết thúc bằng /v1 (sẽ tự append /chat/completions & /models)</div>
                    </div>
                  )}

                  {/* Models */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-700">Models ({pCfg.models.length})</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFetchModels(pid)}
                          disabled={fetchingModels[pid]}
                          className="text-[11px] px-2 py-1 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium"
                        >{fetchingModels[pid] ? "⏳..." : "🔄 " + t("fetch_models")}</button>
                        <button onClick={() => addCustomModel(pid)} className="text-[11px] px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700">+ Thêm tay</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {pCfg.models.map(m => (
                        <span key={m} className={`text-[11px] font-mono px-2 py-1 rounded-full border ${pCfg.defaultModel === m ? "bg-blue-100 border-blue-400 text-blue-800" : "bg-white border-slate-300 text-slate-700"} flex items-center gap-1 group`}>
                          <button onClick={() => updateProvider(pid, "defaultModel", m)} className="hover:underline" title="Đặt làm mặc định">{m}</button>
                          <button onClick={() => removeModel(pid, m)} className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                        </span>
                      ))}
                      {pCfg.models.length === 0 && <span className="text-xs text-slate-400 italic">Chưa có model nào. Bấm "Fetch Models" hoặc "+ Thêm tay".</span>}
                    </div>
                  </div>

                  {/* Keys */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-700">API Keys ({keyCount})</label>
                      <button onClick={() => addKey(pid)} className="text-[11px] px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium">{t("add_key")}</button>
                    </div>
                    <div className="space-y-2">
                      {pCfg.keys.map(k => {
                        const shown = showKeyId.has(k.id);
                        const testStatus = testing[k.id];
                        return (
                          <div key={k.id} className="bg-white rounded-md border border-slate-200 p-2.5">
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-2">
                                <input
                                  value={k.label}
                                  onChange={e => updateKey(pid, k.id, "label", e.target.value)}
                                  placeholder={t("label")}
                                  className="w-full text-xs border border-slate-200 rounded px-2 py-1 font-medium"
                                />
                              </div>
                              <div className="col-span-5 relative">
                                <input
                                  type={shown ? "text" : "password"}
                                  value={k.value}
                                  onChange={e => updateKey(pid, k.id, "value", e.target.value)}
                                  placeholder="sk-... hoặc AIza..."
                                  className="w-full text-xs border border-slate-200 rounded px-2 py-1 pr-8 font-mono"
                                />
                                <button
                                  onClick={() => toggleShowKey(k.id)}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs px-1"
                                >{shown ? "🙈" : "👁️"}</button>
                              </div>
                              <div className="col-span-2 text-[10px] text-slate-500">
                                <div>📞 {k.calls || 0} · ❌ {k.errors || 0}</div>
                                <div>⏱ {k.latency || 0}ms</div>
                              </div>
                              <div className="col-span-3 flex items-center gap-1 justify-end">
                                <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                                  <input type="checkbox" checked={k.enabled} onChange={e => updateKey(pid, k.id, "enabled", e.target.checked)} className="accent-green-600" />
                                  <span className={k.enabled ? "text-green-700 font-medium" : "text-slate-400"}>{k.enabled ? t("enabled") : t("disabled")}</span>
                                </label>
                                <button
                                  onClick={() => handleTest(pid, k.id)}
                                  disabled={!k.value || testStatus === "loading"}
                                  className="text-[11px] px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700"
                                >
                                  {testStatus === "loading" ? "⏳" : t("test_key")}
                                </button>
                                <button onClick={() => deleteKey(pid, k.id)} className="text-red-500 hover:text-red-700 text-sm px-1">×</button>
                              </div>
                            </div>
                            {testStatus && testStatus !== "loading" && (
                              <div className={`mt-2 text-[11px] px-2 py-1 rounded ${testStatus.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                                {testStatus.ok ? `✅ OK · ${testStatus.latency}ms` : `❌ ${testStatus.err}`}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {pCfg.keys.length === 0 && (
                        <div className="text-xs text-slate-400 italic text-center py-3 bg-white rounded border border-dashed border-slate-200">
                          Chưa có key nào. Bấm "+ Thêm Key" để bắt đầu.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 space-y-1">
        <div className="font-semibold text-sm mb-1">🔒 Bảo mật</div>
        <div>• API key được lưu <b>duy nhất trong localStorage</b> của trình duyệt bạn — không gửi lên bất kỳ server nào.</div>
        <div>• Có thể <b>xuất/nhập cấu hình JSON</b> để backup hoặc chuyển qua máy khác.</div>
        <div>• Khi 1 key bị 429 (hết quota), hệ thống <b>tự động xoay sang key khác</b> trong cùng provider.</div>
      </div>
    </div>
  );
}

window.ProvidersTab = ProvidersTab;
