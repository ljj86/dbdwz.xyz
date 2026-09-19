<template>
  <view class="page" :class="{ night: isNight }">
    <view class="select-container" :class="{ leaving: isLeaving }">
      <!-- 顶部栏 -->
      <view class="top-bar">
        <view class="back-btn" @click="goBack">
          <text>◀</text>
        </view>
        <text class="top-title">上传资料</text>
        <view class="spacer"></view>
      </view>

      <!-- 卡片选择区 -->
      <view class="cards-wrap">
        <view
          class="type-card"
          :class="{ leaving: isLeaving }"
          @click="selectType('material')"
        >
          <view class="card-icon">📄</view>
          <text class="card-label">组会资料</text>
          <text class="card-desc">上传组会文档、课件与附件</text>
        </view>

        <view
          v-if="isTester"
          class="type-card"
          :class="{ leaving: isLeaving }"
          @click="selectType('article')"
        >
          <view class="card-icon">✎</view>
          <text class="card-label">上传文章</text>
          <text class="card-desc">编辑封面与正式文章正文</text>
        </view>

        <view
          class="type-card"
          :class="{ leaving: isLeaving }"
          @click="selectType('website')"
        >
          <view class="card-icon">🔗</view>
          <text class="card-label">网站推荐</text>
          <text class="card-desc">上传图标、名字、简介、链接与分类</text>
        </view>

      </view>

      <!-- 提示 -->
      <view class="select-hint">
        <text>选择上传类型，开始记录你的知识</text>
      </view>
    </view>
  </view>
</template>

<script>
import { isLogin, getUser } from '@/store/auth.js'

export default {
  data() {
    return {
      isNight: false,
      isLeaving: false
    }
  },
  computed: {
    isTester() {
      const user = getUser()
      return !!(user && user.role === 'admin')
    }
  },
  onLoad() {
    if (!isLogin()) {
      uni.redirectTo({ url: '/pages/login/login' })
    }
  },
  methods: {
    goBack() {
      this.isLeaving = true
      setTimeout(() => {
        uni.navigateBack({ delta: 1 })
      }, 300)
    },
    selectType(type) {
      this.isLeaving = true
      setTimeout(() => {
        if (type === 'material') {
          uni.navigateTo({ url: '/pages/meeting-material/meeting-material' })
        }
        if (type === 'article') {
          uni.navigateTo({ url: '/pages/meeting-cover/meeting-cover' })
        }
        if (type === 'website') {
          uni.navigateTo({ url: '/pages/resource-recommend-upload/resource-recommend-upload' })
        }
        this.isLeaving = false
      }, 400)
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

.select-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 24px;
  transition: opacity 0.3s ease;
}
.select-container.leaving {
  opacity: 0;
}

/* ========== 顶部栏 ========== */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
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

/* ========== 卡片选择 ========== */
.cards-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 20px 0;
}

.type-card {
  width: 100%;
  max-width: 420px;
  padding: 28px 24px;
  border: 4px solid #2E1D0E;
  background: rgba(255, 250, 241, 0.92);
  box-shadow: 6px 6px 0 #2E1D0E26;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease;
  animation: cardFloat 3s ease-in-out infinite;
  user-select: none;
}
.type-card:nth-child(2) {
  animation-delay: 0.4s;
}
.type-card.leaving {
  animation: none;
  opacity: 0;
  transform: scale(0.92) translateY(-10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.type-card:active {
  transform: translate(2px, 2px);
  box-shadow: 3px 3px 0 #2E1D0E26;
}
.type-card:hover {
  transform: translateY(-4px);
  box-shadow: 8px 8px 0 #2E1D0E26;
}
.card-icon {
  font-size: 40px;
  opacity: 0.85;
  line-height: 1;
}
.card-label {
  font-size: 18px;
  font-weight: 900;
  color: #2E1D0E;
  letter-spacing: 0.06em;
}
.card-desc {
  font-size: 12px;
  font-weight: 800;
  color: #8C7B5E;
  letter-spacing: 0.04em;
}

.select-hint {
  text-align: center;
  padding: 16px 0;
  flex-shrink: 0;
}
.select-hint text {
  font-size: 13px;
  font-weight: 800;
  color: #8C7B5E;
  letter-spacing: 0.04em;
}

/* ========== keyframes ========== */
@keyframes cardFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* ========== 响应式 ========== */
@media (max-width: 620px) {
  .select-container {
    padding: 16px;
  }
  .type-card {
    padding: 22px 18px;
  }
}
</style>
