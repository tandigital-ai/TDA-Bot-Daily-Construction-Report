// IndexedDB wrapper — thay thế localStorage để lưu được nhiều dữ liệu hơn
// (localStorage giới hạn ~5-10MB, IndexedDB có thể lên đến hàng GB)
//
// Cấu trúc DB:
//   database: "kh_tc_v1"
//   object store: "kv"  (keyPath: "key") — lưu config, prompt, tab, lang, raw
//   object store: "rows" (keyPath: "id", autoIncrement) — lưu từng dòng dữ liệu chuẩn hóa
//
// API:
//   IDB.open()                  → Promise<db>
//   IDB.get(key)                → Promise<value|null>
//   IDB.set(key, value)         → Promise<void>
//   IDB.remove(key)             → Promise<void>
//   IDB.getAllRows()            → Promise<Row[]>
//   IDB.replaceRows(rows)       → Promise<void>
//   IDB.clearRows()             → Promise<void>
//   IDB.countRows()             → Promise<number>
//   IDB.exportAll()             → Promise<{kv, rows}>
//   IDB.importAll(data)         → Promise<void>

const DB_NAME = "kh_tc_v1";
const DB_VERSION = 1;
const STORE_KV = "kv";
const STORE_ROWS = "rows";

let _dbPromise = null;

function open() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Trình duyệt không hỗ trợ IndexedDB"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_ROWS)) {
        db.createObjectStore(STORE_ROWS, { keyPath: "id", autoIncrement: true });
      }
    };
  });
  return _dbPromise;
}

function tx(storeName, mode = "readonly") {
  return open().then(db => {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  });
}

function get(key) {
  return tx(STORE_KV).then(store => new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  }));
}

function set(key, value) {
  return tx(STORE_KV, "readwrite").then(store => new Promise((resolve, reject) => {
    const req = store.put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

function remove(key) {
  return tx(STORE_KV, "readwrite").then(store => new Promise((resolve, reject) => {
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

function getAllRows() {
  return tx(STORE_ROWS).then(store => new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      // Sắp xếp theo id (thứ tự chèn) và bỏ field id đi
      const items = (req.result || []).sort((a, b) => a.id - b.id);
      resolve(items.map(r => { const { id, ...rest } = r; return rest; }));
    };
    req.onerror = () => reject(req.error);
  }));
}

async function replaceRows(rows) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ROWS, "readwrite");
    const store = transaction.objectStore(STORE_ROWS);
    store.clear();
    for (const r of rows) {
      // Không truyền id → tự autoIncrement
      const { id, ...rest } = r;
      store.add(rest);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function clearRows() {
  return tx(STORE_ROWS, "readwrite").then(store => new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

function countRows() {
  return tx(STORE_ROWS).then(store => new Promise((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

async function exportAll() {
  const db = await open();
  const kv = await new Promise((resolve, reject) => {
    const store = db.transaction(STORE_KV, "readonly").objectStore(STORE_KV);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  const rows = await getAllRows();
  return { kv, rows, meta: { db: DB_NAME, version: DB_VERSION, exportedAt: new Date().toISOString() } };
}

async function importAll(data) {
  if (!data || !data.kv) throw new Error("File backup không hợp lệ");
  const db = await open();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_KV, STORE_ROWS], "readwrite");
    const kvStore = transaction.objectStore(STORE_KV);
    const rowsStore = transaction.objectStore(STORE_ROWS);
    kvStore.clear();
    rowsStore.clear();
    for (const item of data.kv) kvStore.put(item);
    for (const r of (data.rows || [])) {
      const { id, ...rest } = r;
      rowsStore.add(rest);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Migration: nếu có dữ liệu cũ trong localStorage, chuyển sang IndexedDB rồi xóa
async function migrateFromLocalStorage() {
  try {
    const keys = ["kh_tc_v1_config", "kh_tc_v1_rows", "kh_tc_v1_raw", "kh_tc_v1_tab", "kh_tc_v1_last_provider", "kh_tc_v1_last_model"];
    let migrated = 0;
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v == null) continue;
      const shortKey = k.replace("kh_tc_v1_", "");
      if (shortKey === "rows") {
        try {
          const rows = JSON.parse(v);
          if (Array.isArray(rows) && rows.length > 0) {
            await replaceRows(rows);
            migrated++;
          }
        } catch {}
      } else if (shortKey === "config") {
        try {
          await set("config", JSON.parse(v));
          migrated++;
        } catch {}
      } else {
        await set(shortKey, v);
        migrated++;
      }
      localStorage.removeItem(k);
    }
    if (migrated > 0) console.info(`[IDB] Đã migrate ${migrated} entries từ localStorage sang IndexedDB`);
  } catch (e) {
    console.warn("[IDB] Migration lỗi:", e);
  }
}

async function estimateStorage() {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      return { usage: est.usage, quota: est.quota, percent: est.quota ? (est.usage / est.quota * 100) : 0 };
    } catch { return null; }
  }
  return null;
}

window.IDB = { open, get, set, remove, getAllRows, replaceRows, clearRows, countRows, exportAll, importAll, migrateFromLocalStorage, estimateStorage };
