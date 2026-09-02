// Kariérní úrovně obchodníka podle celkového (celoživotního) počtu prodejů.
// Čistě motivační/kosmetická věc - nemá vliv na provize ani přístupová práva.

export interface CareerLevel {
  title: string;
  emoji: string;
  minSales: number;
}

export const CAREER_LEVELS: CareerLevel[] = [
  { title: 'Junior obchodník', emoji: '🌱', minSales: 0 },
  { title: 'Obchodník', emoji: '📈', minSales: 5 },
  { title: 'Senior obchodník', emoji: '⭐', minSales: 15 },
  { title: 'Expert', emoji: '🔥', minSales: 30 },
  { title: 'Mistr prodeje', emoji: '👑', minSales: 50 },
];

export interface CareerLevelInfo {
  title: string;
  emoji: string;
  minSales: number;
  nextTitle: string | null;
  salesToNextLevel: number | null;
}

export function getCareerLevel(totalSales: number): CareerLevelInfo {
  let current = CAREER_LEVELS[0];
  for (const level of CAREER_LEVELS) {
    if (totalSales >= level.minSales) current = level;
  }
  const currentIndex = CAREER_LEVELS.indexOf(current);
  const next = CAREER_LEVELS[currentIndex + 1] ?? null;

  return {
    title: current.title,
    emoji: current.emoji,
    minSales: current.minSales,
    nextTitle: next?.title ?? null,
    salesToNextLevel: next ? next.minSales - totalSales : null,
  };
}
