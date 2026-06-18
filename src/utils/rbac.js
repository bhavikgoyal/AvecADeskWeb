
import { GET_MENU } from '../config/MenuConfig';

const ROLE_ID_MAP = {
  1: 'Admin', 
};

export function resolveRole(role) {
  return ROLE_ID_MAP[role] || role;
}

export function getAllowedPaths(role) {
  const menu = GET_MENU(resolveRole(role));
  const paths = new Set();
  menu.forEach((group) => {
    group.items.forEach((item) => paths.add(item.path));
  });
  return paths;
}

export function getDefaultRoute(role) {
  const menu = GET_MENU(resolveRole(role));
  return menu[0]?.items[0]?.path || '/login';
}

export function canAccessPath(role, path) {
  return getAllowedPaths(role).has(path);
}