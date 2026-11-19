// Progress storage for the Leonida Ledger: one localStorage key holds the
// earned set, per-trophy notes and per-trophy progress counts, plus the
// spoiler setting. Export writes the same shape to a JSON file; import
// reads it back, keeping only names that exist in the official list.

export const STORAGE_KEY = 'leonida-ledger-v1';
export const EXPORT_FORMAT = 'leonida-ledger-progress';
export const EXPORT_VERSION = 1;

export function emptyState() {
  return { earned: [], notes: {}, counts: {}, spoilers: true };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyState();
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned.filter((n) => typeof n === 'string') : [],
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      counts: parsed.counts && typeof parsed.counts === 'object' ? parsed.counts : {},
      spoilers: parsed.spoilers !== false,
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable (private mode): the in-memory state
    // still works for this visit; the export button is the fallback.
  }
}

export function isEarned(state, name) {
  return state.earned.includes(name);
}

export function setEarned(state, name, earned) {
  if (earned && !state.earned.includes(name)) state.earned.push(name);
  if (!earned) state.earned = state.earned.filter((n) => n !== name);
  saveState(state);
}

export function setNote(state, name, text) {
  if (text.trim()) state.notes[name] = text;
  else delete state.notes[name];
  saveState(state);
}

export function setCount(state, name, value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  if (n > 0) state.counts[name] = n;
  else delete state.counts[name];
  saveState(state);
}

// Build the object an export file holds. exportedAt is left out on purpose:
// an export of the same progress is byte-identical whenever it is made.
export function exportPayload(state) {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, ...state };
}

export function downloadExport(state) {
  const blob = new Blob([JSON.stringify(exportPayload(state), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(url);
}

// Read an imported file and return a state shaped like loadState's, or
// throw a plain Error naming what is wrong with it.
export async function parseImportFile(file, knownNames) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('That file does not hold a progress export.');
  if (parsed.format && parsed.format !== EXPORT_FORMAT) {
    throw new Error('That file is not a Leonida Ledger progress export.');
  }
  const known = new Set(knownNames);
  const state = emptyState();
  if (Array.isArray(parsed.earned)) {
    state.earned = parsed.earned.filter((n) => typeof n === 'string' && known.has(n));
  }
  if (parsed.notes && typeof parsed.notes === 'object') {
    for (const [name, note] of Object.entries(parsed.notes)) {
      if (known.has(name) && typeof note === 'string' && note.trim()) state.notes[name] = note;
    }
  }
  if (parsed.counts && typeof parsed.counts === 'object') {
    for (const [name, value] of Object.entries(parsed.counts)) {
      const n = Math.floor(Number(value) || 0);
      if (known.has(name) && n > 0) state.counts[name] = n;
    }
  }
  if (typeof parsed.spoilers === 'boolean') state.spoilers = parsed.spoilers;
  return state;
}
