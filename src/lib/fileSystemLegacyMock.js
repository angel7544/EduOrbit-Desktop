export const documentDirectory = '';
export const deleteAsync = async () => {};
export const getInfoAsync = async () => ({ exists: false, size: 0, isDirectory: false });
export const readDirectoryAsync = async () => [];
export const makeDirectoryAsync = async () => {};
export const writeAsStringAsync = async () => {};
export const downloadAsync = async () => ({ uri: '' });
export const readAsStringAsync = async () => '';
export const cacheDirectory = '';

// Secure Store mocks
export const getItemAsync = async () => null;
export const setItemAsync = async () => {};
export const deleteItemAsync = async () => {};

// Firebase messaging mock
export const requestPermission = async () => 1;
export const getToken = async () => 'mock-token';

const mock = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'default') return mock;
    return async () => null;
  }
});

export default mock;
