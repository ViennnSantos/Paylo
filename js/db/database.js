const DB_NAME = "paylo-db";
const DB_VERSION = 1;

export const STORES = {
  SETTINGS: "settings",
  PAYCHECKS: "paychecks",
  EXPENSES: "expenses",
  LOANS: "loans",
  RECURRING: "recurring",
  CATEGORIES: "categories"
};

let dbPromise = null;

export function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORES.PAYCHECKS)) {
        db.createObjectStore(STORES.PAYCHECKS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        const store = db.createObjectStore(STORES.EXPENSES, { keyPath: "id" });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("paycheckPeriodStart", "paycheckPeriodStart", { unique: false });
        store.createIndex("loanId", "loanId", { unique: false });
        store.createIndex("recurringId", "recurringId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.LOANS)) {
        db.createObjectStore(STORES.LOANS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.RECURRING)) {
        db.createObjectStore(STORES.RECURRING, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        db.createObjectStore(STORES.CATEGORIES, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
    request.onblocked = () => reject(new Error("Database upgrade blocked"));
  });
  return dbPromise;
}

export async function dbAdd(storeName, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const request = tx.objectStore(storeName).add(value);
    request.onsuccess = () => resolve(value);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function dbPut(storeName, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const request = tx.objectStore(storeName).put(value);
    request.onsuccess = () => resolve(value);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function dbGet(storeName, key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function dbGetAll(storeName) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function dbGetByIndex(storeName, indexName, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const index = tx.objectStore(storeName).index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function dbDelete(storeName, key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const request = tx.objectStore(storeName).delete(key);
    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function dbClear(storeName) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const request = tx.objectStore(storeName).clear();
    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function dbClearAll() {
  for (const store of Object.values(STORES)) {
    await dbClear(store);
  }
}

export async function dbBulkPut(storeName, values) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    for (const value of values) store.put(value);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (event) => reject(event.target.error);
  });
}
