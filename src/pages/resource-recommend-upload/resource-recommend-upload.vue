<template>
  <view class="page">
    <view class="top-bar">
      <view class="back-btn" @click="goBack">‹</view>
      <view class="top-copy"><text>上传网站推荐</text><small>v0.3.9 · 成员可用</small></view>
      <view class="spacer"></view>
    </view>

    <view class="workspace">
      <view class="form-card">
        <view class="field">
          <text>图标</text>
          <view class="icon-row">
            <view class="icon-preview">
              <image v-if="isImageIcon(form.icon)" :src="form.icon" mode="aspectFit" />
              <text v-else>{{ form.icon || '🔗' }}</text>
            </view>
            <view class="icon-controls">
              <input v-model="form.icon" class="input" maxlength="20" placeholder="输入 emoji 或简短文字，例如 ✦" />
              <view class="choose-icon" @click="chooseIcon">选择图片图标</view>
              <small>图片不超过 300KB；选择图片后会替换文字图标。</small>
            </view>
          </view>
        </view>

        <view class="field"><text>名字</text><input v-model="form.name" class="input" maxlength="100" placeholder="网站名称" /></view>
        <view class="field"><text>简介</text><textarea v-model="form.description" class="textarea" maxlength="500" placeholder="一句话说明这个网站的用途" /></view>
        <view class="field"><text>链接</text><input v-model="form.url" class="input" maxlength="2000" placeholder="https://example.com/" /></view>
        <view class="field">
          <text>分类</text>
          <picker :range="categories" range-key="label" :value="categoryIndex" @change="selectCategory">
            <view class="category-picker">
              <text>{{ selectedCategory.label }}</text><strong>⌄</strong>
            </view>
          </picker>
        </view>

        <view class="submit-btn" :class="{ disabled: submitting || !canSubmit }" @click="submit">
          {{ submitting ? '发布中…' : '发布网站推荐' }}
        </view>
      </view>

      <view class="preview-card">
        <text class="preview-title">卡片预览</text>
        <a class="resource-card" :href="normalizedPreviewUrl" target="_blank" rel="noopener noreferrer" @click.prevent>
          <view class="preview-icon">
            <image v-if="isImageIcon(form.icon)" :src="form.icon" mode="aspectFit" />
            <text v-else>{{ form.icon || '🔗' }}</text>
          </view>
          <view class="resource-copy">
            <strong>{{ form.name || '网站名称' }}</strong>
            <text>{{ form.description || '网站用途简介会显示在这里' }}</text>
            <small>{{ previewHost }}</small>
          </view>
          <view class="open-mark">↗</view>
        </a>
        <view class="preview-meta"><text>分类</text><strong>{{ selectedCategory.label }}</strong></view>
      </view>
    </view>
  </view>
</template>

<script>
import { getToken, isLogin } from '@/store/auth.js'
import { apiUrl } from '@/utils/api.js'
import { applyGlobalTheme, getStoredTheme } from '@/utils/theme.js'

export default {
  data() {
    return {
      submitting: false,
      categoryIndex: 0,
      categories: [
        { value: 'development', label: '开发与通用工具' },
        { value: 'ai', label: 'AI 网站' },
        { value: 'academic', label: '学术、金融与数据' },
        { value: 'game', label: '游戏与素材' }
      ],
      form: { icon: '🔗', name: '', description: '', url: '', category: 'development' }
    }
  },
  computed: {
    selectedCategory() { return this.categories[this.categoryIndex] || this.categories[0] },
    canSubmit() { return !!(this.form.name.trim() && this.form.description.trim() && this.form.url.trim() && this.form.category) },
    normalizedPreviewUrl() { return this.form.url.trim() || '#' },
    previewHost() {
      try { return new URL(this.form.url.trim()).hostname.replace(/^www\./, '') } catch (error) { return 'example.com' }
    }
  },
  onLoad() {
    applyGlobalTheme(getStoredTheme())
    if (!isLogin()) return uni.redirectTo({ url: '/pages/login/login' })
  },
  onShow() { applyGlobalTheme(getStoredTheme()) },
  methods: {
    goBack() { uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/upload/upload' }) }) },
    isImageIcon(value) { return String(value || '').startsWith('data:image/') || /^https?:\/\//i.test(String(value || '')) },
    selectCategory(event) {
      this.categoryIndex = Number(event.detail.value) || 0
      this.form.category = this.selectedCategory.value
    },
    chooseIcon() {
      // #ifdef H5
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
      input.onchange = event => {
        const file = event.target.files && event.target.files[0]
        if (!file) return
        if (file.size > 300 * 1024) return uni.showToast({ title: '图标不能超过 300KB', icon: 'none' })
        const reader = new FileReader()
        reader.onload = loadEvent => { this.form.icon = String(loadEvent.target.result || '') }
        reader.readAsDataURL(file)
      }
      input.click()
      // #endif
    },
    submit() {
      if (this.submitting || !this.canSubmit) return
      let parsed
      try {
        parsed = new URL(this.form.url.trim())
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
      } catch (error) {
        return uni.showToast({ title: '请输入正确的 http/https 链接', icon: 'none' })
      }
      this.submitting = true
      uni.request({
        url: apiUrl('/api/resources'),
        method: 'POST',
        header: { Authorization: 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
        data: { ...this.form, url: parsed.toString() },
        success: response => {
          if (!response.data || response.data.code !== 201) {
            return uni.showToast({ title: (response.data && response.data.message) || '发布失败', icon: 'none' })
          }
          uni.showToast({ title: '网站推荐已发布', icon: 'success' })
          setTimeout(() => uni.redirectTo({ url: '/pages/resource-recommend/resource-recommend' }), 500)
        },
        fail: () => uni.showToast({ title: '无法连接服务器', icon: 'none' }),
        complete: () => { this.submitting = false }
      })
    }
  }
}
</script>

<style scoped>
.page{box-sizing:border-box;height:100vh;padding:20px 24px;overflow:hidden;background:var(--paper);color:var(--ink)}
.top-bar{height:58px;display:grid;grid-template-columns:48px 1fr 48px;align-items:center;margin-bottom:16px}.back-btn{width:42px;height:42px;display:flex;align-items:center;justify-content:center;border:3px solid var(--line);background:var(--paper-2);box-shadow:4px 4px 0 var(--shadow);font-size:30px;font-weight:900;cursor:pointer}.top-copy{text-align:center}.top-copy text,.top-copy small{display:block}.top-copy text{font-size:20px;font-weight:900}.top-copy small{margin-top:2px;color:var(--muted);font-size:10px}.workspace{height:calc(100vh - 98px);display:grid;grid-template-columns:minmax(430px,1fr) minmax(360px,.8fr);gap:18px}.form-card,.preview-card{min-width:0;border:4px solid var(--line);background:var(--paper-2);box-shadow:7px 7px 0 var(--shadow)}.form-card{padding:22px;overflow-y:auto}.field{display:flex;flex-direction:column;gap:7px;margin-bottom:15px}.field>text{font-size:12px;font-weight:900}.input,.textarea{box-sizing:border-box;width:100%;border:3px solid var(--border-soft);background:var(--paper-2);color:var(--ink)}.input{height:42px;padding:0 10px}.textarea{height:118px;padding:10px}.icon-row{display:grid;grid-template-columns:82px 1fr;gap:12px}.icon-preview,.preview-icon{display:flex;align-items:center;justify-content:center;border:3px solid var(--line);background:var(--surface-muted);overflow:hidden}.icon-preview{width:82px;height:82px;font-size:32px}.icon-preview image,.preview-icon image{width:100%;height:100%}.icon-controls{min-width:0}.choose-icon{margin-top:7px;padding:8px;border:2px solid var(--line);background:var(--surface-muted);text-align:center;font-size:10px;font-weight:900;cursor:pointer}.icon-controls small{display:block;margin-top:5px;color:var(--muted);font-size:8px}.category-picker{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 11px;border:3px solid var(--border-soft);background:var(--paper-2);font-size:11px;font-weight:900;cursor:pointer}.submit-btn{padding:13px;border:3px solid var(--line);background:var(--ink);color:var(--paper-2);text-align:center;font-size:13px;font-weight:900;cursor:pointer}.submit-btn.disabled{opacity:.42;cursor:not-allowed}.preview-card{display:flex;flex-direction:column;justify-content:center;padding:24px}.preview-title{margin-bottom:12px;font-size:15px;font-weight:900}.resource-card{display:flex;align-items:center;gap:11px;padding:13px;border:3px solid var(--border-soft);background:var(--paper-2);color:var(--ink);text-decoration:none;box-shadow:4px 4px 0 var(--shadow)}.preview-icon{width:48px;height:48px;flex-shrink:0;font-size:22px}.resource-copy{min-width:0;flex:1}.resource-copy strong,.resource-copy text,.resource-copy small{display:block}.resource-copy strong{font-size:13px}.resource-copy text{margin-top:4px;color:var(--muted);font-size:10px;line-height:1.5}.resource-copy small{margin-top:5px;color:var(--accent);font-size:9px}.open-mark{color:var(--accent);font-size:20px;font-weight:900}.preview-meta{display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding:10px;border:2px solid var(--border-soft);background:var(--surface-muted);font-size:10px}.preview-meta strong{font-size:11px}@media(max-width:900px){.page{height:auto;min-height:100vh;overflow:auto;padding:12px}.workspace{height:auto;grid-template-columns:1fr}.form-card,.preview-card{min-height:520px}}
</style>
