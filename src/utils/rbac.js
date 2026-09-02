import { GET_MENU } from '../config/MenuConfig';

export function getAllowedPaths(role) {
  const menu = GET_MENU(role);
  const paths = new Set();
  menu.forEach((group) => {
    group.items.forEach((item) => paths.add(item.path));
  });
  return paths;
}

export function getDefaultRoute(role) {
  const menu = GET_MENU(role);
  return menu[0]?.items[0]?.path || '/login';
}

export function canAccessPath(role, path) {
  return getAllowedPaths(role).has(path);
}

const CREDENTIALS_ROLES = ['Accounting', 'Admin', 'Super Admin', 'SuperAdmin'];

export function canViewCredentials(user) {
  if (!user?.role) return false;
  const normalized = String(user.role).trim().toLowerCase().replace(/\s+/g, '');
  return CREDENTIALS_ROLES.some(
    (role) => role.toLowerCase().replace(/\s+/g, '') === normalized,
  );
}
