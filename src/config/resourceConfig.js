import { DOMAIN_FIELD_DEFS, DOMAIN_RESOURCES } from './domainConfig';

export const FIELD_DEFS = DOMAIN_FIELD_DEFS;

export const RESOURCE_PATHS = [
  'vendors',
  'institutes',
  'students',
  'invoices',
  'reminders',
  'templates',
  'users',
  'work-history',
  'tasks',
  'status/students',
  'status/vendors',
  'status/institutes',
  'reports/ai-scraping',
  'reports/receivables',
  'reports/received',
  'reports/dues',
  'reports/work-hours',
  'ai-tool',
  'vendor-portal',
];

export function pathToKey(path) {
  return path.replace(/^\//, '').replace(/\//g, '_');
}

function buildResource(pathKey, path) {
  const domain = DOMAIN_RESOURCES[pathKey];
  if (!domain) return null;
  return {
    path: path.startsWith('/') ? path : `/${path}`,
    ...domain,
  };
}

export const RESOURCE_CONFIG = Object.fromEntries(
  RESOURCE_PATHS.map((segment) => {
    const key = pathToKey(segment);
    return [key, buildResource(key, `/${segment}`)];
  }).filter(([, value]) => value),
);

export function getResourceConfig(path) {
  return RESOURCE_CONFIG[pathToKey(path)] || null;
}

export function getEmptyForm(path) {
  const resource = getResourceConfig(path);
  if (!resource?.emptyForm) {
    return { id: '', updated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) };
  }
  return {
    id: '',
    ...resource.emptyForm(),
    updated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

export function isFormValid(resource, form) {
  if (!resource?.requiredFields?.length) return true;
  return resource.requiredFields.every((field) => String(form[field] ?? '').trim());
}

export function getRecordLabel(resource, form) {
  const field = resource?.primaryField;
  return (field && form[field]) || form.businessName || form.fullName || form.taskTitle || form.invoiceNumber || 'Record';
}
