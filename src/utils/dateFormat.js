function buildValidDate(year, month, day) {
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function toDateParts(date) {
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()),
  };
}

export function parseIsoDate(value) {
  if (typeof value !== 'string') return null;

  const isoValue = value.split('T')[0];
  const match = isoValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return null;

  const [, year, month, day] = match;
  return buildValidDate(Number(year), Number(month), Number(day));
}

export function parseDisplayDate(value) {
  if (typeof value !== 'string') return null;

  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (!match) return null;

  const [, day, month, year] = match;
  return buildValidDate(Number(year), Number(month), Number(day));
}

export function formatDateDisplay(value, emptyValue = '—') {
  if (!value) return emptyValue;

  const parsed =
    parseIsoDate(value) ||
    parseDisplayDate(value) ||
    (() => {
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    })();

  if (!parsed) return emptyValue;

  const { day, month, year } = toDateParts(parsed);
  return `${day}-${month}-${year}`;
}

export function formatDateInputDisplay(value) {
  return formatDateDisplay(value, '');
}

export function toIsoDateString(value) {
  if (!value) return '';

  const parsed =
    parseIsoDate(value) ||
    parseDisplayDate(value) ||
    (() => {
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    })();

  if (!parsed) return '';

  const { day, month, year } = toDateParts(parsed);
  return `${year}-${month}-${day}`;
}

export function normalizeDateTextInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}
