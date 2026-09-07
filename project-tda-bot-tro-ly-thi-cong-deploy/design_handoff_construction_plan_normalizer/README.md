# Handoff: Construction Plan Normalizer (Chuẩn hóa Kế hoạch Thi công)

## Overview

An AI-powered internal tool for a Vietnamese urban-drainage company. Operations managers copy shift-planning messages out of Zalo (informal, free-form Vietnamese) and paste them here — the app calls a Large Language Model with a strictly-locked system prompt to normalize the raw text into a clean, filterable, exportable table (14 columns) at **one-row-per-worker × vehicle × task** granularity.

Key differentiators:
- **8 pluggable AI providers** (Gemini, Groq, Mistral, OpenRouter, NVIDIA NIM, Cerebras, Together AI, plus a Custom OpenAI-compatible endpoint) with multiple keys per provider, automatic round-robin failover on `429`/`503`, and per-key call/error/latency counters.
- **Locked System Prompt** carrying the JSON schema + Vietnamese-specific mapping rules (worker-name normalization, vehicle-ID → vehicle-type, road → area) + a few-shot example — so every provider returns the same shape.
- **Chunked-by-day processing** — the app splits raw text on the marker `Kế hoạch thi công ngày DD/MM/YYYY:` so each daily block becomes its own request (avoids token limits).
- Fully client-side: keys and results stored only in `localStorage`, nothing is sent to any backend other than the AI provider APIs the user configured.
- Bilingual UI (Vietnamese primary, English secondary).

## About the Design Files

The files under `design/` are a **working HTML prototype**, not a production drop-in. They use React 18 + Babel Standalone via CDN and Tailwind Play CDN so the whole app boots directly in a browser without a build step — great for a design review, unacceptable as a shipping artifact.

**Your job is to recreate this prototype inside the target codebase's existing environment** using its established patterns (React + Vite/Next, Vue + Nuxt, Angular, or whatever framework is in place). If no target codebase exists yet, pick the most appropriate modern stack — the reference implementation is React 18 + Vite + TypeScript + Tailwind, so that translates naturally.

Do **not** ship the current HTML/JSX files verbatim: they use inline `<script type="text/babel">`, the Tailwind CDN, `window.PROVIDER_CATALOG`-style globals, and CDN-hosted SheetJS. All of that must be replaced with real bundler imports, typed modules, and a proper component tree.

## Fidelity

**High-fidelity (hifi).** The prototype has final colors, spacing, typography, tag palettes, interaction affordances, and copy. Recreate pixel-for-pixel. All measurements, colors, and typography rules below reflect what is actually implemented in the prototype and were chosen deliberately — treat them as the spec, not as suggestions.

The one place we intentionally left flexible: **the bar chart on the Stats tab** is a lightweight custom DOM implementation. In the production codebase you may substitute a real charting library (Recharts, Chart.js, Nivo, ECharts, etc.) as long as you preserve the visual weight — horizontal bars, per-series color, count-label at the end of the bar, sorted descending.

---

## Screens / Views

The app is a single-page layout: a fixed left sidebar (240px, `slate-900`) and a scrollable main area. Six views switched from the sidebar. Active view persists to `localStorage['kh_tc_v1_tab']`.

Screenshots for each view are in `screenshots/`.

### 1. Input tab (`01_tab_input.jpg`)

**Purpose.** Paste raw Zalo text, pick a provider/model, run the normalization.

**Layout.** Two-column grid inside the main area (`max-w-7xl mx-auto p-6`):
- Left column, `col-span-2` — textarea card + collapsible logs card
- Right column — AI config card, run button, progress card, "How it works" info card

**Textarea card.**
- White (`bg-white`) rounded card with `border-slate-200` and small shadow.
- Header row (padding `px-4 py-3`, bottom border): label "Dữ liệu thô (dán trực tiếp từ Zalo)" on the left; on the right, four small pill buttons: **Nạp dữ liệu mẫu**, **📁 Tải file (.md / .txt / .xlsx)**, **Xóa** (hover turns red).
- Body: `<textarea>` `h-96`, no border, `font-mono text-sm`, `p-4`, placeholder shows a 3-line example.
- Footer strip (`bg-slate-50` `border-t`): live character count and "N ngày phát hiện" (bolded blue, computed by regex `/Kế hoạch thi công ngày/i`).

**AI config card (right column).**
- Two dropdowns: **Provider** (only providers with ≥1 enabled key appear), **Model** (populated from the selected provider's `models` array).
- Amber warning banner appears when no provider has keys, with an inline link to the Providers tab.
- Divider, then a temperature slider (`0.00–1.00`, step `0.05`, default `0.10`), accented `bg-blue-600`. Sub-label: "Thấp (0-0.2) = ổn định, nhất quán".

**Run button.**
- Full-width, `bg-blue-600 hover:bg-blue-700`, disabled state `bg-slate-300`, height ~44px.
- Label swaps: "🚀 Chuẩn hóa với AI" → "⏳ Đang xử lý... (3/28)".

**Progress card (visible while running).**
- White card. Header line: "Chunk N/T" · "P%". Below: 8px-tall progress bar with `bg-slate-100` track and `bg-blue-600` fill; width animates from left with `transition-all`.

**How-it-works card.**
- `bg-blue-50` `border-blue-200`, 4 bullet lines in dark blue, small text (`text-xs`).

**Logs panel (dark, appears below textarea after first run).**
- `bg-slate-900` `border-slate-800`. Header: "📋 Nhật ký" and a "Xóa log" text button.
- Body: `h-56` scrollable, `font-mono text-[11px] text-green-300`. Each line prefixed with a slate timestamp `[HH:MM:SS]`. Auto-scrolls to bottom on new entries.

### 2. Result tab (`02_tab_result.jpg`)

**Purpose.** The final normalized table with filter/sort/inline-edit/export.

**Top strip.**
- Left: h1 "Bảng kết quả", subtitle "Tổng số dòng: **N**" (blue-700).
- Right: five action buttons (small, `text-xs`, rounded, ~28px tall, 8px gap):
  - **📊 Xuất Excel** — `bg-green-600` white
  - **📋 Xuất JSON** — `bg-slate-700` white
  - **📄 Xuất PDF** — `bg-red-600` white
  - **📎 Copy** — `bg-blue-600` white (copies TSV to clipboard for direct paste into Sheets/Excel)
  - **🗑️ Xóa tất cả** — white with slate border, on hover turns red

**Filter row (white card).**
- 8-column CSS grid. First column (`col-span-2`): search input. Next 6 columns: dropdown filters for `date`, `shift`, `task_type`, `area`, `vehicle_type`, `worker` — populated with unique values from the rows.
- Below a thin divider: a checkbox "Chỉ hiện dòng bất thường (thiếu người/xe/ngày)" (accent red) and a right-aligned "Xóa bộ lọc" text button (blue-600).

**Table.**
- Wrapper: white card with `border-slate-200`, rounded, overflow hidden. Vertical scroll capped at `calc(100vh - 260px)`.
- Header row: `bg-slate-100`, sticky, `text-slate-700 font-semibold text-xs`, cells clickable to toggle sort with `▲`/`▼` indicator (blue-600).
- Body rows: alternating `bg-white` / `bg-slate-50`; hover `bg-blue-50`; anomaly rows (missing worker, vehicle_id, date, or note contains "chưa phân công") get `bg-red-50` hover `bg-red-100`.
- Cell renderers:
  - `status` → pill: `bg-slate-100 text-slate-700` default; `bg-green-100 text-green-800` for "Hoàn thành"; `bg-blue-100 text-blue-800` for "Đang thực hiện"; `bg-red-100 text-red-800` for "Hủy".
  - `task_type` → colored pill by value: Vét máng = purple, Nạo vét LHM = cyan, Sửa chữa = amber, Xử lý sự cố 1022 = red, Lấy cấu kiện = emerald, Chở vật tư = indigo, other = slate.
  - `vehicle_id` → `font-mono text-slate-800`.
  - `worker` → `font-medium text-slate-800`.
  - `trips` → number or an em-dash `—` for null.
  - empty strings → soft slate-300 em-dash.
- **Inline edit.** Double-click any cell → the value replaces with an autofocused `<input>` with a blue-400 border; blur or Enter commits, Escape cancels.
- Last column "Thao tác": a small `×` icon per row for delete (with confirm).
- Footer strip (`bg-slate-50 border-t`): usage hint text.

### 3. Stats tab (`03_tab_stats.jpg`)

**Purpose.** Aggregate month-view metrics.

**Row 1 — 4 stat cards (4-column grid, gap-4).**
Each card: white, rounded-lg, `border-slate-200`, shadow-sm, `p-4`. Icon block on the left (`w-10 h-10 rounded-lg`) with a per-card background color and large emoji; on the right a tiny uppercase slate-500 label and a big `text-2xl font-bold text-slate-900` value.
- 📅 Số ngày — `bg-blue-500`
- 📋 Số đầu việc — `bg-emerald-500`
- 🚛 Tổng chuyến — `bg-amber-500`
- 👷 Người tham gia — `bg-purple-500`

**Rows 2-3 — 4 bar-chart cards (2-column grid).**
Each: white card, section title with emoji, then horizontal bars.
- Theme colors: workers = blue-500, vehicles = amber-500, task types = emerald-500, areas = purple-500.
- Bar row layout: `w-28` truncated slate-700 label on the left, then a flex-1 track (`bg-slate-100 rounded-full h-5`) with a colored fill that has the count right-aligned inside (white, `text-[11px] font-semibold`).
- Entries always sorted descending by count.

**Row 4 — Full-width "Theo ngày" bar chart** in cyan-500, otherwise identical.

Empty state (`rows.length === 0`): a card with `📊` emoji and the "no data" message centered.

### 4. AI Providers tab (`04_tab_providers.jpg`)

**Purpose.** Manage providers, keys, models.

**Top strip.**
- Left: h1 + subtitle.
- Right: two outline buttons: **💾 Xuất cấu hình** (downloads full config JSON) and **📂 Nhập cấu hình** (opens file picker).

**Provider list.** Vertical stack of collapsible cards, one per provider from `PROVIDER_CATALOG`. Card is white, rounded, `border-slate-200`, shadow-sm.
- **Header (always visible).** Chevron `▶`/`▼` (slate-400) · provider name (`font-semibold text-sm`) · sub-line: "N keys (M bật) · K models · Default: <font-mono blue-700>{model}</font-mono>". If any key is enabled, a green pill "Hoạt động" on the far right.
- **Expanded body** (`bg-slate-50/50`, `border-t`):
  - **Custom provider only:** a "Base URL" text input with monospace font.
  - **Models section.** Header row with a "🔄 Fetch Models" button (blue-50 bg, blue-700 text) and "+ Thêm tay" button (white). Below: flex-wrap chips, one per model. Default model chip: `bg-blue-100 border-blue-400 text-blue-800`. Others: white with slate border. Hovering a chip reveals an `×` remove button. Clicking the chip label sets that model as default.
  - **API Keys section.** Header with a "+ Thêm Key" blue button. Body: vertical stack of key rows.
    - Each key row is a white card with `p-2.5` and a 12-column grid:
      - `col-span-2` — label input
      - `col-span-5` — value input (masked as `password` by default, eye toggle inside on the right)
      - `col-span-2` — small stats: "📞 {calls} · ❌ {errors}" and "⏱ {latency}ms"
      - `col-span-3` — right-aligned cluster: enabled checkbox (green accent), Test button, delete `×`
    - After Test: an inline banner appears (`bg-green-50 text-green-800` on success, `bg-red-50 text-red-800` on failure) and auto-dismisses.
  - Empty state: dashed border card "Chưa có key nào. Bấm '+ Thêm Key' để bắt đầu."

**Bottom info banner.** `bg-blue-50 border-blue-200`, three bullet security notes.

### 5. Prompt AI tab (`05_tab_prompt.jpg`)

**Purpose.** Show the locked system prompt (read-only) and let the user edit the user-prompt template.

**System prompt card.** `bg-slate-900 border-slate-700`, header strip `bg-slate-800` with a lock icon, title, and a "READ ONLY" amber badge (`bg-amber-500/20 text-amber-300`). Body is a `<pre>` block: `text-[11px] leading-relaxed text-green-200 font-mono`, `max-h-96 overflow-y-auto`, `whitespace-pre-wrap`. Content is the constant `LOCKED_SYSTEM_PROMPT` from `design/js/prompt.js` — **do not edit it in the UI, and preserve it verbatim in the port** (see "Locked System Prompt" section below).

**User prompt card.** White card, header with an "↩️ Khôi phục mặc định" outline button and a blue "💾 Lưu" primary button. Body is a `<textarea>` `h-48` `font-mono text-xs`. Placeholder token: `{{RAW_DATA}}`.

**Settings card.** White card, 3-column grid:
1. Temperature slider (mirrors the Input tab slider).
2. Max retries number input (default 3, range 1-10).
3. "Chunk theo ngày" checkbox with helper text.

**Info banner.** `bg-amber-50 border-amber-200` explaining why the system prompt is locked.

### 6. Help tab (`06_tab_help.jpg`)

**Purpose.** Getting-started guide.

Sections:
- 6 numbered step cards (each: white card, big emoji digit on the left, title + body on the right).
- A "🔗 Nơi lấy API Key miễn phí" card containing a 2-column grid of provider link cards. Each: outline card, blue-700 title with "↗", small description. On hover: `border-blue-400 bg-blue-50`.
- A closing gradient card `from-blue-50 to-indigo-50 border-blue-200` explaining the prompt-engineering guarantees.

Provider link table (used verbatim):

| Provider | URL | Note |
|---|---|---|
| Google Gemini | https://aistudio.google.com/apikey | Miễn phí 15 req/phút với 2.0-flash |
| Groq | https://console.groq.com/keys | Tốc độ ~500 tok/s. Free 30 req/phút |
| Mistral AI | https://console.mistral.ai/api-keys/ | Free tier, tốt cho tiếng Việt |
| OpenRouter | https://openrouter.ai/keys | Nhiều model FREE |
| NVIDIA NIM | https://build.nvidia.com/ | 1000 credits free |
| Cerebras | https://cloud.cerebras.ai/ | Nhanh nhất ~2000 tok/s |
| Together AI | https://api.together.ai/settings/api-keys | Có Llama-3.3-70B Turbo FREE |

---

## Sidebar

- Width `w-60` (240px), full height (`h-screen`), `bg-slate-900 text-slate-200`, flex column.
- **Brand block** (`px-5 py-5`, bottom border `border-slate-800`): 32×32 `rounded-md` gradient tile (`from-blue-500 to-blue-700`) with white "DN" glyph, then app title (`text-[13px] font-semibold text-white`, truncated) and a two-line subtitle underneath (`text-[10.5px] text-slate-400`).
- **Tab list.** 6 buttons: Nhập liệu, Bảng kết quả, Thống kê, AI Providers, Prompt AI, Hướng dẫn. Each button: full width, `px-3 py-2.5 rounded-md text-sm`, icon-emoji on the left, label on the right, optional count badge (result tab). Active tab: `bg-blue-600 text-white`; idle: hover `bg-slate-800`. Result tab shows a count badge (`bg-slate-700` normally, `bg-blue-800` when active) with the current row count.
- **Language switcher block** (bottom, above the fold): tiny uppercase label "Ngôn ngữ / Language", then a segmented control inside a `bg-slate-800 rounded-md p-1` — two half-width buttons "🇻🇳 VI" and "🇬🇧 EN", active one is `bg-blue-600 text-white`. Below: three centered lines of `text-[10px] text-slate-500` — version + local-only note.

---

## Interactions & Behavior

### Global

- **Persistence.** Everything survives reload via `localStorage`:
  - `kh_tc_v1_config` — providers, keys, settings, user prompt override, language
  - `kh_tc_v1_rows` — normalized table rows
  - `kh_tc_v1_raw` — the latest raw text in the input textarea
  - `kh_tc_v1_tab` — active tab
  - `kh_tc_v1_last_provider`, `kh_tc_v1_last_model` — last selection
- **Language toggle.** Vietnamese and English strings both live in `js/i18n.js`. Every user-visible string is looked up via `t(key)`. Both dictionaries must be fully populated.

### Input tab

1. Paste or upload raw text. `.xlsx` uploads are parsed with SheetJS: each row of every sheet is joined with a space and concatenated with `\n`.
2. Live count of characters and days.
3. Click "🚀 Chuẩn hóa với AI".
4. The pipeline (`js/ai_client.js` → `normalizeRawData`):
   1. Split raw text into daily chunks by regex `/Kế hoạch thi công ngày/i` (each chunk starts with that header and continues to the next header). Chunks without the header are dropped.
   2. For each chunk, template it into the user prompt (`{{RAW_DATA}}` placeholder).
   3. Call `callProvider()`: pick the next enabled key round-robin, POST the chat request. On `429`/`503`, blacklist the key for this attempt and pick another; on `401`/`403`, blacklist permanently for this attempt; other HTTP errors count as retryable. Increment per-key `calls` on success, `errors` on failure. Update `latency` with the last measurement.
   4. Parse the response via `extractJson()` — strips markdown fences, hunts for the first `{`/`[` and the last `}`/`]`, tries `JSON.parse`, falls back to stripping trailing commas.
   5. If the parse fails, retry the same chunk once with a stricter reminder appended ("⚠️ Chỉ trả JSON hợp lệ, không markdown.").
   6. Normalize each row through `normalizeRow()` — guarantees all 14 fields present, `trips` coerced to number-or-null.
5. On completion: if rows already exist, ask user to append or replace via `confirm()`; then auto-switch to the Result tab after 800ms.
6. All progress and errors stream into the log panel.

### Result tab

- **Filter.** Object with `date`, `shift`, `task_type`, `area`, `vehicle_type`, `worker`, `status`. Empty string = "Tất cả".
- **Search.** Case-insensitive substring match across every field of every row.
- **Sort.** Click a header to toggle asc/desc on that column.
- **Anomaly filter.** A row is "anomalous" if `!worker || !vehicle_id || !date || note contains "chưa phân công"`.
- **Inline edit.** Double-click a cell → `<input autoFocus defaultValue={val}>`. `onBlur` and Enter commit; Escape cancels.
- **Delete row.** `×` button with `confirm()`.
- **Clear all.** `🗑️ Xóa tất cả` with `confirm()`.
- **Exports** (all client-side, see `js/export.js`):
  - **Excel** — SheetJS `writeFile` with `cellStyles: true`. Two sheets: "Kế hoạch thi công" (14 columns in fixed order with per-column widths, blue header row `#1E40AF` white bold centered, freeze row 1) and "Thông tin" (metadata: file title, export timestamp, row/day/worker/vehicle counts). Filename `KeHoachThiCong_YYYY-MM-DD.xlsx`.
  - **JSON** — pretty-printed `application/json` blob download.
  - **Copy** — TSV to clipboard (tab-separated header + rows); `\t\n\r` in cell values collapsed to spaces. Falls back to `document.execCommand('copy')`.
  - **PDF** — opens a new window with a print-styled HTML table and triggers `window.print()`.

### Providers tab

- Provider cards collapse/expand independently.
- Adding a key creates `{id, label: "Key N", value: "", enabled: true, calls: 0, errors: 0, latency: 0}`.
- **Test key** posts a minimal chat request ("Reply with exactly this JSON and nothing else: {\"ok\":true}") using that provider's default model. Success shows latency; failure shows the HTTP error text (first 150 chars).
- **Fetch Models** calls the provider's `/models` endpoint (or the equivalent for Gemini, which uses `?key=`) and replaces the local `models` array. Success is alerted; if the current default model is no longer in the list, replace it with the first entry.
- **Export config** downloads a JSON snapshot including all keys — user acknowledges the risk implicitly.
- **Import config** replaces the entire config from a JSON file (validated by checking for a `providers` field).

### Prompt tab

- User can edit the user-prompt template but the system prompt is a static, read-only `<pre>`.
- "Khôi phục mặc định" resets `cfg.userPrompt` to `DEFAULT_USER_PROMPT_TEMPLATE`.
- Temperature/retries/chunkPerDay changes save immediately.

### Sidebar

- Tab switch is instant; no route.
- Language switch swaps translation dictionary and re-renders. Saved to config.

### Round-robin implementation

```
pickKey(cfg, providerId, skipIds):
  p = cfg.providers[providerId]
  enabled = p.keys.filter(k => k.enabled && !skipIds.includes(k.id))
  if empty return null
  idx = (p.rrIndex ?? 0) % enabled.length
  picked = enabled[idx]
  p.rrIndex = (idx + 1) % enabled.length
  return picked
```

The `skipIds` array grows across an attempt: each 429/503/401/403 pushes the offending key ID onto it, so the next `pickKey` call in the same request picks a different key. `rrIndex` persists across requests so calls are naturally distributed even under low load.

### Retry contract

```
maxRetries (default 3) — for provider transport errors and quota rotations
maxParseAttempts = 2   — for JSON parse failures on a single chunk
```

The user-visible temperature default is `0.10` and should not be changed without a warning — consistency is a core promise of this tool.

---

## State Management

Minimal, all local. In React terms:

- **App root** owns:
  - `cfg` — persisted config object (providers, settings, userPrompt, lang)
  - `rows` — normalized rows array
  - `activeTab` — string enum
  - `lang` — `"vi" | "en"`
- **InputTab** local state: `rawText`, `providerId`, `model`, `processing`, `progress`, `logs`.
- **ResultTab** local state: `search`, `filters`, `sortBy`, `editing`, `showAnomalies`.
- **ProvidersTab** local state: `expanded` (Set of provider IDs), `showKeyId` (Set of key IDs whose values are unmasked), `testing`, `fetchingModels`.
- **PromptTab** local state: `userPrompt` (edited text before save).

In a real codebase, migrate this to whatever the codebase uses — Redux Toolkit, Zustand, Pinia, Signals, TanStack Query — but the shape of the persisted config is the source of truth.

### Config schema (localStorage `kh_tc_v1_config`)

```ts
type Config = {
  providers: Record<ProviderId, ProviderConfig>;
  settings: {
    temperature: number;       // default 0.1
    maxRetries: number;        // default 3
    chunkPerDay: boolean;      // default true
  };
  userPrompt: string;          // editable user-prompt template
  lang: "vi" | "en";
};

type ProviderConfig = {
  enabled: boolean;
  keys: ApiKey[];
  models: string[];
  defaultModel: string;
  baseUrl: string;             // only for provider "custom"
  rrIndex: number;             // round-robin cursor
};

type ApiKey = {
  id: string;                  // "k_" + timestamp + random
  label: string;
  value: string;               // raw key
  enabled: boolean;
  calls: number;
  errors: number;
  latency: number;             // ms of last call
};
```

### Row schema (localStorage `kh_tc_v1_rows`)

```ts
type Row = {
  date: string;                // "YYYY-MM-DD"
  shift: "05:00" | "07:00" | "19:00" | "";
  period: "Sáng" | "Chiều" | "Tối" | "";
  task_description: string;
  task_type: "Vét máng" | "Nạo vét LHM" | "Sửa chữa" | "Xử lý sự cố 1022" | "Lấy cấu kiện" | "Chở vật tư" | "Khác";
  area: "TP Thủ Đức" | "Bình Dương" | "Dĩ An" | "Đông Hòa" | "Khác" | "";
  ward: string;
  street: string;
  vehicle_id: string;
  vehicle_type: "Xe cẩu" | "Xe hút bùn" | "Xe tải" | "Xe ép cống" | "";
  trips: number | null;
  worker: string;
  note: string;
  status: "Kế hoạch" | "Đang thực hiện" | "Hoàn thành" | "Hủy";
};
```

---

## Locked System Prompt (critical)

The full prompt is in `design/js/prompt.js` as `LOCKED_SYSTEM_PROMPT`. Port it **verbatim** — every rule, every example, every bullet. It is the contract that keeps eight different AI providers returning the same JSON shape. If a rule is wrong, fix it in one place and treat it as a codebase-level constant, not a user setting.

Key ingredients baked in:
- The 14-field JSON schema with exact enum values.
- Six task-type keyword rules (vét máng, nạo vét LHM, sửa chữa, 1022, lấy cấu kiện, chở vật tư).
- Vehicle-ID → vehicle-type table (78659/88516 → Xe cẩu, 77504 → Xe hút bùn, 01034/03566/75570/75560 → Xe tải).
- Area mapping (Bình Dương vs TP Thủ Đức) based on road/ward names.
- Worker-name normalization table (`t anh` → `Tuấn Anh`, `hait` → `Hải`, etc.), including splitting `khanh + tuấn anh` into two rows.
- Trip parsing (`(02 chuyến)` → `2`).
- Shift/date normalization.
- A concrete few-shot example built from real Zalo text for August 3, 2026.

The user prompt (editable) simply injects the raw chunk. The default template is `DEFAULT_USER_PROMPT_TEMPLATE` in the same file.

---

## AI Provider Catalog

Full catalog in `design/js/providers.js`. Each provider entry declares:

| Field | Purpose |
|---|---|
| `id`, `name`, `docs` | Display + link |
| `default_models` | Seed list (before Fetch Models) |
| `models_endpoint` or `getModelsEndpoint(cfg)` | Where to fetch the model list; Gemini uses `?key=` template |
| `modelsAuth` | `"bearer"` when the list endpoint needs `Authorization: Bearer <key>` |
| `parseModelsList(json)` | Extractor for the raw list response |
| `build({ model, systemPrompt, userPrompt, key, temperature, baseUrl })` | Returns `{ url, headers, body }` for a chat request |
| `parse(json)` | Extracts the assistant's text from the raw response |

Chat request notes:
- **Gemini** uses `systemInstruction` + `contents`, and `generationConfig.responseMimeType = "application/json"`.
- **Groq**, **Mistral**, **OpenRouter**, **Cerebras**, **Together** all use OpenAI-compatible `/v1/chat/completions` with `response_format: {type: "json_object"}`.
- **NVIDIA NIM** uses the same shape but without `response_format` (they don't support it universally).
- **Custom** takes a user-supplied `baseUrl` and appends `/chat/completions` and `/models`.
- **OpenRouter** additionally sends `HTTP-Referer` and `X-Title` headers.

**Do not remove any provider without checking with the user.** The point of the tool is provider diversity.

---

## Design Tokens

### Colors (Tailwind class + hex)

**Brand / primary**
- Primary blue: `bg-blue-600` `#2563EB`, hover `bg-blue-700` `#1D4ED8`, deep `bg-blue-800` `#1E40AF` (Excel header)
- Info blue backgrounds: `bg-blue-50` `#EFF6FF`, `bg-blue-100` `#DBEAFE`
- Info blue borders: `border-blue-200` `#BFDBFE`, `border-blue-400` `#60A5FA`

**Neutrals**
- Sidebar bg: `bg-slate-900` `#0F172A`; borders inside: `border-slate-800` `#1E293B`
- Page bg: `bg-slate-50` `#F8FAFC` and `bg-slate-100` `#F1F5F9`
- Card bg: `#FFFFFF`; card border: `border-slate-200` `#E2E8F0`
- Text: `text-slate-900` `#0F172A`, `text-slate-800` `#1E293B`, `text-slate-700` `#334155`, `text-slate-600` `#475569`, `text-slate-500` `#64748B`, `text-slate-400` `#94A3B8`, `text-slate-300` `#CBD5E1`

**Semantic**
- Success: `bg-green-600` `#16A34A`, `bg-green-100` `#DCFCE7` / `text-green-800` `#166534`
- Warning: `bg-amber-500` `#F59E0B`, `bg-amber-50` `#FFFBEB` / `text-amber-800` `#92400E`
- Danger: `bg-red-600` `#DC2626`, `bg-red-50` `#FEF2F2` / `text-red-800` `#991B1B`, `bg-red-100` `#FEE2E2` (anomaly rows)

**Tag palette (task_type)**
- Vét máng — `bg-purple-100 text-purple-800` `#F3E8FF / #6B21A8`
- Nạo vét LHM — `bg-cyan-100 text-cyan-800` `#CFFAFE / #155E75`
- Sửa chữa — `bg-amber-100 text-amber-800` `#FEF3C7 / #92400E`
- Xử lý sự cố 1022 — `bg-red-100 text-red-800`
- Lấy cấu kiện — `bg-emerald-100 text-emerald-800` `#D1FAE5 / #065F46`
- Chở vật tư — `bg-indigo-100 text-indigo-800` `#E0E7FF / #3730A3`
- Khác — `bg-slate-100 text-slate-700`

**Stats chart series**
- Workers: `bg-blue-500` `#3B82F6`
- Vehicles: `bg-amber-500` `#F59E0B`
- Task types: `bg-emerald-500` `#10B981`
- Areas: `bg-purple-500` `#A855F7`
- Days: `bg-cyan-500` `#06B6D4`

**Logs**
- Log panel bg: `bg-slate-900`; text: `text-green-300` `#86EFAC`; timestamp: `text-slate-500`

### Typography

- Body font: **Inter** (Google Fonts weights 400/500/600/700). Applied to `*` via a global stylesheet rule.
- Monospace font: **JetBrains Mono** (400/500) — applied to `code`, `pre`, and any `.font-mono` element.
- Scale (Tailwind classes → px):
  - `text-2xl` — page h1 (`24px / 32px`, `font-bold`)
  - `text-sm` — labels and body (`14px`)
  - `text-xs` — buttons, filters, most controls (`12px`)
  - `text-[11px]` — dense meta (stats, timestamps, footer notes)
  - `text-[10px]` / `text-[10.5px]` — captions in sidebar

### Spacing

Tailwind scale, most used:
- Card padding: `p-4` (16px) inside content cards; `px-4 py-3` for card headers
- Grid gap: `gap-4` (16px) for card grids, `gap-2` for control clusters
- Sidebar padding: `px-5 py-5` brand block, `py-3 px-2` nav, `px-3 py-3` footer
- Table cell padding: `px-2 py-1.5`

### Borders & radii

- Card radius: `rounded-lg` (8px)
- Button radius: `rounded-md` (6px), pills `rounded-full`
- Chip/tag radius: `rounded` (4px)
- Border weight: 1px default (`border`)
- Table row separators: `border-b border-slate-100`
- Sticky table header: `bg-slate-100 sticky top-0 z-10`

### Shadows

- Cards: `shadow-sm`
- No larger elevation shadows anywhere. Use the same, understated ERP tone throughout.

### Icons

- Emoji only (no icon font, no SVG library). Preserve the exact emoji per label listed in i18n and screens. Do not swap for Heroicons/Feather etc. unless the user explicitly asks.

---

## Assets

- **No image assets.** All visual affordances are emoji, Tailwind CSS, and inline SVG-free.
- **Vendor scripts (via CDN in prototype — replace with npm imports in production):**
  - `react@18.3.1` + `react-dom@18.3.1`
  - `@babel/standalone@7.29.0` (remove — production uses a real bundler)
  - `tailwindcss` (replace CDN with the Tailwind Vite/PostCSS plugin and a `tailwind.config.js`)
  - `xlsx@0.20.3` (SheetJS — `npm i xlsx`)
- **Sample data** for QA: `design/data/sample_input.md` — real Zalo output for August 2026 (~13 KB, 30 daily blocks). Use it to hand-verify the AI pipeline in the ported app.

---

## Files

Structure of this handoff bundle:

```
design_handoff_construction_plan_normalizer/
├── README.md                              ← you are here
├── screenshots/
│   ├── 01_tab_input.jpg
│   ├── 02_tab_result.jpg
│   ├── 03_tab_stats.jpg
│   ├── 04_tab_providers.jpg
│   ├── 05_tab_prompt.jpg
│   └── 06_tab_help.jpg
└── design/
    ├── index.html                         ← app shell (React 18 + Babel + Tailwind CDN)
    ├── data/
    │   └── sample_input.md                ← real Zalo data for August 2026
    └── js/
        ├── i18n.js                        ← VI/EN dictionary
        ├── providers.js                   ← 8-provider catalog + request/response adapters
        ├── prompt.js                      ← LOCKED_SYSTEM_PROMPT + DEFAULT_USER_PROMPT_TEMPLATE
        ├── keystore.js                    ← localStorage config, round-robin pick
        ├── ai_client.js                   ← normalizeRawData(), callProvider(), extractJson(), chunkByDay(), testKey(), fetchModels()
        ├── export.js                      ← xlsx/json/tsv/pdf export
        ├── sample_data.js                 ← in-app "Load sample" button payload
        └── components/
            ├── Sidebar.jsx
            ├── InputTab.jsx
            ├── ResultTab.jsx
            ├── ProvidersTab.jsx
            ├── PromptTab.jsx
            ├── StatsTab.jsx
            └── HelpTab.jsx
```

### Reading order for the developer

1. `design/index.html` — mount point and script wiring (understand the CDN vs. bundler swap).
2. `design/js/prompt.js` — **the contract**. Port verbatim.
3. `design/js/providers.js` — the 8 adapters. Each is a small pure module; easy to unit test.
4. `design/js/ai_client.js` — the pipeline (chunk → call → parse → normalize).
5. `design/js/keystore.js` — config + round-robin.
6. `design/js/components/*.jsx` — the UI. Read in the order Sidebar → InputTab → ResultTab → ProvidersTab → PromptTab → StatsTab → HelpTab.
7. `design/js/export.js` — SheetJS invocation, note the header styling that requires `cellStyles: true`.
8. `design/js/i18n.js` — the string dictionary. Keep every key in both languages.

### Production checklist

- [ ] Replace CDN React/Babel with a real bundler (Vite recommended).
- [ ] Replace Tailwind CDN with the plugin + `tailwind.config.js` scanning `src/**/*.{ts,tsx}`.
- [ ] Replace CDN SheetJS with `npm i xlsx`.
- [ ] Convert `.jsx` files to typed `.tsx` (or the codebase's convention) with `Row` and `Config` types shared from a `types.ts`.
- [ ] Replace `window.PROVIDER_CATALOG`, `window.LOCKED_SYSTEM_PROMPT`, etc. globals with real module imports.
- [ ] Add unit tests for `chunkByDay`, `extractJson`, `normalizeRow`, and each provider's `parse()`.
- [ ] Add an integration test that hits a stub server for each provider adapter.
- [ ] Confirm the app boots offline (all vendor code bundled).
- [ ] Keep the "keys never leave the browser" promise: no telemetry, no analytics that touches the key values.
