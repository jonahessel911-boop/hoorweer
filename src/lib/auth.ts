const AUTH_KEY = 'hear-direct-admin-auth';

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === 'true';
}

export function loginAdmin(password: string): boolean {
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'hear-direct-admin';
  if (password === adminPassword) {
    sessionStorage.setItem(AUTH_KEY, 'true');
    return true;
  }
  return false;
}

export function logoutAdmin(): void {
  sessionStorage.removeItem(AUTH_KEY);
}
