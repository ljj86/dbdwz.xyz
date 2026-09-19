<template>
  <view class="page">
    <view class="top-bar">
      <view class="back-btn" @click="goBack">‹</view>
      <view class="top-copy">
        <text>资源推荐</text>
        <small>v0.3.9 · 成员可见</small>
      </view>
      <view class="total-badge">{{ totalCount }}</view>
    </view>

    <view class="toolbar">
      <view class="search-row">
        <input v-model="keyword" class="search-input" placeholder="搜索网站名称或用途" maxlength="80" />
        <view class="upload-link-btn" @click="goUploadLink">＋ 上传链接</view>
      </view>
      <view class="category-tabs">
        <view
          v-for="tab in categoryTabs"
          :key="tab.value"
          class="category-tab"
          :class="{ active: activeCategory === tab.value }"
          @click="activeCategory = tab.value"
        >
          <text>{{ tab.label }}</text>
          <small>{{ tab.count }}</small>
        </view>
      </view>
    </view>

    <scroll-view class="resource-scroll" scroll-y>
      <view v-if="filteredGroups.length === 0" class="empty-state">没有找到匹配的网站</view>
      <view v-for="group in filteredGroups" :key="group.key" class="resource-section">
        <view class="section-head">
          <view>
            <strong>{{ group.title }}</strong>
            <small>{{ group.items.length }} 个网站</small>
          </view>
          <text>{{ group.icon }}</text>
        </view>
        <view class="resource-grid">
          <a
            v-for="item in group.items"
            :key="item.url"
            class="resource-card"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <view class="resource-index" :class="{ editable: isTester && item.id }" :title="isTester ? '点击编辑推荐' : ''" @click="handleIconClick($event, item)">
              <image v-if="isImageIcon(item.icon)" :src="item.icon" mode="aspectFit" />
              <text v-else>{{ item.icon || group.icon }}</text>
              <text v-if="item.id && !item.icon" class="icon-edit-mark">+</text>
              <small>{{ item.index }}</small>
            </view>
            <view class="resource-copy">
              <strong>{{ item.name }}</strong>
              <text>{{ item.description }}</text>
              <small>{{ displayHost(item.url) }}</small>
            </view>
            <view class="open-mark">↗</view>
          </a>
        </view>
      </view>
    </scroll-view>

    <view v-if="showIconEditor" class="dialog-mask" @click="closeIconEditor"></view>
    <view v-if="showIconEditor" class="icon-dialog">
      <view class="dialog-head"><strong>编辑网站推荐</strong><text @click="closeIconEditor">×</text></view>
      <view class="dialog-body">
        <view class="dialog-icon-preview">
          <image v-if="isImageIcon(editForm.icon)" :src="editForm.icon" mode="aspectFit" />
          <text v-else>{{ editForm.icon || '🔗' }}</text>
        </view>
        <input v-model="editForm.icon" class="dialog-input" maxlength="20" placeholder="输入 emoji 或简短文字" />
        <view class="choose-file" @click="chooseEditorIcon">选择图片图标</view>
        <input v-model="editForm.name" class="dialog-input edit-name" maxlength="100" placeholder="网站标题" />
        <textarea v-model="editForm.description" class="dialog-textarea" maxlength="500" placeholder="网站简介" />
        <small>图片不超过 300KB；标题、简介和图标保存后写入数据库。</small>
      </view>
      <view class="dialog-actions"><view class="danger" @click="deleteResource">删除</view><view @click="closeIconEditor">取消</view><view class="save" @click="saveResource">{{ savingResource ? '保存中…' : '保存修改' }}</view></view>
    </view>
  </view>
</template>

<script>
import { getToken, getUser, isLogin } from '@/store/auth.js'
import { apiUrl } from '@/utils/api.js'
import { applyGlobalTheme, getStoredTheme } from '@/utils/theme.js'

const RESOURCE_GROUPS = [
  {
    key: 'development', title: '开发与通用工具', icon: '⌘', items: [
      ['GitHub', 'https://github.com/', '代码托管、协作开发与开源项目检索平台'],
      ['Visual Studio Code', 'https://code.visualstudio.com/', '轻量、可扩展的跨平台代码编辑器'],
      ['npm', 'https://www.npmjs.com/', 'JavaScript 与 Node.js 包管理和插件检索平台'],
      ['Mathcha', 'https://www.mathcha.io/', 'LaTeX、Word、PDF、画图和公式编辑'],
      ['uni-app', 'https://uniapp.dcloud.net.cn/', '创建 Vue 3 项目和网站'],
      ['anyrouter', 'https://anyrouter.top/', 'API Key 服务'],
      ['MinerU', 'https://mineru.net/', 'PDF、Word、PPT 等转换为 Markdown'],
      ['There’s An AI For That', 'https://theresanaiforthat.com/', 'AI 工具搜索网站'],
      ['Qoder', 'https://qoder.com/zh', 'AI 编程工具'],
      ['AI Vocal Remover', 'https://aivocalremover.com/', 'AI 分离人声和伴奏'],
      ['樱花穿透', 'https://www.natfrp.com/', '内网穿透服务'],
      ['腾讯云 SSL 证书', 'https://console.cloud.tencent.com/ssl', '获取和管理 SSL 证书'],
      ['全国互联网安全管理服务平台', 'https://beian.mps.gov.cn/#/', '公安联网备案'],
      ['ICP/IP 地址/域名信息备案管理系统', 'https://beian.miit.gov.cn/#/Integrated/index', '工信部 ICP 备案'],
      ['LaTeX 在线编辑', 'https://www.latexlive.com/', '公式识别、编辑、预览与多格式导出'],
      ['RAR', 'https://www.rarlab.com/download.htm', '压缩软件官方下载'],
      ['shadcn 中文站', 'https://www.shadcn.com.cn/', '开源 UI 设计系统基础']
    ]
  },
  {
    key: 'ai', title: 'AI 网站', icon: '✦', items: [
      ['ChatGPT', 'https://chatgpt.com/', 'AI 对话网站'],
      ['DeepSeek', 'https://chat.deepseek.com/', 'AI 学习与生活助手'],
      ['豆包', 'https://www.doubao.com/', 'AI 助手'],
      ['Yandex', 'https://yandex.com/', '搜索与 AI 服务网站'],
      ['雾象', 'https://fogsight.ai/', '一句话生成动画视频'],
      ['Claude', 'https://claude.ai/new', 'AI 对话与复杂任务处理'],
      ['Gemini', 'https://gemini.google.com/', 'Google AI 助手'],
      ['腾讯混元', 'https://aistudio.tencent.com/chat/', '腾讯开发的 AI 助手']
    ]
  },
  {
    key: 'academic', title: '学术、金融与数据', icon: '▥', items: [
      ['AI4Scholar', 'https://ai4scholar.net/auth/sign-in', '学术文献搜索'],
      ['同花顺数据中心', 'https://data.10jqka.com.cn/', '同花顺官方金融数据'],
      ['萝卜投研', 'https://robo.datayes.com/', '研报与投研平台'],
      ['金融界', 'https://www.jrj.com.cn/', '金融资讯与数据'],
      ['东方财富数据中心', 'https://data.eastmoney.com/', '东方财富金融数据'],
      ['Loot Drop', 'https://www.loot-drop.io/', '创业失败经验总结']
    ]
  },
  {
    key: 'game', title: '游戏与素材', icon: '◆', items: [
      ['CrazyGames', 'https://crazygames.com/', '国外 H5 在线游戏网站'],
      ['Meowa', 'https://www.meowa.ai', '像素游戏素材库'],
      ['OpenGameArt', 'https://opengameart.org/', '免费开源游戏素材库'],
      ['1Games', 'https://1games.io/', '免费即开在线游戏库'],
      ['Neural4D', 'https://www.neural4d.com/', '免费 3D 模型生成器'],
      ['七卡瓦', 'https://perlerbeads.zippland.com/', '拼豆图案生成网站']
    ]
  }
]

let resourceIndex = 0
RESOURCE_GROUPS.forEach(group => {
  group.items = group.items.map(([name, url, description]) => ({ index: ++resourceIndex, name, url, description }))
})

export default {
  data() {
    return {
      keyword: '',
      activeCategory: 'all',
      isTester: false,
      showIconEditor: false,
      editingResource: null,
      editForm: { name: '', description: '', icon: '' },
      savingResource: false,
      groups: RESOURCE_GROUPS.map(group => ({ ...group, items: group.items.map(item => ({ ...item })) }))
    }
  },
  computed: {
    totalCount() { return this.groups.reduce((total, group) => total + group.items.length, 0) },
    categoryTabs() {
      return [
        { value: 'all', label: '全部', count: this.totalCount },
        ...this.groups.map(group => ({ value: group.key, label: group.title, count: group.items.length }))
      ]
    },
    filteredGroups() {
      const keyword = this.keyword.trim().toLowerCase()
      return this.groups
        .filter(group => this.activeCategory === 'all' || group.key === this.activeCategory)
        .map(group => ({
          ...group,
          items: group.items.filter(item => !keyword || `${item.name} ${item.description} ${item.url}`.toLowerCase().includes(keyword))
        }))
        .filter(group => group.items.length)
    }
  },
  onLoad() {
    applyGlobalTheme(getStoredTheme())
    if (!isLogin()) {
      uni.redirectTo({ url: '/pages/login/login' })
      return
    }
    const user = getUser()
    this.isTester = !!(user && user.role === 'admin')
    this.loadResources()
  },
  onShow() { applyGlobalTheme(getStoredTheme()) },
  methods: {
    goBack() { uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) }) },
    goUploadLink() { uni.navigateTo({ url: '/pages/resource-recommend-upload/resource-recommend-upload' }) },
    isImageIcon(value) {
      const icon = String(value || '')
      return icon.startsWith('data:image/') || icon.startsWith('/static/') || /^https?:\/\//i.test(icon)
    },
    canonicalUrl(value) {
      try {
        const parsed = new URL(value)
        const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '')
        return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${path}${parsed.search}${parsed.hash}`
      } catch (error) {
        return String(value || '').replace(/\/+$/, '').toLowerCase()
      }
    },
    loadResources() {
      uni.request({
        url: apiUrl('/api/resources'),
        header: { Authorization: 'Bearer ' + getToken() },
        success: response => {
          const resources = response.data && response.data.code === 200 && response.data.data
            ? response.data.data.resources || []
            : []
          this.groups = RESOURCE_GROUPS.map(group => ({ ...group, items: [] }))
          const seenUrls = new Set()
          let nextIndex = 1
          resources.forEach(resource => {
            const group = this.groups.find(item => item.key === resource.category)
            if (!group) return
            const resourceUrl = this.canonicalUrl(resource.url)
            if (seenUrls.has(resourceUrl)) return
            seenUrls.add(resourceUrl)
            group.items.push({ ...resource, index: nextIndex++ })
          })
        }
      })
    },
    handleIconClick(event, item) {
      if (!this.isTester || !item || !item.id) return
      event.preventDefault()
      event.stopPropagation()
      this.openIconEditor(item)
    },
    openIconEditor(item) {
      if (!this.isTester || !item || !item.id) return
      this.editingResource = item
      this.editForm = { name: item.name || '', description: item.description || '', icon: item.icon || '' }
      this.showIconEditor = true
    },
    closeIconEditor() {
      if (this.savingResource) return
      this.showIconEditor = false
      this.editingResource = null
      this.editForm = { name: '', description: '', icon: '' }
    },
    chooseEditorIcon() {
      // #ifdef H5
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
      input.onchange = event => {
        const file = event.target.files && event.target.files[0]
        if (!file) return
        if (file.size > 300 * 1024) return uni.showToast({ title: '图标不能超过 300KB', icon: 'none' })
        const reader = new FileReader()
        reader.onload = loadEvent => { this.editForm.icon = String(loadEvent.target.result || '') }
        reader.readAsDataURL(file)
      }
      input.click()
      // #endif
    },
    saveResource() {
      const name = this.editForm.name.trim()
      const description = this.editForm.description.trim()
      if (this.savingResource || !this.editingResource) return
      if (!name || !description) return uni.showToast({ title: '标题和简介不能为空', icon: 'none' })
      this.savingResource = true
      uni.request({
        url: apiUrl(`/api/resources/${this.editingResource.id}`),
        method: 'PUT',
        header: { Authorization: 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
        data: { name, description, icon: this.editForm.icon.trim() },
        success: response => {
          if (!response.data || response.data.code !== 200) return uni.showToast({ title: (response.data && response.data.message) || '保存失败', icon: 'none' })
          Object.assign(this.editingResource, { name, description, icon: this.editForm.icon.trim() })
          uni.showToast({ title: '推荐已更新', icon: 'success' })
          this.showIconEditor = false
          this.editingResource = null
          this.editForm = { name: '', description: '', icon: '' }
        },
        fail: () => uni.showToast({ title: '无法连接服务器', icon: 'none' }),
        complete: () => { this.savingResource = false }
      })
    },
    deleteResource() {
      if (this.savingResource || !this.editingResource) return
      const resource = this.editingResource
      uni.showModal({
        title: '删除网站推荐',
        content: `确定删除“${resource.name}”吗？`,
        confirmText: '确认删除',
        confirmColor: '#b53a2d',
        success: modal => {
          if (!modal.confirm) return
          this.savingResource = true
          uni.request({
            url: apiUrl(`/api/resources/${resource.id}`),
            method: 'DELETE',
            header: { Authorization: 'Bearer ' + getToken() },
            success: response => {
              if (!response.data || response.data.code !== 200) return uni.showToast({ title: (response.data && response.data.message) || '删除失败', icon: 'none' })
              this.groups.forEach(group => { group.items = group.items.filter(item => item.id !== resource.id) })
              this.showIconEditor = false
              this.editingResource = null
              this.editForm = { name: '', description: '', icon: '' }
              uni.showToast({ title: '推荐已删除', icon: 'success' })
            },
            fail: () => uni.showToast({ title: '无法连接服务器', icon: 'none' }),
            complete: () => { this.savingResource = false }
          })
        }
      })
    },
    displayHost(url) {
      try { return new URL(url).hostname.replace(/^www\./, '') } catch (error) { return url }
    }
  }
}
</script>

<style scoped>
.page { box-sizing: border-box; height: 100vh; height: 100dvh; display: flex; flex-direction: column; padding: 18px 22px 22px; overflow: hidden; background: var(--paper); color: var(--ink); }
.top-bar { height: 58px; flex-shrink: 0; display: grid; grid-template-columns: 48px 1fr 48px; align-items: center; margin-bottom: 14px; }
.back-btn { width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border: 3px solid var(--line); background: var(--paper-2); box-shadow: 4px 4px 0 var(--shadow); font-size: 30px; font-weight: 900; cursor: pointer; }
.top-copy { text-align: center; }.top-copy text,.top-copy small { display: block; }.top-copy text { font-size: 21px; font-weight: 900; }.top-copy small { margin-top: 2px; color: var(--muted); font-size: 10px; font-weight: 800; }
.total-badge { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border: 3px solid var(--line); background: var(--accent); color: #fff; box-shadow: 4px 4px 0 var(--shadow); font-size: 13px; font-weight: 900; }
.toolbar { flex-shrink: 0; margin-bottom: 12px; }.search-row { display: flex; gap: 8px; }.search-input { box-sizing: border-box; min-width: 0; flex: 1; height: 40px; padding: 0 12px; border: 3px solid var(--border-soft); background: var(--paper-2); color: var(--ink); font-size: 12px; }.upload-link-btn { height: 36px; padding: 0 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 3px solid var(--line); background: var(--ink); color: var(--paper-2); box-shadow: 3px 3px 0 var(--shadow); font-size: 11px; font-weight: 900; cursor: pointer; }.category-tabs { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; margin-top: 8px; }.category-tab { min-width: 0; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 5px; border: 2px solid var(--border-soft); background: var(--paper-2); color: var(--muted); font-size: 10px; font-weight: 900; cursor: pointer; }.category-tab small { min-width: 18px; padding: 1px 3px; border: 1px solid currentColor; text-align: center; font-size: 8px; }.category-tab.active { border-color: var(--line); background: var(--surface-muted); color: var(--ink); box-shadow: 2px 2px 0 var(--shadow); }
.resource-scroll { flex: 1; min-height: 0; height: auto; }.resource-section { margin-bottom: 18px; }.resource-section:last-child { padding-bottom: 18px; }.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding: 9px 12px; border: 3px solid var(--line); background: var(--surface-muted); }.section-head view strong,.section-head view small { display: block; }.section-head strong { font-size: 14px; }.section-head small { margin-top: 2px; color: var(--muted); font-size: 9px; }.section-head>text { font-size: 20px; font-weight: 900; }
.resource-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 9px; }.resource-card { min-width: 0; display: flex; align-items: center; gap: 10px; padding: 11px; border: 2px solid var(--border-soft); background: var(--paper-2); color: var(--ink); text-decoration: none; box-shadow: 3px 3px 0 var(--shadow); transition: transform .12s ease, box-shadow .12s ease; }.resource-card:hover { transform: translate(-1px,-1px); border-color: var(--line); box-shadow: 5px 5px 0 var(--shadow); }.resource-index { position: relative; width: 36px; height: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 2px solid var(--line); background: var(--surface-muted); overflow: hidden; font-size: 16px; font-weight: 900; }.resource-index.editable { cursor: pointer; }.resource-index image { width: 100%; height: 100%; }.resource-index small { position: absolute; right: 0; bottom: 0; min-width: 14px; padding: 1px 2px; background: var(--line); color: var(--paper-2); text-align: center; font-size: 6px; }.resource-index .icon-edit-mark { position: absolute; left: 0; top: 0; width: 13px; height: 13px; line-height: 11px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); background: var(--accent); color: #fff; font-size: 10px; }.resource-copy { min-width: 0; flex: 1; }.resource-copy strong,.resource-copy text,.resource-copy small { display: block; }.resource-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }.resource-copy text { margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); font-size: 9px; }.resource-copy small { margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--accent); font-size: 8px; }.open-mark { flex-shrink: 0; color: var(--accent); font-size: 17px; font-weight: 900; }.empty-state { padding: 90px 20px; border: 3px dashed var(--border-soft); color: var(--muted); text-align: center; font-weight: 900; }
.dialog-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,.48); }.icon-dialog { box-sizing: border-box; position: fixed; z-index: 51; left: 50%; top: 50%; width: min(420px, calc(100vw - 28px)); transform: translate(-50%,-50%); border: 3px solid var(--line); background: var(--paper-2); color: var(--ink); box-shadow: 8px 8px 0 var(--shadow); }.dialog-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 2px solid var(--border-soft); }.dialog-head strong { font-size: 15px; }.dialog-head text { font-size: 24px; font-weight: 900; cursor: pointer; }.dialog-body { padding: 18px; text-align: center; }.dialog-icon-preview { width: 72px; height: 72px; margin: 0 auto 14px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 3px solid var(--line); background: var(--surface-muted); font-size: 28px; }.dialog-icon-preview image { width: 100%; height: 100%; }.dialog-input,.dialog-textarea { box-sizing: border-box; width: 100%; padding: 0 10px; border: 2px solid var(--border-soft); background: var(--paper); color: var(--ink); }.dialog-input { height: 42px; }.edit-name { margin-top: 12px; }.dialog-textarea { height: 92px; margin-top: 10px; padding: 10px; text-align: left; }.choose-file { margin-top: 10px; padding: 10px; border: 2px solid var(--line); background: var(--surface-muted); font-size: 12px; font-weight: 900; cursor: pointer; }.dialog-body small { display: block; margin-top: 9px; color: var(--muted); font-size: 9px; }.dialog-actions { display: grid; grid-template-columns: repeat(3,1fr); border-top: 2px solid var(--border-soft); }.dialog-actions view { padding: 12px 6px; text-align: center; font-weight: 900; cursor: pointer; }.dialog-actions view+view { border-left: 2px solid var(--border-soft); }.dialog-actions .save { color: var(--accent); }.dialog-actions .danger { color: #b53a2d; }
@media(max-width:900px){.page{padding:12px}.search-row{align-items:stretch}.upload-link-btn{padding:0 10px}.category-tabs{grid-template-columns:repeat(2,1fr)}.resource-grid{grid-template-columns:1fr}}
</style>
