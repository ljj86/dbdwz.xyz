<template>
  <view class="page">
    <view class="top-bar">
      <view class="back-btn" @click="goBack">◀</view>
      <text class="top-title">{{ isEditMode ? '修改组会资料' : '上传组会资料' }}</text>
      <view class="spacer"></view>
    </view>

    <view class="upload-workspace">
    <view class="upload-card">
      <view class="field">
        <text class="label">资料标题</text>
        <input v-model="title" class="input" placeholder="例如：第十二周课题组组会" maxlength="80" />
      </view>
      <view class="field">
        <text class="label">资料说明</text>
        <textarea v-model="description" class="textarea" placeholder="填写汇报主题、讨论结论或补充说明"></textarea>
      </view>
      <view
        ref="fileDropZone"
        class="picker"
        :class="{ dragover: isDragOver }"
        @click="chooseFiles"
        @dragenter.prevent="isDragOver = true"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="onDragLeave"
        @drop.stop.prevent="onDrop"
      >
        <text class="picker-icon">＋</text>
        <text class="picker-title">点击选择或拖入资料文件</text>
        <text class="picker-desc">支持文档、课件、表格、图片、视频；ZIP 可在线解压</text>
      </view>

      <view class="submit-btn" :class="{ disabled: files.length === 0 || loadingMaterial }" @click="finishAndView">
        {{ loadingMaterial ? '读取中…' : (uploading ? (isEditMode ? '保存中…' : '上传中…') : (isEditMode ? '保存修改' : '上传资料')) }}
      </view>
    </view>

    <view class="recent-card">
      <view class="recent-head">
        <view>
          <text class="recent-title">{{ isEditMode ? '当前资料附件' : '后端临时文件' }}</text>
          <text class="recent-subtitle">{{ isEditMode ? '可以删除旧附件，也可以继续加入新文件' : '未点击“上传资料”不会正式保存，离开时自动清理' }}</text>
        </view>
      </view>
      <view v-if="files.length" class="pending-section" :class="{ expanded: myMaterials.length === 0 }">
        <view class="pending-head">
          <text>{{ isEditMode ? '修改后的附件' : (files.every(file => file.status === 'uploaded') ? '临时区已接收' : '正在进入临时区') }}</text>
          <text>{{ displayFileCount }} 个</text>
        </view>
        <view class="file-list">
          <view v-for="(file, index) in files" :key="file.clientId || file.name + index" class="file-card" :class="{ archive: isZipFile(file) }">
            <view class="file-item">
              <view class="file-badge">{{ extension(file.name) }}</view>
              <view class="file-info">
                <text class="file-name">{{ file.name }}</text>
                <text class="file-size">{{ formatSize(file.size) }}</text>
              </view>
              <view class="file-status">
                <view v-if="file.status === 'uploading'" class="file-progress-wrap">
                  <view class="file-progress-track"><view class="file-progress-fill" :style="{ width: file.progress + '%' }"></view></view>
                  <text class="file-progress-percent">{{ file.progress }}%</text>
                </view>
                <text v-else class="pending-label" :class="file.status">{{ file.status === 'uploaded' ? '已上传' : (file.status === 'failed' ? '失败' : '待上传') }}</text>
              </view>
              <view v-if="!isEditMode && isZipFile(file) && file.status === 'uploaded'" class="extract-btn" :class="{ busy: file.extracting }" title="在线解压限制：仅支持 ZIP；压缩包最大 50MB；最多 100 个文件；解压总量最大 200MB；单文件最大 50MB；压缩比不超过 40:1；目录最多 6 层；最长 30 秒。" @click.stop="extractArchive(file)">
                {{ file.extracting ? '解压中…' : ((file.extractedFiles || []).length ? '重新解压' : '在线解压') }}
              </view>
              <view v-if="file.status !== 'uploading'" class="file-remove" @click.stop="removeFile(index)">×</view>
            </view>
            <view v-if="(file.extractedFiles || []).length" class="extracted-list">
              <view class="extracted-head"><text>解压后的文件</text><small>{{ file.extractedFiles.length }} 个</small></view>
              <view v-for="child in file.extractedFiles" :key="child.clientFileId" class="extracted-file">
                <view class="child-tree">└</view>
                <view class="file-badge child-badge">{{ extension(child.name) }}</view>
                <view class="file-info">
                  <text class="file-name">{{ child.name }}</text>
                  <text class="file-size">{{ child.archivePath || '' }} · {{ formatSize(child.size) }}</text>
                </view>
                <text class="pending-label uploaded">已解压</text>
              </view>
            </view>
          </view>
        </view>
      </view>
      <scroll-view v-if="myMaterials.length || files.length === 0" class="recent-scroll" scroll-y>
        <view v-if="myMaterials.length === 0" class="recent-empty">还没有上传文件</view>
        <view v-else>
          <view v-for="material in myMaterials" :key="material.folder" class="recent-batch">
            <view class="batch-head">
              <view class="batch-icon">📁</view>
              <view class="batch-info">
                <text class="batch-title">{{ material.title || '未命名资料' }}</text>
                <text class="batch-time">{{ formatTime(material.uploadedAt) }}</text>
              </view>
              <text class="batch-count">{{ material.files.length }}</text>
            </view>
            <text v-if="material.description" class="batch-desc">{{ material.description }}</text>
            <view class="recent-files">
              <a v-for="file in material.files" :key="file.name" class="recent-file" :href="fileUrl(material, file)" target="_blank" download>
                <text class="recent-file-badge">{{ extension(file.name) }}</text>
                <view class="recent-file-info">
                  <text class="recent-file-name">{{ file.name }}</text>
                  <text class="recent-file-size">{{ formatSize(file.size) }}</text>
                </view>
                <text class="recent-file-open">打开</text>
              </a>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
    </view>

    <view v-if="showLeaveDialog" class="leave-mask" @click.stop></view>
    <view v-if="showLeaveDialog" class="leave-dialog" @click.stop>
      <view class="leave-title">{{ isEditMode ? '修改内容是否需要保存？' : '已上传内容是否需要保存？' }}</view>
      <view class="leave-content">{{ isEditMode ? '保存后更新这张资料卡片；不保存将放弃本次修改。' : '当前文件只在后端临时区，保存后才会正式发布；不保存将删除全部临时文件。' }}</view>
      <view class="leave-actions">
        <view class="leave-button discard" @click="discardAndLeave">不保存</view>
        <view class="leave-button save" @click="saveAndLeave">保存</view>
      </view>
    </view>
  </view>
</template>

<script>
import { isLogin } from '@/store/auth.js'
import { apiUrl } from '@/utils/api.js'

function createUploadTaskId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`
}

export default {
  data() {
    return { title: '', description: '', files: [], isDragOver: false, uploading: false, uploadedThisSession: [], uploadTimer: null, navigateAfterUpload: false, editId: null, loadingMaterial: false, uploadTaskId: createUploadTaskId(), showLeaveDialog: false, formalSaved: false, allowLeave: false }
  },
  computed: {
    isEditMode() { return Number.isInteger(this.editId) && this.editId > 0 },
    canSubmit() { return this.pendingFiles.length > 0 },
    pendingFiles() { return this.files.filter(file => file.status === 'pending' || file.status === 'failed') },
    archiveExtracting() { return this.files.some(file => file.extracting) },
    displayFileCount() { return this.files.reduce((total, file) => total + 1 + ((file.extractedFiles || []).length), 0) },
    myMaterials() {
      return this.isEditMode ? [] : this.uploadedThisSession
    }
  },
  onLoad(options = {}) {
    if (!isLogin()) return uni.redirectTo({ url: '/pages/login/login' })
    const editId = Number(options.editId)
    if (Number.isInteger(editId) && editId > 0) {
      this.editId = editId
      this.loadEditMaterial()
    }
    // #ifdef H5
    window.addEventListener('beforeunload', this.handleBeforeUnload)
    // #endif
  },
  onReady() {
    // #ifdef H5
    this.$nextTick(() => this.setupNativeDropZone())
    // #endif
  },
  mounted() {
    // #ifdef H5
    this.$nextTick(() => this.setupNativeDropZone())
    // #endif
  },
  updated() {
    // #ifdef H5
    this.setupNativeDropZone()
    // #endif
  },
  beforeUnmount() {
    // #ifdef H5
    window.removeEventListener('beforeunload', this.handleBeforeUnload)
    // #endif
    if (!this.isEditMode && !this.formalSaved && this.files.length) this.cleanupStaging(true)
  },
  onBackPress() {
    if (this.files.length || this.title.trim() || this.description.trim()) {
      this.showLeaveDialog = true
      return true
    }
    return false
  },
  methods: {
    goBack() {
      if (this.files.length || this.title.trim() || this.description.trim()) {
        this.showLeaveDialog = true
        return
      }
      this.leavePage()
    },
    leavePage() {
      this.allowLeave = true
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
      if (pages.length > 1) uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/index/index' }) })
      else uni.reLaunch({ url: '/pages/index/index' })
    },
    saveAndLeave() {
      this.showLeaveDialog = false
      this.navigateAfterUpload = true
      this.finishAndView()
    },
    discardAndLeave() {
      if (this.uploading) return uni.showToast({ title: '文件正在传输，请稍候', icon: 'none' })
      if (this.archiveExtracting) return uni.showToast({ title: '压缩包正在解压，请稍候', icon: 'none' })
      this.showLeaveDialog = false
      if (!this.isEditMode) this.cleanupStaging(false)
      this.files = []
      this.title = ''
      this.description = ''
      this.leavePage()
    },
    handleBeforeUnload() {
      if (!this.isEditMode && !this.formalSaved && this.files.length) this.cleanupStaging(true)
    },
    chooseFiles() {
      // #ifdef H5
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.onchange = event => {
        this.addFiles(Array.from(event.target.files || []))
      }
      input.click()
      // #endif
      // #ifndef H5
      uni.chooseFile({ count: 9, success: res => { this.addFiles(res.tempFiles || []) } })
      // #endif
    },
    setupNativeDropZone() {
      const ref = this.$refs.fileDropZone
      const refElement = ref && (ref.$el || ref)
      const element = (refElement && typeof refElement.addEventListener === 'function')
        ? refElement
        : (typeof document !== 'undefined' ? document.querySelector('.picker') : null)
      if (!element || element._materialDropReady) return
      element._materialDropReady = true
      element.addEventListener('dragenter', event => {
        event.preventDefault()
        event.stopPropagation()
        this.isDragOver = true
      })
      element.addEventListener('dragover', event => {
        event.preventDefault()
        event.stopPropagation()
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
        this.isDragOver = true
      })
      element.addEventListener('dragleave', event => {
        event.preventDefault()
        if (!element.contains(event.relatedTarget)) this.isDragOver = false
      })
      element.addEventListener('drop', event => {
        event.preventDefault()
        event.stopPropagation()
        this.isDragOver = false
        this.addFiles(Array.from((event.dataTransfer && event.dataTransfer.files) || []))
      })
    },
    addFiles(newFiles) {
      const existing = new Set(this.files.map(file => `${file.name}-${file.size}-${file.lastModified || 0}`))
      const unique = (newFiles || []).filter(file => {
        const key = `${file.name}-${file.size}-${file.lastModified || 0}`
        if (existing.has(key)) return false
        existing.add(key)
        return true
      })
      this.files = this.files.concat(unique.map(file => ({
        clientId: createUploadTaskId(),
        raw: file,
        name: file.name || file.path || '未命名文件',
        size: Number(file.size) || 0,
        lastModified: file.lastModified || 0,
        status: 'pending',
        progress: 0
      })))
      if (unique.length && !this.isEditMode) this.$nextTick(() => this.files.filter(file => file.status === 'pending').forEach(file => this.stageFile(file)))
    },
    stageFile(file) {
      if (!file || !file.raw || this.isEditMode || file.status === 'uploading') return
      file.status = 'uploading'
      file.progress = 0
      const form = new FormData()
      form.append('uploadTaskId', this.uploadTaskId)
      form.append('clientFileId', file.clientId)
      form.append('file', file.raw, file.name)
      const request = new XMLHttpRequest()
      file.request = request
      request.open('POST', apiUrl('/api/materials/stage'))
      request.setRequestHeader('Authorization', 'Bearer ' + uni.getStorageSync('token'))
      request.upload.onprogress = event => {
        if (event.lengthComputable && event.total > 0) file.progress = Math.min(99, Math.round((event.loaded / event.total) * 100))
      }
      request.onerror = () => { file.status = 'failed'; file.progress = 0 }
      request.onabort = () => { if (this.files.includes(file)) { file.status = 'failed'; file.progress = 0 } }
      request.onload = () => {
        try {
          const result = JSON.parse(request.responseText || '{}')
          if (result.code !== 200) throw new Error(result.message || '临时上传失败')
          file.status = 'uploaded'
          file.progress = 100
        } catch (error) {
          file.status = 'failed'
          file.progress = 0
          uni.showToast({ title: error.message || '临时上传失败', icon: 'none' })
        }
      }
      request.onloadend = () => { if (file.request === request) file.request = null }
      request.send(form)
    },
    removeFile(index) {
      const file = this.files[index]
      if (!file) return
      if (file.extracting) return uni.showToast({ title: '压缩包正在解压，请稍候', icon: 'none' })
      if (file.request) file.request.abort()
      this.files.splice(index, 1)
      if (!this.isEditMode && file.clientId) {
        uni.request({
          url: apiUrl(`/api/materials/stage/${encodeURIComponent(this.uploadTaskId)}/${encodeURIComponent(file.clientId)}`),
          method: 'DELETE',
          header: { Authorization: 'Bearer ' + uni.getStorageSync('token') }
        })
      }
    },
    cleanupStaging(keepalive = false) {
      if (this.isEditMode || this.formalSaved || !this.uploadTaskId) return
      const url = apiUrl(`/api/materials/stage/${encodeURIComponent(this.uploadTaskId)}`)
      const token = uni.getStorageSync('token')
      // #ifdef H5
      if (keepalive && typeof fetch === 'function') {
        fetch(url, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token }, keepalive: true }).catch(() => {})
        return
      }
      // #endif
      uni.request({ url, method: 'DELETE', header: { Authorization: 'Bearer ' + token } })
    },
    onDragLeave(event) {
      const current = event.currentTarget
      if (!current || !current.contains(event.relatedTarget)) this.isDragOver = false
    },
    onDrop(event) {
      this.isDragOver = false
      const transfer = event.dataTransfer || (event.detail && event.detail.dataTransfer) || (event.originalEvent && event.originalEvent.dataTransfer)
      if (!transfer) return
      this.addFiles(Array.from(transfer.files || []))
    },
    isZipFile(file) {
      return /\.zip$/i.test(String(file && file.name || ''))
    },
    extractArchive(file) {
      if (!file || file.extracting || file.status !== 'uploaded' || !file.clientId) return
      if (Number(file.size) > 50 * 1024 * 1024) return uni.showToast({ title: 'ZIP 不能超过 50MB', icon: 'none' })
      file.extracting = true
      file.extractedFiles = []
      uni.request({
        url: apiUrl(`/api/materials/stage/${encodeURIComponent(this.uploadTaskId)}/${encodeURIComponent(file.clientId)}/extract`),
        method: 'POST',
        header: { Authorization: 'Bearer ' + uni.getStorageSync('token') },
        success: response => {
          if (!response.data || response.data.code !== 200) return uni.showToast({ title: (response.data && response.data.message) || '在线解压失败', icon: 'none' })
          file.extractedFiles = (response.data.data && response.data.data.files) || []
          uni.showToast({ title: `已解压 ${file.extractedFiles.length} 个文件`, icon: 'success' })
        },
        fail: response => {
          const message = response && response.data && response.data.message
          uni.showToast({ title: message || '无法连接解压服务', icon: 'none' })
        },
        complete: () => { file.extracting = false }
      })
    },
    extension(name) {
      const ext = String(name || '').split('.').pop().toUpperCase()
      return ext && ext.length <= 5 ? ext : 'FILE'
    },
    formatSize(size) {
      const value = Number(size) || 0
      if (value < 1024) return value + ' B'
      if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB'
      return (value / 1024 / 1024).toFixed(1) + ' MB'
    },
    formatTime(value) {
      return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : ''
    },
    fileUrl(material, file) {
      return apiUrl('/materials-files/' + encodeURIComponent(material.folder) + '/' + encodeURIComponent(file.name))
    },
    uploadForm(form, token) {
      return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest()
        request.open('POST', apiUrl('/api/materials/upload'))
        request.setRequestHeader('Authorization', 'Bearer ' + token)
        request.onerror = () => reject(new Error('网络连接失败'))
        request.onabort = () => reject(new Error('上传已取消'))
        request.onload = () => {
          try {
            const result = JSON.parse(request.responseText || '{}')
            if (result.code !== 200) return reject(new Error(result.message || '上传失败'))
            resolve(result)
          } catch (error) {
            reject(new Error('服务器返回数据异常'))
          }
        }
        request.send(form)
      })
    },
    updateForm(form, token, newFiles) {
      return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest()
        request.open('PUT', apiUrl(`/api/materials/${this.editId}`))
        request.setRequestHeader('Authorization', 'Bearer ' + token)
        request.upload.onprogress = event => {
          if (!event.lengthComputable || !event.total) return
          const progress = Math.min(99, Math.round((event.loaded / event.total) * 100))
          newFiles.forEach(file => { file.status = 'uploading'; file.progress = progress })
        }
        request.onerror = () => reject(new Error('网络连接失败'))
        request.onabort = () => reject(new Error('保存已取消'))
        request.onload = () => {
          try {
            const result = JSON.parse(request.responseText || '{}')
            if (result.code !== 200) return reject(new Error(result.message || '保存失败'))
            resolve(result)
          } catch {
            reject(new Error('服务器返回数据异常'))
          }
        }
        request.send(form)
      })
    },
    loadEditMaterial() {
      this.loadingMaterial = true
      uni.request({
        url: apiUrl(`/api/materials/${this.editId}/edit`),
        header: { Authorization: 'Bearer ' + uni.getStorageSync('token') },
        success: response => {
          if (!response.data || response.data.code !== 200) {
            uni.showToast({ title: (response.data && response.data.message) || '读取资料失败', icon: 'none' })
            return setTimeout(() => uni.navigateBack({ delta: 1 }), 700)
          }
          const material = response.data.data
          this.title = material.title || ''
          this.description = material.description || ''
          this.files = (material.files || []).map(file => ({
            id: file.id,
            name: file.name,
            size: Number(file.size) || 0,
            mimeType: file.mimeType || '',
            existing: true,
            status: 'uploaded',
            progress: 100
          }))
        },
        fail: () => {
          uni.showToast({ title: '无法连接资料服务', icon: 'none' })
          setTimeout(() => uni.navigateBack({ delta: 1 }), 700)
        },
        complete: () => { this.loadingMaterial = false }
      })
    },
    async saveEdits() {
      if (this.uploading || this.loadingMaterial) return
      if (!this.files.length) return uni.showToast({ title: '资料至少需要保留一个附件', icon: 'none' })
      const title = this.title.trim()
      if (!title) return uni.showToast({ title: '请填写资料标题', icon: 'none' })
      const newFiles = this.files.filter(file => !file.existing)
      newFiles.forEach(file => { file.status = 'uploading'; file.progress = 0 })
      this.uploading = true
      try {
        const form = new FormData()
        form.append('title', title)
        form.append('description', this.description.trim())
        form.append('keepFiles', JSON.stringify(this.files.filter(file => file.existing).map(file => file.name)))
        newFiles.forEach(file => form.append('files', file.raw || file, file.name))
        await this.updateForm(form, uni.getStorageSync('token'), newFiles)
        newFiles.forEach(file => { file.status = 'uploaded'; file.progress = 100 })
        uni.showToast({ title: '修改已保存', icon: 'success' })
        setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 350)
      } catch (error) {
        newFiles.forEach(file => { file.status = 'failed'; file.progress = 0 })
        uni.showToast({ title: error.message || '保存失败', icon: 'none' })
      } finally {
        this.uploading = false
      }
    },
    finishAndView() {
      if (this.isEditMode) return this.saveEdits()
      if (!this.files.length) return uni.showToast({ title: '请先拖入或选择文件', icon: 'none' })
      if (this.uploading) return
      if (this.archiveExtracting) return uni.showToast({ title: '压缩包正在解压，请稍候', icon: 'none' })
      if (this.files.some(file => file.status === 'uploading' || file.status === 'pending')) return uni.showToast({ title: '文件正在进入临时区，请稍候', icon: 'none' })
      const failedFiles = this.files.filter(file => file.status === 'failed')
      if (failedFiles.length) {
        failedFiles.forEach(file => this.stageFile(file))
        return uni.showToast({ title: '正在重试失败文件', icon: 'none' })
      }
      this.finalizeUpload()
    },
    finalizeUpload() {
      if (this.uploading || !this.files.length) return
      this.uploading = true
      const firstName = this.files[0] && this.files[0].name ? this.files[0].name.replace(/\.[^.]+$/, '') : '组会资料'
      uni.request({
        url: apiUrl('/api/materials/finalize'),
        method: 'POST',
        header: { Authorization: 'Bearer ' + uni.getStorageSync('token') },
        data: {
          uploadTaskId: this.uploadTaskId,
          title: this.title.trim() || firstName,
          description: this.description.trim()
        },
        success: response => {
          if (!response.data || response.data.code !== 200) return uni.showToast({ title: (response.data && response.data.message) || '保存失败', icon: 'none' })
          this.formalSaved = true
          this.navigateAfterUpload = false
          uni.showToast({ title: '资料已正式保存', icon: 'success' })
          setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 350)
        },
        fail: () => uni.showToast({ title: '无法连接资料服务', icon: 'none' }),
        complete: () => {
          this.uploading = false
        }
      })
    }
  }
}
</script>

<style scoped>
.page { box-sizing: border-box; height: 100vh; padding: 24px; background: #F3E4C9; color: #2E1D0E; overflow: hidden; }
.top-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.back-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border: 4px solid #2E1D0E; background: #FFFAF1; box-shadow: 4px 4px 0 #2E1D0E26; cursor: pointer; }
.top-title { font-size: 18px; font-weight: 900; }.spacer { width: 44px; }
.upload-workspace { height: calc(100vh - 96px); display: grid; grid-template-columns: minmax(420px, 1fr) minmax(360px, .9fr); gap: 20px; }
.upload-card { box-sizing: border-box; min-width: 0; height: 100%; padding: 24px; border: 4px solid #2E1D0E; background: #FFFAF1; box-shadow: 7px 7px 0 #2E1D0E26; overflow-y: auto; }
.field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; }.label { font-size: 13px; font-weight: 900; }
.input, .textarea { box-sizing: border-box; width: 100%; border: 3px solid #C0B5A0; border-radius: 0; background: #fff; color: #2E1D0E; font-size: 14px; outline: none; }
.input { height: 42px; padding: 0 10px; display: flex; align-items: center; }
.input :deep(.uni-input-input) { width: 100%; height: 36px; line-height: 36px; box-sizing: border-box; font-size: 14px; color: #2E1D0E; }
.input :deep(.uni-input-placeholder) { line-height: 36px; color: #8C7B5E; }
.input:focus-within, .textarea:focus-within { border-color: #2E1D0E; }.textarea { min-height: 100px; padding: 10px; }
.picker { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 26px; border: 3px dashed #8C7B5E; background: #F8EBD3; cursor: pointer; }
.picker.dragover { border-color: #2E1D0E; background: #E9D5B2; box-shadow: inset 0 0 0 3px #FFFAF1; transform: scale(1.01); }
.picker-icon { font-size: 30px; font-weight: 900; }.picker-title { font-size: 15px; font-weight: 900; }.picker-desc { color: #8C7B5E; font-size: 11px; text-align: center; }
.file-list { margin-top: 16px; }.file-card { margin-bottom: 8px; border: 2px solid #C0B5A0; background: #fff; }.file-card.archive { border-color: #8C6A3B; }.file-item { display: flex; align-items: center; gap: 10px; padding: 10px; background: #fff; }.extract-btn { flex-shrink: 0; padding: 6px 10px; border: 2px solid #6F2B18; background: #C85E36; color: #FFF9EE; box-shadow: 2px 2px 0 #6F2B1838; font-size: 9px; font-weight: 900; cursor: pointer; transition: transform .12s ease, background .12s ease, box-shadow .12s ease; }.extract-btn:hover { transform: translate(-1px,-1px); background: #B84B29; box-shadow: 3px 3px 0 #6F2B1850; }.extract-btn.busy { border-color: #9B8068; background: #B39A82; box-shadow: none; opacity: .75; cursor: wait; transform: none; }.extracted-list { padding: 0 8px 8px 28px; border-top: 1px dashed #C0B5A0; background: #FFF9EE; }.extracted-head { display: flex; align-items: center; justify-content: space-between; padding: 7px 4px 5px; color: #8C5A2E; font-size: 9px; font-weight: 900; }.extracted-head small { font-size: 8px; }.extracted-file { display: flex; align-items: center; gap: 8px; margin-top: 5px; padding: 6px 7px; border: 1px solid #D7C49E; background: #fff; }.child-tree { flex-shrink: 0; color: #8C7B5E; font-size: 13px; }.child-badge { width: 35px; padding: 5px 1px; font-size: 8px; }
.file-badge { width: 42px; padding: 8px 2px; border: 2px solid #2E1D0E; text-align: center; font-size: 10px; font-weight: 900; }.file-info { flex: 1; min-width: 0; }.file-name, .file-size { display: block; }.file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 800; }.file-size { color: #8C7B5E; font-size: 10px; }.file-remove { padding: 5px 9px; color: #C0392B; font-size: 20px; cursor: pointer; }
.submit-btn { margin-top: 20px; padding: 12px; border: 3px solid #2E1D0E; background: #2E1D0E; color: #FFFAF1; text-align: center; font-weight: 900; cursor: pointer; }.submit-btn.disabled { opacity: .4; cursor: not-allowed; }
.recent-card { box-sizing: border-box; min-width: 0; height: 100%; display: flex; flex-direction: column; border: 4px solid #2E1D0E; background: #FFFAF1; box-shadow: 7px 7px 0 #2E1D0E26; overflow: hidden; }
.recent-head { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 3px solid #2E1D0E; background: #E9D5B2; }.recent-title, .recent-subtitle { display: block; }.recent-title { font-size: 16px; font-weight: 900; }.recent-subtitle { margin-top: 3px; color: #8C7B5E; font-size: 10px; }.refresh-btn { padding: 5px 10px; border: 2px solid #2E1D0E; background: #FFFAF1; font-size: 10px; font-weight: 900; cursor: pointer; }
.pending-section { flex-shrink: 0; max-height: 42%; padding: 10px 12px; border-bottom: 3px solid #2E1D0E; background: #FFF3D9; overflow-y: auto; }.pending-section.expanded { flex: 1; min-height: 0; max-height: none; border-bottom: 0; }.pending-head { position: sticky; top: -10px; z-index: 2; display: flex; align-items: center; justify-content: space-between; margin: -10px -12px 7px; padding: 10px 12px 7px; border-bottom: 1px solid #D7C49E; background: #FFF3D9; color: #8C5A2E; font-size: 11px; font-weight: 900; }.pending-section .file-list { margin-top: 0; }.pending-section .file-item { padding: 7px; }.pending-label { flex-shrink: 0; padding: 3px 5px; border: 1px solid #B18442; background: #F8E5C4; color: #8C5A2E; font-size: 8px; font-weight: 900; }
.file-status { width: 112px; flex-shrink: 0; display: flex; justify-content: flex-end; }.file-progress-wrap { width: 108px; display: flex; align-items: center; gap: 5px; }.file-progress-track { flex: 1; height: 9px; overflow: hidden; border: 1px solid #2E1D0E; background: #E6D9C3; }.file-progress-fill { height: 100%; background: linear-gradient(90deg, #C96B4B, #B18442); transition: width .12s linear; }.file-progress-percent { width: 28px; color: #8C5A2E; text-align: right; font-size: 8px; font-weight: 900; }.pending-label.uploaded { border-color: #4E7C74; background: #E3F0E7; color: #2F695D; }.pending-label.failed { border-color: #B83A32; background: #F8DFDA; color: #B83A32; }
.upload-progress { margin-bottom: 9px; padding: 8px; border: 2px solid #C0B5A0; background: #fff; }.upload-progress-track { height: 12px; overflow: hidden; border: 2px solid #2E1D0E; background: #E6D9C3; }.upload-progress-fill { height: 100%; background: linear-gradient(90deg, #C96B4B, #B18442); transition: width .18s ease; }.upload-progress-text { display: block; margin-top: 5px; color: #2E1D0E; text-align: right; font-size: 9px; font-weight: 900; }
.recent-scroll { flex: 1; min-height: 0; padding: 12px; box-sizing: border-box; }.recent-empty { padding: 70px 15px; color: #8C7B5E; text-align: center; font-size: 13px; font-weight: 800; }.recent-batch { margin-bottom: 12px; padding: 12px; border: 2px solid #C0B5A0; background: #FDF8EE; }.batch-head { display: flex; align-items: center; gap: 9px; }.batch-icon { font-size: 24px; }.batch-info { flex: 1; min-width: 0; }.batch-title, .batch-time { display: block; }.batch-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 900; }.batch-time { margin-top: 2px; color: #8C7B5E; font-size: 9px; }.batch-count { min-width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border: 2px solid #2E1D0E; border-radius: 50%; background: #C96B4B; color: #fff; font-size: 9px; font-weight: 900; }.batch-desc { display: block; margin: 9px 0; color: #5E4C35; font-size: 10px; line-height: 1.5; }.recent-files { display: flex; flex-direction: column; gap: 6px; margin-top: 9px; }.recent-file { display: flex; align-items: center; gap: 7px; padding: 7px; border: 2px solid #C0B5A0; background: #fff; color: #2E1D0E; text-decoration: none; }.recent-file-badge { width: 35px; padding: 5px 1px; border: 2px solid #2E1D0E; text-align: center; font-size: 8px; font-weight: 900; }.recent-file-info { min-width: 0; flex: 1; }.recent-file-name, .recent-file-size { display: block; }.recent-file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; font-weight: 800; }.recent-file-size { color: #8C7B5E; font-size: 8px; }.recent-file-open { color: #8C5A2E; font-size: 9px; font-weight: 900; }
.leave-mask { position: fixed; inset: 0; z-index: 80; background: rgba(23,16,10,.62); }.leave-dialog { position: fixed; left: 50%; top: 50%; z-index: 81; width: min(430px, calc(100vw - 34px)); transform: translate(-50%,-50%); border: 4px solid #2E1D0E; background: #FFFAF1; box-shadow: 8px 8px 0 #2E1D0E55; }.leave-title { padding: 18px 20px 10px; font-size: 19px; font-weight: 900; }.leave-content { padding: 0 20px 20px; color: #6F5D45; font-size: 12px; line-height: 1.7; }.leave-actions { display: grid; grid-template-columns: 1fr 1fr; border-top: 3px solid #2E1D0E; }.leave-button { padding: 14px 8px; text-align: center; font-size: 13px; font-weight: 900; cursor: pointer; }.leave-button + .leave-button { border-left: 3px solid #2E1D0E; }.leave-button.discard { background: #FFFAF1; color: #A43D30; }.leave-button.save { background: #2E1D0E; color: #fff; }
@media (max-width: 900px) { .page { height: auto; min-height: 100vh; overflow: auto; padding: 14px; }.upload-workspace { height: auto; grid-template-columns: 1fr; }.upload-card, .recent-card { height: auto; min-height: 520px; }.upload-card { padding: 16px; }.recent-card { max-height: 620px; } }
</style>
