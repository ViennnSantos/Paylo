import { dbPut, dbGet, dbGetAll, STORES } from "./database.js";

const DEFAULTS = {
  onboardingComplete: false,
  payFrequency: null,
  payDay: null,
  currency: "PHP",
  theme: "light"
};

export async function getSetting(key) {
  const record = await dbGet(STORES.SETTINGS, key);
  return record ? record.value : DEFAULTS[key];
}

export async function setSetting(key, value) {
  await dbPut(STORES.SETTINGS, { key, value });
  return value;
}

export async function getAllSettings() {
  const records = await dbGetAll(STORES.SETTINGS);
  const settings = { ...DEFAULTS };
  for (const record of records) {
    settings[record.key] = record.value;
  }
  return settings;
}

export async function setSettings(partial) {
  const entries = Object.entries(partial);
  for (const [key, value] of entries) {
    await setSetting(key, value);
  }
  return getAllSettings();
}
