<template>
  <view class="page">
    <view class="topbar">
      <view class="back" @click="goBack">←</view>
      <view class="title-block"><text>论文协作</text><small>共同收集 · 实时共享</small></view>
      <view class="sync" @click="loadSpace">{{ loading ? '同步中…' : '↻ 同步' }}</view>
      <view class="help-wrap" @mouseenter="helpHover=true" @mouseleave="helpHover=false">
        <view class="help-button" @click.stop="helpPinned=!helpPinned">？</view>
        <view v-if="helpHover || helpPinned" class="help-popover" @click.stop="noop">
          <view class="help-title"><text>论文协作说明书</text><view @click="helpPinned=false;helpHover=false">×</view></view>
          <view class="help-item"><strong>1. 加入协作</strong><small>未加入时可查看和下载；点击左侧“+”后可上传、编辑和归类。退出页面后头像自动消失。</small></view>
          <view class="help-item"><strong>2. 上传论文</strong><small>电脑可直接拖入多篇文件，手机点击“上传论文”。单个文件最大 100MB。</small></view>
          <view class="help-item"><strong>3. 整理论文</strong><small>可点击分类文字，或把论文拖到其他分类。分类支持新建、改名和删除。</small></view>
          <view class="help-item"><strong>4. 删除论文</strong><small>把论文拖进左下角垃圾桶，确认后会从共享空间和服务器中删除。</small></view>
          <view class="help-item"><strong>5. 分类下载</strong><small>一键下载会按分类生成文件夹，并以低负载流式方式打成 ZIP。</small></view>
        </view>
      </view>
    </view>

    <view class="workspace">
      <aside class="project-panel">
        <text class="eyebrow">COLLABORATION</text>
        <text class="project-title">{{ space.name || '论文收集' }}</text>
        <text class="project-desc">{{ space.description || '把值得讨论的论文集中到一个地方。' }}</text>

        <view class="member-heading"><text>协作成员</text><small>{{ members.length }} 人</small></view>
        <view class="member-stack">
          <view v-for="member in members" :key="member.id" class="member" :title="displayName(member)">
            <image v-if="member.avatarUrl" :src="member.avatarUrl" mode="aspectFill" />
            <text v-else>{{ initials(member) }}</text>
            <view v-if="canRemoveMember(member)" class="member-remove" title="移除成员" @click.stop="confirmRemoveMember(member)">×</view>
          </view>
          <view v-if="!canEdit" class="member add" title="加入当前协作" @click="joinPresence">+</view>
        </view>
        <view class="invite-tip">{{ canEdit ? '你已加入当前协作，可以上传、改名和归类；退出页面后会自动离开。' : '当前为只读查看。点击“+”加入后才能上传、编辑和归类。' }}</view>

        <view class="stats">
          <view><strong>{{ papers.length }}</strong><small>论文</small></view>
          <view><strong>{{ totalSize }}</strong><small>共享文件</small></view>
        </view>
        <view
          v-if="canEdit"
          class="trash-drop"
          :class="{ active: trashDragActive }"
          @dragover.prevent="onTrashDragOver"
          @dragleave.prevent="trashDragActive=false"
          @drop.prevent.stop="onTrashDrop"
        >
          <text>♲</text>
          <view><strong>垃圾桶</strong><small>拖入论文删除</small></view>
        </view>
      </aside>

      <main
        class="content"
        :class="{ 'drag-active': isDragOver }"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDropPaper"
      >
        <view v-if="isDragOver" class="drop-overlay">
          <view class="drop-card"><strong>松开即可共享</strong><small>论文会直接加入协作列表</small></view>
        </view>
        <view class="hero">
          <view><text>共享论文库</text><small>PDF、Word、压缩包等文件，单个最大 100MB</small></view>
          <view class="hero-actions">
            <view class="download-all" :class="{ disabled: !papers.length }" @click="downloadCategorized">⇩ 下载分类压缩包</view>
            <view class="upload-button" :class="{ disabled: !canEdit }" @click="choosePaper">{{ canEdit ? '＋ 上传论文' : '只读查看' }}</view>
          </view>
        </view>
        <view v-if="uploading" class="progress"><view :style="{ width: uploadProgress + '%' }"></view><text>{{ uploadStatus || (uploadProgress + '%') }}</text></view>

        <view class="filters">
          <input v-model="keyword" class="search" placeholder="搜索标题、作者或上传者…" />
          <view class="count">共 {{ filteredPapers.length }} 篇</view>
        </view>
        <view v-if="canEdit" class="category-toolbar">
          <view @click="createCategory">＋ 新建分类</view>
          <small>最多 20 个分类，可拖动论文归类</small>
        </view>
        <view v-if="!loading && !filteredPapers.length && keyword" class="empty">
          <text>这里还没有论文</text>
          <small>没有找到符合搜索条件的论文。</small>
        </view>
        <view v-for="group in groupedPapers" :key="group.category" class="category-section" :class="{ 'paper-drag-target': dragTargetCategory === group.category }" @dragover.prevent="onCategoryDragOver(group.category, $event)" @dragleave.prevent="dragTargetCategory = ''" @drop.prevent.stop="onCategoryDrop(group.category, $event)">
          <view class="category-heading">
            <view class="category-title-row">
              <text>{{ group.category }}</text>
              <view v-if="canEdit" class="category-edit" @click="editCategory(group)">编辑</view>
              <view v-if="canEdit && categoryItems.length > 1" class="category-delete" @click="confirmDeleteCategory(group)">删除</view>
            </view>
            <small>{{ group.papers.length }} 篇</small>
          </view>
          <view v-if="!group.papers.length" class="category-empty">暂无论文</view>
          <view v-else class="paper-head"><text>论文</text><text>调整分类</text><text>上传者</text><text>时间</text><text>操作</text></view>
          <view v-for="paper in group.papers" :key="paper.id" class="paper-row" :class="{ draggable: canEdit }" :draggable="canEdit" @dragstart="onPaperDragStart(paper, $event)" @dragend="onPaperDragEnd">
            <view class="paper-main">
              <view class="file-icon">{{ extension(paper.filename) }}</view>
              <view class="paper-text">
                <text>{{ paper.title }}</text>
                <small>{{ paper.authors || paper.filename }} · {{ formatSize(paper.fileSize) }}</small>
                <small v-if="paper.note" class="note">{{ paper.note }}</small>
              </view>
            </view>
            <view v-if="canEdit" class="direct-categories">
              <view
                v-for="category in categories"
                :key="category"
                :class="{ active: (paper.category || '未分类') === category }"
                @click="changeCategoryDirect(paper, category)"
              >{{ category }}</view>
            </view>
            <view v-else class="readonly-category">{{ paper.category || '未分类' }}</view>
            <view class="uploader">
              <view class="tiny-avatar">
                <image v-if="paper.uploader.avatarUrl" :src="paper.uploader.avatarUrl" mode="aspectFill" />
                <text v-else>{{ initials(paper.uploader) }}</text>
              </view>
              <text>{{ displayName(paper.uploader) }}</text>
            </view>
            <text class="time">{{ formatTime(paper.createdAt) }}</text>
            <view class="download" @click="downloadPaper(paper)">下载</view>
          </view>
        </view>
      </main>
    </view>

    <view v-if="inviteOpen" class="mask" @click="inviteOpen=false"></view>
    <view v-if="inviteOpen" class="dialog">
      <view class="dialog-head"><text>加入协作成员</text><view @click="inviteOpen=false">×</view></view>
      <input v-model="userKeyword" class="dialog-search" placeholder="输入用户名或昵称" @input="searchUsers" />
      <scroll-view class="user-list" scroll-y>
        <view v-for="user in candidateUsers" :key="user.id" class="user-row">
          <view class="member">
            <image v-if="user.avatarUrl" :src="user.avatarUrl" mode="aspectFill" />
            <text v-else>{{ initials(user) }}</text>
          </view>
          <view class="user-name"><text>{{ displayName(user) }}</text><small>@{{ user.username }}</small></view>
          <view v-if="isMember(user.id)" class="joined">已加入</view>
          <view v-else class="join" @click="addMember(user)">＋ 加入</view>
        </view>
        <view v-if="!candidateUsers.length" class="user-empty">没有找到可加入的账号</view>
      </scroll-view>
    </view>

    <view v-if="uploadOpen" class="mask" @click="uploadOpen=false"></view>
    <view v-if="uploadOpen" class="dialog upload-dialog">
      <view class="dialog-head"><text>上传论文</text><view @click="uploadOpen=false">×</view></view>
      <view class="selected-file"><strong>{{ selectedFile && selectedFile.name }}</strong><small>{{ selectedFile ? formatSize(selectedFile.size) : '' }}</small></view>
      <text class="label">论文标题</text><input v-model="paperForm.title" class="field" placeholder="默认使用文件名" />
      <text class="label">作者</text><input v-model="paperForm.authors" class="field" placeholder="例如：Zhang San, Li Si" />
      <text class="label">备注</text><textarea v-model="paperForm.note" class="textarea" placeholder="推荐理由、阅读重点或讨论问题（选填）" />
      <view class="submit" :class="{ disabled: uploading }" @click="submitPaper">{{ uploading ? '上传中…' : '确认共享' }}</view>
    </view>
  </view>
</template>

<script>
import { apiUrl } from '@/utils/api.js'
import { getToken, getUser, clearAuth } from '@/store/auth.js'

export default {
  data() {
    return { space: {}, members: [], papers: [], loading: false, keyword: '', categoryItems: [], canEdit: false, helpHover: false, helpPinned: false, trashDragActive: false, inviteOpen: false, userKeyword: '', candidateUsers: [], uploadOpen: false, selectedFile: null, paperForm: { title: '', authors: '', note: '' }, uploading: false, uploadProgress: 0, uploadStatus: '', isDragOver: false, dragDepth: 0, draggedPaperId: null, dragTargetCategory: '', poller: null, heartbeat: null }
  },
  computed: {
    categories() {
      return this.categoryItems.length ? this.categoryItems.map(item => item.name) : ['未分类', '待阅读', '重点精读', '方法参考', '已归档']
    },
    filteredPapers() {
      const q = this.keyword.trim().toLowerCase()
      return this.papers.filter(p => !q || [p.title, p.authors, p.filename, p.uploader.nickname, p.uploader.username].join(' ').toLowerCase().includes(q))
    },
    groupedPapers() {
      return this.categories.map(category => ({
        category,
        papers: this.filteredPapers.filter(paper => (paper.category || '未分类') === category)
      }))
    },
    totalSize() { return this.formatSize(this.papers.reduce((sum, paper) => sum + Number(paper.fileSize || 0), 0)) }
  },
  onLoad() { this.loadInitial() },
  onShow() { if (this.space.id) this.loadSpace(false) },
  onHide() { this.leavePresence() },
  onUnload() { clearInterval(this.poller); clearInterval(this.heartbeat); this.leavePresence(true) },
  methods: {
    noop() {},
    request(options) {
      return new Promise((resolve, reject) => uni.request({ ...options, header: { Authorization: 'Bearer ' + getToken(), ...(options.header || {}) }, success: res => {
        if (res.statusCode === 401 || (res.data && res.data.code === 401)) {
          clearAuth(); uni.redirectTo({ url: '/pages/login/login' }); return reject(new Error('登录已过期，请重新登录'))
        }
        return res.data && res.data.code === 200 ? resolve(res.data.data || {}) : reject(new Error((res.data && res.data.message) || '请求失败'))
      }, fail: reject }))
    },
    async loadInitial() {
      if (!getToken()) return uni.redirectTo({ url: '/pages/login/login' })
      try {
        const data = await this.request({ url: apiUrl('/api/collaboration/spaces') })
        this.space = data.spaces[0] || {}
        await this.loadSpace()
        this.poller = setInterval(() => this.loadSpace(false), 15000)
      } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) }
    },
    async loadSpace(showLoading = true) {
      if (!this.space.id) return
      if (showLoading) this.loading = true
      try {
        const data = await this.request({ url: apiUrl('/api/collaboration/spaces/' + this.space.id) })
        this.space = data.space; this.members = data.members; this.papers = data.papers
        this.categoryItems = data.categories || []
        this.canEdit = !!data.canEdit
      } catch (error) { if (showLoading) uni.showToast({ title: error.message, icon: 'none' }) }
      finally { this.loading = false }
    },
    goBack() { uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) }) },
    displayName(user) { return (user && (user.nickname || user.username)) || '成员' },
    initials(user) { return this.displayName(user).slice(0, 2).toUpperCase() },
    isMember(id) { return this.members.some(member => Number(member.id) === Number(id)) },
    async joinPresence() {
      try {
        await this.request({ url: apiUrl(`/api/collaboration/spaces/${this.space.id}/presence`), method: 'POST' })
        this.canEdit = true
        clearInterval(this.heartbeat)
        this.heartbeat = setInterval(() => {
          this.request({ url: apiUrl(`/api/collaboration/spaces/${this.space.id}/presence`), method: 'POST' }).catch(() => {})
        }, 20000)
        await this.loadSpace(false)
        uni.showToast({ title: '已加入协作', icon: 'success' })
      } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) }
    },
    leavePresence(keepalive = false) {
      if (!this.canEdit || !this.space.id || !getToken()) return
      this.canEdit = false
      clearInterval(this.heartbeat)
      // #ifdef H5
      fetch(apiUrl(`/api/collaboration/spaces/${this.space.id}/presence`), {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + getToken() },
        keepalive
      }).catch(() => {})
      // #endif
    },
    canRemoveMember(member) {
      const user = getUser()
      return !!(user && Number(this.space.owner_id) === Number(user.id) && Number(member.id) !== Number(this.space.owner_id))
    },
    confirmRemoveMember(member) {
      uni.showModal({
        title: '移除协作成员',
        content: `确定将“${this.displayName(member)}”移出论文收集吗？其已上传的论文会保留。`,
        confirmText: '移除',
        confirmColor: '#B83A32',
        success: result => { if (result.confirm) this.removeMember(member) }
      })
    },
    async removeMember(member) {
      try {
        await this.request({ url: apiUrl(`/api/collaboration/spaces/${this.space.id}/members/${member.id}`), method: 'DELETE' })
        uni.showToast({ title: '成员已移除', icon: 'success' })
        await this.loadSpace()
      } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) }
    },
    categoryIndex(category) {
      const index = this.categories.indexOf(category || '未分类')
      return index < 0 ? 0 : index
    },
    async changeCategoryDirect(paper, category) {
      if (!this.canEdit) return uni.showToast({ title: '请先加入协作', icon: 'none' })
      if (!category || category === paper.category) return
      const previous = paper.category
      paper.category = category
      try {
        await this.request({ url: apiUrl(`/api/collaboration/papers/${paper.id}/category`), method: 'PATCH', header: { 'Content-Type': 'application/json' }, data: { category } })
        uni.showToast({ title: '分类已更新', icon: 'success' })
      } catch (error) {
        paper.category = previous
        uni.showToast({ title: error.message, icon: 'none' })
      }
    },
    editCategory(group) {
      if (!this.canEdit) return
      const item = this.categoryItems.find(category => category.name === group.category)
      if (!item) return
      uni.showModal({
        title: '修改分类名称',
        editable: true,
        placeholderText: group.category,
        content: group.category,
        confirmText: '保存',
        success: result => {
          if (result.confirm) this.renameCategory(item, String(result.content || '').trim())
        }
      })
    },
    createCategory() {
      if (!this.canEdit) return
      uni.showModal({
        title: '新建分类',
        editable: true,
        placeholderText: '请输入分类名称',
        confirmText: '创建',
        success: result => {
          if (result.confirm) this.saveNewCategory(String(result.content || '').trim())
        }
      })
    },
    async saveNewCategory(name) {
      if (!name) return uni.showToast({ title: '请输入分类名称', icon: 'none' })
      try {
        await this.request({ url: apiUrl(`/api/collaboration/spaces/${this.space.id}/categories`), method: 'POST', header: { 'Content-Type': 'application/json' }, data: { name } })
        await this.loadSpace(false)
        uni.showToast({ title: '分类已创建', icon: 'success' })
      } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) }
    },
    confirmDeleteCategory(group) {
      const item = this.categoryItems.find(category => category.name === group.category)
      if (!item) return
      const fallback = this.categoryItems.find(category => Number(category.id) !== Number(item.id))
      uni.showModal({
        title: '删除分类',
        content: group.papers.length
          ? `“${group.category}”中有 ${group.papers.length} 篇论文。删除后将自动移动到“${fallback ? fallback.name : '其他分类'}”。`
          : `确定删除空分类“${group.category}”吗？`,
        confirmText: '删除',
        confirmColor: '#B83A32',
        success: result => { if (result.confirm) this.deleteCategory(item) }
      })
    },
    async deleteCategory(item) {
      try {
        const data = await this.request({ url: apiUrl(`/api/collaboration/spaces/${this.space.id}/categories/${item.id}`), method: 'DELETE' })
        await this.loadSpace(false)
        const moved = Number(data.movedCount || 0)
        uni.showToast({ title: moved ? `已删除，移动 ${moved} 篇` : '分类已删除', icon: 'success' })
      } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) }
    },
    async renameCategory(item, name) {
      if (!name || name === item.name) return
      try {
        await this.request({ url: apiUrl(`/api/collaboration/spaces/${this.space.id}/categories/${item.id}`), method: 'PATCH', header: { 'Content-Type': 'application/json' }, data: { name } })
        await this.loadSpace(false)
        uni.showToast({ title: '分类名称已更新', icon: 'success' })
      } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) }
    },
    onPaperDragStart(paper, event) {
      if (!this.canEdit) return
      this.draggedPaperId = paper.id
      if (event && event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('application/x-dbdwz-paper', String(paper.id))
      }
    },
    onPaperDragEnd() {
      this.draggedPaperId = null
      this.dragTargetCategory = ''
      this.trashDragActive = false
    },
    onCategoryDragOver(category, event) {
      if (!this.canEdit || !this.draggedPaperId) return
      this.dragTargetCategory = category
      if (event && event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    },
    async onCategoryDrop(category, event) {
      if (!this.canEdit || !this.draggedPaperId) return
      const paper = this.papers.find(item => Number(item.id) === Number(this.draggedPaperId))
      this.onPaperDragEnd()
      if (paper) await this.changeCategoryDirect(paper, category)
    },
    onTrashDragOver(event) {
      if (!this.canEdit || !this.draggedPaperId) return
      this.trashDragActive = true
      if (event && event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    },
    onTrashDrop() {
      if (!this.canEdit || !this.draggedPaperId) return
      const paper = this.papers.find(item => Number(item.id) === Number(this.draggedPaperId))
      this.onPaperDragEnd()
      if (!paper) return
      uni.showModal({
        title: '删除论文',
        content: `确定删除“${paper.title}”吗？文件会从共享空间和服务器中删除，无法恢复。`,
        confirmText: '确认删除',
        confirmColor: '#B83A32',
        success: result => { if (result.confirm) this.deletePaper(paper) }
      })
    },
    async deletePaper(paper) {
      try {
        await this.request({ url: apiUrl(`/api/collaboration/papers/${paper.id}`), method: 'DELETE' })
        await this.loadSpace(false)
        uni.showToast({ title: '论文已删除', icon: 'success' })
      } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) }
    },
    async openInvite() { this.inviteOpen = true; this.userKeyword = ''; await this.searchUsers() },
    async searchUsers() {
      try { const data = await this.request({ url: apiUrl('/api/collaboration/users?q=' + encodeURIComponent(this.userKeyword)) }); this.candidateUsers = data.users }
      catch (error) { uni.showToast({ title: error.message, icon: 'none' }) }
    },
    async addMember(user) {
      try {
        await this.request({ url: apiUrl(`/api/collaboration/spaces/${this.space.id}/members`), method: 'POST', header: { 'Content-Type': 'application/json' }, data: { userId: user.id } })
        uni.showToast({ title: '已加入协作', icon: 'success' }); await this.loadSpace()
      } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) }
    },
    choosePaper() {
      if (!this.canEdit) return uni.showToast({ title: '请先点击“+”加入协作', icon: 'none' })
      const input = document.createElement('input'); input.type = 'file'; input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.zip'
      input.onchange = event => {
        const file = event.target.files && event.target.files[0]; if (!file) return
        this.preparePaper(file, false)
      }; input.click()
    },
    preparePaper(file, directUpload) {
      if (!file) return
      if (file.size > 100 * 1024 * 1024) return uni.showToast({ title: '单个文件不能超过 100MB', icon: 'none' })
      this.selectedFile = file
      this.paperForm = { title: file.name.replace(/\.[^.]+$/, ''), authors: '', note: '' }
      if (directUpload) this.submitPaper()
      else this.uploadOpen = true
    },
    onDragEnter() {
      if (this.uploading || this.draggedPaperId || !this.canEdit) return
      this.dragDepth += 1
      this.isDragOver = true
    },
    onDragOver(event) {
      if (this.uploading || this.draggedPaperId || !this.canEdit) return
      this.isDragOver = true
      if (event && event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    },
    onDragLeave() {
      this.dragDepth = Math.max(0, this.dragDepth - 1)
      if (this.dragDepth === 0) this.isDragOver = false
    },
    onDropPaper(event) {
      this.dragDepth = 0
      this.isDragOver = false
      if (this.draggedPaperId) return
      if (!this.canEdit) return uni.showToast({ title: '请先点击“+”加入协作', icon: 'none' })
      if (this.uploading) return uni.showToast({ title: '当前文件正在上传，请稍候', icon: 'none' })
      const files = event && event.dataTransfer && event.dataTransfer.files
      if (!files || !files.length) return
      this.uploadDroppedPapers(Array.from(files))
    },
    sendPaper(file, metadata, onProgress) {
      return new Promise((resolve, reject) => {
        const form = new FormData()
        form.append('file', file, file.name)
        Object.keys(metadata).forEach(key => form.append(key, metadata[key] || ''))
        const xhr = new XMLHttpRequest()
        xhr.open('POST', apiUrl(`/api/collaboration/spaces/${this.space.id}/papers`))
        xhr.setRequestHeader('Authorization', 'Bearer ' + getToken())
        xhr.upload.onprogress = event => { if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total) }
        xhr.onload = () => {
          let result = {}
          try { result = JSON.parse(xhr.responseText || '{}') } catch (e) {}
          if (xhr.status >= 200 && xhr.status < 300 && result.code === 200) resolve(result)
          else reject(new Error(result.message || `上传失败（${xhr.status}）`))
        }
        xhr.onerror = () => reject(new Error('网络连接失败'))
        xhr.send(form)
      })
    },
    async uploadDroppedPapers(files) {
      const validFiles = files.filter(file => {
        if (file.size <= 100 * 1024 * 1024) return true
        uni.showToast({ title: `${file.name} 超过 100MB，已跳过`, icon: 'none' })
        return false
      })
      if (!validFiles.length) return
      this.uploading = true
      this.uploadProgress = 0
      let successCount = 0
      const failed = []
      for (let index = 0; index < validFiles.length; index += 1) {
        const file = validFiles[index]
        this.uploadStatus = `正在上传 ${index + 1}/${validFiles.length}：${file.name}`
        try {
          await this.sendPaper(file, { title: file.name.replace(/\.[^.]+$/, ''), authors: '', note: '' }, ratio => {
            this.uploadProgress = Math.round(((index + ratio) / validFiles.length) * 100)
          })
          successCount += 1
        } catch (error) {
          failed.push(`${file.name}：${error.message}`)
        }
      }
      this.uploading = false
      this.uploadProgress = 100
      this.uploadStatus = ''
      await this.loadSpace()
      if (failed.length) uni.showModal({ title: `已上传 ${successCount} 篇，失败 ${failed.length} 篇`, content: failed.join('\n'), showCancel: false })
      else uni.showToast({ title: `已共享 ${successCount} 篇`, icon: 'success' })
    },
    async submitPaper() {
      if (!this.selectedFile || this.uploading) return
      this.uploading = true
      this.uploadProgress = 0
      this.uploadStatus = '正在上传 1/1'
      try {
        await this.sendPaper(this.selectedFile, this.paperForm, ratio => { this.uploadProgress = Math.round(ratio * 100) })
        this.uploadOpen = false
        this.selectedFile = null
        await this.loadSpace()
        uni.showToast({ title: '已共享', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error.message, icon: 'none' })
      } finally {
        this.uploading = false
        this.uploadStatus = ''
      }
    },
    downloadCategorized() {
      if (!this.papers.length) return uni.showToast({ title: '当前没有可下载的论文', icon: 'none' })
      window.open(apiUrl(`/api/collaboration/spaces/${this.space.id}/download?access_token=${encodeURIComponent(getToken())}`), '_blank')
    },
    downloadPaper(paper) { window.open(apiUrl(`/api/collaboration/papers/${paper.id}/file?access_token=${encodeURIComponent(getToken())}`), '_blank') },
    extension(name) { const ext = String(name || '').split('.').pop().slice(0, 4).toUpperCase(); return ext || 'FILE' },
    formatSize(bytes) { const n = Number(bytes || 0); if (n < 1024) return n + ' B'; if (n < 1048576) return (n / 1024).toFixed(1) + ' KB'; return (n / 1048576).toFixed(1) + ' MB' },
    formatTime(value) { const date = new Date(value); const now = new Date(); if (date.toDateString() === now.toDateString()) return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) }
  }
}
</script>

<style scoped>
.page{min-height:100vh;background:#f4ead7;color:#2e1d0e;font-family:Arial,"Microsoft YaHei",sans-serif}.topbar{height:72px;padding:0 26px;display:flex;align-items:center;gap:14px;border-bottom:3px solid #2e1d0e;background:#fffaf1}.back{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:2px solid #2e1d0e;cursor:pointer;font-weight:900}.title-block{display:flex;flex-direction:column}.title-block text{font-size:18px;font-weight:900}.title-block small{margin-top:2px;color:#8c7b5e;font-size:9px}.sync{margin-left:auto;padding:9px 13px;border:2px solid #2e1d0e;background:#ead7b7;font-size:10px;font-weight:900;cursor:pointer}.workspace{min-height:calc(100vh - 75px);display:grid;grid-template-columns:300px 1fr}.project-panel{padding:34px 26px;border-right:3px solid #2e1d0e;background:#ead7b7}.eyebrow{color:#9b5a37;font-size:9px;font-weight:900;letter-spacing:2px}.project-title{display:block;margin-top:10px;font-size:27px;font-weight:900}.project-desc{display:block;margin-top:8px;color:#6e5b42;font-size:11px;line-height:1.7}.member-heading{margin-top:36px;display:flex;justify-content:space-between;font-size:11px;font-weight:900}.member-heading small{color:#8c7b5e}.member-stack{margin-top:14px;display:flex;flex-wrap:wrap;gap:8px}.member,.tiny-avatar{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid #2e1d0e;background:#b86848;color:#fff;font-weight:900}.member{width:42px;height:42px;font-size:11px;overflow:visible}.member>image{overflow:hidden}.member image,.tiny-avatar image{width:100%;height:100%}.member-remove{position:absolute;right:-7px;top:-7px;width:18px;height:18px;display:flex;align-items:center;justify-content:center;border:2px solid #2e1d0e;border-radius:50%;background:#b83a32;color:#fff;font-size:12px;line-height:1;cursor:pointer}.member.add{box-sizing:border-box;background:#fffaf1;color:#2e1d0e;font-size:24px;cursor:pointer}.invite-tip{margin-top:16px;padding:11px;border-left:3px solid #9b5a37;background:#f5e8d1;color:#6e5b42;font-size:9px;line-height:1.7}.stats{margin-top:34px;display:grid;grid-template-columns:1fr 1fr;border:2px solid #2e1d0e;background:#fffaf1}.stats view{padding:13px}.stats view+view{border-left:2px solid #2e1d0e}.stats strong,.stats small{display:block}.stats strong{font-size:18px}.stats small{margin-top:3px;color:#8c7b5e;font-size:9px}.content{position:relative;min-width:0;padding:32px 38px}.content.drag-active{outline:4px dashed #9b5a37;outline-offset:-12px}.drop-overlay{position:absolute;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;background:#f4ead7dd;pointer-events:none}.drop-card{padding:34px 52px;border:4px dashed #2e1d0e;background:#fffaf1;box-shadow:8px 8px 0 #c8aa7a;text-align:center}.drop-card strong,.drop-card small{display:block}.drop-card strong{font-size:22px}.drop-card small{margin-top:8px;color:#8c7b5e;font-size:10px}.hero{display:flex;align-items:center;justify-content:space-between}.hero>view:first-child{display:flex;flex-direction:column}.hero text{font-size:22px;font-weight:900}.hero small{margin-top:5px;color:#8c7b5e;font-size:10px}.upload-button,.submit{padding:12px 18px;border:3px solid #2e1d0e;background:#2e1d0e;color:#fff;box-shadow:4px 4px 0 #c8aa7a;font-size:11px;font-weight:900;cursor:pointer}.progress{height:22px;position:relative;margin-top:15px;border:2px solid #2e1d0e;background:#fff}.progress view{height:100%;background:#74a58f}.progress text{position:absolute;inset:0;padding:0 8px;display:flex;align-items:center;justify-content:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;font-weight:900}.filters{margin-top:25px;display:flex;align-items:center;gap:12px}.search,.dialog-search,.field{box-sizing:border-box;height:42px;padding:0 12px;border:2px solid #b9a98e;background:#fff;color:#2e1d0e}.search{flex:1}.count{font-size:10px;font-weight:900}.category-tabs{margin-top:10px;white-space:nowrap}.category-tab{margin-right:7px;padding:7px 10px;display:inline-flex;align-items:center;gap:6px;border:2px solid #b9a98e;background:#fffaf1;font-size:9px;font-weight:900;cursor:pointer}.category-tab small{min-width:16px;padding:1px 4px;background:#e5d6bd;text-align:center}.category-tab.active{border-color:#2e1d0e;background:#2e1d0e;color:#fff}.category-tab.active small{background:#fff;color:#2e1d0e}.paper-head,.paper-row{display:grid;grid-template-columns:minmax(250px,1fr) 94px 125px 76px 58px;align-items:center;gap:12px}.paper-head{margin-top:12px;padding:10px 13px;border-bottom:3px solid #2e1d0e;color:#8c7b5e;font-size:9px;font-weight:900}.paper-row{padding:15px 13px;border-bottom:2px solid #d5c4a7;background:#fffaf1}.paper-main,.uploader{min-width:0;display:flex;align-items:center;gap:10px}.file-icon{width:42px;height:48px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid #2e1d0e;background:#d98464;color:#fff;font-size:8px;font-weight:900}.paper-text{min-width:0}.paper-text text,.paper-text small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.paper-text text{font-size:12px;font-weight:900}.paper-text small{margin-top:4px;color:#8c7b5e;font-size:9px}.paper-text .note{color:#9b5a37}.category-pill{padding:7px 6px;border:2px solid #2e1d0e;background:#eee3cf;text-align:center;font-size:8px;font-weight:900;cursor:pointer}.category-1{background:#f2dfab}.category-2{background:#efb8a7}.category-3{background:#bcdad1}.category-4{background:#d8d4ce;color:#6b6258}.tiny-avatar{width:28px;height:28px;flex-shrink:0;font-size:8px}.uploader>text,.time{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px}.download{padding:7px 8px;border:2px solid #2e1d0e;text-align:center;font-size:9px;font-weight:900;cursor:pointer}.empty{padding:70px 20px;text-align:center;border-bottom:2px solid #d5c4a7;background:#fffaf1}.empty text,.empty small{display:block}.empty text{font-size:15px;font-weight:900}.empty small{margin-top:8px;color:#8c7b5e;font-size:10px}.mask{position:fixed;inset:0;z-index:20;background:#20150da6}.dialog{position:fixed;left:50%;top:50%;z-index:21;width:min(460px,calc(100vw - 28px));transform:translate(-50%,-50%);border:4px solid #2e1d0e;background:#fffaf1;box-shadow:9px 9px 0 #2e1d0e55}.dialog-head{padding:14px 16px;display:flex;justify-content:space-between;border-bottom:3px solid #2e1d0e;background:#ead7b7;font-weight:900}.dialog-head view{cursor:pointer;font-size:20px}.dialog-search{width:calc(100% - 32px);margin:16px}.user-list{max-height:350px;border-top:2px solid #d5c4a7}.user-row{padding:11px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #d5c4a7}.user-name{min-width:0;flex:1}.user-name text,.user-name small{display:block}.user-name text{font-size:11px;font-weight:900}.user-name small{margin-top:3px;color:#8c7b5e;font-size:9px}.join,.joined{padding:7px 9px;font-size:9px;font-weight:900}.join{border:2px solid #2e1d0e;cursor:pointer}.joined{color:#6e8d7e}.user-empty{padding:35px;text-align:center;color:#8c7b5e;font-size:10px}.upload-dialog{padding-bottom:18px}.selected-file{margin:16px;padding:12px;border:2px dashed #9b5a37;background:#f5e8d1}.selected-file strong,.selected-file small{display:block}.selected-file strong{font-size:11px}.selected-file small{margin-top:4px;color:#8c7b5e;font-size:9px}.label{display:block;margin:11px 16px 5px;font-size:10px;font-weight:900}.field,.textarea{width:calc(100% - 32px);margin:0 16px}.textarea{box-sizing:border-box;height:80px;padding:10px 12px;border:2px solid #b9a98e;background:#fff}.submit{margin:16px 16px 0;text-align:center}.disabled{opacity:.55}
.category-section{margin-top:24px}.category-heading{padding:10px 4px 8px;display:flex;align-items:flex-end;justify-content:space-between;border-bottom:5px solid #17110c}.category-heading text{font-size:19px;font-weight:1000;letter-spacing:1px}.category-heading small{padding-bottom:2px;font-size:9px;font-weight:900}.category-empty{padding:22px 13px;border-bottom:2px solid #b9a98e;background:#fffaf1;color:#9a8a72;font-size:10px}.category-section .paper-head{margin-top:0}.paper-head,.paper-row{grid-template-columns:minmax(250px,1fr) 245px 110px 72px 58px}.direct-categories{display:flex;flex-wrap:wrap;gap:4px}.direct-categories view{padding:4px 6px;border:1px solid #a99a82;background:#f4ead7;color:#756650;font-size:7px;font-weight:900;cursor:pointer}.direct-categories view:hover{border-color:#2e1d0e;color:#2e1d0e}.direct-categories view.active{border:2px solid #2e1d0e;background:#2e1d0e;color:#fff}
.category-toolbar{margin-top:12px;display:flex;align-items:center;gap:10px}.category-toolbar>view{padding:8px 11px;border:3px solid #2e1d0e;background:#2e1d0e;color:#fff;font-size:9px;font-weight:900;cursor:pointer}.category-toolbar small{color:#8c7b5e;font-size:8px}.category-title-row{display:flex;align-items:center;gap:8px}.category-edit,.category-delete{padding:4px 7px;border:2px solid #2e1d0e;background:#fffaf1;font-size:8px;font-weight:900;letter-spacing:0;cursor:pointer}.category-delete{border-color:#b83a32;color:#b83a32}.paper-row.draggable{cursor:grab}.paper-row.draggable:active{cursor:grabbing}.paper-drag-target{outline:4px dashed #9b5a37;outline-offset:4px;background:#ead7b755}.paper-drag-target .category-heading{background:#ead7b7}.readonly-category{padding:7px;border:2px solid #b9a98e;background:#eee3cf;text-align:center;font-size:8px;font-weight:900}.upload-button.disabled{cursor:not-allowed;box-shadow:none}
.hero-actions{display:flex;align-items:center;gap:9px}.download-all{padding:11px 14px;border:3px solid #2e1d0e;background:#fffaf1;color:#2e1d0e;box-shadow:3px 3px 0 #c8aa7a;font-size:10px;font-weight:900;cursor:pointer}.download-all.disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
.help-wrap{position:relative;z-index:30}.help-button{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:3px solid #2e1d0e;background:#fffaf1;font-size:17px;font-weight:1000;cursor:pointer}.help-popover{position:absolute;right:0;top:43px;width:340px;padding:14px;border:4px solid #2e1d0e;background:#fffaf1;box-shadow:8px 8px 0 #2e1d0e33}.help-title{display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:3px solid #2e1d0e}.help-title text{font-size:14px;font-weight:1000}.help-title view{font-size:18px;font-weight:900;cursor:pointer}.help-item{padding:9px 2px;border-bottom:1px solid #cbbba1}.help-item:last-child{border-bottom:0}.help-item strong,.help-item small{display:block}.help-item strong{font-size:10px}.help-item small{margin-top:4px;color:#756650;font-size:9px;line-height:1.55}.trash-drop{position:fixed;left:24px;bottom:24px;z-index:15;box-sizing:border-box;width:225px;padding:12px;display:flex;align-items:center;gap:11px;border:4px solid #2e1d0e;background:#fffaf1;box-shadow:6px 6px 0 #2e1d0e33;transition:.15s ease}.trash-drop>text{font-size:28px;font-weight:900}.trash-drop strong,.trash-drop small{display:block}.trash-drop strong{font-size:11px}.trash-drop small{margin-top:3px;color:#8c7b5e;font-size:8px}.trash-drop.active{transform:scale(1.07);border-color:#b83a32;background:#f7d8d1;color:#b83a32;box-shadow:8px 8px 0 #b83a3244}
@media(max-width:1200px) and (min-width:801px){.content{padding-left:22px;padding-right:22px}.paper-head,.paper-row{grid-template-columns:minmax(200px,1fr) 175px 88px 62px 50px;gap:8px}.direct-categories view{padding:3px 4px;font-size:6px}}
@media(max-width:800px){.topbar{height:62px;padding:0 12px}.workspace{display:block}.project-panel{padding:20px 15px;border-right:0;border-bottom:3px solid #2e1d0e}.project-desc,.invite-tip{display:none}.member-heading{margin-top:18px}.stats{display:none}.content{padding:20px 12px 86px}.hero{align-items:flex-end;gap:8px}.hero text{font-size:18px}.hero-actions{flex-direction:column;align-items:stretch}.upload-button,.download-all{padding:9px 8px;text-align:center;font-size:8px}.paper-head{display:none}.paper-row{grid-template-columns:1fr auto;padding:13px 10px}.paper-main{grid-column:1/-1}.direct-categories{grid-column:1/-1}.direct-categories view{padding:6px 8px;font-size:8px}.uploader{min-width:0}.time{display:none}.download{min-width:48px}.filters{margin-top:18px}.category-heading{border-bottom-width:4px}.category-heading text{font-size:17px}.help-popover{position:fixed;left:12px;right:12px;top:70px;box-sizing:border-box;width:auto;max-height:calc(100vh - 90px);overflow-y:auto}.trash-drop{left:12px;bottom:12px;width:180px;padding:9px}.trash-drop>text{font-size:22px}}
</style>
