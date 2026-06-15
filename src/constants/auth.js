export const STORAGE_KEY = 'user';

export const USERS_DB = [
  {
    id: 'admin-1',
    email: 'admin@gmail.com',
    password: '123',
    role: 'Admin',
    name: 'Alex Admin',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'acc-1',
    email: 'acc@gmail.com',
    password: '123',
    role: 'Accounting',
    name: 'Sarah Finance',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'consultant-1',
    email: 'consultant@gmail.com',
    password: '123',
    role: 'Consultant',
    name: 'Mark Consultant',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'vendor-1',
    email: 'vendor@gmail.com',
    password: '123',
    role: 'Vendor',
    name: 'James Vendor',
    avatar: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=200&q=80',
  },
];

export function authenticateUser(email='admin@gmail.com', password='123') {
  return USERS_DB.find((user) => user.email === email && user.password === password) || null;
}
