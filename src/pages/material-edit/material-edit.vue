<template>
  <view class="page">
    <view class="top-bar">
      <view class="back-btn" @click="goBack">◀</view>
      <view class="top-copy"><text>修改组会资料</text><small>原有附件与本次新增附件分开管理</small></view>
      <view class="spacer"></view>
    </view>

    <view v-if="loading" class="state-box">正在读取原资料…</view>
    <view v-else class="edit-workspace">
      <view class="form-card">
        <view class="field"><text>资料标题</text><input v-model="title" class="input" maxlength="120" /></view>
        <view class="field"><text>资料说明</text><textarea v-model="description" class="textarea" maxlength="5000"></textarea></view>
        <!-- #ifdef H5 -->
        <div class="picker material-edit-picker" :class="{ dragover: isDragOver }" @click="chooseFiles" @dragenter.stop.prevent="isDragOver = true" @dragover.stop.prevent="isDragOver = true" @dragleave.stop.prevent="onDragLeave" @drop.stop.prevent="onDrop">
          <strong>＋</strong><text>点击选择或拖入需要新增的文件</text><small>新文件会在保存修改时上传</small>
        </div>
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <view class="picker" @click="chooseFiles">
          <strong>＋</strong><text>点击选择需要新增的文件</text><small>新文件会在保存修改时上传</small>
        </view>
        <!-- #endif -->
        <view class="form-actions">
          <view class="cancel-btn" @click="goBack">取消</view>
          <view class="save-btn" :class="{ disabled: saving || totalFileCount === 0 }" @click="saveChanges">{{ saving ? '保存中…' : '保存修改' }}</view>
        </view>
      </view>

      <view class="files-card">
        <view class="file-section original-section">
          <view class="section-head"><view><strong>原有附件</strong><small>进入修改页面时已有的文件</small></view><text>{{ existingFiles.length }} 个</text></view>
          <scroll-view class="file-scroll" scroll-y>
            <view v-if="existingFiles.length === 0" class="empty">原有附件已全部移除</view>
            <view v-for="(file,index) in existingFiles" :key="file.id || file.name" class="file-row">
              <view class="badge">{{ extension(file.name) }}</view>
              <view class="file-info"><strong>{{ file.name }}</strong><small>{{ formatSize(file.size) }}</small></view>
              <view class="remove" @click="existingFiles.splice(index,1)">删除</view>
            </view>
          </scroll-view>
        </view>

        <view class="file-section new-section">
          <view class="section-head"><view><strong>本次新增附件</strong><small>尚未保存到这张资料卡片</small></view><text>{{ newFiles.length }} 个</text></view>
          <scroll-view class="file-scroll" scroll-y>
            <view v-if="newFiles.length === 0" class="empty">还没有加入新文件</view>
            <view v-for="(file,index) in newFiles" :key="file.localId" class="file-row">
              <view class="badge">{{ extension(file.name) }}</view>
              <view class="file-info"><strong>{{ file.name }}</strong><small>{{ formatSize(file.size) }}</small></view>
              <view v-if="file.status === 'uploading'" class="progress"><view><i :style="{width:file.progress+'%'}"></i></view><small>{{ file.progress }}%</small></view>
              <view v-else class="remove" @click="newFiles.splice(index,1)">移除</view>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>

    <view v-if="showLeaveDialog" class="dialog-mask"></view>
    <view v-if="showLeaveDialog" class="dialog">
      <strong>放弃本次修改？</strong><text>标题、说明和附件调整都不会保存。</text>
      <view><button @click="showLeaveDialog=false">继续修改</button><button class="danger" @click="discardAndLeave">放弃修改</button></view>
    </view>
  </view>
</template>

<script>
import { isLogin } from '@/store/auth.js'
import { apiUrl } from '@/utils/api.js'

export default {
  data() {
    return { materialId: 0, title: '', description: '', existingFiles: [], newFiles: [], loading: true, saving: false, isDragOver: false, showLeaveDialog: false, initialState: '' }
  },
  computed: {
    totalFileCount() { return this.existingFiles.length + this.newFiles.length },
    currentState() { return JSON.stringify({ title: this.title, description: this.description, files: this.existingFiles.map(file => file.name), newFiles: this.newFiles.map(file => `${file.name}:${file.size}`) }) },
    changed() { return !!this.initialState && this.currentState !== this.initialState }
  },
  onLoad(options = {}) {
    if (!isLogin()) return uni.redirectTo({ url: '/pages/login/login' })
    this.materialId = Number(options.id) || 0
    this.loadMaterial()
  },
  onBackPress() {
    if (this.changed) { this.showLeaveDialog = true; return true }
    return false
  },
  methods: {
    loadMaterial() {
      if (!this.materialId) return this.leavePage()
      uni.request({
        url: apiUrl(`/api/materials/${this.materialId}/edit`),
        header: { Authorization: 'Bearer ' + uni.getStorageSync('token') },
        success: response => {
          if (!response.data || response.data.code !== 200) {
            uni.showToast({ title: (response.data && response.data.message) || '无法读取资料', icon: 'none' })
            return setTimeout(() => this.leavePage(), 700)
          }
          const material = response.data.data
          this.title = material.title || ''
          this.description = material.description || ''
          this.existingFiles = (material.files || []).map(file => ({ ...file }))
          this.$nextTick(() => { this.initialState = this.currentState })
        },
        fail: () => { uni.showToast({ title: '无法连接资料服务', icon: 'none' }); setTimeout(() => this.leavePage(), 700) },
        complete: () => { this.loading = false }
      })
    },
    goBack() {
      if (this.changed) { this.showLeaveDialog = true; return }
      this.leavePage()
    },
    leavePage() {
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
      if (pages.length > 1) uni.navigateBack({ delta: 1 })
      else uni.reLaunch({ url: '/pages/index/index' })
    },
    discardAndLeave() { this.showLeaveDialog = false; this.initialState = ''; this.leavePage() },
    chooseFiles() {
      // #ifdef H5
      const input = document.createElement('input')
      input.type = 'file'; input.multiple = true
      input.onchange = event => this.addFiles(Array.from(event.target.files || []))
      input.click()
      // #endif
      // #ifndef H5
      uni.chooseFile({ count: 9, success: res => this.addFiles(res.tempFiles || []) })
      // #endif
    },
    onDragLeave(event) {
      const current = event.currentTarget
      if (!current || !current.contains(event.relatedTarget)) this.isDragOver = false
    },
    onDrop(event) {
      this.isDragOver = false
      const transfer = event.dataTransfer || (event.detail && event.detail.dataTransfer) || (event.originalEvent && event.originalEvent.dataTransfer)
      if (transfer) this.addFiles(Array.from(transfer.files || []), true)
    },
    addFiles(files, fromDrop = false) {
      const before = this.newFiles.length
      const keys = new Set(this.newFiles.map(file => `${file.name}:${file.size}:${file.lastModified || 0}`))
      ;(files || []).forEach(file => {
        const key = `${file.name}:${file.size}:${file.lastModified || 0}`
        if (keys.has(key)) return
        keys.add(key)
        this.newFiles.push({ localId: `${Date.now()}_${Math.random()}`, raw: file, name: file.name || '未命名文件', size: Number(file.size) || 0, lastModified: file.lastModified || 0, status: 'pending', progress: 0 })
      })
      if (fromDrop) {
        const added = this.newFiles.length - before
        uni.showToast({ title: added ? `已加入 ${added} 个文件` : '没有检测到新文件', icon: 'none' })
      }
    },
    extension(name) { const ext = String(name || '').split('.').pop().toUpperCase(); return ext && ext.length <= 5 ? ext : 'FILE' },
    formatSize(size) { const value = Number(size) || 0; if (value < 1024) return value + ' B'; if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB'; return (value / 1024 / 1024).toFixed(1) + ' MB' },
    saveChanges() {
      if (this.saving) return
      if (!this.title.trim()) return uni.showToast({ title: '请填写资料标题', icon: 'none' })
      if (!this.totalFileCount) return uni.showToast({ title: '资料至少需要一个附件', icon: 'none' })
      const form = new FormData()
      form.append('title', this.title.trim())
      form.append('description', this.description.trim())
      form.append('keepFiles', JSON.stringify(this.existingFiles.map(file => file.name)))
      this.newFiles.forEach(file => { file.status = 'uploading'; file.progress = 0; form.append('files', file.raw, file.name) })
      this.saving = true
      const request = new XMLHttpRequest()
      request.open('PUT', apiUrl(`/api/materials/${this.materialId}`))
      request.setRequestHeader('Authorization', 'Bearer ' + uni.getStorageSync('token'))
      request.upload.onprogress = event => {
        if (!event.lengthComputable || !event.total) return
        const value = Math.min(99, Math.round(event.loaded / event.total * 100))
        this.newFiles.forEach(file => { file.progress = value })
      }
      request.onerror = () => this.finishSaveError('网络连接失败')
      request.onload = () => {
        try {
          const result = JSON.parse(request.responseText || '{}')
          if (result.code !== 200) return this.finishSaveError(result.message || '保存失败')
          this.newFiles.forEach(file => { file.status = 'uploaded'; file.progress = 100 })
          this.initialState = ''
          uni.showToast({ title: '修改已保存', icon: 'success' })
          setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 350)
        } catch { this.finishSaveError('服务器返回数据异常') }
      }
      request.onloadend = () => { this.saving = false }
      request.send(form)
    },
    finishSaveError(message) { this.newFiles.forEach(file => { file.status = 'failed'; file.progress = 0 }); this.saving = false; uni.showToast({ title: message, icon: 'none' }) }
  }
}
</script>

<style scoped>
.page{box-sizing:border-box;height:100vh;padding:22px;background:#F3E4C9;color:#2E1D0E;overflow:hidden}.top-bar{height:54px;display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.back-btn{width:42px;height:42px;display:flex;align-items:center;justify-content:center;border:3px solid #2E1D0E;background:#FFFAF1;box-shadow:4px 4px 0 #2E1D0E25;cursor:pointer}.spacer{width:42px}.top-copy{text-align:center}.top-copy text,.top-copy small{display:block}.top-copy text{font-size:19px;font-weight:900}.top-copy small{margin-top:3px;color:#8C7B5E;font-size:10px}.state-box{padding:100px;text-align:center;font-weight:900}.edit-workspace{height:calc(100vh - 94px);display:grid;grid-template-columns:minmax(390px,.85fr) minmax(480px,1.15fr);gap:18px}.form-card,.files-card{min-width:0;border:4px solid #2E1D0E;background:#FFFAF1;box-shadow:7px 7px 0 #2E1D0E22}.form-card{padding:22px;overflow-y:auto}.field{display:flex;flex-direction:column;gap:7px;margin-bottom:15px}.field>text{font-size:12px;font-weight:900}.input,.textarea{box-sizing:border-box;width:100%;border:3px solid #C0B5A0;background:#fff;color:#2E1D0E}.input{height:42px;padding:0 10px}.textarea{height:130px;padding:10px}.picker{display:flex;flex-direction:column;align-items:center;gap:6px;padding:28px 12px;border:3px dashed #8C7B5E;background:#F8EBD3;cursor:pointer}.picker.dragover{background:#E9D5B2;border-color:#2E1D0E}.picker strong{font-size:30px}.picker text{font-size:13px;font-weight:900}.picker small{color:#8C7B5E;font-size:10px}.form-actions{display:grid;grid-template-columns:.35fr .65fr;gap:10px;margin-top:18px}.cancel-btn,.save-btn{padding:11px;border:3px solid #2E1D0E;text-align:center;font-size:12px;font-weight:900;cursor:pointer}.cancel-btn{background:#FFFAF1}.save-btn{background:#2E1D0E;color:#fff}.save-btn.disabled{opacity:.45}.files-card{display:grid;grid-template-rows:1fr 1fr;min-height:0;overflow:hidden}.file-section{min-height:0;display:flex;flex-direction:column}.original-section{border-bottom:4px solid #2E1D0E}.section-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:2px solid #C0B5A0;background:#E9D5B2}.section-head strong,.section-head small{display:block}.section-head strong{font-size:14px}.section-head small{margin-top:2px;color:#8C7B5E;font-size:9px}.section-head>text{min-width:28px;padding:4px;border:2px solid #2E1D0E;background:#FFFAF1;text-align:center;font-size:10px;font-weight:900}.new-section .section-head{background:#F8EBD3}.file-scroll{flex:1;min-height:0;padding:9px;box-sizing:border-box}.file-row{display:flex;align-items:center;gap:9px;margin-bottom:7px;padding:8px;border:2px solid #C0B5A0;background:#fff}.badge{width:38px;padding:6px 1px;border:2px solid #2E1D0E;text-align:center;font-size:8px;font-weight:900}.file-info{min-width:0;flex:1}.file-info strong,.file-info small{display:block}.file-info strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.file-info small{margin-top:2px;color:#8C7B5E;font-size:8px}.remove{padding:5px 8px;border:1px solid #A43D30;color:#A43D30;font-size:9px;font-weight:900;cursor:pointer}.empty{padding:45px 12px;color:#8C7B5E;text-align:center;font-size:11px;font-weight:800}.progress{width:105px}.progress>view{height:8px;border:1px solid #2E1D0E;background:#E6D9C3}.progress i{display:block;height:100%;background:#4E7C74}.progress small{display:block;margin-top:2px;text-align:right;font-size:8px}.dialog-mask{position:fixed;inset:0;z-index:80;background:rgba(23,16,10,.62)}.dialog{position:fixed;left:50%;top:50%;z-index:81;width:min(420px,calc(100vw - 32px));transform:translate(-50%,-50%);border:4px solid #2E1D0E;background:#FFFAF1;box-shadow:8px 8px 0 #2E1D0E55}.dialog>strong,.dialog>text{display:block}.dialog>strong{padding:18px 20px 8px;font-size:18px}.dialog>text{padding:0 20px 18px;color:#6F5D45;font-size:12px}.dialog>view{display:grid;grid-template-columns:1fr 1fr;border-top:3px solid #2E1D0E}.dialog button{border:0;border-radius:0;background:#fff;padding:13px;font-weight:900}.dialog button+button{border-left:3px solid #2E1D0E}.dialog .danger{color:#A43D30}@media(max-width:900px){.page{height:auto;min-height:100vh;overflow:auto}.edit-workspace{height:auto;grid-template-columns:1fr}.form-card{min-height:520px}.files-card{height:720px}}
</style>
