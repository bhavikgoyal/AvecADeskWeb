export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const revenueTrend = [
  { name: 'Jan', value: 4200, secondary: 2800 },
  { name: 'Feb', value: 5100, secondary: 3100 },
  { name: 'Mar', value: 4800, secondary: 3400 },
  { name: 'Apr', value: 6200, secondary: 3900 },
  { name: 'May', value: 5800, secondary: 4200 },
  { name: 'Jun', value: 7100, secondary: 4600 },
  { name: 'Jul', value: 6800, secondary: 5100 },
  { name: 'Aug', value: 7400, secondary: 5300 },
  { name: 'Sep', value: 8200, secondary: 5800 },
  { name: 'Oct', value: 7900, secondary: 6100 },
  { name: 'Nov', value: 8600, secondary: 6400 },
  { name: 'Dec', value: 9200, secondary: 6800 },
];

export const sparklineData = [
  { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 26 }, { v: 24 }, { v: 30 },
];

export const trafficData = [
  { name: '00', visits: 120, signups: 40 },
  { name: '04', visits: 180, signups: 55 },
  { name: '08', visits: 260, signups: 80 },
  { name: '12', visits: 320, signups: 110 },
  { name: '16', visits: 280, signups: 95 },
  { name: '20', visits: 340, signups: 120 },
  { name: '24', visits: 220, signups: 70 },
];

export const enrollmentData = [
  { name: 'Mon', enrolled: 24, pending: 12 },
  { name: 'Tue', enrolled: 32, pending: 18 },
  { name: 'Wed', enrolled: 28, pending: 15 },
  { name: 'Thu', enrolled: 40, pending: 20 },
  { name: 'Fri', enrolled: 36, pending: 17 },
  { name: 'Sat', enrolled: 22, pending: 10 },
  { name: 'Sun', enrolled: 18, pending: 8 },
];

export function buildSparkline(seed = 1) {
  return Array.from({ length: 10 }, (_, i) => ({
    v: 10 + ((i * seed * 3) % 18) + Math.round(Math.sin(i + seed) * 6),
  }));
}
