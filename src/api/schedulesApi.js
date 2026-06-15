import axiosClient from './axiosClient';

export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1)}k`;
  }
  return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export async function fetchPaymentSummary() {
  const { data } = await axiosClient.get('/api/schedules/summary');
  return {
    activeStudents: data.activeStudents ?? data.ActiveStudents ?? 0,
    collectedTotal: data.collectedTotal ?? data.CollectedTotal ?? 0,
    outstandingTotal: data.outstandingTotal ?? data.OutstandingTotal ?? 0,
    overdueTotal: data.overdueTotal ?? data.OverdueTotal ?? 0,
    overdueCount: data.overdueCount ?? data.OverdueCount ?? 0,
  };
}
