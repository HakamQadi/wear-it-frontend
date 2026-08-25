const TOKEN_KEY = 'wear_it_admin_token';
export const authStore = {
  get: () => typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};
