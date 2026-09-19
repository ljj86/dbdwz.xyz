<template>
  <view class="page">
    <view class="sidebar-scrim" :class="{ show: sidebarOpen }" @click="sidebarOpen = false"></view>
    <aside class="guide-sidebar" :class="{ open: sidebarOpen }">
      <view class="app-return" @click="goBack"><text>←</text><strong>返回主界面</strong></view>
      <view class="site-head">
        <view class="site-logo">DS</view>
        <view class="site-copy">
          <strong>dbdwz.xyz</strong>
          <small>电子教程 · DEEPSEEK</small>
        </view>
      </view>
      <view class="side-label">DEEPSEEK × CLINE · CONTENTS</view>
      <scroll-view class="sidebar-nav" scroll-y>
        <view
          v-for="(section, index) in tutorialSections"
          :key="section.id"
          class="sidebar-link"
          :class="{ active: activeSection === section.id }"
          @click="scrollToSection(section.id)"
        >
          <text>{{ String(index + 1).padStart(2, '0') }}</text>
          <strong>{{ section.title }}</strong>
        </view>
      </scroll-view>
      <view class="sidebar-status"><text>21</text><view><strong>操作步骤</strong><small>图文教程</small></view></view>
    </aside>

    <view class="guide-main">
      <view class="mobile-head">
        <view class="mobile-menu" @click="sidebarOpen = true">☰</view>
        <view><strong>DeepSeek 接入 VS Code</strong><small>电子教程 · 图文指引</small></view>
      </view>
      <scroll-view class="article-scroll" scroll-y>
        <view class="article-shell">
          <view class="article-ribbon">
            <text>DEEPSEEK × CLINE × VS CODE</text>
            <small>请勿在截图、GitHub 或群聊中公开 API Key</small>
          </view>
          <view v-if="guideLoading" class="guide-state">教程加载中…</view>
          <view v-else-if="guideError" class="guide-state error">{{ guideError }}</view>
          <view v-else class="markdown-body" v-html="renderedGuide"></view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { isLogin } from '@/store/auth.js'
import { applyGlobalTheme, getStoredTheme } from '@/utils/theme.js'

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
})

markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  tokens[index].attrSet('target', '_blank')
  tokens[index].attrSet('rel', 'noopener noreferrer')
  return self.renderToken(tokens, index, options)
}

export default {
  data() {
    return {
      renderedGuide: '',
      guideLoading: true,
      guideError: '',
      tutorialSections: [],
      activeSection: '',
      sidebarOpen: false
    }
  },
  onLoad() {
    applyGlobalTheme(getStoredTheme())
    if (!isLogin()) {
      uni.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.loadGuide()
  },
  onShow() {
    applyGlobalTheme(getStoredTheme())
  },
  methods: {
    loadGuide() {
      this.guideLoading = true
      this.guideError = ''
      uni.request({
        url: '/static/tutorials/deepseek-vscode/guide.md',
        dataType: 'text',
        success: response => {
          if (typeof response.data !== 'string') {
            this.guideError = '教程内容读取失败'
            return
          }
          const source = response.data.replace(
            /\]\(images\//g,
            '](/static/tutorials/deepseek-vscode/images/'
          )
          const sourceWithoutInlineToc = source.replace(/\n## 目录\n[\s\S]*?\n---\n/, '\n---\n')
          const tokens = markdown.parse(sourceWithoutInlineToc, {})
          const sections = []
          let topLevelHeadingIndex = 0
          tokens.forEach((token, index) => {
            if (token.type !== 'heading_open' || token.tag !== 'h1') return
            const title = tokens[index + 1] && tokens[index + 1].content
              ? tokens[index + 1].content
              : '教程章节'
            const id = topLevelHeadingIndex === 0 ? 'guide-title' : `guide-section-${topLevelHeadingIndex}`
            token.attrSet('id', id)
            if (topLevelHeadingIndex > 0) sections.push({ id, title })
            topLevelHeadingIndex += 1
          })
          this.tutorialSections = sections
          this.activeSection = sections.length ? sections[0].id : ''
          const rendered = markdown.renderer.render(tokens, markdown.options, {})
          this.renderedGuide = DOMPurify.sanitize(rendered, {
            ADD_ATTR: ['target', 'rel']
          })
        },
        fail: () => {
          this.guideError = '无法加载教程，请稍后再试'
        },
        complete: () => {
          this.guideLoading = false
        }
      })
    },
    scrollToSection(id) {
      this.activeSection = id
      this.sidebarOpen = false
      // #ifdef H5
      this.$nextTick(() => {
        const target = document.getElementById(id)
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      // #endif
    },
    goBack() {
      // #ifdef H5
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'dbdwz:return-main' }, window.location.origin)
        return
      }
      // #endif
      uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) })
    }
  }
}
</script>

<style scoped>
.page { box-sizing: border-box; height: 100vh; height: 100dvh; display: grid; grid-template-columns: 280px minmax(0, 1fr); overflow: hidden; background: var(--paper); color: var(--ink); }
.guide-sidebar { box-sizing: border-box; min-width: 0; height: 100vh; height: 100dvh; display: flex; flex-direction: column; padding: 14px; overflow: hidden; border-right: 4px solid var(--line); background: #efdbb7; box-shadow: 6px 0 0 rgba(52, 43, 34, .12); z-index: 100; }
.app-return { min-height: 43px; flex-shrink: 0; display: flex; align-items: center; gap: 9px; margin-bottom: 17px; padding: 7px 11px; border: 4px solid var(--line); background: var(--green); color: #fff; box-shadow: 5px 5px 0 var(--shadow); font-size: 13px; cursor: pointer; }
.app-return text { font-size: 20px; line-height: 1; }
.app-return strong { font-weight: 1000; }
.app-return:active { transform: translate(2px, 2px); box-shadow: 3px 3px 0 var(--shadow); }
.site-head { min-height: 58px; flex-shrink: 0; display: flex; align-items: center; gap: 10px; }
.site-logo { width: 46px; height: 46px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 4px solid var(--line); background: linear-gradient(135deg, #28664b, #163f31); color: #fff; box-shadow: 4px 4px 0 var(--shadow); font-size: 15px; font-weight: 1000; }
.site-copy { min-width: 0; }
.site-copy strong, .site-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.site-copy strong { font-size: 16px; line-height: 1.05; }
.site-copy small { margin-top: 5px; color: #8c765f; font-size: 9px; font-weight: 900; letter-spacing: .08em; }
.side-label { flex-shrink: 0; margin: 18px 4px 9px; color: #9d6b32; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 9px; font-weight: 900; letter-spacing: .13em; }
.sidebar-nav { min-height: 0; flex: 1; }
.sidebar-link { min-height: 46px; box-sizing: border-box; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 9px 10px; border: 4px solid var(--line); background: #fff9ee; color: var(--ink); box-shadow: 5px 5px 0 var(--shadow); cursor: pointer; }
.sidebar-link > text { width: 26px; height: 24px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 2px solid var(--line); background: #f3e2c0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; font-weight: 900; }
.sidebar-link > strong { min-width: 0; font-size: 12px; font-weight: 1000; line-height: 1.35; }
.sidebar-link.active { background: var(--green); color: #fff; }
.sidebar-link.active > text { background: #fff; color: var(--ink); }
.sidebar-status { min-height: 48px; flex-shrink: 0; display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 9px; border: 4px solid var(--line); background: #fff9ee; box-shadow: 5px 5px 0 var(--shadow); }
.sidebar-status > text { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 3px solid var(--line); background: var(--accent); color: #fff; font-size: 10px; font-weight: 1000; }
.sidebar-status strong, .sidebar-status small { display: block; }
.sidebar-status strong { font-size: 11px; }
.sidebar-status small { margin-top: 2px; color: var(--muted); font-size: 9px; }
.guide-main { min-width: 0; height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; background-image: linear-gradient(rgba(71, 53, 34, .045) 1px, transparent 1px), linear-gradient(90deg, rgba(71, 53, 34, .045) 1px, transparent 1px); background-size: 36px 36px; }
.mobile-head { display: none; }
.sidebar-scrim { display: none; }
.article-scroll { min-height: 0; flex: 1; height: auto; padding-top: 28px; box-sizing: border-box; }
.article-shell { box-sizing: border-box; width: min(920px, calc(100% - 16px)); margin: 0 auto 34px; border: 4px solid var(--line); background: var(--paper-2); box-shadow: 8px 8px 0 var(--shadow); }
.article-ribbon { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 12px 18px; border-bottom: 3px solid var(--line); background: var(--surface-muted); }
.article-ribbon text { color: var(--accent); font-size: 10px; font-weight: 1000; letter-spacing: .12em; }
.article-ribbon small { color: var(--muted); font-size: 9px; font-weight: 900; text-align: right; }
.guide-state { padding: 110px 24px; color: var(--muted); text-align: center; font-size: 14px; font-weight: 1000; }
.guide-state.error { color: var(--red); }
.markdown-body { padding: clamp(24px, 5vw, 58px); color: var(--ink); font-family: "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 15px; line-height: 1.85; }
.markdown-body :deep(h1), .markdown-body :deep(h2), .markdown-body :deep(h3) { color: var(--ink); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "PingFang SC", monospace; line-height: 1.35; }
.markdown-body :deep(h1) { margin: 0 0 28px; padding-bottom: 18px; border-bottom: 4px solid var(--line); font-size: clamp(28px, 5vw, 46px); }
.markdown-body :deep(h2) { margin: 42px 0 18px; padding: 10px 13px; border: 3px solid var(--line); background: var(--surface-muted); box-shadow: 4px 4px 0 var(--shadow); font-size: 23px; }
.markdown-body :deep(h3) { margin: 28px 0 12px; font-size: 18px; }
.markdown-body :deep(p) { margin: 12px 0; }
.markdown-body :deep(a) { color: var(--green-dark); font-weight: 900; text-decoration-thickness: 2px; text-underline-offset: 3px; }
.markdown-body :deep(blockquote) { margin: 18px 0; padding: 12px 16px; border: 0; border-left: 6px solid var(--accent); background: var(--surface-muted); color: var(--muted); }
.markdown-body :deep(blockquote p) { margin: 4px 0; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { padding-left: 25px; }
.markdown-body :deep(li) { margin: 8px 0; }
.markdown-body :deep(code) { padding: 2px 6px; border: 1px solid var(--border-soft); background: var(--surface-muted); color: var(--accent); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: .9em; }
.markdown-body :deep(pre) { box-sizing: border-box; max-width: 100%; margin: 17px 0; padding: 16px; overflow-x: auto; border: 3px solid var(--line); background: #201914; color: #f6e7ca; box-shadow: 4px 4px 0 var(--shadow); }
.markdown-body :deep(pre code) { padding: 0; border: 0; background: transparent; color: inherit; }
.markdown-body :deep(img) { display: block; box-sizing: border-box; max-width: 100%; height: auto; margin: 22px auto; border: 3px solid var(--line); background: var(--surface-muted); box-shadow: 5px 5px 0 var(--shadow); }
.markdown-body :deep(hr) { margin: 34px 0; border: 0; border-top: 3px dashed var(--border-soft); }
.markdown-body :deep(strong) { color: var(--ink); font-weight: 1000; }
.markdown-body :deep(table) { width: 100%; border-collapse: collapse; }
.markdown-body :deep(th), .markdown-body :deep(td) { padding: 10px; border: 2px solid var(--border-soft); text-align: left; }
.markdown-body :deep(th) { background: var(--surface-muted); }

@media (max-width: 820px) {
  .page { display: block; }
  .guide-sidebar { position: fixed; inset: 0 auto 0 0; width: 280px; transform: translateX(-110%); transition: transform .18s ease; box-shadow: 8px 0 0 rgba(52, 43, 34, .25); }
  .guide-sidebar.open { transform: translateX(0); }
  .sidebar-scrim { position: fixed; inset: 0; display: block; z-index: 95; background: rgba(35, 28, 21, .42); opacity: 0; pointer-events: none; transition: opacity .18s ease; }
  .sidebar-scrim.show { opacity: 1; pointer-events: auto; }
  .guide-main { width: 100%; }
  .mobile-head { min-height: 62px; flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-bottom: 4px solid var(--line); background: #efdbb7; }
  .mobile-menu { width: 44px; height: 44px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 4px solid var(--line); background: var(--green); color: #fff; box-shadow: 4px 4px 0 var(--shadow); font-size: 20px; font-weight: 1000; }
  .mobile-head strong, .mobile-head small { display: block; }
  .mobile-head strong { font-size: 13px; }
  .mobile-head small { margin-top: 3px; color: var(--muted); font-size: 8px; font-weight: 900; }
  .article-scroll { padding-top: 14px; }
  .article-shell { width: calc(100% - 8px); margin-bottom: 24px; border-width: 3px; box-shadow: 5px 5px 0 var(--shadow); }
  .article-ribbon { align-items: flex-start; flex-direction: column; gap: 5px; padding: 10px 12px; }
  .article-ribbon small { text-align: left; }
  .markdown-body { padding: 22px 16px; font-size: 14px; }
  .markdown-body :deep(h2) { margin-top: 32px; font-size: 19px; }
}
</style>
