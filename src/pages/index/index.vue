<template>
  <view class="app" :class="[{ collapsed: isCollapsed, animating: isAnimating, 'tutorial-mode': activeTutorial }, 'theme-' + themeMode]">
    <!-- ===== 侧边栏 ===== -->
    <view v-if="!activeTutorial" class="sidebar">
      <!-- 品牌 + 折叠按钮 -->
      <view class="brand">
        <view class="brand-main">
          <view class="brand-icon" aria-label="LJ Logo">
            <image class="brand-logo" :src="logoSvg" mode="aspectFit" />
          </view>
          <view class="brand-text">
            <text class="brand-title">个人数字空间</text>
            <text class="brand-sub">组会资料网站</text>
            <text class="brand-version">v{{ appVersion }}</text>
          </view>
        </view>

        <view
          class="toggle"
          @click="toggleSidebar"
          :aria-label="isCollapsed ? '展开侧边栏' : '折叠侧边栏'"
        >
          <image class="collapsed-logo" :src="logoSvg" mode="aspectFit" />
          <view class="toggle-icon-wrap" :style="{ opacity: isCollapsed ? 0 : 1, transform: isCollapsed ? 'rotate(0deg) scale(.72)' : 'rotate(180deg) scale(1)' }">
            <text class="toggle-icon-text">◀</text>
          </view>
        </view>
      </view>

      <!-- 导航菜单 -->
      <view class="nav">
        <view
          v-for="item in visibleNavItems"
          :key="item.key"
          class="nav-item"
          :class="{ active: activeNav === item.key }"
          @click="onNavClick(item.key)"
        >
          <view class="icon" v-html="item.icon"></view>
          <text class="nav-label">{{ item.label }}</text>
        </view>
      </view>

      <!-- 最近文件：仅测试员可见 -->
      <text v-if="isTester" class="recent-title">最近</text>
      <scroll-view v-if="isTester" class="recent-list" scroll-y>
        <view
          v-for="(file, idx) in recentFiles"
          :key="idx"
          class="recent-item"
          @click="onRecentClick(file)"
        >
          <text>{{ file.name }}</text>
        </view>
      </scroll-view>

      <view class="spacer"></view>

      <!-- 用户资料 -->
      <view v-if="profileMenuOpen" class="profile-menu" @click.stop>
        <view class="profile-menu-head">
          <view class="menu-avatar">
            <image v-if="userAvatar" :src="userAvatar" mode="aspectFill" />
            <text v-else>{{ avatarText }}</text>
          </view>
          <view class="menu-user-info">
            <text class="menu-user-name">{{ userName }}</text>
            <text v-if="isTester" class="menu-user-title">测试员</text>
          </view>
        </view>
        <view class="profile-menu-line"></view>
        <view class="profile-menu-item" @click="showThemeChoices = !showThemeChoices"><text>◐</text><text>个性化</text><text class="menu-arrow">›</text></view>
        <view v-if="showThemeChoices" class="theme-choices">
          <view v-for="theme in themes" :key="theme.value" class="theme-choice" :class="{ active: themeMode === theme.value }" @click.stop="setTheme(theme.value)">{{ theme.label }}</view>
        </view>
        <view class="profile-menu-item" @click="openProfileEditor"><text>◎</text><text>个人资料</text></view>
        <view class="profile-menu-item" @click="openPasswordEditor"><text>⌘</text><text>修改密码</text></view>
        <view class="profile-menu-item" @click="openTrash"><text>♲</text><text>我的删除</text><text v-if="trashCount" class="trash-menu-count">{{ trashCount }}</text></view>
        <view v-if="isTester" class="profile-menu-item" @click="openPanel('extensions')"><text>⚙</text><text>扩展功能</text></view>
        <view class="profile-menu-item" @click="openPanel('updates')"><text>↻</text><text>更新记录</text></view>
        <view v-if="isTester" class="profile-menu-item" @click="openPanel('future')"><text>＋</text><text>未来加入功能</text></view>
        <view class="profile-menu-line"></view>
        <view class="profile-menu-item danger" @click="handleLogout"><text>↪</text><text>退出登录</text></view>
      </view>
      <view class="profile" @click="toggleProfileMenu">
        <view class="avatar">
          <image v-if="userAvatar" :src="userAvatar" mode="aspectFill" />
          <text v-else>{{ avatarText }}</text>
        </view>
        <view class="user-meta">
          <text class="user-name">{{ userName }}</text>
          <text class="user-status" :class="{ offline: !loggedIn }">{{ userStatus }}</text>
        </view>
        <view class="profile-actions" v-if="loggedIn"><text class="profile-chevron">⌃</text></view>
        <view class="profile-actions" v-else>
          <view class="login-btn" @click.stop="goLogin">
            <text>登录</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="profileMenuOpen" class="profile-menu-mask" @click="profileMenuOpen = false"></view>
    <view v-if="openMaterialMenuId" class="material-menu-mask" @click="openMaterialMenuId = null"></view>

    <!-- ===== 主区域 ===== -->
    <view class="main">
      <!-- 电子书接管整个主界面，书内目录替代网站主侧边栏 -->
      <view v-if="activeTutorial" class="tutorial-reader-full">
        <!-- #ifdef H5 -->
        <iframe class="tutorial-frame-full" :src="activeTutorial.path" :title="activeTutorial.title"></iframe>
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <view class="tutorial-reader-fallback">请在网页版打开电子教程</view>
        <!-- #endif -->
      </view>

      <!-- 主题切换按钮 (暂时隐藏，保留接口) -->
      <!-- <view class="theme-toggle" @click="toggleTheme">
        <text class="sun" v-if="!isNight">☀</text>
        <text class="moon" v-else>☾</text>
      </view> -->

      <!-- 组会资料 -->
      <view v-else-if="activeNav === 'recommend'" class="meeting-hub">
        <view class="meeting-head">
          <view>
            <text class="meeting-title">组会资料</text>
            <text class="meeting-subtitle">选择成员，查看他上传的全部资料</text>
          </view>
          <view class="meeting-refresh" @click="loadMeetingMaterials">刷新</view>
        </view>

        <scroll-view v-if="activeMeetingUsers.length" class="member-strip" scroll-x>
          <view class="member-list">
            <view class="member-card" :class="{ active: selectedMemberId === null }" @click="selectedMemberId = null">
              <view class="member-avatar all-avatar">全</view>
              <text class="member-name">全部</text>
              <text class="member-count">{{ meetingMaterials.length }}</text>
            </view>
            <view
              v-for="member in activeMeetingUsers"
              :key="member.id"
              class="member-card"
              :class="{ active: selectedMemberId === member.id }"
              @click="selectedMemberId = member.id"
            >
              <view class="member-avatar" :style="{ background: member.avatarUrl ? '#fff' : avatarColor(member.id) }">
                <image v-if="member.avatarUrl" :src="member.avatarUrl" mode="aspectFill" />
                <text v-else>{{ memberAvatar(member) }}</text>
              </view>
              <text class="member-name">{{ member.nickname || member.username }}</text>
              <text class="member-count">{{ memberUploadCount(member.id) }}</text>
            </view>
          </view>
        </scroll-view>

        <scroll-view class="material-scroll" scroll-y>
          <view v-if="materialsLoading" class="material-empty">正在读取组会资料…</view>
          <view v-else-if="filteredMaterials.length === 0" class="material-empty">{{ activeMeetingUsers.length ? '该成员暂未上传组会资料' : '暂时还没有人上传组会资料' }}</view>
          <view v-else class="material-grid">
            <view v-for="material in filteredMaterials" :key="material.folder" class="material-card" :class="{ 'menu-open': openMaterialMenuId === material.id }">
              <view class="material-card-head">
                <view class="material-uploader-avatar" :style="{ background: material.uploader.avatarUrl ? '#fff' : avatarColor(material.uploader.id) }">
                  <image v-if="material.uploader.avatarUrl" :src="material.uploader.avatarUrl" mode="aspectFill" />
                  <text v-else>{{ memberAvatar(material.uploader) }}</text>
                </view>
                <view class="material-heading">
                  <text class="material-title">{{ material.title || '未命名组会资料' }}</text>
                  <text class="material-meta">{{ material.uploader.username }} · 修改于 {{ formatMaterialTime(material.updatedAt || material.uploadedAt) }}</text>
                </view>
                <view v-if="canUnpublish(material)" class="material-action-wrap">
                  <view class="material-action-trigger" @click.stop="toggleMaterialMenu(material)">管理⌄</view>
                  <view v-if="openMaterialMenuId === material.id" class="material-action-menu" @click.stop>
                    <view @click="editMaterial(material)">修改</view>
                    <view class="danger" @click="unpublishMaterial(material)">下架</view>
                  </view>
                </view>
              </view>
              <text class="material-description">{{ material.description || '暂无简介' }}</text>
              <view class="material-files">
                <a v-for="file in material.files.slice(0, 5)" :key="file.name" class="material-file" :href="materialFileUrl(material, file)" target="_blank" download>
                  <text class="material-file-type">{{ fileExtension(file.name) }}</text>
                  <view class="material-file-info">
                    <text class="material-file-name">{{ file.name }}</text>
                    <text class="material-file-size">{{ formatFileSize(file.size) }}</text>
                  </view>
                  <text class="material-download">下载</text>
                </a>
              </view>
              <view class="material-enter" @click="openMaterialDetail(material)">
                <text>查看全部{{ material.files.length > 5 ? ' ' + material.files.length + ' 个文件' : '资料' }}</text>
                <strong>》</strong>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 游客与登录用户都可访问的主页 -->
      <view v-else class="home-empty">
        <view class="home-landing" v-if="activeNav === 'home'">
          <view class="home-hero">
            <view class="home-eyebrow">个人数字空间 · OPEN HOME</view>
            <text class="home-title">组会资料与科研绘图工作台</text>
            <text class="home-desc">主页和科研绘图电子书无需登录即可浏览；上传资料、组会资料和电子教程需登录后使用。</text>
            <view class="home-actions">
              <view class="home-action primary" @click="openRBook">打开 R 科研绘图电子书</view>
              <view class="home-action" @click="onNavClick('recommend')">{{ loggedIn ? '查看组会资料' : '登录后查看组会资料' }}</view>
            </view>
          </view>
          <view class="home-feature-grid">
            <view class="home-feature featured" @click="openRBook">
              <text class="home-feature-no">01 · 本期新增</text>
              <strong>R 科研绘图电子书</strong>
              <small>收录 R 与 MATLAB 科研图例、对应代码、浏览器交互预览及源文件下载。</small>
              <text class="home-feature-link">免登录阅读 》</text>
            </view>
            <view class="home-feature" @click="onNavClick('recommend')">
              <text class="home-feature-no">02 · 组会资料</text>
              <strong>成员资料集中浏览</strong>
              <small>按成员查看文档、图片、代码和演示文件，支持在线预览与下载。</small>
              <text class="home-feature-link">{{ loggedIn ? '进入资料库 》' : '登录后进入 》' }}</text>
            </view>
            <view class="home-feature" @click="onNavClick('tutorials')">
              <text class="home-feature-no">03 · 电子教程</text>
              <strong>软件配置与开发指南</strong>
              <small>按步骤阅读实用教程，当前已上线 DeepSeek、FlyWire、Web of Science、LeakDetector 和私有云 RTX 3090 五套内容。</small>
              <text class="home-feature-link">{{ loggedIn ? '查看教程 》' : '登录后查看 》' }}</text>
            </view>
          </view>
        </view>
        <view class="tutorial-landing" v-else-if="activeNav === 'tutorials'">
          <view class="tutorial-head">
            <view>
              <text class="tutorial-eyebrow">个人数字空间 · LEARNING</text>
              <text class="tutorial-title">电子教程</text>
              <text class="tutorial-subtitle">从工具配置到项目实践，一步一步跟着做</text>
            </view>
            <view class="tutorial-count">06</view>
          </view>
          <view class="tutorial-grid">
            <view class="tutorial-card available" @click="openDeepSeekTutorial">
              <view class="tutorial-card-top">
                <text class="tutorial-index">01</text>
                <text class="tutorial-status online">已上线</text>
              </view>
              <view class="tutorial-icon">&lt;/&gt;</view>
              <text class="tutorial-card-title">DeepSeek 接入 VS Code</text>
              <text class="tutorial-card-desc">安装 VS Code 与 Cline，配置 DeepSeek API，并完成第一个 AI 辅助编程任务。</text>
              <view class="tutorial-meta"><text>21 个步骤</text><text>图文教程</text></view>
              <view class="tutorial-open">开始学习 <strong>↗</strong></view>
            </view>
            <view class="tutorial-card available" @click="openFlyWireTutorial">
              <view class="tutorial-card-top">
                <text class="tutorial-index">02</text>
                <text class="tutorial-status online">已上线</text>
              </view>
              <view class="tutorial-icon">FW</view>
              <text class="tutorial-card-title">FlyWire FAFB v783 果蝇大脑下载</text>
              <text class="tutorial-card-desc">从 FlyWire Codex 获取成年雌性果蝇全脑连接组数据，并完成文件选择、下载与完整性检查。</text>
              <view class="tutorial-meta"><text>5 张配图</text><text>数据下载</text></view>
              <view class="tutorial-open">打开电子书 <strong>↗</strong></view>
            </view>
            <view class="tutorial-card available" @click="openWebOfScienceTutorial">
              <view class="tutorial-card-top">
                <text class="tutorial-index">03</text>
                <text class="tutorial-status online">已上线</text>
              </view>
              <view class="tutorial-icon">WoS</view>
              <text class="tutorial-card-title">Web of Science 文献检索</text>
              <text class="tutorial-card-desc">通过 CARSI 完成校外机构登录，学习检索、筛选、全文获取、导出和引用分析。</text>
              <view class="tutorial-meta"><text>8 张配图</text><text>科研检索</text></view>
              <view class="tutorial-open">打开电子书 <strong>↗</strong></view>
            </view>
            <view class="tutorial-card available" @click="openLeakDetectorTutorial">
              <view class="tutorial-card-top">
                <text class="tutorial-index">04</text>
                <text class="tutorial-status online">已上线</text>
              </view>
              <view class="tutorial-icon">LD</view>
              <text class="tutorial-card-title">LeakDetector 使用教程</text>
              <text class="tutorial-card-desc">通过 76 秒完整录屏和分步图文，学习项目创建、摄像头、4 点标定、漏点标注、复核与保存。</text>
              <view class="tutorial-meta"><text>视频 + 4 张配图</text><text>实验工具</text></view>
              <view class="tutorial-open">打开电子书 <strong>↗</strong></view>
            </view>
            <view class="tutorial-card available" @click="openPrivateCloudTutorial">
              <view class="tutorial-card-top">
                <text class="tutorial-index">05</text>
                <text class="tutorial-status online">已上线</text>
              </view>
              <view class="tutorial-icon">GPU</view>
              <text class="tutorial-card-title">私有云 RTX 3090 调用</text>
              <text class="tutorial-card-desc">从 AutoDL 私有云登录、创建容器和 SSH 连接，到验证 RTX 3090、安装 PyTorch并完成首次 GPU 计算。</text>
              <view class="tutorial-meta"><text>6 张配图</text><text>GPU 云计算</text></view>
              <view class="tutorial-open">打开电子书 <strong>↗</strong></view>
            </view>
            <view class="tutorial-card developing" aria-disabled="true">
              <view class="tutorial-card-top">
                <text class="tutorial-index">06</text>
                <text class="tutorial-status">开发中</text>
              </view>
              <view class="tutorial-icon muted">...</view>
              <text class="tutorial-card-title">新教程准备中</text>
              <text class="tutorial-card-desc">更多实用的科研与开发教程正在整理，完成后会在这里更新。</text>
              <view class="tutorial-meta"><text>内容策划中</text><text>敬请期待</text></view>
              <view class="tutorial-open disabled">开发中</view>
            </view>
          </view>
        </view>
        <view class="empty-content" v-else>
          <text class="empty-title">{{ getActiveNavLabel() }}</text>
          <text class="empty-desc">页面建设中...</text>
        </view>
      </view>
      </view>

    <view v-if="pendingUnpublishMaterial" class="unpublish-mask" @click="cancelUnpublish"></view>
    <view v-if="pendingUnpublishMaterial" class="unpublish-dialog" @click.stop>
      <view class="unpublish-dialog-head">
        <view class="unpublish-dialog-icon">—</view>
        <text>下架组会资料</text>
      </view>
      <view class="unpublish-dialog-body">
        <text>确定下架以下资料吗？</text>
        <strong>{{ pendingUnpublishMaterial.title || '未命名组会资料' }}</strong>
        <small>下架后将进入“我的删除”。3 天内可以在头像 》 我的删除中修改、永久删除或重新上架；超过 3 天将自动删除。</small>
      </view>
      <view class="unpublish-dialog-actions">
        <view class="dialog-button cancel" @click="cancelUnpublish">取消</view>
        <view class="dialog-button confirm" :class="{ disabled: unpublishing }" @click="confirmUnpublish">{{ unpublishing ? '下架中…' : '确认下架' }}</view>
      </view>
    </view>

    <!-- 个人资料弹窗 -->
    <view v-if="showProfileModal" class="account-modal-mask" @click="closeAccountPanels"></view>
    <view v-if="showProfileModal" class="account-modal">
      <view class="account-modal-head"><text>个人资料</text><view @click="closeAccountPanels">×</view></view>
      <view class="account-modal-body">
        <view class="avatar-editor" @click="chooseProfileAvatar">
          <image v-if="profileForm.avatar" :src="profileForm.avatar" mode="aspectFill" />
          <text v-else>{{ avatarText }}</text>
          <view class="avatar-edit-hint">更换头像</view>
        </view>
        <view class="account-field"><text>账号 ID</text><input class="account-input" v-model="profileForm.username" maxlength="50" placeholder="字母、数字或下划线" /></view>
        <view class="account-field"><text>名字</text><input class="account-input" v-model="profileForm.nickname" maxlength="50" placeholder="显示名称" /></view>
        <view class="database-id">数据库编号：{{ profileForm.id }}（系统编号不可修改）</view>
        <view class="account-save" :class="{ disabled: savingProfile }" @click="saveProfile">{{ savingProfile ? '保存中…' : '保存到数据库' }}</view>
      </view>
    </view>

    <!-- 修改密码弹窗 -->
    <view v-if="showPasswordModal" class="account-modal-mask" @click="closeAccountPanels"></view>
    <view v-if="showPasswordModal" class="account-modal password-modal">
      <view class="account-modal-head"><text>修改密码</text><view @click="closeAccountPanels">×</view></view>
      <view class="account-modal-body">
        <view class="password-notice">修改密码前需要验证当前密码。新密码保存后立即生效。</view>
        <view class="account-field"><text>当前密码</text><input class="account-input" v-model="passwordForm.currentPassword" type="password" maxlength="72" placeholder="输入当前密码" /></view>
        <view class="account-field"><text>新密码</text><input class="account-input" v-model="passwordForm.newPassword" type="password" maxlength="72" placeholder="8-72 个字符" /></view>
        <view class="account-field"><text>确认新密码</text><input class="account-input" v-model="passwordForm.confirmPassword" type="password" maxlength="72" placeholder="再次输入新密码" /></view>
        <view class="account-save" :class="{ disabled: savingPassword }" @click="savePassword">{{ savingPassword ? '修改中…' : '确认修改密码' }}</view>
      </view>
    </view>

    <!-- 我的删除：保留三天的个人回收站 -->
    <view v-if="showTrashModal" class="account-modal-mask" @click="closeAccountPanels"></view>
    <view v-if="showTrashModal" class="account-modal trash-modal">
      <view class="account-modal-head"><text>我的删除</text><view @click="closeAccountPanels">×</view></view>
      <view class="trash-notice">下架资料保留 3 天。期间可以修改、永久删除或重新上架，过期后系统自动清理。</view>
      <scroll-view class="trash-list" scroll-y>
        <view v-if="trashLoading" class="trash-empty">正在读取删除内容…</view>
        <view v-else-if="trashItems.length === 0" class="trash-empty">这里还没有下架的资料</view>
        <view v-for="item in trashItems" :key="item.id" class="trash-card">
          <view class="trash-card-top">
            <text>删除倒计时：{{ formatTrashRemaining(item.remainingSeconds) }}</text>
            <small>{{ item.files.length }} 个文件</small>
          </view>
          <input class="trash-title-input" v-model="item.draftTitle" maxlength="120" placeholder="资料标题" />
          <textarea class="trash-description-input" v-model="item.draftDescription" maxlength="5000" placeholder="资料说明"></textarea>
          <view class="trash-file-summary">
            <text v-for="file in item.files.slice(0, 3)" :key="file.name">{{ file.name }}</text>
            <small v-if="item.files.length > 3">另有 {{ item.files.length - 3 }} 个文件</small>
          </view>
          <view class="trash-actions">
            <view class="trash-action save" @click="saveTrashItem(item)">保存修改</view>
            <view class="trash-action restore" @click="restoreTrashItem(item)">重新上架</view>
            <view class="trash-action remove" @click="deleteTrashItem(item)">永久删除</view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 功能栏目弹窗 -->
    <view v-if="activeAccountPanel" class="account-modal-mask" @click="closeAccountPanels"></view>
    <view v-if="activeAccountPanel" class="account-modal feature-modal">
      <view class="account-modal-head"><text>{{ accountPanelTitle }}</text><view @click="closeAccountPanels">×</view></view>
      <view class="account-modal-body feature-grid" v-if="activeAccountPanel === 'extensions'">
        <view class="feature-card"><text>用户权限</text><small>查看成员与测试员权限边界</small></view>
        <view class="feature-card"><text>数据库状态</text><small>管理用户、资料和文件记录</small></view>
        <view class="feature-card"><text>系统诊断</text><small>检查前端、后端与上传服务</small></view>
        <view class="feature-card"><text>测试工具</text><small>集中管理实验性功能入口</small></view>
      </view>
      <scroll-view class="account-modal-body update-list" scroll-y v-else-if="activeAccountPanel === 'updates'">
        <view class="server-status-panel">
          <view class="server-status-head">
            <view><strong>服务器容量</strong><small>显示网站当前部署服务器的真实容量</small></view>
            <view class="server-status-refresh" @click.stop="loadServerStatus">{{ serverStatusLoading ? '读取中…' : '刷新' }}</view>
          </view>
          <view v-if="serverStatusLoading && !serverStatus" class="server-status-state">正在读取服务器状态…</view>
          <view v-else-if="serverStatusError && !serverStatus" class="server-status-state error">{{ serverStatusError }}</view>
          <view v-else-if="serverStatus" class="server-metric-grid">
            <view v-for="metric in [serverStatus.storage, serverStatus.memory]" :key="metric.label" class="server-metric-card">
              <view class="server-metric-title"><text>{{ metric.label }}</text><strong>剩余 {{ formatCapacity(metric.freeBytes) }}</strong></view>
              <view class="server-progress"><view :style="{ width: metric.usagePercent + '%' }"></view></view>
              <view class="server-metric-meta"><text>已用 {{ formatCapacity(metric.usedBytes) }}</text><text>总计 {{ formatCapacity(metric.totalBytes) }}</text></view>
            </view>
          </view>
          <small v-if="serverStatus" class="server-checked-time">更新时间：{{ formatStatusTime(serverStatus.checkedAt) }}</small>
        </view>
        <view class="update-item"><text>v0.5.3 · 2026-09-19</text><strong>电子教程扩充与安卓 APP 备案</strong><small>新增 FlyWire、Web of Science、LeakDetector 和私有云 RTX 3090 教程；统一电子书接管式侧边栏，并完成安卓 APP 备案与正式发布证书准备。</small></view>
        <view class="update-item"><text>v0.5.2 · 2026-09-05</text><strong>电子教程</strong><small>新增电子教程入口与 DeepSeek 接入 VS Code 图文教程；普通成员侧边栏精简为五项，论文协作入口暂时屏蔽。</small></view>
        <view class="update-item"><text>v0.5.1 · 2026-08-27</text><strong>科研绘图电子书与开放主页</strong><small>主页无需登录即可浏览；新增 R 科研绘图电子书入口，开放已完善图例、交互预览、R/MATLAB 代码及源文件下载。</small></view>
        <view class="update-item"><text>v0.4.2 · 2026-07-29</text><strong>论文协作收集</strong><small>新增在线协作成员、多人共享上传、分类改名与增删、拖动归类、垃圾桶删除、分类压缩下载、只读查看和协作说明书。</small></view>
        <view class="update-item"><text>v0.4.1 · 2026-07-19</text><strong>手机端适配与全屏预览</strong><small>手机端新增底部导航，修复小屏导航消失；资料预览支持手机和电脑全屏；上传支持 ZIP 在线解压。</small></view>
        <view class="update-item"><text>v0.3.9 · 2026-07-15</text><strong>网站推荐</strong><small>成员可查看并上传网站链接；上传文章仍为测试员专属。测试员可编辑和删除推荐，并修复重复显示。</small></view>
        <view class="update-item"><text>v0.3.8 · 2026-07-15</text><strong>测试员网站推荐</strong><small>新增测试员专属资源推荐页和数据库上传入口，按四类收录 38 个原站网站，并可继续发布新推荐。</small></view>
        <view class="update-item"><text>v0.3.7 · 2026-07-14</text><strong>文档在线预览更新</strong><small>上传后预生成 Office PDF 和视频缓存，支持 Markdown、公式、代码、图片、HTML、PDF 与常见视频在线预览。</small></view>
        <view class="update-item"><text>v0.3.6 · 2026-07-14</text><strong>修改、密码与多文件上传</strong><small>新增资料修改页、临时上传区、多文件拖放、真实进度、最新修改时间和密码修改。</small></view>
        <view class="update-item"><text>v0.3.5 · 2026-07-14</text><strong>备案信息与部署基线</strong><small>加入可点击的 ICP、公安备案记录和官方图标，并以生产环境部署包作为后续部署文档基线。</small></view>
        <view class="update-item"><text>v0.3.4 · 2026-07-14</text><strong>上传与预览实验失败存档</strong><small>修复自动刷新、0% 卡住和模拟进度等问题，但整体状态仍不稳定，仅保留用于复盘，禁止部署。</small></view>
        <view class="update-item"><text>v0.3.3 · 2026-07-14</text><strong>预转换与上传优化实验</strong><small>尝试 Office 预转换、富文本预览、临时区、幂等和签名下载；未建立独立 Git 标签。</small></view>
        <view class="update-item"><text>v0.3.2 · 2026-07-14</text><strong>生产部署前稳定版本</strong><small>加入同源后端、回收站、早期资料导入、服务器容量、PM2、Nginx、数据库快照和 OpenClaw 部署文档。</small></view>
        <view class="update-item"><text>v0.3.1 · 2026-07-14</text><strong>组会资料与个人资料</strong><small>新增组会资料、成员浏览、个人资料存储、全站主题、回收站和基础在线预览。</small></view>
        <view class="update-item"><text>v0.2.10 · 2026-07-12</text><strong>文章卡片编辑器</strong><small>完善文字、图片、表格、视频、文档、代码、公式、网站和文件卡片编辑。</small></view>
        <view class="update-item"><text>v0.2.9 · 2026-07-12</text><strong>文字编辑面板重做</strong><small>重做功能按钮、文字输入和 Markdown 预览三区布局。</small></view>
        <view class="update-item"><text>v0.2.8 · 2026-07-12</text><strong>彩色文字与图片组合</strong><small>加入粗体、斜体、下划线、删除线、颜色工具和图片文字整体预览。</small></view>
        <view class="update-item"><text>v0.2.7 · 2026-07-12</text><strong>图片中的文字编辑</strong><small>增加左右文字框、文字编辑模式和滑块限制区域。</small></view>
        <view class="update-item"><text>v0.2.6 · 2026-07-11</text><strong>图片组合细节优化</strong><small>微调图片框、边框、拖动和滑块交互。</small></view>
        <view class="update-item"><text>v0.2.5 · 2026-07-11</text><strong>图片组合核心</strong><small>支持图片组合、选中、移动、缩放、旋转、生成和撤回。</small></view>
        <view class="update-item"><text>v0.2.4 · 2026-07-11</text><strong>正常的封面预览</strong><small>修复封面卡片形状和预览渲染。</small></view>
        <view class="update-item"><text>v0.2.3 · 2026-07-11</text><strong>内容编辑初步正常</strong><small>调整内容编辑页并恢复封面形状。</small></view>
        <view class="update-item"><text>v0.2.2 · 2026-07-11</text><strong>封面更新</strong><small>更新专刊封面编辑和展示效果。</small></view>
        <view class="update-item"><text>v0.2.1 · 2026-07-11</text><strong>上传分类更新</strong><small>完善上传资料入口与分类结构。</small></view>
        <view class="update-item"><text>v0.1.0 · 2026-07-11</text><strong>项目初始化与登录</strong><small>建立 Vue3 项目、基础页面和登录功能。</small></view>
      </scroll-view>
      <view class="account-modal-body feature-grid" v-else>
        <view class="feature-card"><text>资料搜索</text><small>按成员、日期和文件类型搜索</small></view>
        <view class="feature-card"><text>消息提醒</text><small>新资料与更新通知</small></view>
        <view class="feature-card"><text>称号系统</text><small>测试后再向成员开放</small></view>
        <view class="feature-card"><text>协作空间</text><small>多人评论与版本管理</small></view>
      </view>
    </view>
  </view>
</template>

<script>
import { isLogin, getUser, clearAuth, setAuth } from '@/store/auth.js'
import { createTutorialTicket, logout as logoutApi } from '@/api/auth.js'
import { getStoredTheme, setGlobalTheme } from '@/utils/theme.js'
import { apiUrl, appTutorialPath, tutorialSessionUrl } from '@/utils/api.js'

export default {
  data() {
    return {
      appVersion: __APP_VERSION__,
      isCollapsed: false,
      isAnimating: false,
      isNight: false,
      themeMode: 'retro',
      themes: [
        { value: 'white', label: '白色' },
        { value: 'black', label: '黑色' },
        { value: 'retro', label: '复古' }
      ],
      profileMenuOpen: false,
      showThemeChoices: false,
      showProfileModal: false,
      showPasswordModal: false,
      showTrashModal: false,
      trashLoading: false,
      trashItems: [],
      trashCount: 0,
      trashActionId: null,
      activeAccountPanel: '',
      serverStatus: null,
      serverStatusLoading: false,
      serverStatusError: '',
      savingProfile: false,
      savingPassword: false,
      userAvatar: '',
      profileForm: { id: '', username: '', nickname: '', avatar: '' },
      passwordForm: { currentPassword: '', newPassword: '', confirmPassword: '' },
      activeNav: 'recommend',
      activeTutorial: null,
      loggedIn: false,
      userName: '未登录',
      userStatus: '离线',
      avatarText: '?',
      logoSvg: '',
      meetingUsers: [],
      meetingMaterials: [],
      selectedMemberId: null,
      materialsLoading: false,
      openMaterialMenuId: null,
      pendingUnpublishMaterial: null,
      unpublishing: false,
      navItems: [
        {
          key: 'home',
          label: '主页',
          icon: '<svg viewBox="0 0 24 24" fill="none" style="width:20px;height:20px;"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>'
        },
        {
          key: 'rbook',
          label: '科研绘图',
          icon: '<svg viewBox="0 0 24 24" fill="none" style="width:20px;height:20px;"><path d="M5 4.5h9.5A2.5 2.5 0 0 1 17 7v12.5H7A2.5 2.5 0 0 1 4.5 17V5A.5.5 0 0 1 5 4.5Z" stroke="currentColor" stroke-width="2.2"/><path d="M8 9h5M8 13h5M17 8h2.5v11.5H8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        },
        {
          key: 'upload',
          label: '上传资料',
          icon: '<svg viewBox="0 0 24 24" fill="none" style="width:20px;height:20px;"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
        },
        {
          key: 'recommend',
          label: '组会资料',
          icon: '<svg viewBox="0 0 24 24" fill="none" style="width:20px;height:20px;"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2.4"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
        },
        {
          key: 'tutorials',
          label: '电子教程',
          icon: '<svg viewBox="0 0 24 24" fill="none" style="width:20px;height:20px;"><path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h5v16H7a2.5 2.5 0 0 0-2.5 2V5.5Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 3h5a2.5 2.5 0 0 1 2.5 2.5V21A2.5 2.5 0 0 0 17 19h-5V3Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M7.5 8h2M14.5 8h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          key: 'resources',
          label: '资源推荐',
          icon: '<svg viewBox="0 0 24 24" fill="none" style="width:20px;height:20px;"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>'
        },
        {
          key: 'collaboration',
          label: '论文协作',
          icon: '<svg viewBox="0 0 24 24" fill="none" style="width:20px;height:20px;"><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="2.2"/><circle cx="17" cy="9" r="2.5" stroke="currentColor" stroke-width="2.2"/><path d="M3.5 19c.4-4 2-6 4.5-6s4.1 2 4.5 6M14 14c3.6-.8 5.8 1 6.5 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 5v5M9.5 7.5h5" stroke="currentColor" stroke-width="2"/></svg>'
        },
        {
          key: 'library',
          label: '文件库',
          icon: '<svg viewBox="0 0 24 24" fill="none" style="width:20px;height:20px;"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v14.5A1.5 1.5 0 0 1 18.5 20H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" stroke="currentColor" stroke-width="2.4"/><path d="M8 4v16M12 4v16" stroke="currentColor" stroke-width="2.4"/></svg>'
        },
        {
          key: 'project',
          label: '项目',
          icon: '<svg viewBox="0 0 24 24" fill="none" style="width:20px;height:20px;"><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z" stroke="currentColor" stroke-width="2.4"/></svg>'
        }
      ],
      recentFiles: [
        { name: 'xxx文件1', url: '#' },
        { name: 'xxx文件2', url: '#' },
        { name: 'xxx文件3', url: '#' },
        { name: 'xxx文件4', url: '#' }
      ]
    }
  },
  computed: {
    isTester() {
      if (!this.loggedIn) return false
      const user = getUser()
      return !!(user && user.role === 'admin')
    },
    visibleNavItems() {
      const hiddenForEveryone = ['collaboration']
      const hiddenForRegularUsers = ['library', 'project', 'resources']
      const items = this.isTester
        ? this.navItems.filter(item => !hiddenForEveryone.includes(item.key))
        : this.navItems.filter(item => !hiddenForEveryone.includes(item.key) && !hiddenForRegularUsers.includes(item.key))
      if (this.loggedIn) {
        const user = getUser()
        if (this.isTester) {
          items.push({
            key: 'test',
            label: '测试',
            icon: '<svg viewBox="0 0 24 24" fill="none" style="width:20px;height:20px;"><path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2.4"/><path d="M10 10l4 4M14 10l-4 4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
          })
        }
      }
      return items.sort((a, b) => {
        if (a.key === 'home') return -1
        if (b.key === 'home') return 1
        if (a.key === 'rbook') return -1
        if (b.key === 'rbook') return 1
        return 0
      })
    },
    filteredMaterials() {
      if (this.selectedMemberId === null) return this.meetingMaterials
      return this.meetingMaterials.filter(material => Number(material.uploader && material.uploader.id) === Number(this.selectedMemberId))
    },
    activeMeetingUsers() {
      const uploaderIds = new Set(this.meetingMaterials.map(material => Number(material.uploader && material.uploader.id)))
      return this.meetingUsers.filter(member => uploaderIds.has(Number(member.id)))
    },
    accountPanelTitle() {
      const titles = { extensions: '扩展功能', updates: '更新记录', future: '未来加入功能' }
      return titles[this.activeAccountPanel] || ''
    }
  },
  onLoad() {
    if (!isLogin()) {
      uni.reLaunch({ url: '/pages/login/login' })
      return
    }
    this.syncAuthState()
    this.activeNav = 'home'

    // Logo SVG 转 data URI
    const logoSvgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img"><defs><linearGradient id="bg" x1="12" y1="8" x2="86" y2="90" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2563EB"/><stop offset="0.45" stop-color="#2DD4BF"/><stop offset="1" stop-color="#22C55E"/></linearGradient><linearGradient id="letter" x1="24" y1="18" x2="76" y2="78" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E0FDF4"/></linearGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#0F172A" flood-opacity="0.26"/></filter></defs><rect width="96" height="96" rx="24" fill="#0F172A"/><rect x="8" y="8" width="80" height="80" rx="22" fill="url(#bg)" filter="url(#shadow)"/><path d="M23 24h13v38h24v11H23V24z" fill="url(#letter)"/><path d="M63 24h13v31c0 12.3-7.5 19.5-20.3 19.5-8.3 0-14.7-3.1-18.5-8.6l8.2-7.1c2.4 3.2 5.4 4.9 9.3 4.9 5.5 0 8.3-3 8.3-8.9V24z" fill="url(#letter)"/><path d="M18 74c18-2 31-11 40-26 5.9-9.8 11.3-15.1 20-17" fill="none" stroke="#B7F7EA" stroke-width="4" stroke-linecap="round" opacity="0.55"/></svg>`
    this.logoSvg = 'data:image/svg+xml;base64,' + this.base64Encode(logoSvgStr)

    // 读取保存的主题
    try {
      this.setTheme(getStoredTheme())
    } catch (e) {
      console.log('Storage not available')
    }

    // #ifdef H5
    window.addEventListener('message', this.handleTutorialMessage)
    // #endif
  },
  onShow() {
    this.syncAuthState()
    if (!this.loggedIn) {
      uni.reLaunch({ url: '/pages/login/login' })
      return
    }
    if (this.loggedIn) {
      this.refreshCurrentUser()
      this.loadMeetingMaterials()
      this.loadTrash(false)
    }
  },
  onUnload() {
    // #ifdef H5
    window.removeEventListener('message', this.handleTutorialMessage)
    // #endif
  },
  methods: {
    handleTutorialMessage(event) {
      // 只接受本站电子书发出的返回消息
      if (event.origin !== window.location.origin) return
      if (event.data && event.data.type === 'dbdwz:return-main') this.closeStaticTutorial()
    },
    refreshCurrentUser() {
      const token = uni.getStorageSync('token')
      if (!token) return
      uni.request({
        url: apiUrl('/api/auth/me?t=' + Date.now()),
        header: { Authorization: 'Bearer ' + token },
        success: response => {
          if (!response.data || response.data.code !== 200 || !response.data.data.user) return
          setAuth({ token, user: response.data.data.user })
          this.syncAuthState()
        }
      })
    },
    onNavClick(key) {
      if (key === 'tutorials' && this.activeNav === 'tutorials' && this.activeTutorial) {
        this.closeStaticTutorial()
        return
      }
      if (key !== 'tutorials') this.activeTutorial = null
      if (key === 'rbook') {
        this.openRBook()
        return
      }
      if (key === 'upload') {
        if (!this.loggedIn) return this.goLogin()
        uni.navigateTo({ url: '/pages/upload/upload' })
        return
      }
      if (key === 'tutorials' && !this.loggedIn) return this.goLogin()
      if (key === 'test') {
        uni.navigateTo({ url: '/pages/test-preview/test-preview' })
        return
      }
      if (key === 'resources') {
        uni.navigateTo({ url: '/pages/resource-recommend/resource-recommend' })
        return
      }
      if (key === 'collaboration') {
        if (!this.loggedIn) return this.goLogin()
        uni.navigateTo({ url: '/pages/collaboration/collaboration' })
        return
      }
      if (key === 'recommend' && !this.loggedIn) return this.goLogin()
      this.activeNav = key
    },
    openRBook() {
      this.activeNav = 'home'
      this.openStaticTutorial('R 科研绘图电子书', '/static/web/ebooks/r-plotting/index.html')
    },
    openDeepSeekTutorial() {
      this.openStaticTutorial('DeepSeek 接入 VS Code', '/#/pages/tutorial-detail/tutorial-detail')
    },
    openFlyWireTutorial() {
      this.openStaticTutorial('FlyWire FAFB v783 果蝇大脑下载', '/static/web/ebooks/flywire-fafb-v783/index.html')
    },
    openWebOfScienceTutorial() {
      this.openStaticTutorial('Web of Science 文献检索', '/static/web/ebooks/web-of-science/index.html')
    },
    openLeakDetectorTutorial() {
      this.openStaticTutorial('LeakDetector 使用教程', '/static/web/ebooks/leakdetector/index.html')
    },
    openPrivateCloudTutorial() {
      this.openStaticTutorial('私有云 RTX 3090 调用', '/static/web/ebooks/private-cloud-rtx3090/index.html')
    },
    async openStaticTutorial(title, path) {
      if (!this.loggedIn) return this.goLogin()
      // #ifdef APP-PLUS
      try {
        const response = await createTutorialTicket()
        const src = encodeURIComponent(tutorialSessionUrl(response.data.ticket, appTutorialPath(path)))
        const label = encodeURIComponent(title)
        uni.navigateTo({ url: `/pages/web-tutorial/web-tutorial?title=${label}&src=${src}` })
      } catch (error) {
        uni.showToast({ title: error.message || '教程授权失败，请重新登录', icon: 'none' })
      }
      return
      // #endif
      this.activeTutorial = { title, path }
      // #ifdef H5
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // #endif
    },
    closeStaticTutorial() {
      this.activeTutorial = null
    },
    toggleSidebar() {
      this.isAnimating = true
      this.isCollapsed = !this.isCollapsed
      setTimeout(() => {
        this.isAnimating = false
      }, 100)
    },
    toggleTheme() {
      this.setTheme(this.themeMode === 'black' ? 'retro' : 'black')
    },
    setTheme(theme) {
      this.themeMode = setGlobalTheme(theme)
      this.isNight = this.themeMode === 'black'
    },
    applyNightMode(night) {
      // #ifdef H5
      if (night) {
        document.body.classList.add('night')
      } else {
        document.body.classList.remove('night')
      }
      // #endif
    },
    getActiveNavLabel() {
      const item = this.navItems.find(n => n.key === this.activeNav)
      return item ? item.label : ''
    },
    onRecentClick(file) {
      console.log('Recent file clicked:', file.name)
    },
    toggleProfileMenu() {
      if (!this.loggedIn) return this.goLogin()
      this.profileMenuOpen = !this.profileMenuOpen
      if (!this.profileMenuOpen) this.showThemeChoices = false
    },
    openProfileEditor() {
      const user = getUser()
      if (!user) return
      this.profileForm = {
        id: user.id,
        username: user.username || '',
        nickname: user.nickname || '',
        avatar: user.avatar || ''
      }
      this.profileMenuOpen = false
      this.showProfileModal = true
    },
    chooseProfileAvatar() {
      // #ifdef H5
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = event => {
        const file = event.target.files && event.target.files[0]
        if (!file) return
        if (file.size > 6 * 1024 * 1024) return uni.showToast({ title: '头像不能超过 6MB', icon: 'none' })
        const reader = new FileReader()
        reader.onload = loadEvent => { this.profileForm.avatar = loadEvent.target.result }
        reader.readAsDataURL(file)
      }
      input.click()
      // #endif
    },
    saveProfile() {
      if (this.savingProfile) return
      this.savingProfile = true
      uni.request({
        url: apiUrl('/api/auth/me'),
        method: 'PUT',
        header: { Authorization: 'Bearer ' + uni.getStorageSync('token'), 'Content-Type': 'application/json' },
        data: {
          username: this.profileForm.username,
          nickname: this.profileForm.nickname,
          avatar: this.profileForm.avatar
        },
        success: response => {
          if (!response.data || response.data.code !== 200) return uni.showToast({ title: (response.data && response.data.message) || '保存失败', icon: 'none' })
          setAuth(response.data.data)
          this.syncAuthState()
          this.showProfileModal = false
          this.loadMeetingMaterials()
          uni.showToast({ title: '个人资料已保存', icon: 'success' })
        },
        fail: () => uni.showToast({ title: '无法连接服务器', icon: 'none' }),
        complete: () => { this.savingProfile = false }
      })
    },
    openPasswordEditor() {
      this.profileMenuOpen = false
      this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' }
      this.showPasswordModal = true
    },
    savePassword() {
      if (this.savingPassword) return
      const currentPassword = this.passwordForm.currentPassword
      const newPassword = this.passwordForm.newPassword
      if (!currentPassword) return uni.showToast({ title: '请输入当前密码', icon: 'none' })
      if (newPassword.length < 8 || newPassword.length > 72) return uni.showToast({ title: '新密码必须为 8-72 个字符', icon: 'none' })
      if (newPassword !== this.passwordForm.confirmPassword) return uni.showToast({ title: '两次输入的新密码不一致', icon: 'none' })
      this.savingPassword = true
      uni.request({
        url: apiUrl('/api/auth/password'),
        method: 'PUT',
        header: { Authorization: 'Bearer ' + uni.getStorageSync('token'), 'Content-Type': 'application/json' },
        data: { currentPassword, newPassword },
        success: response => {
          if (!response.data || response.data.code !== 200) return uni.showToast({ title: (response.data && response.data.message) || '修改失败', icon: 'none' })
          this.showPasswordModal = false
          this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' }
          uni.showToast({ title: '密码修改成功', icon: 'success' })
        },
        fail: () => uni.showToast({ title: '无法连接服务器', icon: 'none' }),
        complete: () => { this.savingPassword = false }
      })
    },
    openPanel(panel) {
      if ((panel === 'extensions' || panel === 'future') && !this.isTester) return
      this.profileMenuOpen = false
      this.activeAccountPanel = panel
      if (panel === 'updates') this.loadServerStatus()
    },
    closeAccountPanels() {
      this.showProfileModal = false
      this.showPasswordModal = false
      this.showTrashModal = false
      this.activeAccountPanel = ''
    },
    openTrash() {
      this.profileMenuOpen = false
      this.showTrashModal = true
      this.loadTrash(true)
    },
    loadServerStatus() {
      if (this.serverStatusLoading) return
      const token = uni.getStorageSync('token')
      if (!token) return
      this.serverStatusLoading = true
      this.serverStatusError = ''
      uni.request({
        url: apiUrl('/api/system/status?t=' + Date.now()),
        header: { Authorization: 'Bearer ' + token },
        success: response => {
          if (!response.data || response.data.code !== 200) {
            this.serverStatusError = (response.data && response.data.message) || '读取服务器容量失败'
            return
          }
          this.serverStatus = response.data.data
        },
        fail: () => { this.serverStatusError = '无法连接服务器状态接口' },
        complete: () => { this.serverStatusLoading = false }
      })
    },
    formatCapacity(bytes) {
      const value = Math.max(0, Number(bytes) || 0)
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let index = 0
      let size = value
      while (size >= 1024 && index < units.length - 1) {
        size /= 1024
        index += 1
      }
      return `${size.toFixed(index >= 3 ? 1 : 0)} ${units[index]}`
    },
    formatStatusTime(value) {
      return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : ''
    },
    loadTrash(showLoading = false) {
      const token = uni.getStorageSync('token')
      if (!token) return
      if (showLoading) this.trashLoading = true
      uni.request({
        url: apiUrl('/api/materials/trash?t=' + Date.now()),
        header: { Authorization: 'Bearer ' + token },
        success: response => {
          if (!response.data || response.data.code !== 200) {
            if (showLoading) uni.showToast({ title: (response.data && response.data.message) || '读取失败', icon: 'none' })
            return
          }
          this.trashItems = (response.data.data.items || []).map(item => ({
            ...item,
            draftTitle: item.title || '',
            draftDescription: item.description || ''
          }))
          this.trashCount = this.trashItems.length
        },
        fail: () => { if (showLoading) uni.showToast({ title: '无法连接删除内容服务', icon: 'none' }) },
        complete: () => { this.trashLoading = false }
      })
    },
    formatTrashRemaining(seconds) {
      const value = Math.max(0, Number(seconds) || 0)
      const days = Math.floor(value / 86400)
      const hours = Math.floor((value % 86400) / 3600)
      const minutes = Math.floor((value % 3600) / 60)
      return days > 0 ? `${days} 天 ${hours} 小时` : `${hours} 小时 ${minutes} 分钟`
    },
    saveTrashItem(item) {
      if (!item || this.trashActionId !== null) return
      const title = String(item.draftTitle || '').trim()
      if (!title) return uni.showToast({ title: '标题不能为空', icon: 'none' })
      this.trashActionId = item.id
      uni.request({
        url: apiUrl(`/api/materials/trash/${item.id}`),
        method: 'PUT',
        header: { Authorization: 'Bearer ' + uni.getStorageSync('token') },
        data: { title, description: item.draftDescription || '' },
        success: response => {
          if (!response.data || response.data.code !== 200) return uni.showToast({ title: (response.data && response.data.message) || '修改失败', icon: 'none' })
          item.title = title
          item.description = item.draftDescription || ''
          uni.showToast({ title: '修改已保存', icon: 'success' })
        },
        complete: () => { this.trashActionId = null }
      })
    },
    restoreTrashItem(item) {
      if (!item || this.trashActionId !== null) return
      uni.showModal({
        title: '重新上架',
        content: `确定将“${item.draftTitle || item.title}”恢复到组会资料吗？`,
        success: result => {
          if (!result.confirm) return
          this.trashActionId = item.id
          uni.request({
            url: apiUrl(`/api/materials/trash/${item.id}/restore`),
            method: 'POST',
            header: { Authorization: 'Bearer ' + uni.getStorageSync('token') },
            success: response => {
              if (!response.data || response.data.code !== 200) return uni.showToast({ title: (response.data && response.data.message) || '上架失败', icon: 'none' })
              this.trashItems = this.trashItems.filter(entry => Number(entry.id) !== Number(item.id))
              this.trashCount = this.trashItems.length
              this.loadMeetingMaterials()
              uni.showToast({ title: '已重新上架', icon: 'success' })
            },
            complete: () => { this.trashActionId = null }
          })
        }
      })
    },
    deleteTrashItem(item) {
      if (!item || this.trashActionId !== null) return
      uni.showModal({
        title: '永久删除',
        content: `确定永久删除“${item.draftTitle || item.title}”及其全部文件吗？此操作无法恢复。`,
        confirmColor: '#A43D30',
        success: result => {
          if (!result.confirm) return
          this.trashActionId = item.id
          uni.request({
            url: apiUrl(`/api/materials/trash/${item.id}`),
            method: 'DELETE',
            header: { Authorization: 'Bearer ' + uni.getStorageSync('token') },
            success: response => {
              if (!response.data || response.data.code !== 200) return uni.showToast({ title: (response.data && response.data.message) || '删除失败', icon: 'none' })
              this.trashItems = this.trashItems.filter(entry => Number(entry.id) !== Number(item.id))
              this.trashCount = this.trashItems.length
              uni.showToast({ title: '已永久删除', icon: 'success' })
            },
            complete: () => { this.trashActionId = null }
          })
        }
      })
    },
    loadMeetingMaterials() {
      const token = uni.getStorageSync('token')
      if (!token) return
      this.materialsLoading = true
      uni.request({
        url: apiUrl('/api/materials?t=' + Date.now()),
        method: 'GET',
        header: { Authorization: 'Bearer ' + token },
        success: response => {
          if (response.data && response.data.code === 200) {
            this.meetingUsers = response.data.data.users || []
            this.meetingMaterials = response.data.data.materials || []
          } else {
            uni.showToast({ title: (response.data && response.data.message) || '资料读取失败', icon: 'none' })
          }
        },
        fail: () => uni.showToast({ title: '无法连接资料服务', icon: 'none' }),
        complete: () => { this.materialsLoading = false }
      })
    },
    memberAvatar(member) {
      return String(member.nickname || member.username || '?').slice(0, 2)
    },
    memberUploadCount(memberId) {
      return this.meetingMaterials.filter(material => Number(material.uploader && material.uploader.id) === Number(memberId)).length
    },
    avatarColor(id) {
      const colors = ['#C96B4B', '#4E7C74', '#8C6AA8', '#B18442', '#4F6FA8', '#8B5D5D', '#5D7E4B', '#996B83']
      return colors[Number(id || 0) % colors.length]
    },
    formatMaterialTime(value) {
      if (!value) return ''
      return new Date(value).toLocaleString('zh-CN', { hour12: false })
    },
    formatFileSize(size) {
      const value = Number(size) || 0
      if (value < 1024) return value + ' B'
      if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB'
      return (value / 1024 / 1024).toFixed(1) + ' MB'
    },
    fileExtension(name) {
      const extension = String(name || '').split('.').pop().toUpperCase()
      return extension && extension.length <= 5 ? extension : 'FILE'
    },
    materialFileUrl(material, file) {
      const url = apiUrl('/materials-files/' + encodeURIComponent(material.folder) + '/' + encodeURIComponent(file.name))
      if (!material.testerOnly) return url
      const token = String(uni.getStorageSync('token') || '')
      return token ? url + '?access_token=' + encodeURIComponent(token) : url
    },
    openMaterialDetail(material) {
      uni.navigateTo({ url: '/pages/material-detail/material-detail?id=' + encodeURIComponent(material.id) })
    },
    canUnpublish(material) {
      const user = getUser()
      return !!(user && material && material.uploader && Number(user.id) === Number(material.uploader.id))
    },
    toggleMaterialMenu(material) {
      this.openMaterialMenuId = this.openMaterialMenuId === material.id ? null : material.id
    },
    editMaterial(material) {
      if (!this.canUnpublish(material)) return
      this.openMaterialMenuId = null
      uni.navigateTo({ url: '/pages/material-edit/material-edit?id=' + encodeURIComponent(material.id) })
    },
    unpublishMaterial(material) {
      if (!this.canUnpublish(material)) return
      this.openMaterialMenuId = null
      this.pendingUnpublishMaterial = material
    },
    cancelUnpublish() {
      if (this.unpublishing) return
      this.pendingUnpublishMaterial = null
    },
    confirmUnpublish() {
      const material = this.pendingUnpublishMaterial
      if (!material || this.unpublishing || !this.canUnpublish(material)) return
      this.unpublishing = true
      uni.request({
        url: apiUrl(`/api/materials/${material.id}/unpublish`),
        method: 'POST',
        header: { Authorization: 'Bearer ' + uni.getStorageSync('token') },
        success: response => {
          if (!response.data || response.data.code !== 200) {
            return uni.showToast({ title: (response.data && response.data.message) || '下架失败', icon: 'none' })
          }
          this.meetingMaterials = this.meetingMaterials.filter(item => Number(item.id) !== Number(material.id))
          this.pendingUnpublishMaterial = null
          this.loadTrash(false)
          uni.showToast({ title: '已下架', icon: 'success' })
        },
        fail: () => uni.showToast({ title: '无法连接资料服务', icon: 'none' }),
        complete: () => { this.unpublishing = false }
      })
    },
    syncAuthState() {
      // #ifdef H5
      if (isLogin()) {
        const user = getUser()
        this.loggedIn = true
        this.userName = user.nickname || user.username
        this.userStatus = '在线'
        this.avatarText = (user.nickname || user.username).substring(0, 2).toUpperCase()
        this.userAvatar = user.avatarUrl || user.avatar || ''
      } else {
        this.loggedIn = false
        this.userName = '未登录'
        this.userStatus = '离线'
        this.avatarText = '?'
        this.userAvatar = ''
      }
      // #endif
      // #ifndef H5
      this.loggedIn = false
      this.userName = 'H5登录'
      this.userStatus = '—'
      this.avatarText = 'JL'
      // #endif
    },
    onProfileClick() {},
    async handleLogout() {
      this.profileMenuOpen = false
      try { await logoutApi() } catch (error) {}
      finally {
        clearAuth()
        this.syncAuthState()
        uni.reLaunch({ url: '/pages/login/login' })
      }
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/login/login' })
    },
    base64Encode(str) {
      // #ifdef H5
      return btoa(unescape(encodeURIComponent(str)))
      // #endif
      // #ifndef H5
      // 简易 base64 编码 (非H5环境)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      let result = ''
      const bytes = []
      for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i)
        if (c < 0x80) bytes.push(c)
        else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
        else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
      }
      for (let i = 0; i < bytes.length; i += 3) {
        const b1 = bytes[i] || 0
        const b2 = bytes[i + 1] || 0
        const b3 = bytes[i + 2] || 0
        result += chars[b1 >> 2]
        result += chars[((b1 & 3) << 4) | (b2 >> 4)]
        result += (i + 1 < bytes.length) ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '='
        result += (i + 2 < bytes.length) ? chars[b3 & 63] : '='
      }
      return result
      // #endif
    }
  }
}
</script>

<style scoped>
/* ===== 主容器 ===== */
.app {
  min-height: 100vh;
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  transition: grid-template-columns .46s var(--ease-soft);
  will-change: grid-template-columns;
}

.app.collapsed {
  grid-template-columns: var(--sidebar-mini) 1fr;
}

.app.tutorial-mode,
.app.tutorial-mode.collapsed {
  grid-template-columns: 1fr;
}

/* ===== 侧边栏 ===== */
.sidebar {
  height: 100vh;
  position: sticky;
  z-index: 85;
  top: 0;
  padding: 18px 14px;
  background: rgba(234, 215, 183, 0.84);
  border-right: 5px solid var(--line);
  box-shadow: 8px 0 0 var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  transition: padding .46s var(--ease-soft), background .35s var(--ease-soft);
}

/* 品牌 */
.brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 54px;
}

.brand-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  max-width: 202px;
  opacity: 1;
  overflow: hidden;
  transition: max-width .46s var(--ease-soft), opacity .1s ease;
}

.brand-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 3px;
  background: rgba(15, 23, 42, 0.84);
  border: 4px solid var(--line);
  box-shadow: 5px 5px 0 var(--shadow);
  overflow: hidden;
}

.brand-logo {
  width: 100%;
  height: 100%;
  border-radius: 10px;
}

.brand-text {
  min-width: 0;
  line-height: 1.15;
  white-space: nowrap;
}

.brand-title {
  display: block;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: .035em;
  color: var(--ink);
}

.brand-version {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .06em;
}

.brand-sub {
  display: block;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

/* 折叠按钮 */
.toggle {
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: 4px solid var(--line);
  background: rgba(255, 250, 241, 0.86);
  box-shadow: 5px 5px 0 var(--shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  overflow: hidden;
  transition: transform .18s var(--ease-pop), box-shadow .18s var(--ease-pop), background .28s var(--ease-soft);
}

.toggle:active {
  transform: translate(3px, 3px);
  box-shadow: 2px 2px 0 var(--shadow);
}

.toggle-icon-wrap {
  position: absolute;
  inset: 0;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity .1s ease, transform .18s var(--ease-soft);
}

.toggle-icon-text {
  font-size: 16px;
  color: var(--ink);
}

.collapsed-logo {
  position: absolute;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  opacity: 0;
  transform: scale(.76);
  pointer-events: none;
  transition: opacity .1s ease, transform .18s var(--ease-soft);
}

.app.collapsed .collapsed-logo {
  opacity: 1;
  transform: scale(1);
}

/* 导航 */
.nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-item {
  height: 48px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  background: rgba(255, 250, 241, 0.88);
  border: 4px solid var(--line);
  box-shadow: 5px 5px 0 var(--shadow);
  font-weight: 900;
  letter-spacing: .04em;
  color: var(--ink);
  transition: transform .18s var(--ease-pop), background .24s var(--ease-soft), gap .46s var(--ease-soft);
}

.nav-item:hover {
  background: rgba(255, 250, 241, 0.82);
  transform: translate(-1px, -1px);
}

.nav-item.active {
  color: #fffaf1;
  background: var(--green);
}

.icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 170px;
  opacity: 1;
  transition: max-width .46s var(--ease-soft), opacity .1s ease;
}

/* 最近文件 */
.recent-title {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: .16em;
  color: var(--muted);
  white-space: nowrap;
  transition: opacity .1s ease, max-width .46s var(--ease-soft);
}

.recent-list {
  min-height: 0;
  max-height: 240px;
  opacity: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: max-height .46s var(--ease-soft), opacity .1s ease;
}

.recent-item {
  color: var(--ink);
  background: rgba(255, 250, 241, 0.76);
  border: 3px solid var(--line);
  padding: 10px;
  box-shadow: 4px 4px 0 rgba(36, 28, 20, 0.17);
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: transform .18s var(--ease-pop);
}

.recent-item:hover {
  transform: translate(-1px, -1px);
}

.spacer {
  flex: 1;
  min-height: 14px;
}

/* 用户资料 */
.profile {
  height: 58px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: rgba(255, 250, 241, 0.86);
  border: 4px solid var(--line);
  box-shadow: 5px 5px 0 var(--shadow);
  transition: gap .46s var(--ease-soft), padding .46s var(--ease-soft);
}

.avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--line);
  background: var(--green);
  color: #fffaf1;
  font-weight: 900;
  font-size: 12px;
}

.user-meta {
  line-height: 1.1;
  white-space: nowrap;
}

.user-name {
  display: block;
  font-size: 13px;
  font-weight: 900;
  color: var(--ink);
}

.user-status {
  display: block;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.user-status.offline {
  color: var(--red);
  opacity: .8;
}

/* profile 点击交互 */
.profile {
  cursor: pointer;
}

.profile:hover {
  filter: brightness(1.04);
  transform: translate(-1px, -1px);
}

.profile-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}

.logout-btn,
.login-btn {
  height: 30px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--line);
  background: rgba(255, 250, 241, 0.9);
  box-shadow: 3px 3px 0 var(--shadow);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .08em;
  color: var(--ink);
  transition: transform .15s var(--ease-pop), box-shadow .15s var(--ease-pop);
}

.logout-btn:active,
.login-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--shadow);
}

.collapsed .profile-actions {
  display: none;
}

/* ===== 折叠状态 ===== */
.collapsed .sidebar {
  padding-left: 10px;
  padding-right: 10px;
}

.collapsed .brand {
  justify-content: center;
  gap: 0;
}

.collapsed .brand-main {
  display: none;
}

.collapsed .brand-text,
.collapsed .nav-label,
.collapsed .recent-title,
.collapsed .recent-list,
.collapsed .user-meta {
  opacity: 0;
  max-width: 0;
  width: 0;
  pointer-events: none;
}

.collapsed .recent-list {
  max-height: 0;
}

.collapsed .nav-item,
.collapsed .profile {
  gap: 0;
  padding-left: 0;
  padding-right: 0;
  justify-content: center;
}

/* ===== 主区域 ===== */
.main {
  position: relative;
  min-width: 0;
  min-height: 100vh;
  background:
    linear-gradient(90deg, rgba(36, 28, 20, .035) 1px, transparent 1px),
    linear-gradient(rgba(36, 28, 20, .035) 1px, transparent 1px),
    var(--paper);
  background-size: 36px 36px;
  overflow: hidden;
  transition: background .35s var(--ease-soft);
}

/* 主题切换按钮 */
.theme-toggle {
  position: absolute;
  top: 26px;
  right: 28px;
  width: 76px;
  height: 48px;
  border: 5px solid var(--line);
  background: rgba(255, 250, 241, 0.84);
  box-shadow: 6px 6px 0 var(--shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 900;
  color: var(--ink);
  z-index: 10;
  transition: background .35s var(--ease-soft), transform .18s var(--ease-pop), box-shadow .18s var(--ease-pop);
}

.theme-toggle:active {
  transform: translate(3px, 3px);
  box-shadow: 2px 2px 0 var(--shadow);
}

/* 开放主页 */
.home-empty {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 42px 34px 96px;
  box-sizing: border-box;
  overflow: auto;
}

.home-landing { width: min(1040px, 100%); }
.home-hero { padding: 42px; border: 5px solid var(--line); background: var(--paper-2); box-shadow: 10px 10px 0 var(--shadow); }
.home-eyebrow { color: var(--accent); font-size: 11px; font-weight: 1000; letter-spacing: .16em; }
.home-title { display: block; max-width: 760px; margin-top: 14px; color: var(--ink); font-size: clamp(30px, 5vw, 56px); font-weight: 1000; line-height: 1.08; }
.home-desc { display: block; max-width: 720px; margin-top: 18px; color: var(--muted); font-size: 14px; font-weight: 700; line-height: 1.9; }
.home-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
.home-action { padding: 12px 16px; border: 3px solid var(--line); background: var(--paper-2); color: var(--ink); box-shadow: 4px 4px 0 var(--shadow); font-size: 12px; font-weight: 1000; cursor: pointer; transition: transform .16s ease, box-shadow .16s ease; }
.home-action.primary { background: var(--green); color: #fffaf1; }
.home-action:active { transform: translate(3px, 3px); box-shadow: 1px 1px 0 var(--shadow); }
.home-feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: 24px; }
.home-feature { min-height: 190px; padding: 22px; border: 4px solid var(--line); background: var(--paper-2); box-shadow: 6px 6px 0 var(--shadow); cursor: pointer; }
.home-feature.featured { background: var(--surface-muted); }
.home-feature-no, .home-feature strong, .home-feature small, .home-feature-link { display: block; }
.home-feature-no { color: var(--accent); font-size: 10px; font-weight: 1000; letter-spacing: .08em; }
.home-feature strong { margin-top: 13px; color: var(--ink); font-size: 18px; line-height: 1.35; }
.home-feature small { margin-top: 10px; color: var(--muted); font-size: 11px; font-weight: 700; line-height: 1.75; }
.home-feature-link { margin-top: 18px; color: var(--green-dark); font-size: 11px; font-weight: 1000; }

/* 电子教程 */
.tutorial-landing { width: min(960px, 100%); }
.tutorial-reader-full { width: 100%; height: 100vh; overflow: hidden; background: var(--paper); }
.tutorial-frame-full { display: block; width: 100%; height: 100%; border: 0; background: #fff; }
.tutorial-reader-fallback { height: 100%; display: flex; align-items: center; justify-content: center; background: var(--paper-2); color: var(--muted); font-size: 14px; font-weight: 900; }
.tutorial-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 24px; padding: 28px 30px; border: 5px solid var(--line); background: var(--surface-muted); box-shadow: 8px 8px 0 var(--shadow); }
.tutorial-eyebrow, .tutorial-title, .tutorial-subtitle { display: block; }
.tutorial-eyebrow { color: var(--accent); font-size: 10px; font-weight: 1000; letter-spacing: .16em; }
.tutorial-title { margin-top: 9px; color: var(--ink); font-size: clamp(28px, 4vw, 43px); font-weight: 1000; line-height: 1.15; }
.tutorial-subtitle { margin-top: 8px; color: var(--muted); font-size: 12px; font-weight: 800; line-height: 1.7; }
.tutorial-count { width: 62px; height: 62px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 4px solid var(--line); background: var(--accent); color: #fffaf1; box-shadow: 4px 4px 0 var(--shadow); font-size: 20px; font-weight: 1000; }
.tutorial-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
.tutorial-card { position: relative; min-width: 0; min-height: 360px; display: flex; flex-direction: column; padding: 24px; border: 4px solid var(--line); background: var(--paper-2); color: var(--ink); box-shadow: 7px 7px 0 var(--shadow); }
.tutorial-card.available { cursor: pointer; transition: transform .16s var(--ease-pop), box-shadow .16s var(--ease-pop); }
.tutorial-card.available:hover { transform: translate(-2px, -2px); box-shadow: 10px 10px 0 var(--shadow); }
.tutorial-card.available:active { transform: translate(4px, 4px); box-shadow: 2px 2px 0 var(--shadow); }
.tutorial-card.developing { border-style: dashed; background: color-mix(in srgb, var(--paper-2) 75%, var(--surface-muted)); }
.tutorial-card-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.tutorial-index { font-size: 13px; font-weight: 1000; letter-spacing: .12em; }
.tutorial-status { padding: 5px 8px; border: 2px solid var(--border-soft); color: var(--muted); font-size: 9px; font-weight: 1000; letter-spacing: .08em; }
.tutorial-status.online { border-color: var(--green-dark); background: var(--green); color: #fffaf1; }
.tutorial-icon { width: 66px; height: 66px; margin-top: 28px; display: flex; align-items: center; justify-content: center; border: 3px solid var(--line); background: var(--surface-muted); box-shadow: 4px 4px 0 var(--shadow); color: var(--accent); font-size: 18px; font-weight: 1000; }
.tutorial-icon.muted { color: var(--muted); }
.tutorial-card-title { display: block; margin-top: 24px; font-size: 21px; font-weight: 1000; line-height: 1.35; }
.tutorial-card-desc { display: block; margin-top: 11px; color: var(--muted); font-size: 11px; font-weight: 700; line-height: 1.8; }
.tutorial-meta { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 16px; }
.tutorial-meta text { padding: 4px 7px; border: 2px solid var(--border-soft); color: var(--muted); font-size: 8px; font-weight: 900; }
.tutorial-open { margin-top: auto; padding-top: 20px; color: var(--green-dark); font-size: 12px; font-weight: 1000; }
.tutorial-open strong { margin-left: 5px; font-size: 17px; }
.tutorial-open.disabled { color: var(--muted); }

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-title {
  font-size: 28px;
  font-weight: 900;
  color: var(--ink);
  letter-spacing: .04em;
}

.empty-desc {
  font-size: 15px;
  font-weight: 800;
  color: var(--muted);
  letter-spacing: .02em;
}

/* 备案信息 */
.site-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 18px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 0 24px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .02em;
  white-space: nowrap;
  opacity: .82;
  transition: color .25s ease, opacity .25s ease;
}

.record-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  line-height: 1;
}

.record-link { color: inherit; text-decoration: none; cursor: pointer; }
.record-link:hover { color: var(--ink); opacity: 1; }

.record-separator {
  width: 1px;
  height: 12px;
  background: currentColor;
  opacity: .35;
}

.record-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .app {
    grid-template-columns: var(--sidebar-mini) 1fr;
  }

  .app.tutorial-mode,
  .app.tutorial-mode.collapsed {
    grid-template-columns: 1fr;
  }

  .brand-text,
  .nav-label,
  .recent-title,
  .recent-list,
  .user-meta {
    display: none;
  }

  .brand,
  .nav-item,
  .profile {
    justify-content: center;
  }

  .brand-main {
    display: none;
  }

  .sidebar {
    padding-left: 10px;
    padding-right: 10px;
  }
}

@media (max-width: 620px) {
  .app {
    display: block;
    padding-bottom: 72px;
  }

  .sidebar {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 100;
    width: 100%;
    height: 72px;
    box-sizing: border-box;
    padding: 7px 8px;
    flex-direction: row;
    align-items: center;
    gap: 7px;
    overflow: visible;
    border-right: 0;
    border-top: 4px solid var(--line);
    box-shadow: 0 -5px 0 var(--shadow);
  }

  .sidebar .brand,
  .sidebar .recent-title,
  .sidebar .recent-list,
  .sidebar > .spacer {
    display: none;
  }

  .sidebar .nav {
    min-width: 0;
    flex: 1;
    flex-direction: row;
    gap: 7px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .sidebar .nav::-webkit-scrollbar {
    display: none;
  }

  .sidebar .nav-item {
    width: 48px;
    min-width: 48px;
    height: 48px;
    box-sizing: border-box;
    padding: 0;
    justify-content: center;
    border-width: 3px;
    box-shadow: 3px 3px 0 var(--shadow);
  }

  .sidebar .profile {
    width: 50px;
    min-width: 50px;
    height: 50px;
    box-sizing: border-box;
    padding: 5px;
    justify-content: center;
    border-width: 3px;
    box-shadow: 3px 3px 0 var(--shadow);
  }

  .sidebar .profile-actions,
  .sidebar .user-meta {
    display: none;
  }

  .main {
    min-height: calc(100vh - 72px);
  }

  .home-empty { min-height: calc(100vh - 72px); padding: 18px 12px 112px; align-items: flex-start; }
  .home-hero { padding: 24px 18px; border-width: 4px; box-shadow: 6px 6px 0 var(--shadow); }
  .home-title { font-size: 30px; }
  .home-desc { font-size: 12px; }
  .home-actions { flex-direction: column; }
  .home-action { text-align: center; }
  .home-feature-grid { grid-template-columns: 1fr; gap: 14px; }
  .home-feature { min-height: 0; }
  .tutorial-head { align-items: center; margin-bottom: 16px; padding: 21px 18px; border-width: 4px; box-shadow: 6px 6px 0 var(--shadow); }
  .tutorial-count { width: 48px; height: 48px; border-width: 3px; font-size: 16px; }
  .tutorial-grid { grid-template-columns: 1fr; gap: 16px; }
  .tutorial-card { min-height: 320px; padding: 20px; }
  .tutorial-mode .main { min-height: 100vh; }

  .meeting-hub {
    height: calc(100vh - 72px);
  }

  .theme-toggle {
    top: 18px;
    right: 18px;
  }

  .site-footer {
    bottom: 84px;
    gap: 8px;
    padding: 0 12px;
    font-size: 10px;
  }

  .record-icon {
    width: 16px;
    height: 16px;
  }
}
.meeting-hub { box-sizing: border-box; height: 100vh; padding: 26px 30px 70px; display: flex; flex-direction: column; gap: 18px; background: #F3E4C9; color: #2E1D0E; overflow: hidden; }
.meeting-head { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }.meeting-title, .meeting-subtitle { display: block; }.meeting-title { font-size: 25px; font-weight: 900; }.meeting-subtitle { margin-top: 5px; color: #8C7B5E; font-size: 12px; font-weight: 700; }
.meeting-refresh { padding: 7px 14px; border: 3px solid #2E1D0E; background: #FFFAF1; box-shadow: 3px 3px 0 #2E1D0E26; font-size: 12px; font-weight: 900; cursor: pointer; }
.member-strip { flex: 0 0 98px; width: 100%; white-space: nowrap; }.member-list { box-sizing: border-box; display: inline-flex; gap: 6px; padding: 2px 3px 7px; }.member-card { position: relative; width: 72px; min-width: 72px; height: 86px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5px 2px; border: 2px solid #C0B5A0; background: #FFFAF1; cursor: pointer; transition: .15s; }.member-card:hover { transform: translateY(-2px); }.member-card.active { border-color: #2E1D0E; box-shadow: 3px 3px 0 #2E1D0E33; background: #F8E5C4; }
.member-avatar { width: 40px; height: 40px; flex-shrink: 0; border: 2px solid #2E1D0E; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 900; }.all-avatar { background: #2E1D0E; }.member-name { display: block; max-width: 100%; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; font-weight: 900; }
.member-count { position: absolute; right: 3px; bottom: 2px; min-width: 16px; height: 16px; padding: 0 3px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 1px solid #2E1D0E; border-radius: 9px; background: #C96B4B; color: #fff; font-size: 8px; font-weight: 900; }
.material-scroll { flex: 1; min-height: 0; }.material-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 14px; padding: 2px 5px 16px; }.material-card { padding: 16px; border: 3px solid #2E1D0E; background: #FFFAF1; box-shadow: 5px 5px 0 #2E1D0E1F; }.material-card-head { display: flex; align-items: center; gap: 10px; }.material-folder-icon { font-size: 28px; }.material-heading { min-width: 0; flex: 1; }.material-title, .material-meta { display: block; }.material-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; font-weight: 900; }.material-meta { margin-top: 3px; color: #8C7B5E; font-size: 10px; }.material-description { display: block; margin: 12px 0; color: #5E4C35; font-size: 12px; line-height: 1.6; }.material-files { display: flex; flex-direction: column; gap: 7px; margin-top: 12px; }.material-file { display: flex; align-items: center; gap: 8px; padding: 8px; border: 2px solid #C0B5A0; background: #fff; color: #2E1D0E; text-decoration: none; }.material-file-type { width: 38px; flex-shrink: 0; padding: 6px 1px; border: 2px solid #2E1D0E; text-align: center; font-size: 8px; font-weight: 900; }.material-file-info { min-width: 0; flex: 1; }.material-file-name, .material-file-size { display: block; }.material-file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 800; }.material-file-size { color: #8C7B5E; font-size: 9px; }.material-download { color: #8C5A2E; font-size: 10px; font-weight: 900; }.material-empty { padding: 80px 20px; border: 3px dashed #C0B5A0; color: #8C7B5E; text-align: center; font-weight: 800; }
.material-card { position: relative; box-sizing: border-box; height: 430px; display: flex; flex-direction: column; overflow: hidden; }.material-card.menu-open { z-index: 22; overflow: visible; }.material-menu-mask { position: fixed; inset: 0; z-index: 20; background: transparent; }.material-action-wrap { position: relative; z-index: 23; flex-shrink: 0; }.material-action-trigger { min-width: 50px; padding: 6px 9px; border: 2px solid #2E1D0E; background: #F3E4C9; color: #2E1D0E; box-shadow: 2px 2px 0 #2E1D0E; text-align: center; font-size: 10px; font-weight: 900; cursor: pointer; }.material-action-trigger:hover { transform: translate(1px,1px); box-shadow: 1px 1px 0 #2E1D0E; background: #E9D5B2; }.material-action-menu { position: absolute; top: calc(100% + 5px); right: 0; min-width: 112px; display: grid; grid-template-columns: 1fr 1fr; border: 2px solid #2E1D0E; background: #FFFAF1; box-shadow: 4px 4px 0 #2E1D0E33; }.material-action-menu view { padding: 8px 10px; color: #2E1D0E; text-align: center; font-size: 10px; font-weight: 900; cursor: pointer; }.material-action-menu view + view { border-left: 2px solid #2E1D0E; }.material-action-menu view:hover { background: #E9D5B2; }.material-action-menu .danger { color: #A43D30; }.material-description { width: 100%; max-width: 100%; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; line-height: 1.6; }.material-files { margin-top: 0; }.material-enter { min-height: 34px; margin-top: auto; display: flex; align-items: center; justify-content: flex-end; gap: 8px; border-top: 2px solid #D8CDBA; color: #8C5A2E; font-size: 11px; font-weight: 900; cursor: pointer; }.material-enter strong { font-size: 23px; line-height: 1; }.material-enter:hover { color: #2E1D0E; }
.unpublish-mask { position: fixed; inset: 0; z-index: 120; background: rgba(35,27,19,.58); backdrop-filter: blur(2px); }.unpublish-dialog { position: fixed; left: 50%; top: 50%; z-index: 121; width: min(440px, calc(100vw - 32px)); transform: translate(-50%,-50%); border: 4px solid #2E1D0E; background: #FFFAF1; color: #2E1D0E; box-shadow: 9px 9px 0 #2E1D0E45; }.unpublish-dialog-head { display: flex; align-items: center; gap: 11px; padding: 14px 16px; border-bottom: 3px solid #2E1D0E; background: #E9D5B2; font-size: 16px; font-weight: 900; }.unpublish-dialog-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: 2px solid #2E1D0E; background: #F3E4C9; font-size: 20px; font-weight: 900; }.unpublish-dialog-body { padding: 22px 20px; }.unpublish-dialog-body text, .unpublish-dialog-body strong, .unpublish-dialog-body small { display: block; }.unpublish-dialog-body text { color: #705D42; font-size: 12px; }.unpublish-dialog-body strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 11px 0; padding: 11px; border: 2px solid #B7A98F; background: #FFF; font-size: 13px; }.unpublish-dialog-body small { color: #8C7B5E; font-size: 10px; line-height: 1.6; }.unpublish-dialog-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 20px 20px; }.dialog-button { padding: 10px; border: 3px solid #2E1D0E; text-align: center; font-size: 12px; font-weight: 900; cursor: pointer; box-shadow: 3px 3px 0 #2E1D0E; }.dialog-button.cancel { background: #FFFAF1; }.dialog-button.confirm { background: #8C5A2E; color: #FFF; }.dialog-button:hover { transform: translate(2px,2px); box-shadow: 1px 1px 0 #2E1D0E; }.dialog-button.disabled { opacity: .55; cursor: wait; }
@media (max-width: 800px) { .meeting-hub { padding: 18px 14px 60px; }.material-grid { grid-template-columns: 1fr; } }

/* 账户头像菜单 */
.avatar { overflow: hidden; }.avatar image, .menu-avatar image { width: 100%; height: 100%; }.profile-chevron { color: var(--ink); font-size: 18px; font-weight: 900; }
.profile-menu-mask { position: fixed; inset: 0; z-index: 70; background: transparent; }
.profile-menu { position: fixed; left: 14px; bottom: 92px; z-index: 90; width: 264px; box-sizing: border-box; padding: 12px; border: 3px solid #2E1D0E; border-radius: 16px; background: #343434; color: #fff; box-shadow: 7px 7px 0 #2E1D0E33; }
.profile-menu-head { display: flex; align-items: center; gap: 11px; padding: 4px 5px 8px; }.menu-avatar { width: 42px; height: 42px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 2px solid #fff; border-radius: 50%; background: #3A87B8; font-size: 12px; font-weight: 900; }.menu-user-info { min-width: 0; }.menu-user-name, .menu-user-title { display: block; }.menu-user-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; font-weight: 900; }.menu-user-title { margin-top: 2px; color: #BDBDBD; font-size: 11px; }
.profile-menu-line { height: 1px; margin: 5px 6px; background: #5B5B5B; }.profile-menu-item { display: flex; align-items: center; gap: 10px; min-height: 38px; padding: 0 8px; border-radius: 9px; font-size: 13px; font-weight: 800; cursor: pointer; }.profile-menu-item:hover { background: #4C4C4C; }.profile-menu-item > text:first-child { width: 20px; text-align: center; font-size: 17px; }.profile-menu-item.danger { color: #FFD7D2; }.menu-arrow { margin-left: auto; font-size: 20px; }.theme-choices { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; padding: 4px 8px 8px 38px; }.theme-choice { padding: 6px 2px; border: 1px solid #6A6A6A; border-radius: 6px; color: #D6D6D6; text-align: center; font-size: 10px; cursor: pointer; }.theme-choice.active { border-color: #fff; background: #F3E4C9; color: #2E1D0E; font-weight: 900; }
.password-modal { width: min(430px, calc(100vw - 32px)); }.password-notice { margin-bottom: 16px; padding: 10px 12px; border: 2px solid #C0B5A0; background: #F8F1E5; color: #6E5B40; font-size: 10px; line-height: 1.6; }

/* 账户弹窗 */
.account-modal-mask { position: fixed; inset: 0; z-index: 110; background: rgba(25,18,12,.5); backdrop-filter: blur(2px); }.account-modal { position: fixed; left: 50%; top: 50%; z-index: 111; width: min(480px, calc(100vw - 32px)); max-height: min(680px, calc(100vh - 40px)); display: flex; flex-direction: column; transform: translate(-50%,-50%); border: 4px solid #2E1D0E; background: #FFFAF1; color: #2E1D0E; box-shadow: 9px 9px 0 #2E1D0E30; }.account-modal-head { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; border-bottom: 3px solid #2E1D0E; background: #E9D5B2; font-size: 16px; font-weight: 900; }.account-modal-head view { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 22px; }.account-modal-body { padding: 18px; overflow-y: auto; }.avatar-editor { position: relative; width: 88px; height: 88px; margin: 0 auto 18px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 3px solid #2E1D0E; border-radius: 50%; background: #C96B4B; color: #fff; font-size: 20px; font-weight: 900; cursor: pointer; }.avatar-editor image { width: 100%; height: 100%; }.avatar-edit-hint { position: absolute; left: 0; right: 0; bottom: 0; padding: 4px 0 7px; background: rgba(0,0,0,.58); color: #fff; text-align: center; font-size: 9px; }.account-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 13px; }.account-field > text { font-size: 12px; font-weight: 900; }.account-input { box-sizing: border-box; width: 100%; height: 42px; padding: 0 9px; border: 2px solid #C0B5A0; background: #fff; display: flex; align-items: center; }.account-input :deep(.uni-input-input) { width: 100%; height: 36px; line-height: 36px; }.database-id { margin: 5px 0 15px; color: #8C7B5E; font-size: 10px; }.account-save { padding: 11px; border: 3px solid #2E1D0E; background: #2E1D0E; color: #fff; text-align: center; font-weight: 900; cursor: pointer; }.account-save.disabled { opacity: .5; }.feature-modal { width: min(620px, calc(100vw - 32px)); }.feature-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }.feature-card { padding: 18px; border: 3px solid #C0B5A0; background: #fff; }.feature-card text, .feature-card small { display: block; }.feature-card text { font-size: 14px; font-weight: 900; }.feature-card small { margin-top: 7px; color: #8C7B5E; font-size: 11px; line-height: 1.5; }.update-list { min-height: 280px; }.update-item { padding: 13px 4px; border-bottom: 2px solid #D8CDBA; }.update-item text, .update-item strong, .update-item small { display: block; }.update-item text { color: #8C5A2E; font-size: 10px; font-weight: 900; }.update-item strong { margin-top: 4px; font-size: 14px; }.update-item small { margin-top: 5px; color: #8C7B5E; line-height: 1.6; }

/* 三种界面风格 */
.app.theme-retro { --theme-bg: #F3E4C9; }.app.theme-white { --ink:#20252C; --line:#303740; --paper:#FFFFFF; --muted:#67707A; --shadow:rgba(32,37,44,.16); --theme-bg:#F4F6F8; }.app.theme-black { --ink:#F2F2F2; --line:#9A9A9A; --paper:#252525; --muted:#B8B8B8; --shadow:rgba(0,0,0,.5); --theme-bg:#181818; }
.theme-white .sidebar { background:#EBEFF2; }.theme-white .meeting-hub { background:#F4F6F8; }.theme-white .material-card, .theme-white .member-card, .theme-white .material-empty { background:#fff; }
.theme-black { background:#181818; }.theme-black .sidebar { background:#202020; }.theme-black .meeting-hub { background:#181818; color:#F2F2F2; }.theme-black .member-card, .theme-black .material-card, .theme-black .material-empty { background:#292929; color:#F2F2F2; }.theme-black .material-file { background:#202020; color:#F2F2F2; }.theme-black .site-footer { color:#B8B8B8; }.theme-black .profile { background:#292929; }
@media (max-width:620px) { .profile-menu { left:12px; right:12px; bottom:84px; width:auto; max-height:calc(100vh - 104px); overflow-y:auto; }.feature-grid { grid-template-columns:1fr; } }

/* 统一头像规范：方形展示；文字只在用户未设置头像时出现。 */
.avatar, .menu-avatar, .avatar-editor, .member-avatar, .material-uploader-avatar { border-radius: 0 !important; }
.member-avatar, .material-uploader-avatar { overflow: hidden; }
.member-avatar image, .material-uploader-avatar image { width: 100%; height: 100%; }
.material-uploader-avatar { width: 40px; height: 40px; flex-shrink: 0; border: 2px solid #2E1D0E; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 900; }

/* 我的删除 */
.trash-menu-count { min-width: 18px; height: 18px; margin-left: auto; padding: 0 4px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 1px solid #fff; background: #A43D30; color: #fff; font-size: 9px; font-weight: 900; }
.trash-modal { width: min(760px, calc(100vw - 32px)); height: min(720px, calc(100vh - 40px)); }.trash-notice { flex-shrink: 0; padding: 11px 16px; border-bottom: 2px solid #B7A98F; background: #F3E4C9; color: #6E5B40; font-size: 11px; line-height: 1.6; }.trash-list { min-height: 0; flex: 1; box-sizing: border-box; padding: 14px; overflow-y: auto; }.trash-empty { padding: 80px 20px; color: #8C7B5E; text-align: center; font-weight: 900; }.trash-card { margin-bottom: 13px; padding: 13px; border: 3px solid #2E1D0E; background: #FFFAF1; box-shadow: 4px 4px 0 #2E1D0E22; }.trash-card-top { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; color: #8C5A2E; font-size: 10px; font-weight: 900; }.trash-card-top small { color: #8C7B5E; }.trash-title-input, .trash-description-input { box-sizing: border-box; width: 100%; border: 2px solid #B7A98F; background: #fff; color: #2E1D0E; }.trash-title-input { height: 39px; padding: 0 9px; font-weight: 900; }.trash-description-input { height: 76px; margin-top: 8px; padding: 8px 9px; font-size: 11px; line-height: 1.5; }.trash-file-summary { margin-top: 9px; padding: 8px 10px; border: 2px dashed #C0B5A0; background: #F8F1E5; }.trash-file-summary text, .trash-file-summary small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.trash-file-summary text { font-size: 9px; line-height: 1.6; }.trash-file-summary small { margin-top: 3px; color: #8C7B5E; font-size: 9px; }.trash-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }.trash-action { padding: 9px 5px; border: 2px solid #2E1D0E; text-align: center; font-size: 10px; font-weight: 900; cursor: pointer; }.trash-action.save { background: #F3E4C9; }.trash-action.restore { background: #4E7C74; color: #fff; }.trash-action.remove { background: #A43D30; color: #fff; }.theme-black .trash-notice, .theme-black .trash-card, .theme-black .trash-file-summary { background: #292929; color: #F2F2F2; }.theme-black .trash-title-input, .theme-black .trash-description-input { background: #202020; color: #F2F2F2; }
@media (max-width:620px) { .trash-actions { grid-template-columns: 1fr; }.trash-modal { height: calc(100vh - 24px); } }

/* 更新记录中的服务器容量 */
.server-status-panel { margin-bottom: 15px; padding: 14px; border: 3px solid #2E1D0E; background: #FFFAF1; box-shadow: 4px 4px 0 #2E1D0E22; }.server-status-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; }.server-status-head strong, .server-status-head small { display: block; }.server-status-head strong { font-size: 15px; }.server-status-head small { margin-top: 4px; color: #8C7B5E; font-size: 9px; }.server-status-refresh { flex-shrink: 0; padding: 6px 10px; border: 2px solid #2E1D0E; background: #F3E4C9; box-shadow: 2px 2px 0 #2E1D0E; font-size: 10px; font-weight: 900; cursor: pointer; }.server-status-state { padding: 32px 10px 18px; color: #8C7B5E; text-align: center; font-size: 11px; font-weight: 900; }.server-status-state.error { color: #A43D30; }.server-metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }.server-metric-card { padding: 11px; border: 2px solid #B7A98F; background: #F8F1E5; }.server-metric-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.server-metric-title text { font-size: 10px; font-weight: 900; }.server-metric-title strong { color: #4E7C74; font-size: 11px; }.server-progress { height: 10px; margin-top: 9px; overflow: hidden; border: 2px solid #2E1D0E; background: #fff; }.server-progress view { height: 100%; background: #8C5A2E; }.server-metric-meta { display: flex; justify-content: space-between; margin-top: 6px; color: #8C7B5E; font-size: 8px; }.server-checked-time { display: block; margin-top: 9px; color: #8C7B5E; text-align: right; font-size: 8px; }.theme-black .server-status-panel, .theme-black .server-metric-card { background: #292929; color: #F2F2F2; }.theme-black .server-progress { background: #202020; }
@media (max-width:620px) { .server-metric-grid { grid-template-columns: 1fr; } }

</style>
