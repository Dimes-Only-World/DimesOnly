// Admin authentication utilities

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  loginTime: string;
}

export const getAdminUser = (): AdminUser | null => {
  const adminUserData = sessionStorage.getItem('adminUser');
  if (!adminUserData) return null;
  
  try {
    return JSON.parse(adminUserData) as AdminUser;
  } catch {
    return null;
  }
};

export const getAdminUserId = (): string | null => {
  const adminUser = getAdminUser();
  return adminUser?.id ?? null;
};

export const clearAdminSession = (): void => {
  sessionStorage.removeItem('adminUser');
};
