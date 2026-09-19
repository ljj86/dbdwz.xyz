const configuredOrigin = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
export const SITE_ORIGIN = String(import.meta.env.VITE_SITE_ORIGIN || 'https://www.dbdwz.xyz').replace(/\/$/, '')

let platformOrigin = ''
// Android/iOS 原生包没有浏览器“当前域名”，必须使用腾讯云的 HTTPS 绝对地址。
// #ifdef APP-PLUS
platformOrigin = String(import.meta.env.VITE_APP_API_BASE_URL || SITE_ORIGIN).replace(/\/$/, '')
// #endif

// 本地开发访问 3000；生产构建默认使用当前域名，由 Nginx/Express 处理 /api。
export const API_ORIGIN = configuredOrigin || platformOrigin || (import.meta.env.DEV ? 'http://localhost:3000' : '')

export function apiUrl(pathname) {
  const path = String(pathname || '')
  return API_ORIGIN + (path.startsWith('/') ? path : '/' + path)
}

export function siteUrl(pathname) {
  const path = String(pathname || '')
  if (/^https:\/\//i.test(path)) return path
  return SITE_ORIGIN + (path.startsWith('/') ? path : '/' + path)
}

export function appTutorialUrl(pathname) {
  const url = siteUrl(pathname)
  return url + (url.includes('?') ? '&' : '?') + 'app=1'
}

export function appTutorialPath(pathname) {
  const path = String(pathname || '')
  return path + (path.includes('?') ? '&' : '?') + 'app=1'
}

export function tutorialSessionUrl(ticket, nextPath) {
  return siteUrl('/api/auth/tutorial-session')
    + '?ticket=' + encodeURIComponent(String(ticket || ''))
    + '&next=' + encodeURIComponent(String(nextPath || ''))
}
