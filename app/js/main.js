// Boot for the Leonida Ledger: loads the trophy data, wires the tracker,
// the roadmap and missables views, the spoiler setting and export/import.
// The app fetches only its own data/trophies.json and makes no network
// request at run time.
//
// Demo links used for screenshots may carry query parameters:
//   ?view=tracker|roadmap|missables  open a section
//   ?seed=13                        show the first 13 trophies as earned
//   ?earned=1,14,15                  show these trophies (by id) as earned
//   ?spoilers=0|1                   set the spoiler guard
//   ?trophy=17                      open a trophy's guide
//   ?grade=silver&kind=activities   pre-set filters
// A seed only changes what is shown; it never writes to localStorage.

import { renderDetail, renderMissables, renderProgressHeader, renderRoadmap, renderTrophyList } from './render.js';
import { downloadExport, loadState, parseImportFile, saveState, setCount, setEarned, setNote } from './store.js';

const DATA_URL = 'data/trophies.json';

const refs = {
  earnedCount: document.getElementById('earnedCount'),
  meter: document.getElementById('meter'),
  meterFill: document.getElementById('meterFill'),
  gradeCounts: document.getElementById('gradeCounts'),
  platinumNote: document.getElementById('platinumNote'),
  trophyList: document.getElementById('trophyList'),
  listMeta: document.getElementById('listMeta'),
  emptyState: document.getElementById('emptyState'),
  detailEmpty: document.getElementById('detailEmpty'),
  detailCard: document.getElementById('detailCard'),
  detailDot: document.getElementById('detailDot'),
  detailGrade: document.getElementById('detailGrade'),
  detailKind: document.getElementById('detailKind'),
  detailMissable: document.getElementById('detailMissable'),
  detailName: document.getElementById('detailName'),
  detailDesc: document.getElementById('detailDesc'),
  detailTarget: document.getElementById('detailTarget'),
  detailProgress: document.getElementById('detailProgress'),
  detailGuide: document.getElementById('detailGuide'),
  detailSources: document.getElementById('detailSources'),
  countInput: document.getElementById('countInput'),
  countTarget: document.getElementById('countTarget'),
  notesInput: document.getElementById('notesInput'),
  detailMeta: document.getElementById('detailMeta'),
  roadmapView: document.getElementById('roadmapView'),
  spoilerNote: document.getElementById('spoilerNote'),
  onlineNote: document.getElementById('onlineNote'),
};

const filters = {
  search: '',
  grade: 'all',
  kind: 'all',
  missableOnly: false,
  hideEarned: false,
};

let trophies = [];
let sourceLinks = {};
let state = loadState();
let selectedName = null;
let currentView = 'tracker';

function refreshAll() {
  renderProgressHeader(trophies, state, refs);
  renderTrophyList(trophies, state, filters, sourceLinks, refs, selectTrophy, toggleEarned);
  renderRoadmap(trophies, state, refs);
  renderMissables(trophies, state);
  refs.spoilerNote.hidden = !state.spoilers;
  refs.onlineNote.hidden = filters.kind !== 'online';
  document.getElementById('spoilerToggle').checked = state.spoilers;
  if (selectedName) {
    const selected = trophies.find((t) => t.name === selectedName);
    if (selected) renderDetail(selected, state, sourceLinks, refs, onCountChange, onNoteChange);
  }
  markSelectedRow();
}

function markSelectedRow() {
  for (const row of refs.trophyList.querySelectorAll('.trophy-row')) {
    row.classList.toggle('selected', row.dataset.name === selectedName);
  }
}

function selectTrophy(trophy) {
  selectedName = trophy.name;
  renderDetail(trophy, state, sourceLinks, refs, onCountChange, onNoteChange);
  markSelectedRow();
}

function toggleEarned(trophy, earned) {
  setEarned(state, trophy.name, earned);
  refreshAll();
}

function onCountChange(trophy, value) {
  setCount(state, trophy.name, value);
  refreshAll();
}

function onNoteChange(trophy, text) {
  setNote(state, trophy.name, text);
  refreshAll();
}

function showView(view) {
  currentView = view;
  document.getElementById('trackerView').hidden = view !== 'tracker';
  document.getElementById('detailPane').hidden = view !== 'tracker';
  document.getElementById('toolbar').style.display = view === 'tracker' ? '' : 'none';
  refs.roadmapView.hidden = view !== 'roadmap';
  document.getElementById('missablesView').hidden = view !== 'missables';
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('active', tab.dataset.view === view);
  }
}

function readDemoParams() {
  const params = new URLSearchParams(location.search);
  if (params.has('spoilers')) state.spoilers = params.get('spoilers') !== '0';
  if (params.has('grade')) filters.grade = params.get('grade');
  if (params.has('kind')) filters.kind = params.get('kind');
  if (params.has('search')) filters.search = params.get('search');
  if (params.has('missable')) filters.missableOnly = params.get('missable') !== '0';
  if (params.has('seed')) {
    const n = Math.max(0, Math.min(trophies.length, Number(params.get('seed')) || 0));
    state.earned = trophies.slice(0, n).map((t) => t.name);
  }
  if (params.has('earned')) {
    const ids = new Set(params.get('earned').split(',').map((s) => Number(s)));
    state.earned = trophies.filter((t) => ids.has(t.id)).map((t) => t.name);
  }
  const view = params.get('view');
  if (view === 'roadmap' || view === 'missables' || view === 'tracker') showView(view);
  const openId = Number(params.get('trophy'));
  if (openId) {
    const trophy = trophies.find((t) => t.id === openId);
    if (trophy) selectTrophy(trophy);
  }
  document.getElementById('gradeFilter').value = filters.grade;
  document.getElementById('kindFilter').value = filters.kind;
  document.getElementById('search').value = filters.search;
  document.getElementById('missableOnly').checked = filters.missableOnly;
}

async function boot() {
  const response = await fetch(DATA_URL);
  const data = await response.json();
  trophies = data.trophies;
  sourceLinks = data.sources;

  document.getElementById('search').addEventListener('input', (event) => {
    filters.search = event.target.value;
    renderTrophyList(trophies, state, filters, sourceLinks, refs, selectTrophy, toggleEarned);
  });
  document.getElementById('gradeFilter').addEventListener('change', (event) => {
    filters.grade = event.target.value;
    renderTrophyList(trophies, state, filters, sourceLinks, refs, selectTrophy, toggleEarned);
  });
  document.getElementById('kindFilter').addEventListener('change', (event) => {
    filters.kind = event.target.value;
    refs.onlineNote.hidden = filters.kind !== 'online';
    renderTrophyList(trophies, state, filters, sourceLinks, refs, selectTrophy, toggleEarned);
  });
  document.getElementById('missableOnly').addEventListener('change', (event) => {
    filters.missableOnly = event.target.checked;
    renderTrophyList(trophies, state, filters, sourceLinks, refs, selectTrophy, toggleEarned);
  });
  document.getElementById('hideEarned').addEventListener('change', (event) => {
    filters.hideEarned = event.target.checked;
    renderTrophyList(trophies, state, filters, sourceLinks, refs, selectTrophy, toggleEarned);
  });
  document.getElementById('spoilerToggle').addEventListener('change', (event) => {
    state.spoilers = event.target.checked;
    saveState(state);
    refreshAll();
  });
  document.getElementById('exportBtn').addEventListener('click', () => downloadExport(state));
  document.getElementById('importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = await parseImportFile(file, trophies.map((t) => t.name));
      state = imported;
      saveState(state);
      selectedName = null;
      refreshAll();
      alert(`Imported ${imported.earned.length} earned trophies.`);
    } catch (error) {
      alert(`Could not import that file: ${error.message}`);
    }
    event.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('Clear all earned trophies, notes and counts saved in this browser?')) return;
    state = { earned: [], notes: {}, counts: {}, spoilers: state.spoilers };
    saveState(state);
    selectedName = null;
    refreshAll();
  });
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => showView(tab.dataset.view));
  }

  readDemoParams();
  refreshAll();
  document.body.dataset.ready = 'true';
}

boot();
