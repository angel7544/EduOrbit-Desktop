export const tokenCache = {
  async getToken(key: string) {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      return;
    }
  },
};
