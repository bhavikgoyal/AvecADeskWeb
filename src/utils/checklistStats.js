import { getWeekItems } from '../api/checklistApi';

const WEEK_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function getWeekdayName(isoDateString) {
  const d = new Date(isoDateString);
  const idx = d.getDay(); // 0 (Sun) .. 6 (Sat)
  const mondayIndex = idx === 0 ? 6 : idx - 1;
  return WEEK_DAYS[mondayIndex];
}

export async function fetchWeekChecklistStats() {
  const items = await getWeekItems();
  const map = WEEK_DAYS.reduce((acc, day) => {
    acc[day] = { day, total: 0, completed: 0 };
    return acc;
  }, {});
  let completedThisWeek = 0;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  let dueToday = 0;
  let overdue = 0;

  items.forEach((it) => {
    const created = new Date(it.createdAt || it.createdDate || it.created);
    const day = getWeekdayName(it.createdAt || it.createdDate || it.created);
    if (!map[day]) return;
    map[day].total += 1;
    if (it.isCompleted) {
      map[day].completed += 1;
      completedThisWeek += 1;
    } else {
      // not completed -> either due today or overdue depending on created date
      if (created >= startOfToday && created < endOfToday) {
        dueToday += 1;
      } else if (created < startOfToday) {
        overdue += 1;
      }
    }
  });

  const daily = WEEK_DAYS.map((day) => {
    const { total, completed } = map[day];
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { day, total, completed, completionRate };
  });
  const pending = items.filter(i => !i.isCompleted).length;
  return { daily, pending, completedThisWeek, dueToday, overdue, raw: items };
}

export default fetchWeekChecklistStats;
