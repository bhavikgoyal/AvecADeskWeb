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

// Institute credentials and contact details are only for these roles (API enforces the same list).
const INSTITUTE_PRIVATE_ROLES = ['Accounting', 'Admin', 'Super Admin', 'SuperAdmin'];

function hasInstitutePrivateRole(user) {
  if (!user?.role) return false;
  const normalized = String(user.role).trim().toLowerCase().replace(/\s+/g, '');
  return INSTITUTE_PRIVATE_ROLES.some(
    (role) => role.toLowerCase().replace(/\s+/g, '') === normalized,
  );
}

export function canViewCredentials(user) {
  return hasInstitutePrivateRole(user);
}

export function canViewInstituteContacts(user) {
  return hasInstitutePrivateRole(user);
}
