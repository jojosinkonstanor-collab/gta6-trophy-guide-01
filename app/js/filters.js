// Filtering for the trophy checklist: grade, kind, missable-only, hide-earned
// and free-text search, plus the spoiler rule that hides story trophies
// until they are earned. A trophy is a "story" trophy for the spoiler rule
// when its kind is story (or it is the platinum, whose name gives nothing
// away — so the platinum is never hidden).

export function isStoryTrophy(trophy) {
  return trophy.kind === 'story';
}

export function isHiddenBySpoilers(trophy, state) {
  return state.spoilers && isStoryTrophy(trophy) && !state.earned.includes(trophy.name);
}

export function trophyMatchesSearch(trophy, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [trophy.name, trophy.description, trophy.guide, trophy.chapter || '', trophy.kind, trophy.grade]
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

export function filterTrophies(trophies, state, filters) {
  return trophies.filter((trophy) => {
    if (filters.grade !== 'all' && trophy.grade !== filters.grade) return false;
    if (filters.kind === 'online') return false; // GTA VI has no online trophies.
    if (filters.kind !== 'all' && trophy.kind !== filters.kind) return false;
    if (filters.missableOnly && !trophy.missable) return false;
    if (filters.hideEarned && state.earned.includes(trophy.name)) return false;
    if (!trophyMatchesSearch(trophy, filters.search)) return false;
    return true;
  });
}

export function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

export function kindLabel(kind) {
  if (kind === 'platinum') return 'Platinum';
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function countByGrade(trophies, state) {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of trophies) {
    if (state.earned.includes(trophy.name)) counts[trophy.grade] += 1;
  }
  return counts;
}
