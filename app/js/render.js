// Rendering for the Leonida Ledger: the checklist rows, the guide detail
// pane, the progress header, and the roadmap and missables views. All text
// from the data file is inserted with textContent, never as HTML, so a
// trophy name or guide can never inject markup.

import { countByGrade, filterTrophies, gradeLabel, isHiddenBySpoilers, kindLabel } from './filters.js';
import { ROADMAP_FACTS, ROADMAP_STAGES } from './roadmap.js';
import { isEarned } from './store.js';

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderProgressHeader(trophies, state, refs) {
  const earned = state.earned.length;
  refs.earnedCount.textContent = String(earned);
  refs.meterFill.style.width = `${Math.round((earned / trophies.length) * 100)}%`;
  refs.meter.setAttribute('aria-valuenow', String(earned));
  const byGrade = countByGrade(trophies, state);
  refs.gradeCounts.textContent =
    `${byGrade.platinum} platinum · ${byGrade.gold} gold · ${byGrade.silver} silver · ${byGrade.bronze} bronze`;
  if (earned === trophies.length) {
    refs.platinumNote.textContent = 'Platinum earned — Vice Got a Price! You are a Leonida Legend.';
  }
}

export function renderTrophyList(trophies, state, filters, sourceLinks, refs, onSelect, onToggle) {
  const visible = filterTrophies(trophies, state, filters);
  refs.listMeta.textContent = `Showing ${visible.length} of ${trophies.length} trophies`;
  refs.emptyState.hidden = visible.length > 0;
  refs.trophyList.replaceChildren();
  for (const trophy of visible) {
    refs.trophyList.append(buildTrophyRow(trophy, state, onSelect, onToggle));
  }
  return visible;
}

function buildTrophyRow(trophy, state, onSelect, onToggle) {
  const hidden = isHiddenBySpoilers(trophy, state);
  const earned = isEarned(state, trophy.name);
  const li = el('li', `trophy-row${earned ? ' earned' : ''}${hidden ? ' hidden-trophy' : ''}`);
  li.dataset.name = trophy.name;

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned;
  box.setAttribute('aria-label', `Mark ${hidden ? 'hidden story trophy' : trophy.name} as earned`);
  box.addEventListener('change', () => onToggle(trophy, box.checked));
  box.addEventListener('click', (event) => event.stopPropagation());
  li.append(box);

  li.append(el('span', `dot ${trophy.grade}`));

  const text = el('span');
  text.append(el('span', 'trophy-name', hidden ? 'Hidden story trophy' : trophy.name));
  text.append(el('span', 'trophy-desc', hidden ? 'Earn it to reveal its name and description.' : trophy.description));
  const sub = el('span', 'trophy-sub');
  const bits = [];
  if (trophy.chapter) bits.push(trophy.chapter);
  if (trophy.target) bits.push(`0/${trophy.target}`);
  if (trophy.missable) bits.push('MISSABLE');
  if (state.counts[trophy.name] && trophy.target) {
    bits.push(`${state.counts[trophy.name]}/${trophy.target} done`);
  }
  if (state.notes[trophy.name]) bits.push('has your note');
  sub.textContent = bits.join(' · ');
  if (trophy.missable) {
    const flag = el('span', 'flag', ' ⚠ MISSABLE');
    sub.append(flag);
  }
  text.append(sub);
  li.append(text);

  li.append(el('span', `grade-tag ${trophy.grade}`, gradeLabel(trophy.grade)));
  li.addEventListener('click', () => onSelect(trophy));
  return li;
}

export function renderDetail(trophy, state, sourceLinks, refs, onCount, onNote) {
  const hidden = isHiddenBySpoilers(trophy, state);
  refs.detailEmpty.hidden = true;
  refs.detailCard.hidden = false;
  refs.detailDot.className = `dot ${trophy.grade}`;
  refs.detailGrade.textContent = gradeLabel(trophy.grade);
  refs.detailKind.textContent = kindLabel(trophy.kind);
  refs.detailMissable.hidden = !trophy.missable;
  refs.detailName.textContent = hidden ? 'Hidden story trophy' : trophy.name;
  refs.detailDesc.textContent = hidden
    ? 'Spoiler guard is on. Earn this trophy to reveal its official name and description.'
    : trophy.description;
  refs.detailGuide.textContent = hidden
    ? 'This guide stays hidden until the trophy is earned — no spoilers here.'
    : trophy.guide;

  if (!hidden && trophy.target) {
    const current = state.counts[trophy.name] || 0;
    refs.detailTarget.hidden = false;
    refs.detailTarget.textContent = `PSN tracks this one: ${current} of ${trophy.target}.`;
    refs.detailProgress.hidden = false;
    refs.countInput.value = String(current);
    refs.countTarget.textContent = `of ${trophy.target}`;
    refs.countInput.onchange = () => onCount(trophy, refs.countInput.value);
  } else {
    refs.detailTarget.hidden = true;
    refs.detailProgress.hidden = true;
  }

  refs.detailSources.replaceChildren();
  if (hidden) {
    refs.detailSources.append(el('li', null, 'Sources are hidden with the guide.'));
  } else {
    for (const key of trophy.sources) {
      const link = sourceLinks[key];
      if (!link) continue;
      const item = document.createElement('li');
      const a = document.createElement('a');
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = link.label;
      item.append(a);
      refs.detailSources.append(item);
    }
  }

  refs.notesInput.value = state.notes[trophy.name] || '';
  refs.notesInput.onchange = () => onNote(trophy, refs.notesInput.value);
  const earned = isEarned(state, trophy.name);
  refs.detailMeta.textContent = hidden
    ? 'Story trophy · hidden by the spoiler guard'
    : `${kindLabel(trophy.kind)} · ${gradeLabel(trophy.grade)} · ${trophy.chapter || 'No chapter'} · ${earned ? 'Earned' : 'Not earned yet'}`;
}

export function renderRoadmap(trophies, state, refs) {
  const view = refs.roadmapView;
  view.replaceChildren();
  const callout = el('div', 'callout');
  callout.append(el('h2', null, 'Roadmap to the platinum'));
  callout.append(el('p', null, 'Six stages, in order. Stages 1–2 are the story and its questlines; stages 3–5 are the open-world work; stage 6 is the 100% checklist that ends in the platinum.'));
  const facts = el('ul');
  for (const fact of ROADMAP_FACTS) facts.append(el('li', null, fact));
  callout.append(facts);
  view.append(callout);

  for (const stage of ROADMAP_STAGES) {
    const stageTrophies = trophies.filter((t) => t.stage === stage.stage);
    const done = stageTrophies.filter((t) => isEarned(state, t.name)).length;
    const box = el('section', 'stage');
    const head = el('div', 'stage-head');
    head.append(el('span', 'stage-num', String(stage.stage)));
    head.append(el('h2', null, stage.title));
    head.append(el('span', 'stage-time', stage.time));
    head.append(el('span', 'stage-count', `${done}/${stageTrophies.length} earned`));
    box.append(head);
    box.append(el('p', null, stage.body));
    const list = el('ul', 'stage-trophies');
    for (const trophy of stageTrophies) {
      const item = el('li', isEarned(state, trophy.name) ? 'done' : null);
      item.textContent = `${isEarned(state, trophy.name) ? '✓ ' : '○ '}${trophy.name} `;
      item.append(el('span', 'mini-grade', `(${trophy.grade}${trophy.missable ? ', missable' : ''})`));
      list.append(item);
    }
    box.append(list);
    view.append(box);
  }
}

export function renderMissables(trophies, state) {
  const missable = trophies.filter((t) => t.missable);
  const view = document.getElementById('missablesView');
  view.replaceChildren();

  const callout = el('div', 'callout warn');
  callout.append(el('h2', null, 'How many trophies can you miss?'));
  callout.append(el('p', null, 'One — potentially. PowerPyx and GTABase both flag Positive Mental Attitude as the only trophy that may be missable, and this guide flags exactly that one. Everything else is either automatic story progress or doable in free-roam after the story.'));
  callout.append(el('p', null, 'Why so few? There is no mission replay in GTA VI, but the story trophies unlock by finishing missions you cannot skip, and every optional quest giver becomes available again after the story. The danger is not the missions — it is the one meditation that only exists in Chapter 1.'));
  view.append(callout);

  for (const trophy of missable) {
    const card = el('article', 'stage missable-card');
    const head = el('div', 'stage-head');
    head.append(el('span', 'stage-num', '!'));
    head.append(el('h2', null, trophy.name));
    head.append(el('span', 'stage-count', isEarned(state, trophy.name) ? 'Earned ✓' : 'Not earned yet'));
    card.append(head);
    card.append(el('p', null, trophy.description));
    card.append(el('p', null, trophy.guide));
    view.append(card);
  }

  const safe = el('div', 'callout');
  safe.append(el('h2', null, 'Not missable — but mind these'));
  const list = el('ul');
  const notes = [
    'No mission replay: GTA VI has 15 manual save slots and 1 autosave. PowerPyx recommends keeping a save at the start and end of each chapter (10 saves) and rotating the other 5 for free-roam cleanup.',
    'Cheats disable trophies and saving — keep cheats off for the whole trophy run.',
    'Optional missions can disappear after a while (black icons with pink letters) and some quest givers go temporarily unavailable mid-story. PowerPyx says none of that affects trophies: all trophy-related quest givers return later.',
    'Criminal Profile: the Irredeemable profile is permanent and makes police more aggressive. It does not block any trophy, but avoid racking up excessive violence early if you do not want it.',
    'Some fences become permanently unavailable and a few magazine collectibles sit in story buildings that later close — neither affects any trophy, because new fences unlock and the collectibles also spawn elsewhere.',
  ];
  for (const note of notes) list.append(el('li', null, note));
  safe.append(list);
  view.append(safe);
}
