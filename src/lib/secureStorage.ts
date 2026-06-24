export const SecureStorage = {
  async init() {},
  getPath(id: string, type: 'video' | 'pdf' | 'hls' = 'video') { return ''; },
  async checkFreeSpace(): Promise<boolean> { return true; },
  async saveFile(): Promise<string> { return ''; },
  async deleteFile(id: string, type: 'video' | 'pdf' | 'hls' = 'video') {},
  async checkAccess(): Promise<boolean> { return true; }
};
