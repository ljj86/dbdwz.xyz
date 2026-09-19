<template>
  <view class="login-page">
    <!-- 表单卡片 -->
    <view class="login-card">
      <view class="card-title">
        <text class="title-text">登录</text>
        <text class="title-sub">个人数字空间</text>
      </view>

      <!-- 用户名 -->
      <view class="field">
        <text class="field-label">用户名</text>
        <view class="field-box">
          <text class="field-icon">@</text>
          <input
            class="field-input"
            v-model="username"
            placeholder="请输入用户名"
            placeholder-style="color: #8d8071; opacity: 0.6;"
            maxlength="50"
          />
        </view>
      </view>

      <!-- 密码 -->
      <view class="field">
        <text class="field-label">密码</text>
        <view class="field-box">
          <text class="field-icon">#</text>
          <input
            class="field-input"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入密码"
            placeholder-style="color: #8d8071; opacity: 0.6;"
            maxlength="100"
          />
          <view class="eye-toggle" @click="showPassword = !showPassword">
            <text>{{ showPassword ? '👁' : '—' }}</text>
          </view>
        </view>
      </view>

      <!-- 错误提示 -->
      <view class="error-msg" v-if="errorMsg">
        <text>{{ errorMsg }}</text>
      </view>

      <!-- 提交按钮 -->
      <view class="submit-btn" @click="handleSubmit" :class="{ loading: submitting }">
        <text>{{ submitting ? '处理中...' : '登录' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { login } from '@/api/auth.js'
import { setAuth } from '@/store/auth.js'

export default {
  data() {
    return {
      showPassword: false,
      username: '',
      password: '',
      errorMsg: '',
      submitting: false
    }
  },
  methods: {
    goBack() {
      uni.navigateBack({ delta: 1 })
    },
    async handleSubmit() {
      if (!this.username.trim()) {
        this.errorMsg = '请输入用户名'
        return
      }
      if (!this.password.trim()) {
        this.errorMsg = '请输入密码'
        return
      }

      this.errorMsg = ''
      this.submitting = true

      try {
        const res = await login(this.username.trim(), this.password)

        // 保存登录状态
        setAuth(res.data)

        // 返回首页
        uni.showToast({ title: '登录成功', icon: 'none' })
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/index/index' })
        }, 800)
      } catch (err) {
        this.errorMsg = err.message || '登录失败'
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at 18px 18px, rgba(36, 28, 20, .06) 2px, transparent 2px),
    #f3e4c9;
  background-size: 28px 28px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "PingFang SC", "Microsoft YaHei", monospace;
}

.back-row {
  position: absolute;
  top: 24px;
  left: 24px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 3px solid #241c14;
  background: rgba(255, 250, 241, 0.86);
  box-shadow: 4px 4px 0 rgba(36, 28, 20, 0.28);
  font-weight: 900;
  color: #241c14;
  transition: transform .18s ease;
}

.back-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 rgba(36, 28, 20, 0.28);
}

.back-arrow { font-size: 20px; }
.back-text { font-size: 14px; letter-spacing: .04em; }

/* 卡片 */
.login-card {
  width: 100%;
  max-width: 420px;
  padding: 36px 32px;
  border: 5px solid #241c14;
  background: rgba(255, 250, 241, 0.92);
  box-shadow: 8px 8px 0 rgba(36, 28, 20, 0.28);
}

.card-title {
  text-align: center;
  margin-bottom: 24px;
}

.title-text {
  display: block;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: .08em;
  color: #241c14;
}

.title-sub {
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: #8d8071;
  letter-spacing: .16em;
  margin-top: 4px;
}

/* 提示框 */
.hint-box {
  text-align: center;
  margin-bottom: 20px;
  padding: 10px 14px;
  border: 3px dashed #8d8071;
  background: rgba(141, 128, 113, 0.08);
}

.hint-text {
  font-size: 13px;
  font-weight: 800;
  color: #5d5347;
  letter-spacing: .04em;
}

/* 表单字段 */
.field {
  margin-bottom: 20px;
}

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 900;
  color: #8d8071;
  letter-spacing: .12em;
  margin-bottom: 6px;
  padding-left: 2px;
}

.field-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 48px;
  border: 4px solid #241c14;
  background: #fffaf1;
  box-shadow: 3px 3px 0 rgba(36, 28, 20, 0.18);
}

.field-icon {
  font-size: 16px;
  font-weight: 900;
  color: #8d8071;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.field-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  font-size: 15px;
  font-weight: 800;
  color: #241c14;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
}

.eye-toggle {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

/* 错误 */
.error-msg {
  padding: 10px 14px;
  margin-bottom: 16px;
  border: 3px solid #c7332b;
  background: rgba(199, 51, 43, 0.08);
  color: #c7332b;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
}

/* 提交 */
.submit-btn {
  width: 100%;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid #241c14;
  background: #3f7d5c;
  color: #fffaf1;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: .08em;
  box-shadow: 5px 5px 0 rgba(36, 28, 20, 0.28);
  transition: transform .18s ease, box-shadow .18s ease, opacity .2s ease;
}

.submit-btn:active {
  transform: translate(3px, 3px);
  box-shadow: 2px 2px 0 rgba(36, 28, 20, 0.28);
}

.submit-btn.loading {
  opacity: .7;
  pointer-events: none;
}

/* 页脚 */
.site-footer {
  position: absolute;
  bottom: 18px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 11px;
  font-weight: 800;
  color: rgba(141, 128, 113, 0.72);
  letter-spacing: .02em;
}

.footer-sep { margin: 0 8px; opacity: .3; }
.footer-record { display: inline-flex; align-items: center; gap: 4px; color: inherit; text-decoration: none; }
.footer-record image { width: 16px; height: 16px; }
.footer-record:hover { color: #3D2E20; }

@media (max-width: 480px) {
  .login-card {
    padding: 28px 20px;
  }
}
</style>
