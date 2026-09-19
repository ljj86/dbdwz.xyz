export const SITE_THEMES = ['white', 'black', 'retro']

export function getStoredTheme() {
  try {
    const saved = uni.getStorageSync('site-theme')
    if (SITE_THEMES.includes(saved)) return saved
    return uni.getStorageSync('retro-theme') === 'night' ? 'black' : 'retro'
  } catch (error) {
    return 'retro'
  }
}

export function applyGlobalTheme(theme) {
  const value = SITE_THEMES.includes(theme) ? theme : 'retro'
  // #ifdef H5
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-site-theme', value)
    document.body.classList.remove('theme-white', 'theme-black', 'theme-retro', 'night')
    document.body.classList.add('theme-' + value)
    if (value === 'black') document.body.classList.add('night')
  }
  // #endif
  return value
}

export function setGlobalTheme(theme) {
  const value = applyGlobalTheme(theme)
  try { uni.setStorageSync('site-theme', value) } catch (error) {}
  return value
}
