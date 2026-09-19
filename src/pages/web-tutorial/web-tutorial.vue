<template>
  <view class="tutorial-page">
    <web-view v-if="src" :src="src"></web-view>
    <view v-else class="load-error">
      <text class="load-error-title">教程地址不可用</text>
      <text class="load-error-desc">仅允许加载 dbdwz.xyz 腾讯云站点中的教程。</text>
      <button class="back-button" @click="goBack">返回</button>
    </view>
  </view>
</template>

<script>
import { SITE_ORIGIN } from '@/utils/api.js'
import { isLogin } from '@/store/auth.js'

function decodeQuery(value) {
  try {
    return decodeURIComponent(String(value || ''))
  } catch (error) {
    return ''
  }
}

export default {
  data() {
    return { src: '' }
  },
  onLoad(options = {}) {
    if (!isLogin()) {
      uni.reLaunch({ url: '/pages/login/login' })
      return
    }
    const title = decodeQuery(options.title) || '电子教程'
    const candidate = decodeQuery(options.src)
    const allowed = candidate === SITE_ORIGIN || candidate.startsWith(SITE_ORIGIN + '/')

    uni.setNavigationBarTitle({ title })
    if (allowed) this.src = candidate
  },
  methods: {
    goBack() {
      uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) })
    }
  }
}
</script>

<style scoped>
.tutorial-page { min-height: 100vh; background: #f3e4c9; }
.load-error { box-sizing: border-box; min-height: 100vh; padding: 96px 28px 40px; display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
.load-error-title { color: #2c241d; font-size: 22px; font-weight: 900; }
.load-error-desc { color: #746454; font-size: 14px; line-height: 1.7; }
.back-button { margin-top: 10px; border: 0; border-radius: 8px; background: #2f6b4f; color: #fff; font-weight: 800; }
</style>
