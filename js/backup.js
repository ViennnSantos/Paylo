import { dbGetAll, dbBulkPut, dbClearAll, STORES } from "./db/database.js";
import { todayStr } from "./utils/dates.js";
import { readFileAsText, downloadTextFile } from "./utils/helpers.js";

export async function exportBackup() {
  const data = {};
  for (const store of Object.values(STORES)) {
    data[store] = await dbGetAll(store);
  }
  const payload = { app: "PAYLO", version: 1, exportedAt: new Date().toISOString(), data };
  downloadTextFile(`paylo-backup-${todayStr()}.json`, JSON.stringify(payload, null, 2));
}

export async function parseBackupFile(file) {
  const text = await readFileAsText(file);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }

  if (!parsed || parsed.app !== "PAYLO" || !parsed.data) {
    throw new Error("This backup file is not a valid PAYLO backup.");
  }

  const requiredStores = Object.values(STORES);
  for (const store of requiredStores) {
    if (!Array.isArray(parsed.data[store])) {
      throw new Error("This backup file is missing required data.");
    }
  }

  return parsed;
}

export async function applyBackup(parsed) {
  const requiredStores = Object.values(STORES);
  await dbClearAll();
  for (const store of requiredStores) {
    const records = parsed.data[store];
    if (records.length) {
      await dbBulkPut(store, records);
    }
  }
}

export async function clearAllData() {
  await dbClearAll();
}
