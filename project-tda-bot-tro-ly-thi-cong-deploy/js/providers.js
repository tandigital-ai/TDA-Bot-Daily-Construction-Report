// Registry của các Provider — mô tả endpoint, cách build request/response
// Mỗi provider có: buildChatRequest(model, systemPrompt, userPrompt, keys) => {url, headers, body}
// và parseResponse(json) => text

const PROVIDER_CATALOG = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    docs: "https://ai.google.dev/",
    default_models: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"],
    models_endpoint: "https://generativelanguage.googleapis.com/v1beta/models?key={KEY}",
    parseModelsList: (json) => (json.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map(m => m.name.replace(/^models\//, "")),
    build: ({ model, systemPrompt, userPrompt, key, temperature }) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      headers: { "Content-Type": "application/json" },
      body: {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: temperature ?? 0.1,
          responseMimeType: "application/json",
        },
      },
    }),
    parse: (json) => {
      const cand = json?.candidates?.[0];
      const parts = cand?.content?.parts || [];
      return parts.map(p => p.text || "").join("");
    },
    testPrompt: "Reply only with the JSON: {\"ok\":true}",
  },

  groq: {
    id: "groq",
    name: "Groq",
    docs: "https://console.groq.com/",
    default_models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
    models_endpoint: "https://api.groq.com/openai/v1/models",
    modelsAuth: "bearer",
    parseModelsList: (json) => (json.data || []).map(m => m.id),
    build: ({ model, systemPrompt, userPrompt, key, temperature }) => ({
      url: "https://api.groq.com/openai/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: {
        model,
        temperature: temperature ?? 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
    }),
    parse: (json) => json?.choices?.[0]?.message?.content || "",
  },

  mistral: {
    id: "mistral",
    name: "Mistral AI",
    docs: "https://console.mistral.ai/",
    default_models: ["mistral-large-latest", "mistral-small-latest", "open-mistral-nemo", "codestral-latest"],
    models_endpoint: "https://api.mistral.ai/v1/models",
    modelsAuth: "bearer",
    parseModelsList: (json) => (json.data || []).map(m => m.id),
    build: ({ model, systemPrompt, userPrompt, key, temperature }) => ({
      url: "https://api.mistral.ai/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: {
        model,
        temperature: temperature ?? 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
    }),
    parse: (json) => json?.choices?.[0]?.message?.content || "",
  },

  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    docs: "https://openrouter.ai/",
    default_models: [
      "google/gemini-2.0-flash-exp:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "mistralai/mistral-small-3.2-24b-instruct:free",
      "deepseek/deepseek-chat-v3.1:free",
      "qwen/qwen-2.5-72b-instruct:free",
    ],
    models_endpoint: "https://openrouter.ai/api/v1/models",
    modelsAuth: "bearer",
    parseModelsList: (json) => (json.data || []).map(m => m.id),
    build: ({ model, systemPrompt, userPrompt, key, temperature }) => ({
      url: "https://openrouter.ai/api/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer": "https://genspark.ai",
        "X-Title": "Construction Plan Normalizer",
      },
      body: {
        model,
        temperature: temperature ?? 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
    }),
    parse: (json) => json?.choices?.[0]?.message?.content || "",
  },

  nvidia: {
    id: "nvidia",
    name: "NVIDIA NIM",
    docs: "https://build.nvidia.com/",
    default_models: [
      "meta/llama-3.3-70b-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "mistralai/mixtral-8x7b-instruct-v0.1",
      "meta/llama-3.1-8b-instruct",
    ],
    models_endpoint: "https://integrate.api.nvidia.com/v1/models",
    modelsAuth: "bearer",
    parseModelsList: (json) => (json.data || []).map(m => m.id),
    build: ({ model, systemPrompt, userPrompt, key, temperature }) => ({
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: {
        model,
        temperature: temperature ?? 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
    }),
    parse: (json) => json?.choices?.[0]?.message?.content || "",
  },

  cerebras: {
    id: "cerebras",
    name: "Cerebras",
    docs: "https://cloud.cerebras.ai/",
    default_models: ["llama-3.3-70b", "llama3.1-8b", "llama-4-scout-17b-16e-instruct"],
    models_endpoint: "https://api.cerebras.ai/v1/models",
    modelsAuth: "bearer",
    parseModelsList: (json) => (json.data || []).map(m => m.id),
    build: ({ model, systemPrompt, userPrompt, key, temperature }) => ({
      url: "https://api.cerebras.ai/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: {
        model,
        temperature: temperature ?? 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
    }),
    parse: (json) => json?.choices?.[0]?.message?.content || "",
  },

  together: {
    id: "together",
    name: "Together AI",
    docs: "https://api.together.ai/",
    default_models: [
      "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
    ],
    models_endpoint: "https://api.together.xyz/v1/models",
    modelsAuth: "bearer",
    parseModelsList: (json) => {
      const arr = Array.isArray(json) ? json : (json.data || []);
      return arr.map(m => m.id || m.name).filter(Boolean);
    },
    build: ({ model, systemPrompt, userPrompt, key, temperature }) => ({
      url: "https://api.together.xyz/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: {
        model,
        temperature: temperature ?? 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
    }),
    parse: (json) => json?.choices?.[0]?.message?.content || "",
  },

  custom: {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    docs: "Bất kỳ endpoint OpenAI-compatible nào",
    default_models: [],
    // custom: dùng field baseUrl từ provider config
    getModelsEndpoint: (cfg) => `${(cfg.baseUrl || "").replace(/\/$/, "")}/models`,
    modelsAuth: "bearer",
    parseModelsList: (json) => (json.data || json.models || []).map(m => m.id || m.name).filter(Boolean),
    build: ({ model, systemPrompt, userPrompt, key, temperature, baseUrl }) => ({
      url: `${(baseUrl || "").replace(/\/$/, "")}/chat/completions`,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: {
        model,
        temperature: temperature ?? 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
    }),
    parse: (json) => json?.choices?.[0]?.message?.content || json?.candidates?.[0]?.content?.parts?.[0]?.text || "",
  },
};

window.PROVIDER_CATALOG = PROVIDER_CATALOG;
