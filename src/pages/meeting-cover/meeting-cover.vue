<template>
  <view class="page" :class="{ night: isNight }">
    <view class="editor-container" :class="{ leaving: isLeaving }">
      <!-- 顶部栏 -->
      <view class="top-bar">
        <view class="back-btn" @click="goBack">
          <text>◀</text>
        </view>
        <text class="top-title">组会资料封面</text>
        <view class="spacer"></view>
      </view>

      <!-- 编辑卡片：完全复刻图片布局 -->
      <view class="edit-card">
        <!-- 第1行：标题 + 时间 -->
        <view class="card-row title-row">
          <view class="title-input-wrap">
            <input
              class="title-input"
              v-model="form.title"
              placeholder="请输入标题"
              placeholder-class="placeholder"
              maxlength="30"
            />
          </view>
          <view class="time-display">
            <text>{{ form.weekDay }}</text>
            <text>{{ form.time }}</text>
          </view>
        </view>

        <!-- 第2行：图片（大图，支持拖入） -->
        <view class="card-row image-row" ref="imageRow" :class="{ 'drag-active': isDragOver }">
          <view v-if="form.cover" class="image-preview">
            <image class="cover-img" :src="form.cover" mode="aspectFill" />
            <view class="image-actions">
              <view class="img-btn" @click="chooseImage">更换</view>
              <view class="img-btn danger" @click="removeImage">删除</view>
            </view>
          </view>
          <view v-else class="image-uploader" @click="chooseImage">
            <image class="placeholder-svg" :src="placeholderSvg" mode="aspectFit" />
            <view class="uploader-hint-bar">
              <text class="uploader-hint">支持拖入 · 推荐 16:9</text>
              <text class="uploader-formats">JPG / PNG / GIF / WEBP / BMP</text>
            </view>
          </view>
          <!-- #ifdef H5 -->
          <view v-if="isDragOver" class="drag-overlay">
            <text class="drag-text">⬇ 拖放图片到此处</text>
            <text class="drag-sub">JPG / PNG / GIF / WEBP / BMP</text>
          </view>
          <!-- #endif -->
        </view>

        <!-- 第3行：简介 + 继续阅读（右下角，文字绕行） -->
        <view class="card-row summary-row">
          <view class="summary-box">
            <!-- #ifdef H5 -->
            <view class="read-more-shape"></view>
            <!-- #endif -->
            <view class="read-more-btn" @click.stop="onReadMore">
              <text>继续阅读</text>
            </view>
            <!-- #ifdef H5 -->
            <div
              ref="summaryEditor"
              class="summary-editor"
              contenteditable="plaintext-only"
              data-placeholder="请输入简介..."
              @input="onSummaryInput"
            ></div>
            <!-- #endif -->
            <!-- #ifndef H5 -->
            <textarea
              class="summary-textarea"
              v-model="form.summary"
              placeholder="请输入简介..."
              placeholder-class="placeholder"
              maxlength="800"
            />
            <!-- #endif -->
          </view>
          <view class="char-count">{{ summaryCount }}/800</view>
        </view>

        <!-- 第4行：作者+时间（左） + 评论按钮（右） -->
        <view class="card-row bottom-row">
          <view class="bottom-left">
            <view class="info-item">
              <text class="info-label">作者：</text>
              <input class="info-input" v-model="form.author" placeholder="名字" maxlength="20" />
            </view>
            <text class="info-sep">·</text>
            <view class="info-item">
              <text class="info-label">时间：</text>
              <text class="info-date">{{ form.date }}</text>
            </view>
          </view>
          <view class="comment-btn" @click="toggleComments">
            <text>💬 评论</text>
            <view class="comment-toggle" :class="{ on: form.commentsEnabled }">
              <view class="toggle-dot"></view>
            </view>
          </view>
        </view>
      </view>

      <!-- 内容编辑按钮 -->
      <view class="edit-bar">
        <text class="edit-hint">标题和简介必写</text>
        <view class="edit-btn" :class="{ disabled: !canEdit }" @click="showContentEditor">
          <text>内容编辑</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { isLogin, getUser } from '@/store/auth.js'
import { setPageData, getPageData, clearPageData } from '@/utils/page-data.js'

export default {
  data() {
    return {
      isLeaving: false,
      isNight: false,
      submitting: false,
      isDragOver: false,
      form: {
        title: '',
        cover: '',
        author: '',
        weekDay: '',
        time: '',
        date: '',
        summary: '',
        content: '',
        commentsEnabled: true
      }
    }
  },
  onLoad() {
    if (!isLogin()) {
      uni.redirectTo({ url: '/pages/login/login' })
      return
    }
    const user = getUser()
    if (!user || user.role !== 'admin') {
      uni.showToast({ title: '上传文章仅测试员可用', icon: 'none' })
      setTimeout(() => uni.redirectTo({ url: '/pages/upload/upload' }), 400)
      return
    }
    this.initDefaults()
  },
  onReady() {
    // #ifdef H5
    this.$nextTick(() => {
      if (this.$refs.summaryEditor) {
        this.$refs.summaryEditor.innerText = this.form.summary
      }
      this.setupDragDrop()
    })
    // #endif
  },
  onShow() {
    // Receive saved data from content-edit page
    const saved = getPageData('content-edit-save')
    if (saved) {
      this.form.content = saved.content || ''
      clearPageData('content-edit-save')
    }
  },
  computed: {
    summaryCount() {
      return this.form.summary.length
    },
    contentCount() {
      return this.form.content.length
    },
    canEdit() {
      return this.form.title.trim() && this.form.summary.trim()
    },
    canSubmit() {
      return this.form.title.trim() && this.form.author.trim() && this.form.content.trim() && !this.submitting
    },
    placeholderSvg() {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225">`
        + `<rect width="400" height="225" fill="#F3E4C9"/>`
        + `<rect x="12" y="12" width="376" height="201" fill="none" stroke="#C0B5A0" stroke-width="2" stroke-dasharray="10,5"/>`
        + `<text x="200" y="115" text-anchor="middle" font-size="38" font-weight="900" fill="#8C7B5E" letter-spacing="10" font-family="monospace">组会资料</text>`
        + `<text x="200" y="145" text-anchor="middle" font-size="12" font-weight="700" fill="#BDB09B" letter-spacing="3" font-family="monospace">MEETING COVER</text>`
        + `</svg>`
      return `data:image/svg+xml,${encodeURIComponent(svg)}`
    }
  },
  methods: {
    initDefaults() {
      const user = getUser()
      const now = new Date()
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      const h = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      this.form.author = user.nickname || user.username || ''
      this.form.weekDay = weekDays[now.getDay()]
      this.form.time = `${h}：${min}`
      this.form.date = `${y}${m}${d}`
    },
    goBack() {
      this.isLeaving = true
      setTimeout(() => {
        uni.navigateBack({ delta: 1 })
      }, 300)
    },
    onSummaryInput(e) {
      // #ifdef H5
      this.form.summary = e.target.innerText
      // #endif
    },
    chooseImage() {
      // #ifdef H5
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml'
      input.style.display = 'none'
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (event) => {
            this.form.cover = event.target.result
          }
          reader.readAsDataURL(file)
        }
      }
      document.body.appendChild(input)
      input.click()
      setTimeout(() => document.body.removeChild(input), 1000)
      // #endif
      // #ifndef H5
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.form.cover = res.tempFilePaths[0]
        }
      })
      // #endif
    },
    removeImage() {
      this.form.cover = ''
    },
    // #ifdef H5
    setupDragDrop() {
      const row = this.$refs.imageRow
      if (!row) return
      const el = row.$el || row
      el.addEventListener('dragenter', this.onDragEnter)
      el.addEventListener('dragover', this.onDragOver)
      el.addEventListener('dragleave', this.onDragLeave)
      el.addEventListener('drop', this.onDrop)
    },
    onDragEnter(e) {
      e.preventDefault()
      this.isDragOver = true
    },
    onDragOver(e) {
      e.preventDefault()
    },
    onDragLeave(e) {
      e.preventDefault()
      const row = this.$refs.imageRow
      if (!row) return
      const el = row.$el || row
      if (!el.contains(e.relatedTarget)) {
        this.isDragOver = false
      }
    },
    onDrop(e) {
      e.preventDefault()
      this.isDragOver = false
      const files = e.dataTransfer && e.dataTransfer.files
      if (files && files.length > 0) {
        const file = files[0]
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (event) => {
            this.form.cover = event.target.result
          }
          reader.readAsDataURL(file)
        } else {
          uni.showToast({ title: '请拖入图片文件（JPG/PNG/GIF/WEBP/BMP）', icon: 'none' })
        }
      }
    },
    // #endif
    toggleComments() {
      this.form.commentsEnabled = !this.form.commentsEnabled
    },
    onReadMore() {
      uni.showToast({ title: '预览展示，发布后可以使用该按钮', icon: 'none' })
    },
    showContentEditor() {
      if (!this.canEdit) {
        uni.showToast({ title: '请先填写标题和简介', icon: 'none' })
        return
      }
      setPageData('content-edit-init', {
        content: this.form.content,
        cover: {
          title: this.form.title,
          cover: this.form.cover,
          author: this.form.author,
          weekDay: this.form.weekDay,
          time: this.form.time,
          date: this.form.date,
          summary: this.form.summary,
          commentsEnabled: this.form.commentsEnabled
        }
      })
      uni.navigateTo({ url: '/pages/content-edit/content-edit' })
    },
    handleSubmit() {
      if (!this.canSubmit) return
      this.submitting = true
      uni.showLoading({ title: '提交中...' })
      setTimeout(() => {
        uni.hideLoading()
        uni.showToast({ title: '提交成功', icon: 'success' })
        this.submitting = false
        this.form.title = ''
        this.form.cover = ''
        this.form.summary = ''
        this.form.content = ''
        // #ifdef H5
        this.$nextTick(() => {
          if (this.$refs.summaryEditor) {
            this.$refs.summaryEditor.innerText = ''
          }
        })
        // #endif
        this.initDefaults()
        setTimeout(() => {
          uni.navigateBack({ delta: 1 })
        }, 800)
      }, 1200)
    }
  }
}
</script>

<style scoped>
/* ========== 页面 ========== */
.page {
  width: 100vw;
  min-height: 100vh;
  overflow-x: hidden;
  background: #F3E4C9;
  transition: background 0.3s ease;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.page.night {
  background: #1E1F23;
}

.editor-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 16px 24px 24px 24px;
  transition: opacity 0.3s ease;
  overflow: hidden;
}
.editor-container.leaving {
  opacity: 0;
}

/* ========== 顶部栏 ========== */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  width: min(92vw, 880px);
  flex-shrink: 0;
}
.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid #2E1D0E;
  background: rgba(255, 250, 241, 0.9);
  box-shadow: 4px 4px 0 #0B0A0F26;
  font-size: 16px;
  font-weight: 900;
  color: #2E1D0E;
  cursor: pointer;
  transition: transform 0.1s ease;
}
.back-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 #0B0A0F26;
}
.top-title {
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #2E1D0E;
}
.spacer {
  width: 44px;
}

/* ========== 编辑卡片（横版A4比例 297:210） ========== */
.edit-card {
  width: min(92vw, 880px);
  aspect-ratio: 297 / 210;
  border: 3px solid #2E1D0E;
  background: rgba(255, 250, 241, 0.92);
  box-shadow: 6px 6px 0 #2E1D0E26;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.card-row {
  border-bottom: 2px solid #2E1D0E;
  padding: 12px 16px;
  box-sizing: border-box;
}
.card-row:last-child {
  border-bottom: none;
}

/* --- 第1行：标题+时间 --- */
.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  flex: 0 0 7.7%;
  overflow: hidden;
}
.title-input-wrap {
  flex: 1;
  min-width: 0;
}
.title-input {
  width: 100%;
  font-size: 15px;
  font-weight: 900;
  color: #2E1D0E;
  border: none;
  background: transparent;
  outline: none;
  height: 32px;
  line-height: 32px;
}
.time-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
  font-size: 12px;
  color: #8C7B5E;
  font-weight: 800;
  min-width: 70px;
  text-align: right;
}

/* --- 第2行：图片（自适应填充） --- */
.image-row {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  position: relative;
  overflow: hidden;
  min-height: 0;
}
.image-uploader {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  border: 2px dashed #C0B5A0;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  overflow: hidden;
  position: relative;
}
.image-uploader:hover {
  border-color: #2E1D0E;
  background: rgba(46, 29, 14, 0.03);
}
.placeholder-svg {
  flex: 1;
  width: 100%;
  min-height: 0;
  object-fit: contain;
}
.uploader-hint-bar {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0;
  background: rgba(255, 250, 241, 0.85);
  border-top: 1px solid #C0B5A0;
}
.uploader-text {
  font-size: 14px;
  font-weight: 900;
  color: #8C7B5E;
  letter-spacing: 0.06em;
}
.uploader-hint {
  font-size: 11px;
  font-weight: 800;
  color: #A89B82;
  letter-spacing: 0.04em;
}
.uploader-formats {
  font-size: 10px;
  font-weight: 700;
  color: #BDB09B;
  letter-spacing: 0.02em;
}

/* 拖拽高亮 */
.image-row.drag-active .image-uploader {
  border-color: #2E1D0E;
  background: rgba(46, 29, 14, 0.08);
  border-width: 3px;
}
.drag-overlay {
  position: absolute;
  inset: 10px 14px;
  background: rgba(46, 29, 14, 0.72);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  z-index: 10;
  pointer-events: none;
  border-radius: 4px;
  border: 3px dashed #FFFAF1;
}
.drag-text {
  font-size: 16px;
  font-weight: 900;
  color: #FFFAF1;
  letter-spacing: 0.1em;
}
.drag-sub {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 250, 241, 0.7);
  letter-spacing: 0.04em;
}

.image-preview {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}
.image-actions {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
}
.img-btn {
  height: 28px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #2E1D0E;
  background: rgba(255, 250, 241, 0.95);
  box-shadow: 2px 2px 0 #2E1D0E40;
  font-size: 11px;
  font-weight: 900;
  color: #2E1D0E;
  cursor: pointer;
}
.img-btn.danger {
  color: #D44A4A;
  border-color: #D44A4A;
}
.img-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #2E1D0E40;
}

/* --- 第3行：简介 + 继续阅读（右下角，文字绕行） --- */
.summary-row {
  flex: 0 0 17.7%;
  padding: 8px 14px 4px 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.summary-box {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

/* H5: 浮动 shape 占位 —— 让文字只在底部右下角绕行 */
.read-more-shape {
  float: right;
  width: 88px;
  height: 100%;
  shape-outside: inset(calc(100% - 38px) 0 0 0);
}

/* 按钮：绝对定位在右下角 */
.read-more-btn {
  position: absolute;
  bottom: 2px;
  right: 0;
  height: 30px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #2E1D0E;
  background: rgba(255, 250, 241, 0.95);
  box-shadow: 3px 3px 0 #2E1D0E26;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #2E1D0E;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  user-select: none;
  z-index: 1;
}
.read-more-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #2E1D0E26;
}

/* H5: contenteditable 编辑器 */
.summary-editor {
  font-size: 12px;
  font-weight: 800;
  color: #2E1D0E;
  line-height: 1.5;
  outline: none;
  height: 100%;
  max-height: 100%;
  word-break: break-all;
  overflow: hidden;
}
.summary-editor:empty::before {
  content: attr(data-placeholder);
  color: #C0B5A0;
  font-weight: 800;
  pointer-events: none;
}

/* 非H5: textarea 回退 */
.summary-textarea {
  width: 100%;
  height: 100%;
  font-size: 12px;
  font-weight: 800;
  color: #2E1D0E;
  border: none;
  background: transparent;
  outline: none;
  line-height: 1.5;
  resize: none;
  padding-right: 92px;
  padding-bottom: 32px;
  box-sizing: border-box;
}

.char-count {
  font-size: 10px;
  font-weight: 900;
  color: #8C7B5E;
  opacity: 0.7;
  text-align: right;
  margin-top: 2px;
  flex-shrink: 0;
}

/* --- 第4行：作者+时间（左） + 评论（右） --- */
.bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  gap: 10px;
  flex: 0 0 7.7%;
  overflow: hidden;
}
.bottom-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}
.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 900;
  color: #2E1D0E;
}
.info-label {
  flex-shrink: 0;
}
.info-input {
  width: 80px;
  font-size: 12px;
  font-weight: 900;
  color: #2E1D0E;
  border: none;
  background: transparent;
  outline: none;
  border-bottom: 1px dashed #C0B5A0;
  padding: 2px 0;
}
.info-input:focus {
  border-bottom-color: #2E1D0E;
}
.info-date {
  color: #8C7B5E;
}
.info-sep {
  color: #C0B5A0;
  font-size: 12px;
  font-weight: 900;
}

.comment-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 900;
  color: #8C7B5E;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}
.comment-toggle {
  width: 32px;
  height: 18px;
  border: 2px solid #8C7B5E;
  border-radius: 9px;
  position: relative;
  transition: background 0.2s ease, border-color 0.2s ease;
  background: transparent;
}
.comment-toggle.on {
  background: #2E1D0E;
  border-color: #2E1D0E;
}
.toggle-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #8C7B5E;
  position: absolute;
  top: 1px;
  left: 2px;
  transition: transform 0.2s ease, background 0.2s ease;
}
.comment-toggle.on .toggle-dot {
  transform: translateX(13px);
  background: #FFFAF1;
}

/* ========== 内容编辑栏 ========== */
.edit-bar {
  margin-top: 12px;
  width: min(92vw, 880px);
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}
.edit-hint {
  font-size: 11px;
  font-weight: 800;
  color: #8C7B5E;
  letter-spacing: 0.04em;
}
.edit-btn {
  height: 44px;
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid #2E1D0E;
  background: #2E1D0E;
  box-shadow: 4px 4px 0 #0B0A0F26;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #FFFAF1;
  cursor: pointer;
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease;
  user-select: none;
}
.edit-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #0B0A0F26;
}
.edit-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}
.edit-btn.disabled:active {
  transform: none;
  box-shadow: none;
}

/* ========== placeholder ========== */
.placeholder {
  color: #C0B5A0;
  font-weight: 800;
}

/* ========== keyframes ========== */
@keyframes popIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ========== 响应式 ========== */
@media (max-width: 620px) {
  .editor-container {
    padding: 12px;
  }
  .top-bar, .submit-bar {
    width: 100%;
  }
  .edit-card {
    width: 100%;
    aspect-ratio: auto;
    height: 60vh;
    overflow: hidden;
  }
  .title-row {
    flex: 0 0 48px;
  }
  .image-row {
    min-height: 160px;
  }
  .summary-row {
    flex: 0 0 90px;
  }
  .bottom-row {
    flex: 0 0 auto;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    height: auto;
    min-height: 48px;
    max-height: 64px;
  }
  .comment-btn {
    align-self: flex-end;
  }
  .content-modal {
    max-height: 90vh;
  }
}
</style>
