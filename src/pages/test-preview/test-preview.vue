<template>
  <view class="page">
    <view class="preview-container">
      <!-- 顶部栏 -->
      <view class="top-bar">
        <view class="back-btn" @click="goBack">
          <text>◀</text>
        </view>
        <text class="top-title">正式文章</text>
        <view class="spacer"></view>
      </view>

      <!-- 预览卡片（只读展示，复刻编辑器布局） -->
      <view class="edit-card">
        <!-- 第1行：标题 + 时间 -->
        <view class="card-row title-row">
          <view class="title-text-wrap">
            <text class="title-text">{{ cover.title }}</text>
          </view>
          <view class="time-display">
            <text>{{ cover.weekDay }}</text>
            <text>{{ cover.time }}</text>
          </view>
        </view>

        <!-- 第2行：图片 -->
        <view class="card-row image-row">
          <view class="image-preview">
            <image v-if="cover.cover" class="cover-img" :src="cover.cover" mode="aspectFill" />
            <image v-else class="cover-img" :src="placeholderSvg" mode="aspectFit" />
          </view>
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
            <div class="summary-text">{{ cover.summary }}</div>
          </view>
          <view class="char-count">{{ cover.summary.length }}/800</view>
        </view>

        <!-- 第4行：作者+时间 + 评论按钮 -->
        <view class="card-row bottom-row">
          <view class="bottom-left">
            <view class="info-item">
              <text class="info-label">作者：</text>
              <text class="info-value">{{ cover.author }}</text>
            </view>
            <text class="info-sep">·</text>
            <view class="info-item">
              <text class="info-label">时间：</text>
              <text class="info-date">{{ cover.date }}</text>
            </view>
          </view>
          <view class="comment-btn">
            <text>💬 评论</text>
            <view class="comment-toggle on">
              <view class="toggle-dot"></view>
            </view>
          </view>
        </view>
      </view>

      <view class="published-divider"><text>正文</text></view>
      <view class="published-body">
        <article v-for="card in article.cardList" :key="card.id" class="published-card">
          <div v-html="renderCard(card)"></div>
        </article>
      </view>
    </view>
  </view>
</template>

<script>
import { createFeatureTestArticle } from '@/utils/test-article.js'

export default {
  data() {
    const article = createFeatureTestArticle()
    return {
      article,
      cover: article.cover
    }
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
  },
  methods: {
    goBack() {
      uni.navigateBack({ delta: 1 })
    },
    onReadMore() {
      const target = document.querySelector('.published-divider')
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    renderCard(card) {
      const data = card.data || {}
      if (card.type === 'text') return this.renderMarkdown(data.content)
      if (card.type === 'image') return this.renderImages(data)
      if (card.type === 'table') return this.renderTable(data)
      if (card.type === 'video') return '<video class="published-video" src="' + this.escapeHtml(data.url) + '" controls preload="metadata"></video>' + this.caption(data.caption)
      if (card.type === 'document' || card.type === 'file') return this.renderFile(card.type, data)
      if (card.type === 'code') return this.heading(data.title || data.language) + '<pre class="published-code"><code>' + this.escapeHtml(data.code) + '</code></pre>'
      if (card.type === 'formula') return this.heading(data.title) + '<div class="published-formula">' + this.escapeHtml(data.latex).replace(/\^\{?([^{}\s]+)\}?/g, '<sup>$1</sup>').replace(/_\{?([^{}\s]+)\}?/g, '<sub>$1</sub>') + '</div>'
      if (card.type === 'website') return '<a class="published-link" href="' + this.escapeHtml(data.url) + '" target="_blank" rel="noopener"><b>↗</b><span><strong>' + this.escapeHtml(data.title) + '</strong><small>' + this.escapeHtml(data.description) + '</small></span></a>'
      return ''
    },
    renderMarkdown(src) {
      return String(src || '').split(/\n+/).filter(Boolean).map(line => {
        const h = line.match(/^(#{1,3})\s+(.*)$/)
        if (h) return '<h' + h[1].length + '>' + this.inline(h[2]) + '</h' + h[1].length + '>'
        if (/^[-*]\s+/.test(line)) return '<div class="published-list">• ' + this.inline(line.replace(/^[-*]\s+/, '')) + '</div>'
        return '<p>' + this.inline(line) + '</p>'
      }).join('')
    },
    inline(text) {
      return this.escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>')
    },
    renderImages(data) {
      const images = (data.imageList || []).map(image => '<img src="' + this.escapeHtml(image.url) + '" alt="' + this.escapeHtml(image.desc) + '">').join('')
      return '<div class="published-image-row"><span>' + this.escapeHtml(data.gridLeftText) + '</span><div class="published-images">' + images + '</div><span>' + this.escapeHtml(data.gridRightText) + '</span></div>'
    },
    renderTable(data) {
      const rows = String(data.content || '').split(/\r?\n/).filter(Boolean).map(row => row.split(/\t|,/))
      const head = rows.length ? '<thead><tr>' + rows[0].map(cell => '<th>' + this.escapeHtml(cell) + '</th>').join('') + '</tr></thead>' : ''
      const body = '<tbody>' + rows.slice(1).map(row => '<tr>' + row.map(cell => '<td>' + this.escapeHtml(cell) + '</td>').join('') + '</tr>').join('') + '</tbody>'
      return this.heading(data.title) + '<div class="published-table-wrap"><table>' + head + body + '</table></div>'
    },
    renderFile(type, data) {
      const badge = type === 'document' ? 'DOC' : 'FILE'
      return '<a class="published-link" href="' + this.escapeHtml(data.url) + '" target="_blank" download><b>' + badge + '</b><span><strong>' + this.escapeHtml(data.name) + '</strong><small>' + this.escapeHtml(data.caption) + '</small></span></a>'
    },
    heading(value) { return value ? '<h3>' + this.escapeHtml(value) + '</h3>' : '' },
    caption(value) { return value ? '<p class="published-caption">' + this.escapeHtml(value) + '</p>' : '' },
    escapeHtml(value) {
      return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 16px 24px 24px 24px;
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

/* ========== 预览卡片（横版A4比例 297:210） ========== */
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
.title-text-wrap {
  flex: 1;
  min-width: 0;
}
.title-text {
  font-size: 15px;
  font-weight: 900;
  color: #2E1D0E;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* --- 第2行：图片 --- */
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

/* H5: 浮动 shape 占位 */
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

/* 简介文本（只读） */
.summary-text {
  font-size: 12px;
  font-weight: 800;
  color: #2E1D0E;
  line-height: 1.5;
  height: 100%;
  max-height: 100%;
  word-break: break-all;
  overflow: hidden;
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

/* --- 第4行：作者+时间 + 评论 --- */
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
.info-value {
  color: #2E1D0E;
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
  flex-shrink: 0;
}
.comment-toggle {
  width: 32px;
  height: 18px;
  border: 2px solid #8C7B5E;
  border-radius: 9px;
  position: relative;
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
}
.comment-toggle.on .toggle-dot {
  transform: translateX(13px);
  background: #FFFAF1;
}

/* ========== 测试说明 ========== */
.test-info {
  margin-top: 16px;
  width: min(92vw, 880px);
  padding: 12px 16px;
  border: 2px solid #C0B5A0;
  background: rgba(255, 250, 241, 0.6);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.test-info-title {
  font-size: 13px;
  font-weight: 900;
  color: #2E1D0E;
  letter-spacing: 0.04em;
}
.test-info-desc {
  font-size: 11px;
  font-weight: 700;
  color: #8C7B5E;
  line-height: 1.5;
}

/* ========== 移动端 ========== */
@media (max-width: 768px) {
  .preview-container {
    padding: 12px 12px 16px 12px;
  }
  .edit-card {
    width: 100%;
    aspect-ratio: auto;
    height: 60vh;
    overflow: hidden;
  }
  .title-text {
    font-size: 14px;
  }
  .title-row {
    flex: 0 0 48px;
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
}

.published-divider { width: min(92vw, 880px); display: flex; align-items: center; gap: 14px; margin: 28px 0 14px; color: #2E1D0E; font-size: 18px; font-weight: 900; }
.published-divider::before, .published-divider::after { content: ''; height: 3px; flex: 1; background: #2E1D0E; }
.published-body { width: min(92vw, 880px); display: flex; flex-direction: column; gap: 16px; }
.published-card { width: 100%; max-width: 100%; box-sizing: border-box; padding: 18px 20px; border: 2px solid #C0B5A0; border-radius: 8px; background: rgba(255,250,241,.94); color: #2E1D0E; box-shadow: 3px 3px 0 #2E1D0E12; overflow: hidden; }
.published-card h1, .published-card h2, .published-card h3 { margin: 0 0 12px; color: #2E1D0E; }
.published-card p { margin: 8px 0; line-height: 1.8; }
.published-list { padding: 4px 0 4px 14px; line-height: 1.6; }
.published-image-row { display: flex; align-items: center; justify-content: center; gap: 18px; color: #8C7B5E; font-weight: 800; }
.published-images { width: min(360px, 55vw); padding: 12px; text-align: center; border: 2px solid #C0B5A0; background: #F3E4C9; }
.published-images img { display: block; max-width: 100%; max-height: 240px; margin: auto; object-fit: contain; }
.published-table-wrap { overflow-x: auto; }
.published-table-wrap table { width: 100%; border-collapse: collapse; background: #fff; }
.published-table-wrap th, .published-table-wrap td { padding: 9px; border: 1px solid #B9AA91; text-align: left; }
.published-table-wrap th { background: #E9D5B2; }
.published-video { width: 100%; max-height: 480px; background: #17120e; border-radius: 6px; }
.published-card :deep(.published-video) { display: block; width: 100%; max-width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: contain; box-sizing: border-box; background: #17120e; border-radius: 6px; }
.published-caption { color: #8C7B5E; font-size: 13px; }
.published-code { margin: 0; padding: 16px; overflow: auto; border-radius: 6px; background: #211b17; color: #f8ead3; font: 13px/1.7 Consolas, monospace; }
.published-formula { padding: 24px; overflow-x: auto; text-align: center; background: #fff; border: 1px solid #D8CDBA; font: 25px 'Times New Roman', serif; }
.published-link { display: flex; align-items: center; gap: 14px; padding: 14px; border: 2px solid #C0B5A0; border-radius: 7px; background: #fff; color: #2E1D0E; text-decoration: none; }
.published-link b { min-width: 46px; height: 42px; display: flex; align-items: center; justify-content: center; border: 2px solid #2E1D0E; border-radius: 5px; background: #F3E4C9; font-size: 11px; }
.published-link strong, .published-link small { display: block; word-break: break-all; }
.published-link small { margin-top: 4px; color: #8C7B5E; }

@media (max-width: 768px) {
  .published-divider, .published-body { width: 100%; }
  .published-card { padding: 14px; }
  .published-image-row { flex-direction: column; }
}
</style>
