// 简易全局状态管理 (uni-app 无需 Vuex)
const authState = {
  user: null,
  token: '',
  isLogin: false
};

// 初始化：从本地存储恢复登录状态
try {
  const token = uni.getStorageSync('token');
  const user = uni.getStorageSync('user');
  if (token && user) {
    authState.token = token;
    authState.user = user;
    authState.isLogin = true;
  }
} catch (e) {}

export function isLogin() {
  return authState.isLogin;
}

export function getUser() {
  return authState.user;
}

export function getToken() {
  return authState.token;
}

export function setAuth(data) {
  authState.token = data.token;
  authState.user = data.user;
  authState.isLogin = true;
  uni.setStorageSync('token', data.token);
  uni.setStorageSync('user', data.user);
}

export function clearAuth() {
  authState.token = '';
  authState.user = null;
  authState.isLogin = false;
  uni.removeStorageSync('token');
  uni.removeStorageSync('user');
}

export default { isLogin, getUser, getToken, setAuth, clearAuth };
