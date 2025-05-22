const ADMIN = 'admin';
const USER = 'user';

const roleTypes = {
  USER,
  ADMIN,
};

const allRoles = {
  [USER]: [],
  [ADMIN]: ['getUsers', 'manageUsers'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

export { roleTypes, roles, roleRights };
