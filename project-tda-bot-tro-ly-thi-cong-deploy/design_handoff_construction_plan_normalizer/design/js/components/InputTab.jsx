// Tab Nhập liệu
const { useState: useStateIn, useMemo: useMemoIn, useEffect: useEffectIn, useRef: useRefIn } = React;

function InputTab({ cfg, setCfg, t, onNormalized, onGoto }) {
  const [rawText, setRawText] = useStateIn(() => localStorage.getItem("kh_tc_v1_raw") || "");
  const [providerId, setProviderId] = useStateIn(() => localStorage.getItem("kh_tc_v1_last_provider") || "");
  const [model, setModel] = useStateIn(() => localStorage.getItem("kh_tc_v1_last_model") || "");
  const [processing, setProcessing] = useStateIn(false);
  const [progress, setProgress] = useStateIn({ current: 0, total: 0 });
  const [logs, setLogs] = useStateIn([]);
  const logsRef = useRefIn(null);
  const fileInputRef = useRefIn(null);

  useEffectIn(() => { localStorage.setItem("kh_tc_v1_raw", rawText); }, [rawText]);
  useEffectIn(() => { if (providerId) localStorage.setItem("kh_tc_v1_last_provider", providerId); }, [providerId]);
  useEffectIn(() => { if (model) localStorage.setItem("kh_tc_v1_last_model", model); }, [model]);
  useEffectIn(() => { if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight; }, [logs]);

  // Provider có key hợp lệ
  const availableProviders = useMemoIn(() => {
    return Object.entries(cfg.providers)
      .filter(([, p]) => p.keys && p.keys.some(k => k.enabled))
      .map(([id]) => ({ id, name: window.PROVIDER_CATALOG[id]?.name || id }));
  }, [cfg]);

  // Auto pick first provider if none selected
  useEffectIn(() => {
    if (!providerId && availableProviders.length > 0) {
      setProviderId(availableProviders[0].id);
    }
  }, [availableProviders, providerId]);

  const models = useMemoIn(() => {
    if (!providerId) return [];
    return cfg.providers[providerId]?.models || [];
  }, [providerId, cfg]);

  useEffectIn(() => {
    if (providerId && !model && models.length > 0) {
      setModel(cfg.providers[providerId].defaultModel || models[0]);
    }
  }, [providerId, models]);

  const chunks = useMemoIn(() => window.AIClient.chunkByDay(rawText), [rawText]);

  const addLog = (msg) => setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg }]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      let text = "";
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        for (const r of rows) {
          text += r.filter(x => x != null && x !== "").join(" ") + "\n";
        }
      }
      setRawText(text);
    } else {
      const text = await file.text();
      setRawText(text);
    }
    e.target.value = "";
  };

  const handleRun = async () => {
    if (!rawText.trim()) { alert("Vui lòng nhập dữ liệu thô"); return; }
    if (!providerId) { alert("Vui lòng chọn Provider (Tab AI Providers)"); return; }
    setProcessing(true);
    setLogs([]);
    setProgress({ current: 0, total: 0 });
    addLog(`🚀 Bắt đầu chuẩn hóa với ${window.PROVIDER_CATALOG[providerId].name} / ${model}`);
    try {
      const result = await window.AIClient.normalizeRawData({
        rawText, providerId, cfg, model,
        onProgress: (p) => setProgress({ current: p.current, total: p.total }),
        onLog: addLog,
      });
      addLog(`\n🎉 Hoàn thành! Tổng ${result.rows.length} dòng từ ${result.chunkCount} chunk. Lỗi: ${result.errors.length}`);
      onNormalized(result.rows);
      window.KeyStore.saveConfig(cfg); // save counters
      setCfg({ ...cfg });
      // Auto chuyển sang tab result sau 800ms
      setTimeout(() => onGoto("result"), 800);
    } catch (e) {
      addLog(`\n❌ Lỗi: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">{t("tab_input")}</h1>
        <p className="text-sm text-slate-500 mt-1">Dán tin nhắn Zalo, AI sẽ tự tách theo ngày và chuẩn hóa thành bảng.</p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: textarea */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="font-medium text-sm text-slate-700">{t("raw_data_label")}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setRawText(window.SAMPLE_RAW_DATA); }}
                  className="text-xs px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-50 text-slate-700"
                >{t("load_sample")}</button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-50 text-slate-700"
                >📁 {t("upload_file")}</button>
                <input ref={fileInputRef} type="file" accept=".md,.txt,.xlsx,.xls" onChange={handleFile} className="hidden" />
                <button
                  onClick={() => setRawText("")}
                  className="text-xs px-2.5 py-1 rounded border border-slate-300 hover:bg-red-50 hover:text-red-600 text-slate-700"
                >{t("clear_input")}</button>
              </div>
            </div>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={t("raw_data_placeholder")}
              className="w-full h-96 p-4 text-sm font-mono resize-none focus:outline-none text-slate-800 leading-relaxed"
              spellCheck={false}
            />
            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center gap-4 text-xs text-slate-500">
              <span>{rawText.length.toLocaleString()} {t("chars")}</span>
              <span>·</span>
              <span className="font-medium text-blue-700">{chunks.length} {t("days_detected")}</span>
            </div>
          </div>

          {/* Logs */}
          {logs.length > 0 && (
            <div className="bg-slate-900 rounded-lg border border-slate-800 shadow-sm">
              <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>📋 Nhật ký</span>
                <button onClick={() => setLogs([])} className="text-[10px] text-slate-400 hover:text-white">Xóa log</button>
              </div>
              <div ref={logsRef} className="h-56 overflow-y-auto p-3 font-mono text-[11px] text-green-300 space-y-0.5">
                {logs.map((l, i) => (
                  <div key={i} className="whitespace-pre-wrap">
                    <span className="text-slate-500">[{l.time}]</span> {l.msg}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: control panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="text-sm font-medium text-slate-700 mb-1">⚙️ Cấu hình AI</div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">{t("provider_select")}</label>
              <select
                value={providerId}
                onChange={e => { setProviderId(e.target.value); setModel(""); }}
                className="w-full text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableProviders.length === 0 && <option value="">-- Chưa có provider nào có key --</option>}
                {availableProviders.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">{t("model_select")}</label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                disabled={!providerId}
                className="w-full text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              >
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {availableProviders.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-800">
                ⚠️ Chưa có API key. Vào tab <button onClick={() => onGoto("providers")} className="underline font-medium">AI Providers</button> để thêm.
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs text-slate-600 block mb-1">Temperature: <span className="font-medium">{cfg.settings.temperature}</span></label>
              <input
                type="range" min="0" max="1" step="0.05" value={cfg.settings.temperature}
                onChange={e => { const c = {...cfg, settings:{...cfg.settings, temperature: parseFloat(e.target.value)}}; setCfg(c); window.KeyStore.saveConfig(c); }}
                className="w-full accent-blue-600"
              />
              <div className="text-[10px] text-slate-500 mt-1">Thấp (0-0.2) = ổn định, nhất quán</div>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={processing || !rawText.trim() || !providerId}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg shadow-sm text-sm transition-colors"
          >
            {processing ? `⏳ ${t("processing")}... (${progress.current}/${progress.total})` : t("process_ai")}
          </button>

          {processing && progress.total > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                <span>Chunk {progress.current}/{progress.total}</span>
                <span>{Math.round(progress.current / progress.total * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${progress.current / progress.total * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
            <div className="font-semibold">💡 Cách hoạt động</div>
            <div>• Text được chia theo <b>từng ngày</b> ("Kế hoạch thi công ngày ...")</div>
            <div>• Mỗi ngày = 1 request → tránh vượt token limit</div>
            <div>• AI dùng <b>Prompt hệ thống KHÓA</b> đảm bảo output đồng nhất</div>
            <div>• Key tự xoay round-robin khi gặp quota 429</div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.InputTab = InputTab;
