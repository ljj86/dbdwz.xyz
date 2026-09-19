import { apiUrl } from '@/utils/api.js';

function request(url, options = {}) {
  const token = uni.getStorageSync('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: apiUrl(url),
      withCredentials: true,
      method: options.method || 'GET',
      data: options.data,
      header: headers,
      success: (res) => {
        if (res.data.code === 200) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail: (err) => {
        reject({ code: -1, message: '网络请求失败' });
      }
    });
  });
}

// 认证 API
export function login(username, password) {
  return request('/api/auth/login', {
    method: 'POST',
    data: { username, password }
  });
}

export function getUserInfo() {
  return request('/api/auth/me');
}

export function createTutorialTicket() {
  return request('/api/auth/tutorial-ticket', { method: 'POST' });
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}
