const configuredOrigin = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
export const SITE_ORIGIN = String(import.meta.env.VITE_SITE_ORIGIN || '').replace(/\/$/, '')

let platformOrigin = ''
// Android/iOS 原生包没有浏览器“当前域名”，应从环境变量读取 HTTPS 服务地址。
// #ifdef APP-PLUS
platformOrigin = String(import.meta.env.VITE_APP_API_BASE_URL || SITE_ORIGIN).replace(/\/$/, '')
// #endif

// H5 生产环境默认使用同源 /api；开发环境如需独立后端，请通过 VITE_API_BASE_URL 配置。
export const API_ORIGIN = configuredOrigin || platformOrigin

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
