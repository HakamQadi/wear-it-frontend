/** Member and admin sessions are stored separately so one never leaks into the other. */
const MEMBER_KEY = 'wear_it_token';
const ADMIN_KEY = 'wear_it_admin_token';

function store(key: string) {
  return {
    get: () => (typeof window === 'undefined' ? null : window.localStorage.getItem(key)),
    set: (token: string) => window.localStorage.setItem(key, token),
    clear: () => window.localStorage.removeItem(key),
  };
}

export const memberSession = store(MEMBER_KEY);
export const adminSession = store(ADMIN_KEY);
