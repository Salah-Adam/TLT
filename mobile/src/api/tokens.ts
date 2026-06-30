//  the only place tokens touch disk — stored encrypted via expo-secure-store, never plain.

import * as SecureStore from "expo-secure-store";

const ACCESS = "tlt_access_token";
const REFRESH = "tlt_refresh_token";
const USER = "tlt_user";

export const tokenStore = {
  async save(access: string, refresh: string) {
    await SecureStore.setItemAsync(ACCESS, access);
    await SecureStore.setItemAsync(REFRESH, refresh);
  },
  async saveAccess(access: string) { await SecureStore.setItemAsync(ACCESS, access); },
  async saveUser(user: unknown) { await SecureStore.setItemAsync(USER, JSON.stringify(user)); },
  async load() {
    return { access: await SecureStore.getItemAsync(ACCESS), refresh: await SecureStore.getItemAsync(REFRESH) };
  },
  async loadUser<T>(): Promise<T | null> {
    const s = await SecureStore.getItemAsync(USER);
    return s ? (JSON.parse(s) as T) : null;
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
    await SecureStore.deleteItemAsync(USER);
  },
};



// import * as SecureStore from "expo-secure-store";

// const ACCESS = "tlt_access_token";
// const REFRESH = "tlt_refresh_token";

// export const tokenStore = {
//   async save(access: string, refresh: string) {
//     await SecureStore.setItemAsync(ACCESS, access);
//     await SecureStore.setItemAsync(REFRESH, refresh);
//   },
//   async saveAccess(access: string) {
//     await SecureStore.setItemAsync(ACCESS, access);
//   },
//   async load() {
//     return {
//       access: await SecureStore.getItemAsync(ACCESS),
//       refresh: await SecureStore.getItemAsync(REFRESH),
//     };
//   },
//   async clear() {
//     await SecureStore.deleteItemAsync(ACCESS);
//     await SecureStore.deleteItemAsync(REFRESH);
//   },
// };