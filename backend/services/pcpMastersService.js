import { repos } from '../repositories/index.js';
import { pcpMasters } from '../utils/pcpSeedData.js';

const MASTER_ID = 'default';
let cache = null;

export function invalidateMastersCache() {
  cache = null;
}

async function loadMasters() {
  if (cache) return structuredClone(cache);
  const stored = await repos.pcpMasterConfig.getById(MASTER_ID);
  cache = stored || { id: MASTER_ID, ...structuredClone(pcpMasters) };
  return structuredClone(cache);
}

async function saveMasters(data) {
  const payload = { ...data, id: MASTER_ID };
  const existing = await repos.pcpMasterConfig.getById(MASTER_ID);
  if (existing) {
    await repos.pcpMasterConfig.update(MASTER_ID, payload);
  } else {
    await repos.pcpMasterConfig.create(payload);
  }
  cache = payload;
  return structuredClone(cache);
}

export async function getMasters() {
  const data = await loadMasters();
  const { id, ...masters } = data;
  // Use stored clients from admin config — do not overwrite with project names
  return {
    ...masters,
    clients: masters.clients?.length ? masters.clients : pcpMasters.clients,
  };
}

export async function addMasterItem(category, value) {
  const data = await loadMasters();
  const list = data[category];
  if (!Array.isArray(list)) throw new Error(`Invalid category: ${category}`);

  if (category === 'costCenters' || category === 'grades') {
    list.push(value);
  } else {
    const str = String(value).trim();
    if (!str) throw new Error('Value is required');
    if (list.includes(str)) throw new Error('Item already exists');
    list.push(str);
  }

  await saveMasters(data);
  return getMasters();
}

export async function removeMasterItem(category, index) {
  const data = await loadMasters();
  const list = data[category];
  if (!Array.isArray(list) || index < 0 || index >= list.length) {
    throw new Error('Item not found');
  }
  list.splice(index, 1);
  await saveMasters(data);
  return getMasters();
}

export async function updateMasterItem(category, index, value) {
  const data = await loadMasters();
  const list = data[category];
  if (!Array.isArray(list) || index < 0 || index >= list.length) {
    throw new Error('Item not found');
  }

  if (category === 'costCenters' || category === 'grades') {
    list[index] = value;
  } else {
    const str = String(value).trim();
    if (!str) throw new Error('Value is required');
    list[index] = str;
  }

  await saveMasters(data);
  return getMasters();
}
