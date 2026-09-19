<template>
  <view class="edit-card">
    <!-- 第1行：标题 + 时间 -->
    <view class="card-row title-row">
      <view class="title-input-wrap">
        <text class="title-static">{{ title || '请输入标题' }}</text>
      </view>
      <view class="time-display">
        <text>{{ weekDay }}</text>
        <text>{{ time }}</text>
      </view>
    </view>

    <!-- 第2行：图片（有图显图 / 无图显SVG占位） -->
    <view class="card-row image-row">
      <view v-if="cover" class="image-preview">
        <image class="cover-img" :src="cover" mode="aspectFill" />
      </view>
      <view v-else class="image-preview">
        <image class="cover-img" :src="placeholderSvg" mode="aspectFit" />
      </view>
    </view>

    <!-- 第3行：简介 + 继续阅读（右下角，文字绕行） -->
    <view class="card-row summary-row">
      <view class="summary-box">
        <!-- #ifdef H5 -->
        <view class="read-more-shape"></view>
        <!-- #endif -->
        <view class="read-more-btn" @click.stop="$emit('read-more')">
          <text>继续阅读</text>
        </view>
        <!-- #ifdef H5 -->
        <view class="summary-editor view-only">{{ summary || '' }}</view>
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <textarea
          class="summary-textarea"
          :value="summary"
          placeholder="请输入简介..."
          placeholder-class="placeholder"
          disabled
        />
        <!-- #endif -->
      </view>
    </view>

    <!-- 第4行：作者+时间（左） + 评论按钮（右） -->
    <view class="card-row bottom-row">
      <view class="bottom-left">
        <view class="info-item">
          <text class="info-label">作者：</text>
          <text class="info-val">{{ author }}</text>
        </view>
        <text class="info-sep">·</text>
        <view class="info-item">
          <text class="info-label">时间：</text>
          <text class="info-date">{{ date }}</text>
        </view>
      </view>
      <view class="comment-btn">
        <text>💬 评论</text>
        <view class="comment-toggle" :class="{ on: commentsEnabled }">
          <view class="toggle-dot"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'CoverCard',
  props: {
    title: { type: String, default: '' },
    cover: { type: String, default: '' },
    summary: { type: String, default: '' },
    author: { type: String, default: '' },
    weekDay: { type: String, default: '' },
    time: { type: String, default: '' },
    date: { type: String, default: '' },
    commentsEnabled: { type: Boolean, default: true }
  },
  computed: {
    placeholderSvg() {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225">`
        + `<rect width="400" height="225" fill="#F3E4C9"/>`
        + `<rect x="12" y="12" width="376" height="201" fill="none" stroke="#C0B5A0" stroke-width="2" stroke-dasharray="10,5"/>`
        + `<text x="200" y="115" text-anchor="middle" font-size="38" font-weight="900" fill="#8C7B5E" letter-spacing="10" font-family="monospace">组会资料</text>`
        + `<text x="200" y="145" text-anchor="middle" font-size="12" font-weight="700" fill="#BDB09B" letter-spacing="3" font-family="monospace">MEETING COVER</text>`
        + `</svg>`
      return `data:image/svg+xml,${encodeURIComponent(svg)}`
    }
  }
}
</script>

<style scoped>
/* ========== 编辑卡片（横版A4比例 297:210） ========== */
.edit-card {
  width: 100%;
  margin: 0 auto 6px;
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
.title-static {
  width: 100%;
  font-size: 15px;
  font-weight: 900;
  color: #2E1D0E;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
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
.read-more-shape {
  float: right;
  width: 88px;
  height: 100%;
  shape-outside: inset(calc(100% - 38px) 0 0 0);
}
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
  user-select: none;
  z-index: 1;
}
.summary-editor {
  font-size: 12px;
  font-weight: 800;
  color: #2E1D0E;
  line-height: 1.5;
  outline: none;
  height: 100%;
  word-break: break-all;
  overflow: hidden;
  white-space: pre-wrap;
}
.summary-editor.view-only {
  pointer-events: none;
}
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

/* --- 第4行：作者+时间（左） + 评论按钮（右） --- */
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
  gap: 6px;
  min-width: 0;
  flex: 1;
}
.info-item {
  display: flex;
  align-items: baseline;
  min-width: 0;
}
.info-label {
  font-size: 12px;
  font-weight: 900;
  color: #2E1D0E;
  flex-shrink: 0;
}
.info-val {
  font-size: 12px;
  font-weight: 900;
  color: #2E1D0E;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 110px;
}
.info-sep {
  font-size: 12px;
  font-weight: 900;
  color: #2E1D0E;
  flex-shrink: 0;
}
.info-date {
  font-size: 12px;
  font-weight: 900;
  color: #2E1D0E;
  letter-spacing: 0.02em;
}
.comment-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  cursor: default;
}
.comment-toggle {
  width: 34px;
  height: 18px;
  border-radius: 9px;
  border: 2px solid #C0B5A0;
  position: relative;
  background: #C0B5A0;
  transition: all 0.25s ease;
}
.comment-toggle.on {
  background: #2E1D0E;
  border-color: #2E1D0E;
}
.toggle-dot {
  position: absolute;
  top: 50%;
  left: 2px;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #FFFAF1;
  transition: all 0.25s ease;
}
.comment-toggle.on .toggle-dot {
  left: 16px;
}
</style>
