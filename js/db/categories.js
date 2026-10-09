import { dbAdd, dbGetAll, STORES } from "./database.js";
import { generateId } from "../utils/helpers.js";
import { DEFAULT_CATEGORIES } from "../utils/categories.js";

export async function seedDefaultCategories() {
  const existing = await dbGetAll(STORES.CATEGORIES);
  if (existing.length > 0) return existing;
  const created = [];
  for (const def of DEFAULT_CATEGORIES) {
    const record = { id: generateId("cat"), name: def.name, icon: def.icon, kind: def.kind, custom: false };
    await dbAdd(STORES.CATEGORIES, record);
    created.push(record);
  }
  return created;
}

export async function getCategories() {
  const all = await dbGetAll(STORES.CATEGORIES);
  return all.sort((a, b) => a.name.localeCompare(b.name));
}
