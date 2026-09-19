<script>
import { applyGlobalTheme, getStoredTheme } from '@/utils/theme.js'
import { isLogin } from '@/store/auth.js'

function requireLogin() {
  const pages = getCurrentPages()
  const current = pages.length ? pages[pages.length - 1] : null
  const route = current ? String(current.route || '') : ''
  const options = current && current.$page && current.$page.options ? current.$page.options : {}
  if (route === 'pages/tutorial-detail/tutorial-detail' && String(options.app || '') === '1') return
  if (!route || route === 'pages/login/login' || isLogin()) return
  uni.reLaunch({ url: '/pages/login/login' })
}

export default {
  onLaunch() {
    applyGlobalTheme(getStoredTheme())
    setTimeout(requireLogin, 0)
  },
  onShow() {
    applyGlobalTheme(getStoredTheme())
    setTimeout(requireLogin, 0)
  },
  onHide() {},
}
</script>

<style>
/* ===== 全局 CSS 变量 - 复古像素风设计系统 ===== */
:root {
  --paper: #f3e4c9;
  --paper-2: #fffaf1;
  --sidebar-bg: #ead7b7;
  --ink: #241c14;
  --muted: #8d8071;
  --green: #3f7d5c;
  --green-dark: #2b5e45;
  --red: #c7332b;
  --shadow: rgba(36, 28, 20, .28);
  --line: #241c14;
  --border-soft: #c0b5a0;
  --surface-muted: #e9d5b2;
  --accent: #8c5a2e;
  --sidebar-width: 286px;
  --sidebar-mini: 72px;
  --ease-soft: cubic-bezier(.22, 1, .36, 1);
  --ease-pop: cubic-bezier(.2, .9, .2, 1);
}

body.theme-retro {
  --paper: #f3e4c9;
  --paper-2: #fffaf1;
  --sidebar-bg: #ead7b7;
  --ink: #241c14;
  --muted: #8d8071;
  --line: #241c14;
  --border-soft: #c0b5a0;
  --surface-muted: #e9d5b2;
  --accent: #8c5a2e;
  --shadow: rgba(36, 28, 20, .28);
}

body.theme-white {
  --paper: #eef1f4;
  --paper-2: #ffffff;
  --sidebar-bg: #dfe5ea;
  --ink: #1f252b;
  --muted: #68727c;
  --line: #1f252b;
  --border-soft: #b8c1ca;
  --surface-muted: #e5eaf0;
  --accent: #3d6685;
  --shadow: rgba(31, 37, 43, .18);
}

body.theme-black,
body.night {
  --paper: #15110d;
  --paper-2: #211a14;
  --sidebar-bg: #1b140f;
  --ink: #f6e7ca;
  --muted: #b6a383;
  --green: #3f7d5c;
  --green-dark: #2b5e45;
  --red: #c7332b;
  --shadow: rgba(0, 0, 0, .45);
  --line: #f6e7ca;
  --border-soft: #6f6456;
  --surface-muted: #30271f;
  --accent: #d59a62;
}

/* 全局重置 */
page {
  background: var(--paper);
  color: var(--ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "PingFang SC", "Microsoft YaHei", monospace;
  transition: background .35s var(--ease-soft), color .35s var(--ease-soft);
}

body { margin: 0; background: var(--paper); color: var(--ink); transition: background .25s ease, color .25s ease; }

/* 全站主题层：覆盖各页面原有的局部固定色 */
body[class*="theme-"] :is(.page, .login-page, .detail-page, .app, .meeting-hub, .preview-container, .select-container, .editor-container) {
  background-color: var(--paper) !important;
  color: var(--ink) !important;
}

body[class*="theme-"] :is(.login-card, .type-card, .edit-card, .upload-card, .recent-card, .material-card, .member-card, .workspace, .preview-panel, .account-modal, .unpublish-dialog, .pane, .published-card, .feature-card) {
  background-color: var(--paper-2) !important;
  color: var(--ink) !important;
  border-color: var(--line) !important;
  box-shadow: 5px 5px 0 var(--shadow) !important;
}

body[class*="theme-"] :is(.top-bar, .recent-head, .pane-head, .preview-toolbar, .account-modal-head, .unpublish-dialog-head, .detail-header, .panel-title, .file-item.active) {
  background-color: var(--surface-muted) !important;
  color: var(--ink) !important;
  border-color: var(--line) !important;
}

body[class*="theme-"] :is(.field-box, .input, .textarea, input, textarea, .material-file, .recent-file, .file-item, .word-page, .title-input-wrap, .summary-box, .published-table-wrap table) {
  background-color: var(--paper-2) !important;
  color: var(--ink) !important;
  border-color: var(--border-soft) !important;
}

body[class*="theme-"] :is(.back-btn, .back-button, .meeting-refresh, .refresh-btn, .download-button, .dialog-button.cancel, .material-unpublish, .theme-choice.active) {
  background-color: var(--paper-2) !important;
  color: var(--ink) !important;
  border-color: var(--line) !important;
}

body[class*="theme-"] :is(.picker, .pending-section, .slides-preview, .word-preview, .material-summary, .file-panel) {
  background-color: var(--sidebar-bg) !important;
  color: var(--ink) !important;
  border-color: var(--line) !important;
}

body.theme-black :is(.profile-menu, .code-preview, .dark-stage) { background-color: #111 !important; color: #f5ead7 !important; }
body.theme-black :is(.preview-panel, .file-item, .word-page, .published-formula) { background-color: #211a14 !important; color: #f6e7ca !important; }
body.theme-black iframe { color-scheme: dark; }

view, text, button, input, image, scroll-view {
  box-sizing: border-box;
}
</style>
