<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="top-bar">
      <view class="back-btn" @click="goBack">
        <text>◀</text>
      </view>
      <text class="top-title">内容编辑</text>
      <view class="save-btn" @click="save">
        <text>保存</text>
      </view>
    </view>

    <!-- 分屏：左编辑 / 右预览 -->
    <view class="split">
      <!-- 左：编辑 -->
      <view class="pane editor-pane">
        <view class="pane-head">编辑</view>
        <!-- 工具栏 -->
        <view class="toolbar">
          <view class="tool-btn" :class="{ active: editingCard && editingCard.type === 'text' }" @click="addCard('text', true)">
            <text class="tool-icon">T</text>
            <text class="tool-label">文字</text>
          </view>
          <view class="tool-btn" :class="{ active: editingCard && editingCard.type === 'image' }" @click="addCard('image', true)">
            <text class="tool-icon">▦</text>
            <text class="tool-label">照片</text>
          </view>
          <view class="tool-btn" :class="{ active: editingCard && editingCard.type === 'table' }" @click="addCard('table', true)">
            <text class="tool-icon">⊞</text>
            <text class="tool-label">表格</text>
          </view>
          <view class="tool-btn" :class="{ active: editingCard && editingCard.type === 'video' }" @click="addCard('video', true)">
            <text class="tool-icon">▶</text>
            <text class="tool-label">视频</text>
          </view>
          <view class="tool-btn" :class="{ active: editingCard && editingCard.type === 'document' }" @click="addCard('document', true)">
            <text class="tool-icon">DOC</text>
            <text class="tool-label">文档</text>
          </view>
          <view class="tool-btn" :class="{ active: editingCard && editingCard.type === 'code' }" @click="addCard('code', true)">
            <text class="tool-icon">&lt;/&gt;</text>
            <text class="tool-label">代码</text>
          </view>
          <view class="tool-btn" :class="{ active: editingCard && editingCard.type === 'file' }" @click="addCard('file', true)">
            <text class="tool-icon">📎</text>
            <text class="tool-label">文件</text>
          </view>
          <view class="tool-btn" :class="{ active: editingCard && editingCard.type === 'website' }" @click="addCard('website', true)">
            <text class="tool-icon">↗</text>
            <text class="tool-label">网站</text>
          </view>
          <view class="tool-btn" :class="{ active: editingCard && editingCard.type === 'formula' }" @click="addCard('formula', true)">
            <text class="tool-icon">∑</text>
            <text class="tool-label">公式</text>
          </view>
        </view>
        <!-- 图片格式扩展栏 -->
        <view v-if="showImagePanel" class="image-panel">
          <!-- 图片链接输入 -->
          <view class="image-input-row">
            <input
              class="image-url-input"
              v-model="imageLink"
              placeholder="输入图片链接 URL"
              placeholder-class="placeholder"
            />
            <view class="image-action-btn" @click="onImageInsert">
              <text>插入</text>
            </view>
            <view class="image-action-btn" @click="onImageAddToGrid">
              <text>+加入组合</text>
            </view>
          </view>
          <!-- 图片上传（同时支持拖入图片） -->
          <view class="image-upload-row">
            <view
              ref="dropZoneUpload"
              class="image-upload-btn"
              @click="triggerImageUpload"
            >
              <text>📎 点击选择或拖入图片</text>
            </view>
          </view>
          <!-- 图片组合容器（可自由拉动调整大小 + 支持拖入图片） -->
          <view class="image-grid-section">
            <view class="grid-section-label">图片组合 · 未开文字编辑时下方滑块左右平移整框；开启「文字编辑」后滑块控制左右文字框宽度（此消彼长）· 点击图片选中后可拖图/缩放/旋转</view>
            <!-- 图片编辑区 + 水平位置滑块（音量条样式） -->
            <view class="grid-with-slider">
            <!-- 外层容器：文字编辑时左右文字框宽度由滑块弹性控制；非编辑时整框随滑块左右平移 -->
            <view
              ref="slideWrapper"
              class="grid-slide-wrapper"
              :style="{ transform: showGridTextEdit ? 'none' : ('translateX(' + gridOffsetX + 'px)') }"
            >
              <!-- 左侧文字编辑（宽度随滑块变化，到最右时消失） -->
              <view class="grid-side grid-side-left" v-if="showGridTextEdit" :style="{ width: gridLeftW + 'px' }">
                <view class="grid-text-toolbar">
                  <view class="gtb-group">
                    <view class="gtb-btn" :class="{ 'gtb-active': gridLeftFmt.bold }" @click="toggleGridFmt('left','bold')"><text>B</text></view>
                    <view class="gtb-btn" :class="{ 'gtb-active': gridLeftFmt.italic }" @click="toggleGridFmt('left','italic')"><text>I</text></view>
                    <view class="gtb-btn" :class="{ 'gtb-active': gridLeftFmt.underline }" @click="toggleGridFmt('left','underline')"><text>U</text></view>
                    <view class="gtb-btn" :class="{ 'gtb-active': gridLeftFmt.strike }" @click="toggleGridFmt('left','strike')"><text>S</text></view>
                  </view>
                  <view class="gtb-divider"></view>
                  <view class="gtb-group gtb-colors">
                    <view class="gtb-btn gtb-color" :class="{ 'gtb-active': gridLeftFmt.color==='#E74C3C' }" @click="setGridColor('left','#E74C3C')" style="background:#E74C3C;color:#fff"><text>A</text></view>
                    <view class="gtb-btn gtb-color" :class="{ 'gtb-active': gridLeftFmt.color==='#E67E22' }" @click="setGridColor('left','#E67E22')" style="background:#E67E22;color:#fff"><text>A</text></view>
                    <view class="gtb-btn gtb-color" :class="{ 'gtb-active': gridLeftFmt.color==='#F1C40F' }" @click="setGridColor('left','#F1C40F')" style="background:#F1C40F;color:#333"><text>A</text></view>
                    <view class="gtb-btn gtb-color" :class="{ 'gtb-active': gridLeftFmt.color==='#2ECC71' }" @click="setGridColor('left','#2ECC71')" style="background:#2ECC71;color:#fff"><text>A</text></view>
                    <view class="gtb-btn gtb-color" :class="{ 'gtb-active': gridLeftFmt.color==='#3498DB' }" @click="setGridColor('left','#3498DB')" style="background:#3498DB;color:#fff"><text>A</text></view>
                    <view class="gtb-btn gtb-color" :class="{ 'gtb-active': gridLeftFmt.color==='#9B59B6' }" @click="setGridColor('left','#9B59B6')" style="background:#9B59B6;color:#fff"><text>A</text></view>
                    <view class="gtb-btn gtb-color" :class="{ 'gtb-active': !gridLeftFmt.color }" @click="setGridColor('left','')"><text>A</text></view>
                  </view>
                </view>
                <textarea
                  ref="gridLeftInput"
                  class="grid-side-input"
                  v-model="gridLeftText"
                  placeholder="左侧文字"
                  placeholder-class="placeholder"
                  @focus="deselectImage"
                ></textarea>
              </view>
              <view
                ref="dropZoneGrid"
                class="image-grid-box"
                :style="{ width: gridWidth + 'px', height: gridHeight + 'px' }"
                @click="deselectImage"
              >
                <view
                  v-for="(img, idx) in imageList"
                  :key="idx"
                  class="grid-thumb-item"
                  :class="{ 'grid-thumb-selected': selectedImageIdx === idx }"
                  :style="{
                    left: img.x + 'px',
                    top: img.y + 'px',
                    width: getImgBaseW(idx) * (img.wScale || 1) + 'px',
                    height: getImgBaseH(idx) * (img.hScale || 1) + 'px',
                    transform: 'rotate(' + (img.rotation || 0) + 'deg)',
                    transformOrigin: 'center center'
                  }"
                  @click.stop="selectImage(idx)"
                  @mousedown.stop.prevent="onImageDragStart($event, idx)"
                  @touchstart.stop.prevent="onImageDragStart($event, idx)"
                  @contextmenu.prevent.stop="showImageContextMenu($event, idx)"
                >
                  <img :src="img.url" class="grid-thumb" mode="aspectFit" />
                  <view class="grid-thumb-remove" @click.stop="removeGridImage(idx)">
                    <text>✕</text>
                  </view>
                  <!-- 选中后：8个控制点 + 旋转手柄 -->
                  <view v-if="selectedImageIdx === idx" class="resize-controls" @click.stop>
                    <view class="resize-point rp-nw" @mousedown.stop.prevent="onResizePointStart($event, idx, 'nw')"></view>
                    <view class="resize-point rp-n" @mousedown.stop.prevent="onResizePointStart($event, idx, 'n')"></view>
                    <view class="resize-point rp-ne" @mousedown.stop.prevent="onResizePointStart($event, idx, 'ne')"></view>
                    <view class="resize-point rp-e" @mousedown.stop.prevent="onResizePointStart($event, idx, 'e')"></view>
                    <view class="resize-point rp-se" @mousedown.stop.prevent="onResizePointStart($event, idx, 'se')"></view>
                    <view class="resize-point rp-s" @mousedown.stop.prevent="onResizePointStart($event, idx, 's')"></view>
                    <view class="resize-point rp-sw" @mousedown.stop.prevent="onResizePointStart($event, idx, 'sw')"></view>
                    <view class="resize-point rp-w" @mousedown.stop.prevent="onResizePointStart($event, idx, 'w')"></view>
                    <view class="rotate-handle" @mousedown.stop.prevent="onRotateStart($event, idx)">
                      <text>↻</text>
                    </view>
                  </view>
                </view>
                <view v-if="imageList.length === 0" class="grid-empty">
                  <text>将图片拖入此处或点击上方上传…</text>
                </view>
                <!-- 拖拽手柄（同时支持鼠标和触摸） -->
                <view
                  class="grid-resize-handle"
                  @mousedown.stop.prevent="onGridResizeStart"
                  @touchstart.stop.prevent="onGridResizeStart"
                >
                  <text>◢</text>
                </view>
              </view>
              <!-- 右侧文字编辑（宽度随滑块变化，到最左时消失） -->
              <view class="grid-side grid-side-right" v-if="showGridTextEdit" :style="{ width: gridRightW + 'px' }">
                <view class="grid-text-toolbar">
                  <view class="gtb-group">
                    <view class="gtb-btn" :class="{ 'gtb-active': gridRightFmt.bold }" @click="toggleGridFmt('right','bold')"><text>B</text></view>
                    <view class="gtb-btn" :class="{ 'gtb-active': gridRightFmt.italic }" @click="toggleGridFmt('right','italic')"><text>I</text></view>
                    <view class="gtb-btn" :class="{ 'gtb-active': gridRightFmt.underline }" @click="toggleGridFmt('right','underline')"><text>U</text></view>
                    <view class="gtb-btn" :class="{ 'gtb-active': gridRightFmt.strike }" @click="toggleGridFmt('right','strike')"><text>S</text></view>
                  </view>
                  <view class="gtb-divider"></view>
                  <view class="gtb-group gtb-colors">
                    <view class="gtb-btn gtb-color" :class="{ 'gtb-active': gridRightFmt.color==='#E74C3C' }" @click="setGridColor('right','#E74C3C')" style="background:#E74C3C;color:#fff"><text>A</text></view>
                    <view class="gtb-btn gtb-color" :class="{ 'gtb-active': gridRightFmt.color==='#E67E22' }" @click="setGridColor('right','#E67E22')" style="background:#E67E22;color:#fff"><text>A</text></view>
                    <view class="gtb-btn gtb-color" :class="{ 'gtb-active': gridRightFmt.color==='#F1C40F' }" @click="setGridColor('right','#F1C40F')" style="background:#F1C40F;color:#333"><text>A</text></view>
                    <view class="gtb-btn gtb-color" :class="{ 'gtb-active': gridRightFmt.color==='#2ECC71' }" @click="setGridColor('right','#2ECC71')" style="background:#2ECC71;color:#fff"><text>A</text></view>
                    <view class="gtb-btn gtb-color" :class="{ 'gtb-active': gridRightFmt.color==='#3498DB' }" @click="setGridColor('right','#3498DB')" style="background:#3498DB;color:#fff"><text>A</text></view>
                    <view class="gtb-btn gtb-color" :class="{ 'gtb-active': gridRightFmt.color==='#9B59B6' }" @click="setGridColor('right','#9B59B6')" style="background:#9B59B6;color:#fff"><text>A</text></view>
                    <view class="gtb-btn gtb-color" :class="{ 'gtb-active': !gridRightFmt.color }" @click="setGridColor('right','')"><text>A</text></view>
                  </view>
                </view>
                <textarea
                  ref="gridRightInput"
                  class="grid-side-input"
                  v-model="gridRightText"
                  placeholder="右侧文字"
                  placeholder-class="placeholder"
                  @focus="deselectImage"
                ></textarea>
              </view>
            </view>
              <!-- 水平位置滑块（音量条样式）：拖动调整「拖入图片」框的左右位置 -->
              <view
                class="hslider-col"
                :class="{ 'hslider-active': imageList.length > 0 }"
              >
                <view class="hslider-head">
                  <text class="hslider-label">组合左右位置</text>
                  <text class="hslider-val" :class="{ 'hslider-val-dim': imageList.length === 0 }">{{ sliderX }}</text>
                  <view class="hslider-undo" @click="undoImage" title="回退到上一次操作">
                    <text>↶</text>
                  </view>
                </view>
                <view
                  ref="hsliderTrack"
                  class="hslider-track"
                  :data-active="imageList.length > 0"
                  :style="{ '--grid-half': (gridWidth / 2 + (showGridTextEdit ? 8 : 0)) + 'px' }"
                  @pointerdown="onHSliderDragStart($event)"
                >
                  <view class="hslider-disabled hslider-disabled-left"></view>
                  <view class="hslider-disabled hslider-disabled-right"></view>
                  <view class="hslider-fill" :style="{ left: sliderMetrics.fillLeft, width: sliderMetrics.fillWidth }"></view>
                  <view
                    class="hslider-thumb"
                    :style="{ left: sliderMetrics.thumbLeft }"
                    @pointerdown.stop="onHSliderDragStart($event)"
                  ></view>
                  <view class="hslider-mark hslider-mark-left"><text>←</text></view>
                  <view class="hslider-mark hslider-mark-mid"><text>●</text></view>
                  <view class="hslider-mark hslider-mark-right"><text>→</text></view>
                </view>
                <view v-if="imageList.length === 0" class="hslider-hint">
                  <text>添加图片后可调整左右位置</text>
                </view>
              </view>
            </view>
            <view class="grid-controls">
              <view class="grid-control-btn" @click="onGridGenerate">
                <text>生成组合</text>
              </view>
              <view class="grid-control-btn" :class="{ 'grid-control-active': showGridTextEdit }" @click="toggleGridTextEdit">
                <text>文字编辑</text>
              </view>
              <view class="grid-control-btn" @click="onGridClear">
                <text>清空</text>
              </view>
              <view v-if="clipboardImage" class="grid-control-btn" @click="pasteImageFromClipboard">
                <text>📋 粘贴</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 文字编辑区：点「文字」标签弹出；上=功能按钮 / 中=所见即所得文字框 / 下=Markdown源码 -->
        <view v-if="showTextPanel" class="text-edit-region">
          <!-- 功能按钮（@mousedown.prevent 保持输入框选区） -->
          <view class="text-toolbar">
            <view class="tb-btn" :class="{ 'tb-on': textFmt.bold }" @mousedown.prevent @click="onTextFormat('bold')"><text class="tb-icon" style="font-weight:900">B</text></view>
            <view class="tb-btn" :class="{ 'tb-on': textFmt.italic }" @mousedown.prevent @click="onTextFormat('italic')"><text class="tb-icon" style="font-style:italic">I</text></view>
            <view class="tb-btn" :class="{ 'tb-on': textFmt.underline }" @mousedown.prevent @click="onTextFormat('underline')"><text class="tb-icon" style="text-decoration:underline">U</text></view>
            <view class="tb-btn" :class="{ 'tb-on': textFmt.strike }" @mousedown.prevent @click="onTextFormat('strike')"><text class="tb-icon" style="text-decoration:line-through">S</text></view>
            <view class="tb-sep"></view>
            <view class="tb-select" :class="{ 'tb-on': showTextFontPop }" @mousedown.prevent @click="onTextToggleFont">
              <text class="tb-select-label">{{ textFont || '字体' }}</text>
              <view class="tb-select-pop" v-if="showTextFontPop">
                <view class="tb-opt" v-for="f in textFonts" :key="f" :style="{ fontFamily: f }" @mousedown.prevent @click="onTextFont(f)">{{ f }}</view>
              </view>
            </view>
            <view class="tb-select" :class="{ 'tb-on': showTextSizePop }" @mousedown.prevent @click="onTextToggleSize">
              <text class="tb-select-label">{{ textFontSize || '字号' }}</text>
              <view class="tb-select-pop" v-if="showTextSizePop">
                <view class="tb-opt" v-for="s in textFontSizes" :key="s" @mousedown.prevent @click="onTextFontSize(s)">{{ s }}</view>
              </view>
            </view>
            <view class="tb-sep"></view>
            <view class="tb-color-wrap">
              <view class="tb-btn tb-color-btn" :class="{ 'tb-on': showTextColorPop }" @mousedown.prevent @click="onTextToggleColor"><text class="tb-icon" :style="{ color: textColor }">A</text></view>
              <view class="tb-color-pop" v-if="showTextColorPop">
                <view
                  v-for="c in textColors"
                  :key="c.value"
                  class="tb-color-item"
                  :style="{ background: c.value }"
                  @mousedown.prevent
                  @click="onTextColor(c.value)"
                ></view>
                <view class="tb-color-item tb-color-none" @mousedown.prevent @click="onTextColor('')"></view>
              </view>
            </view>
            <view class="tb-color-wrap">
              <view class="tb-btn tb-color-btn" :class="{ 'tb-on': showTextBgPop }" @mousedown.prevent @click="onTextToggleBg"><text class="tb-icon" :style="{ backgroundColor: textBgColor === 'transparent' ? '#E0DCC8' : textBgColor, color: '#fff', padding: '0 3px', borderRadius: '3px', lineHeight: '1.45' }">A</text></view>
              <view class="tb-color-pop" v-if="showTextBgPop">
                <view
                  v-for="c in textColors"
                  :key="c.value"
                  class="tb-color-item"
                  :style="{ background: c.value }"
                  @mousedown.prevent
                  @click="onTextBgColor(c.value)"
                ></view>
                <view class="tb-color-item tb-color-none" @mousedown.prevent @click="onTextBgColor('')"></view>
              </view>
            </view>
            <view class="tb-sep"></view>
            <view class="tb-btn tb-del" @mousedown.prevent @click="onTextDelete"><text class="tb-icon">⌫</text></view>
          </view>
          <!-- 文字框（所见即所得，不显示 markdown 指令） -->
          <div
            ref="textMainInput"
            class="text-input"
            :style="{ flex: textInputFlex }"
            contenteditable="true"
            @focus="deselectImage"
            @input="onTextInput"
            @blur="onTextBlur"
            @mouseup="saveRange"
            @keyup="saveRange"
          ></div>
          <!-- 上下拖动分隔条：调整文字框与源码框高度（此消彼长，默认等高相同大小） -->
          <view
            class="text-splitter"
            @mousedown.prevent="onTextSplitStart"
            @touchstart.prevent="onTextSplitStart"
          >
            <view class="text-splitter-bar"></view>
          </view>
          <!-- Markdown 源码显示区域 -->
          <view class="text-preview" ref="textPreviewBox" :style="{ flex: textPreviewFlex }">
            <view class="text-preview-head">MARKDOWN 源码</view>
            <view class="text-preview-body">
              <pre class="md-source">{{ content || '暂无内容' }}</pre>
            </view>
          </view>
        </view>

        <textarea
          v-if="!showTextPanel"
          class="md-input"
          v-model="content"
          placeholder="在此输入 Markdown 内容..."
          placeholder-class="placeholder"
          @focus="deselectImage"
        />
      </view>

      <!-- 分界线 -->
      <view class="divider"></view>

      <!-- 右：预览 -->
      <view class="pane preview-pane">
        <view class="pane-head">正文</view>
        <view class="preview-body" ref="previewBody">
          <!-- 封面预览（直接复用封面编辑器卡片） -->
          <cover-card
            :title="cover.title"
            :cover="cover.cover"
            :summary="cover.summary"
            :author="cover.author"
            :weekDay="cover.weekDay"
            :time="cover.time"
            :date="cover.date"
            :commentsEnabled="cover.commentsEnabled"
            @read-more="onReadMore"
          />

          <view class="preview-divider"></view>

          <!-- #ifdef H5 -->
          <div class="md-render" v-html="rendered"></div>
          <!-- #endif -->
          <!-- #ifndef H5 -->
          <text class="md-raw">{{ content }}</text>
          <!-- #endif -->

          <!-- 卡片流：按 cardList 顺序渲染每张卡片 -->
          <view class="card-flow" ref="cardFlow">
            <view
              v-for="card in cardList"
              :key="card.id"
              class="card-block"
              :class="{ 'card-active': card.id === activeCardId }"
              :data-card-id="card.id"
              @click="onCardEdit(card)"
            >
              <div class="md-render" v-html="renderCard(card)"></div>
            </view>
          </view>
          <!-- 预留下拉空间 -->
          <view class="preview-spacer"></view>
        </view>
      </view>
    </view>

    <!-- 图片右键菜单 -->
    <view v-if="contextMenuVisible" class="context-menu" :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }" @click.stop>
      <view class="context-menu-item" @click.stop="onContextAction('reply')">
        <text>↩ 回复</text>
      </view>
      <view class="context-menu-item" @click.stop="onContextAction('cut')">
        <text>✂ 剪切</text>
      </view>
      <view v-if="clipboardImage" class="context-menu-item" @click.stop="onContextAction('paste')">
        <text>📋 粘贴</text>
      </view>
      <view v-if="undoStack.length > 0" class="context-menu-item" @click.stop="onContextAction('undo')">
        <text>↶ 撤回</text>
      </view>
      <view class="context-menu-item context-menu-danger" @click.stop="onContextAction('delete')">
        <text>🗑 删除</text>
      </view>
    </view>

    <!-- ========== 卡片悬浮窗（右下角）+ 总览面板 + 编辑抽屉 ========== -->
    <view v-if="false" class="card-fab" :class="{ open: showCardPanel }" @click="toggleCardPanel">
      <text class="card-fab-icon">{{ showCardPanel ? '×' : '☰' }}</text>
    </view>

    <view v-if="false && showCardPanel" class="card-panel">
      <view class="card-panel-head">
        <text class="card-panel-title">卡片总览</text>
        <view class="card-add card-add-grid">
          <view v-for="type in cardTypes" :key="type.value" class="card-add-btn" @click="addCard(type.value, true)">+ {{ type.label }}</view>
        </view>
      </view>
      <scroll-view class="card-list" scroll-y>
        <view
          v-for="(card, idx) in cardList"
          :key="card.id"
          class="card-item"
          draggable="true"
          @dragstart="onCardDragStart(card, $event)"
          @dragover.prevent="onCardDragOver($event)"
          @drop="onCardDrop(card, $event)"
        >
          <view class="card-item-handle">⠿</view>
          <view class="card-item-info">
            <text class="card-item-type">{{ cardTypeLabel(card.type) }}</text>
            <text class="card-item-desc">{{ cardDesc(card) }}</text>
          </view>
          <view class="card-item-actions">
            <view class="card-item-btn" @click="moveCard(idx, -1)">↑</view>
            <view class="card-item-btn" @click="moveCard(idx, 1)">↓</view>
            <view class="card-item-btn" @click="onCardLocate(card)">定位</view>
            <view class="card-item-btn" @click="onCardEdit(card)">编辑</view>
            <view class="card-item-btn danger" @click="onCardDelete(card)">删除</view>
          </view>
        </view>
        <view v-if="cardList.length === 0" class="card-empty">暂无卡片，点上方 + 添加</view>
      </scroll-view>
    </view>

    <!-- 编辑抽屉 -->
    <view v-if="editingCard" class="card-drawer">
      <view class="card-drawer-head">
        <text class="card-drawer-title">编辑{{ cardTypeLabel(editingCard.type) }}卡片</text>
        <view class="card-position-actions">
          <view class="card-drawer-move" @click="moveEditingCard(-1)">↑ 上移</view>
          <view class="card-drawer-move" @click="moveEditingCard(1)">↓ 下移</view>
          <view class="card-drawer-close" @click="closeCardEditor">完成</view>
        </view>
      </view>
      <view class="card-drawer-body">
        <!-- 文字卡片 -->
        <block v-if="editingCard.type === 'text'">
          <view class="text-toolbar">
            <view class="tb-btn" :class="{ 'tb-on': cardTextFmt.bold }" @mousedown.prevent @click="onCardFmt('bold')"><text class="tb-icon">B</text></view>
            <view class="tb-btn" :class="{ 'tb-on': cardTextFmt.italic }" @mousedown.prevent @click="onCardFmt('italic')"><text class="tb-icon">I</text></view>
            <view class="tb-btn" :class="{ 'tb-on': cardTextFmt.underline }" @mousedown.prevent @click="onCardFmt('underline')"><text class="tb-icon">U</text></view>
            <view class="tb-btn" :class="{ 'tb-on': cardTextFmt.strike }" @mousedown.prevent @click="onCardFmt('strike')"><text class="tb-icon">S</text></view>
            <view class="tb-sep"></view>
            <view class="tb-color-wrap">
              <view class="tb-color-btn" :style="{ color: cardTextColor }" @click="showCardColorPop = !showCardColorPop">A</view>
              <view v-if="showCardColorPop" class="tb-color-pop">
                <view v-for="c in textColors" :key="c.value" class="tb-color-item" :style="{ background: c.value }" @click="onCardColor(c.value)"></view>
                <view class="tb-color-item tb-color-none" @click="onCardColor('')">无</view>
              </view>
            </view>
          </view>
          <div
            class="text-input card-text-input"
            ref="cardTextInput"
            contenteditable="true"
            @input="onCardTextInput"
            @blur="onCardTextBlur"
            @mousedown.prevent
            @mouseup="saveCardRange"
            @keyup="saveCardRange"
          ></div>
        </block>
        <!-- 图片卡片 -->
        <block v-else-if="editingCard.type === 'image'">
          <view class="card-img-tip">点击下方添加图片，拖动滑块调整整框左右位置</view>
          <view class="card-img-add">
            <view class="image-upload-btn" @click="onCardImgPick">+ 拖入 / 添加图片</view>
          </view>
          <view v-if="editingCard.data.imageList.length" class="card-img-preview">
            <view v-for="(img, i) in editingCard.data.imageList" :key="i" class="card-img-thumb">
              <image :src="img.url" class="card-img-thumb-img" mode="aspectFill" />
              <view class="card-img-thumb-del" @click="onCardImgDel(i)">✕</view>
            </view>
          </view>
          <view class="card-img-slider">
            <text class="card-slider-label">整框左右：{{ editingCard.data.gridOffsetX }}</text>
            <input type="range" min="-160" max="160" :value="editingCard.data.gridOffsetX" @input="onCardOffsetInput" />
          </view>
          <view class="card-img-row">
            <input class="card-side-input" placeholder="左侧文字" :value="editingCard.data.gridLeftText" @input="onCardLeftInput" />
            <input class="card-side-input" placeholder="右侧文字" :value="editingCard.data.gridRightText" @input="onCardRightInput" />
          </view>
        </block>
        <block v-else>
          <view class="field-group" v-if="['table','code','formula'].includes(editingCard.type)">
            <text class="field-label">标题（选填）</text>
            <input class="card-field" v-model="editingCard.data.title" placeholder="输入卡片标题" />
          </view>
          <view v-if="['video','document','file','website'].includes(editingCard.type)" class="field-group">
            <text class="field-label">{{ editingCard.type === 'website' ? '网站地址' : '文件或资源地址' }}</text>
            <input class="card-field" v-model="editingCard.data.url" placeholder="https://..." />
          </view>
          <view v-if="['video','document','file'].includes(editingCard.type)" class="field-group">
            <text class="field-label">名称</text>
            <input class="card-field" v-model="editingCard.data.name" placeholder="资源名称" />
            <view class="image-upload-btn" @click="onGenericFilePick">选择本地文件</view>
          </view>
          <view v-if="editingCard.type === 'website'" class="field-group">
            <text class="field-label">网站标题</text>
            <input class="card-field" v-model="editingCard.data.title" placeholder="网站名称" />
            <text class="field-label">简介</text>
            <textarea class="card-textarea" v-model="editingCard.data.description" placeholder="简单介绍这个网站"></textarea>
          </view>
          <view v-if="editingCard.type === 'video'" class="field-group">
            <text class="field-label">视频说明</text>
            <input class="card-field" v-model="editingCard.data.caption" placeholder="视频说明（选填）" />
          </view>
          <view v-if="editingCard.type === 'document' || editingCard.type === 'file'" class="field-group">
            <text class="field-label">说明</text>
            <input class="card-field" v-model="editingCard.data.caption" placeholder="文件说明（选填）" />
          </view>
          <view v-if="editingCard.type === 'code'" class="field-group">
            <text class="field-label">语言</text>
            <select class="card-field" v-model="editingCard.data.language">
              <option v-for="lang in codeLanguages" :key="lang" :value="lang">{{ lang }}</option>
            </select>
            <text class="field-label">代码</text>
            <textarea class="card-textarea code-textarea" v-model="editingCard.data.code" placeholder="输入代码" spellcheck="false"></textarea>
          </view>
          <view v-if="editingCard.type === 'formula'" class="field-group">
            <text class="field-label">LaTeX 公式</text>
            <textarea class="card-textarea" v-model="editingCard.data.latex" placeholder="例如：E = mc^2"></textarea>
            <view class="formula-live-preview" v-html="renderFormula(editingCard.data.latex)"></view>
          </view>
          <view v-if="editingCard.type === 'table'" class="field-group">
            <text class="field-label">表格内容</text>
            <textarea class="card-textarea table-textarea" v-model="editingCard.data.content" placeholder="第一行为表头，使用逗号或 Tab 分隔列"></textarea>
            <text class="field-hint">每行一条数据，例如：名称,用途,网址</text>
          </view>
        </block>
      </view>
    </view>

    <!-- 像素风确认弹窗 -->
    <view v-if="showSaveConfirm" class="modal-overlay">
      <view class="modal-box" @click.stop>
        <view class="modal-title-bar">
          <text class="modal-title">提示</text>
        </view>
        <view class="modal-body">
          <text class="modal-text">是否保存当前编辑的内容？</text>
        </view>
        <view class="modal-actions">
          <view class="modal-btn modal-btn-stay" @click="showSaveConfirm = false">
            <text>不返回</text>
          </view>
          <view class="modal-btn modal-btn-cancel" @click="leaveWithoutSave">
            <text>不保存</text>
          </view>
          <view class="modal-btn modal-btn-save" @click="leaveWithSave">
            <text>保存</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import CoverCard from '@/components/cover-card.vue'
import { getPageData, setPageData, clearPageData } from '@/utils/page-data.js'
import { getUser, isLogin } from '@/store/auth.js'

export default {
  components: { CoverCard },
  data() {
    return {
      showSaveConfirm: false,
      showImagePanel: false,
      showTextPanel: false,
      showTextColorPop: false,
      textColor: '#E74C3C',
      showTextBgPop: false,
      textBgColor: '#F1C40F',
      savedRange: null,
      textFmt: { bold: false, italic: false, underline: false, strike: false },
      textColors: [
        { label: '红', value: '#E74C3C' },
        { label: '橙', value: '#E67E22' },
        { label: '黄', value: '#F1C40F' },
        { label: '绿', value: '#2ECC71' },
        { label: '蓝', value: '#3498DB' },
        { label: '紫', value: '#9B59B6' }
      ],
      textFonts: ['宋体', '黑体', '微软雅黑', '楷体', 'Arial', 'Times New Roman', 'Courier New'],
      showTextFontPop: false,
      textFont: '',
      textFontSizes: [12, 14, 16, 18, 20, 24, 28, 32],
      showTextSizePop: false,
      textFontSize: '',
      // 文字框 / 源码框 上下分隔比例（默认相等=相同大小）
      textInputFlex: 1,
      textPreviewFlex: 1,
      imageLink: '',
      imageList: [],
      gridWidth: 200,
      gridHeight: 120,
      gridResizing: false,
      gridOffsetX: 0,
      gridLeftText: '',
      gridRightText: '',
      gridLeftFmt: { bold: false, italic: false, underline: false, strike: false, color: '' },
      gridRightFmt: { bold: false, italic: false, underline: false, strike: false, color: '' },
      showGridTextEdit: false,
      gridWrapW: 0,
      selectedImageIdx: -1,
      contextMenuVisible: false,
      contextMenuIdx: -1,
      contextMenuX: 0,
      contextMenuY: 0,
      clipboardImage: null,
      undoStack: [],
      comboSeq: 0,
      content: '',
      // ===== 卡片流（清空重来，全新用卡片组织内容） =====
      cardList: [],            // 卡片数组：{ id, type:'text'|'image', data }
      cardSeq: 0,             // 卡片 id 自增
      activeCardId: null,      // 预览区当前高亮/定位的卡片 id
      showCardPanel: false,    // 右下角悬浮窗（卡片总览）是否展开
      editingCard: null,       // 正在编辑的卡片副本（抽屉用）
      editingCardIndex: -1,    // 正在编辑卡片在 cardList 的下标
      dragCardId: null,        // 拖拽排序中源卡片 id
      cardTextFmt: { bold: false, italic: false, underline: false, strike: false },
      cardTextColor: '#E74C3C',
      showCardColorPop: false,
      savedCardRange: null,
      cardTypes: [
        { value: 'text', label: '文字' }, { value: 'image', label: '图片' },
        { value: 'table', label: '表格' }, { value: 'video', label: '视频' },
        { value: 'document', label: '文档' }, { value: 'code', label: '代码' },
        { value: 'formula', label: '公式' }, { value: 'website', label: '网站' },
        { value: 'file', label: '文件' }
      ],
      codeLanguages: ['plaintext', 'javascript', 'typescript', 'html', 'css', 'python', 'java', 'c', 'cpp', 'go', 'rust', 'sql', 'json', 'markdown'],
      cover: {
        title: '',
        cover: '',
        author: '',
        weekDay: '',
        time: '',
        date: '',
        summary: '',
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
      uni.showToast({ title: '内容编辑仅测试员可用', icon: 'none' })
      setTimeout(() => uni.redirectTo({ url: '/pages/upload/upload' }), 400)
      return
    }
    const data = getPageData('content-edit-init')
      if (data) {
        this.content = data.content || ''
        if (data.cardList) {
          this.cardList = data.cardList
          this.cardSeq = this.cardList.reduce((max, card) => Math.max(max, Number(card.id) || 0), 0)
        }
        if (data.cover) {
        this.cover = { ...this.cover, ...data.cover }
      }
      clearPageData('content-edit-init')
    }
  },
  watch: {
    editingCard: {
      deep: true,
      handler(card) {
        if (!card) return
        const index = this.cardList.findIndex(item => item.id === card.id)
        if (index >= 0) this.$set(this.cardList, index, JSON.parse(JSON.stringify(card)))
      }
    },
    showImagePanel(val) {
      if (val) {
        this.$nextTick(() => {
          this.setupDropZone('dropZoneUpload')
          this.setupDropZone('dropZoneGrid')
        })
      }
    },
    // 兜底：整块尺寸变化时，自动收敛偏移保证始终在边界内
    gridWidth() {
      this.$nextTick(() => { this.clampGridOffset(); this.updateGridMetrics() })
    },
    gridHeight() {
      this.$nextTick(() => { this.clampGridOffset(); this.updateGridMetrics() })
    }
  },
  computed: {
    rendered() {
      return this.renderMarkdown(this.content)
    },
    sliderX: {
      get() {
        return Math.round(this.gridOffsetX || 0)
      },
      set(val) {
        const maxOff = this.gridBaseW || 0
        let v = Number(val) || 0
        v = Math.max(-maxOff, Math.min(maxOff, v))
        this.gridOffsetX = v
      }
    },
    // 滑块百分比（基于动态 maxOff 映射到 0~100）
    sliderPercent() {
      const maxOff = this.gridBaseW || 1
      return ((this.sliderX + maxOff) / (2 * maxOff)) * 100
    },
    // 滑块最大偏移：文字编辑时=左右文字框基准宽（限制框半宽-图片框/间距）；非编辑时=整框可平移半宽
    gridBaseW() {
      const W = this.gridWrapW || 0
      if (this.showGridTextEdit) {
        return Math.max(0, Math.floor((W - this.gridWidth) / 2) - 8)
      }
      return Math.max(0, Math.floor((W - this.gridWidth) / 2))
    },
    gridMaxSide() {
      const W = this.gridWrapW || 0
      return Math.max(0, W - this.gridWidth - 8)
    },
    // 左文字框宽：滑块右移（gridOffsetX 增大，图片框右移）时左侧变宽，到最右最大；左移变窄到消失
    gridLeftW() {
      if (!this.showGridTextEdit) return 0
      const w = (this.gridBaseW || 0) + this.gridOffsetX
      return Math.max(0, Math.min(this.gridMaxSide || 0, w))
    },
    // 右文字框宽：与左侧相反
    gridRightW() {
      if (!this.showGridTextEdit) return 0
      const w = (this.gridBaseW || 0) - this.gridOffsetX
      return Math.max(0, Math.min(this.gridMaxSide || 0, w))
    },
    // 滑块把手/填充定位：把手被两端灰色限制区（= 图片框半宽，含编辑模式 gap）严格约束在中间可滑区
    sliderMetrics() {
      const W = Math.max(this.gridWrapW || 0, 1)
      const editing = this.showGridTextEdit
      // 灰色限制区半宽（像素）：核心图片框的 1/2；编辑模式再含一侧 gap（文字框贴图）
      const halfPx = this.gridWidth / 2 + (editing ? 8 : 0)
      const halfPct = (halfPx / W) * 100
      const maxOff = this.gridBaseW || 1
      const ratio = Math.max(-1, Math.min(1, (this.gridOffsetX || 0) / maxOff))
      // 把手中心百分比：灰条内缘(halfPct%) ↔ 另一灰条内缘(100-halfPct%)，中点=50%
      const centerPct = halfPct + ((ratio + 1) / 2) * (100 - 2 * halfPct)
      const fillWNum = Math.abs(ratio) * (50 - halfPct)
      return {
        thumbLeft: `calc(${centerPct}% - 12px)`,
        fillLeft: ratio >= 0 ? '50%' : `${centerPct}%`,
        fillWidth: `calc(${fillWNum}%)`
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.setupPreviewDelegate()
      this.updateGridMetrics()
    })
  },
  methods: {
    onToolClick(type) {
      // 屏蔽按钮：灰色禁用，仅提示不展开
      const reserved = ['table', 'video', 'doc', 'code', 'file', 'link', 'formula']
      if (reserved.includes(type)) {
        uni.showToast({ title: '功能开发中', icon: 'none' })
        return
      }
      if (type === 'text') {
        const willShow = !this.showTextPanel
        this.showTextPanel = willShow
        this.showImagePanel = false // 与照片面板互斥
        this.showTextColorPop = false
        if (willShow) {
          this.deselectImage()
          this.$nextTick(() => {
            const el = this.$refs.textMainInput
            if (el) {
              el.innerHTML = this.content ? this.renderMarkdown(this.content) : '<br>'
              try { document.execCommand('styleWithCSS', false, true) } catch (e) {}
            }
          })
        }
        return
      }
      if (type === 'image') {
        const willShow = !this.showImagePanel
        this.showImagePanel = willShow
        this.showTextPanel = false // 与文字面板互斥
        return
      }
    },
    // ===== 图片功能 =====
    onImageInsert() {
      if (!this.imageLink) {
        uni.showToast({ title: '请先输入图片链接', icon: 'none' })
        return
      }
      this.insertText(`\n![图片描述](${this.imageLink})\n`)
      this.imageLink = ''
    },
    onImageAddToGrid() {
      if (!this.imageLink) {
        uni.showToast({ title: '请先输入图片链接', icon: 'none' })
        return
      }
      this.imageList.push({ url: this.imageLink, desc: '图片' + (this.imageList.length + 1), x: 0, y: 0, wScale: 1, hScale: 1, rotation: 0 })
      this.imageLink = ''
    },
    triggerImageUpload() {
      uni.chooseImage({
        count: 9,
        success: (res) => {
          const paths = res.tempFilePaths || []
          paths.forEach((p) => {
            this.imageList.push({ url: p, desc: '上传图片' + (this.imageList.length + 1), x: 0, y: 0, wScale: 1, hScale: 1, rotation: 0 })
          })
          if (paths.length === 0) {
            uni.showToast({ title: '未选择图片', icon: 'none' })
          }
        },
        fail: () => {
          uni.showToast({ title: '取消选择', icon: 'none' })
        }
      })
    },
    onGridDragOver(e) {
      // 允许拖放（H5原生事件），同时添加高亮
      if (e && e.currentTarget) {
        e.currentTarget.classList && e.currentTarget.classList.add('dragover')
      }
    },
    onGridDragLeave(e) {
      if (e && e.currentTarget) {
        e.currentTarget.classList && e.currentTarget.classList.remove('dragover')
      }
    },
    onGridDragDrop(e) {
      // 拖放后移除高亮
      if (e && e.currentTarget) {
        e.currentTarget.classList && e.currentTarget.classList.remove('dragover')
      }
      // H5 拖拽文件放入
      const dt = (e && e.dataTransfer) || (e && e.originalEvent && e.originalEvent.dataTransfer)
      if (!dt) return
      const files = dt.files || []
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        if (!f.type.startsWith('image/')) continue
        const reader = new FileReader()
        reader.onload = (evt) => {
          this.imageList.push({ url: evt.target.result, desc: f.name || '拖入图片', x: 0, y: 0, scale: 1 })
        }
        reader.readAsDataURL(f)
      }
    },
    setupDropZone(refName) {
      const ref = this.$refs[refName]
      if (!ref) return
      // uni-app H5 下 $refs 可能是组件实例或 DOM 元素
      const el = ref.$el || ref
      if (!el || el._dropSetup) return // 避免重复绑定
      el._dropSetup = true

      el.addEventListener('dragover', (e) => {
        e.preventDefault()
        e.stopPropagation()
        el.classList.add('dragover')
      })
      el.addEventListener('dragleave', (e) => {
        e.preventDefault()
        el.classList.remove('dragover')
      })
      el.addEventListener('drop', (e) => {
        e.preventDefault()
        e.stopPropagation()
        el.classList.remove('dragover')
        const dt = e.dataTransfer
        if (!dt) return
        const files = dt.files || []
        for (let i = 0; i < files.length; i++) {
          const f = files[i]
          if (!f.type.startsWith('image/')) continue
          const reader = new FileReader()
          reader.onload = (evt) => {
            this.imageList.push({ url: evt.target.result, desc: f.name || '拖入图片', x: 0, y: 0, wScale: 1, hScale: 1, rotation: 0 })
          }
          reader.readAsDataURL(f)
        }
      })
    },
    removeGridImage(idx) {
      this.imageList.splice(idx, 1)
    },
    // ===== 点击图片选中/取消选中 =====
    selectImage(idx) {
      this.selectedImageIdx = idx
    },
    deselectImage() {
      this.selectedImageIdx = -1
      this.hideContextMenu()
    },
    // ===== 拖动图片移动位置 =====
    onImageDragStart(e, idx) {
      this.selectedImageIdx = idx
      const isTouch = e.touches && e.touches.length > 0
      const point = isTouch ? e.touches[0] : e
      const startX = point.clientX
      const startY = point.clientY
      const img = this.imageList[idx]
      const initX = img.x || 0
      const initY = img.y || 0
      let moved = false

      const onMove = (ev) => {
        const p = (ev.touches && ev.touches.length > 0) ? ev.touches[0] : ev
        const dx = p.clientX - startX
        const dy = p.clientY - startY
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true
        if (moved) {
          this.$set(this.imageList[idx], 'x', initX + dx)
          this.$set(this.imageList[idx], 'y', initY + dy)
        }
      }
      const onEnd = () => {
        if (typeof document !== 'undefined') {
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onEnd)
          document.removeEventListener('touchmove', onMove)
          document.removeEventListener('touchend', onEnd)
        }
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onEnd)
        document.addEventListener('touchmove', onMove, { passive: false })
        document.addEventListener('touchend', onEnd)
      }
    },
    // ===== 获取图片基础宽高（像素） =====
    getImgBaseW(idx) {
      return this.imageList.length === 1 ? this.gridWidth : this.gridWidth * 0.5
    },
    getImgBaseH(idx) {
      return this.imageList.length === 1 ? this.gridHeight : this.gridHeight * 0.5
    },
    // ===== 拖拽控制点调整大小 =====
    onResizePointStart(e, idx, point) {
      const isTouch = e.touches && e.touches.length > 0
      const point0 = isTouch ? e.touches[0] : e
      const startX = point0.clientX
      const startY = point0.clientY
      const img = this.imageList[idx]
      const initW = img.wScale || 1
      const initH = img.hScale || 1
      const initX = img.x || 0
      const initY = img.y || 0
      const baseW = this.getImgBaseW(idx)
      const baseH = this.getImgBaseH(idx)
      const rotation = (img.rotation || 0) * Math.PI / 180
      const cosR = Math.cos(rotation)
      const sinR = Math.sin(rotation)
      const isCtrl = e && (e.ctrlKey || e.metaKey)

      // 控制点方向符号：w=-1（左）e=1（右）n=-1（上）s=1（下）0=不缩放该轴
      const wSign = point.includes('w') ? -1 : (point.includes('e') ? 1 : 0)
      const hSign = point.includes('n') ? -1 : (point.includes('s') ? 1 : 0)

      const onMove = (ev) => {
        const p = (ev.touches && ev.touches.length > 0) ? ev.touches[0] : ev
        const dx = p.clientX - startX
        const dy = p.clientY - startY
        // 将屏幕坐标系位移转换为图片本地坐标系（考虑旋转角度）
        const localDx = dx * cosR + dy * sinR
        const localDy = -dx * sinR + dy * cosR

        let newW = initW
        let newH = initH

        if (isCtrl && wSign !== 0 && hSign !== 0) {
          // Ctrl+拖角点 → 等比缩放（保持当前宽高比）
          const avgDelta = (localDx * wSign + localDy * hSign) / 2
          const sensitivity = 1 / Math.max(baseW * initW, baseH * initH)
          const ratio = Math.max(0.01, 1 + avgDelta * sensitivity)
          newW = Math.max(0.1, initW * ratio)
          newH = Math.max(0.1, initH * ratio)
        } else {
          // 普通缩放
          if (wSign !== 0) {
            newW = Math.max(0.1, initW + wSign * localDx / baseW)
          }
          if (hSign !== 0) {
            newH = Math.max(0.1, initH + hSign * localDy / baseH)
          }
        }

        // 计算新的x/y，使对角点（或对边）保持不动
        const W1 = baseW * initW, H1 = baseH * initH
        const W2 = baseW * newW, H2 = baseH * newH
        const dW = (W1 - W2) / 2
        const dH = (H1 - H2) / 2
        const newX = initX + dW * (1 - wSign * cosR) + hSign * dH * sinR
        const newY = initY + dW * (-wSign * sinR) + dH * (1 - hSign * cosR)

        this.$set(this.imageList[idx], 'wScale', newW)
        this.$set(this.imageList[idx], 'hScale', newH)
        this.$set(this.imageList[idx], 'x', newX)
        this.$set(this.imageList[idx], 'y', newY)
      }
      const onEnd = () => {
        if (typeof document !== 'undefined') {
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onEnd)
          document.removeEventListener('touchmove', onMove)
          document.removeEventListener('touchend', onEnd)
        }
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onEnd)
        document.addEventListener('touchmove', onMove, { passive: false })
        document.addEventListener('touchend', onEnd)
      }
    },
    // ===== 旋转图片 =====
    onRotateStart(e, idx) {
      const isTouch = e.touches && e.touches.length > 0
      const point0 = isTouch ? e.touches[0] : e
      const img = this.imageList[idx]
      const initRotation = img.rotation || 0

      // 获取图片元素，计算中心点
      const el = e.currentTarget && e.currentTarget.parentElement
      let centerX = 0, centerY = 0
      if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect()
        centerX = rect.left + rect.width / 2
        centerY = rect.top + rect.height / 2
      } else {
        centerX = point0.clientX
        centerY = point0.clientY
      }

      // 初始角度（鼠标相对于图片中心的角度）
      const initAngle = Math.atan2(point0.clientY - centerY, point0.clientX - centerX) * 180 / Math.PI

      const onMove = (ev) => {
        const p = (ev.touches && ev.touches.length > 0) ? ev.touches[0] : ev
        const angle = Math.atan2(p.clientY - centerY, p.clientX - centerX) * 180 / Math.PI
        let newRotation = initRotation + (angle - initAngle)
        newRotation = ((newRotation % 360) + 360) % 360
        this.$set(this.imageList[idx], 'rotation', newRotation)
      }
      const onEnd = () => {
        if (typeof document !== 'undefined') {
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onEnd)
          document.removeEventListener('touchmove', onMove)
          document.removeEventListener('touchend', onEnd)
        }
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onEnd)
        document.addEventListener('touchmove', onMove, { passive: false })
        document.addEventListener('touchend', onEnd)
      }
    },
    // ===== 水平滑块拖动（音量条交互）：移动整个「拖入图片」框的左右位置 =====
    onHSliderDragStart(e) {
      this.saveUndoSnapshot()
      const ref = this.$refs.hsliderTrack
      const track = (ref && ref.$el) ? ref.$el : ref
      if (!track || !track.getBoundingClientRect) return
      // 指针捕获：快速甩动移出窗口/元素时，move/up 仍派发到 track，避免拖动卡住
      if (e && typeof e.pointerId === 'number' && track.setPointerCapture) {
        try { track.setPointerCapture(e.pointerId) } catch (_) {}
      }
      // 同步限制框可用宽，确保 maxOff 基于最新容器宽
      this.updateGridMetrics()

      const onMove = (ev) => {
        ev.preventDefault()
        // 每次实时取轨道位置，避免快速滑动/布局变化时错位
        const rect = track.getBoundingClientRect()
        if (!rect || !rect.width) return
        const p = (ev.touches && ev.touches.length > 0) ? ev.touches[0] : ev
        let ratio = (p.clientX - rect.left) / rect.width
        ratio = Math.max(0, Math.min(1, ratio))
        // 滑块范围 = ±gridBaseW：左右文字框从基准宽随 gridOffsetX 此消彼长，到两端一端消失一端最大
        const maxOff = this.gridBaseW || 0
        if (!maxOff) return
        let val = Math.round(-maxOff + ratio * 2 * maxOff)
        val = Math.max(-maxOff, Math.min(maxOff, val))
        this.gridOffsetX = val
      }
      const onEnd = () => {
        if (typeof document !== 'undefined') {
          document.removeEventListener('pointermove', onMove)
          document.removeEventListener('pointerup', onEnd)
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onEnd)
          document.removeEventListener('touchmove', onMove, { passive: false })
          document.removeEventListener('touchend', onEnd)
        }
        if (track.releasePointerCapture && e && typeof e.pointerId === 'number') {
          try { track.releasePointerCapture(e.pointerId) } catch (_) {}
        }
      }
      if (typeof document !== 'undefined') {
        // 优先 pointer 事件（桌面+触屏统一），mouse/touch 作为兼容兜底（幂等无害）
        document.addEventListener('pointermove', onMove, { passive: false })
        document.addEventListener('pointerup', onEnd)
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onEnd)
        document.addEventListener('touchmove', onMove, { passive: false })
        document.addEventListener('touchend', onEnd)
      }
    },
    // ===== 回退（撤回上一个快照） =====
    undoImage() {
      if (this.undoStack.length > 0) {
        const snapshot = this.undoStack.pop()
        this.imageList = snapshot.imageList
        this.gridOffsetX = snapshot.gridOffsetX || 0
        this.selectedImageIdx = -1
        uni.showToast({ title: '已回退', icon: 'none' })
      } else {
        uni.showToast({ title: '无可回退操作', icon: 'none' })
      }
    },
    // ===== 保存撤回快照（含图片组合与框体左右偏移） =====
    saveUndoSnapshot() {
      const snapshot = {
        imageList: this.imageList.map(img => ({
          url: img.url, desc: img.desc,
          x: img.x || 0, y: img.y || 0,
          wScale: img.wScale || 1, hScale: img.hScale || 1,
          rotation: img.rotation || 0
        })),
        gridOffsetX: this.gridOffsetX || 0
      }
      this.undoStack.push(snapshot)
      if (this.undoStack.length > 30) this.undoStack.shift()
    },
    // ===== 右键菜单 =====
    showImageContextMenu(e, idx) {
      this.contextMenuVisible = true
      this.contextMenuIdx = idx
      this.contextMenuX = (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0) + 2
      this.contextMenuY = (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || 0) + 2
      this.selectedImageIdx = idx
    },
    hideContextMenu() {
      this.contextMenuVisible = false
      this.contextMenuIdx = -1
    },
    onContextAction(action) {
      const idx = this.contextMenuIdx
      if (idx < 0 || idx >= this.imageList.length) {
        this.hideContextMenu()
        return
      }
      switch (action) {
        case 'reply':
          // 回复 → 恢复图片到原始状态（重置所有变换）
          this.saveUndoSnapshot()
          this.$set(this.imageList[idx], 'x', 0)
          this.$set(this.imageList[idx], 'y', 0)
          this.$set(this.imageList[idx], 'wScale', 1)
          this.$set(this.imageList[idx], 'hScale', 1)
          this.$set(this.imageList[idx], 'rotation', 0)
          uni.showToast({ title: '已恢复原始状态', icon: 'none' })
          break
        case 'cut':
          // 剪切 → 存储图片数据到剪贴板并从列表中移除
          this.saveUndoSnapshot()
          this.clipboardImage = {
            url: this.imageList[idx].url,
            desc: this.imageList[idx].desc
          }
          this.imageList.splice(idx, 1)
          this.selectedImageIdx = -1
          uni.showToast({ title: '已剪切', icon: 'none' })
          break
        case 'paste':
          // 粘贴 → 从剪贴板中恢复图片到列表
          if (this.clipboardImage) {
            this.saveUndoSnapshot()
            this.imageList.push({
              url: this.clipboardImage.url,
              desc: this.clipboardImage.desc,
              x: 0, y: 0, wScale: 1, hScale: 1, rotation: 0
            })
            uni.showToast({ title: '已粘贴', icon: 'none' })
          } else {
            uni.showToast({ title: '剪贴板为空', icon: 'none' })
          }
          break
        case 'undo':
          this.undoImage()
          break
        case 'delete':
          this.saveUndoSnapshot()
          this.imageList.splice(idx, 1)
          this.selectedImageIdx = -1
          uni.showToast({ title: '已删除', icon: 'none' })
          break
      }
      this.hideContextMenu()
    },
    resetImagePositions() {
      this.imageList.forEach(img => {
        img.x = 0
        img.y = 0
        img.wScale = 1
        img.hScale = 1
        img.rotation = 0
      })
    },
    onGridResizeStart(e) {
      // 同时兼容鼠标和触摸
      const isTouch = e.touches && e.touches.length > 0
      const point = isTouch ? e.touches[0] : e
      const startX = point.clientX
      const startY = point.clientY
      const startW = this.gridWidth
      const startH = this.gridHeight
      this.gridResizing = true

      // 获取编辑器面板和组合框的边界，用于约束拖拽范围
      let editorRect = null
      let gridRect = null
      if (this.$el && typeof this.$el.querySelector === 'function') {
        const editorEl = this.$el.querySelector('.editor-pane')
        const gridEl = this.$el.querySelector('.image-grid-box')
        if (editorEl && editorEl.getBoundingClientRect) editorRect = editorEl.getBoundingClientRect()
        if (gridEl && gridEl.getBoundingClientRect) gridRect = gridEl.getBoundingClientRect()
      }

      const onMove = (ev) => {
        if (!this.gridResizing) return
        const p = (ev.touches && ev.touches.length > 0) ? ev.touches[0] : ev
        let newW = startW + (p.clientX - startX)
        let newH = startH + (p.clientY - startY)
        // 最小尺寸约束
        newW = Math.max(100, newW)
        newH = Math.max(80, newH)
        // 不超过编辑器面板的边界
        if (editorRect && gridRect) {
          // 右边界：组合框左边缘 + 新宽度 ≤ 编辑器右边缘
          const maxW = editorRect.right - gridRect.left - 4 // 留 4px padding
          // 下边界：组合框上边缘 + 新高度 ≤ 编辑器下边缘
          const maxH = editorRect.bottom - gridRect.top - 4
          if (maxW > 100) newW = Math.min(newW, maxW)
          if (maxH > 80) newH = Math.min(newH, maxH)
        }
        this.gridWidth = newW
        this.gridHeight = newH
        // 放大整块后，自动把偏移收敛到边界内（朝中间收），保证整块始终在容器边界内
        this.clampGridOffset()
        this.updateGridMetrics()
      }
      const onEnd = () => {
        this.gridResizing = false
        if (typeof document !== 'undefined') {
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onEnd)
          document.removeEventListener('touchmove', onMove)
          document.removeEventListener('touchend', onEnd)
        }
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onEnd)
        document.addEventListener('touchmove', onMove, { passive: false })
        document.addEventListener('touchend', onEnd)
      }
    },
    // 收敛整框水平偏移：保证放大/缩小整块后，整框始终在容器边界内（超出则朝中间收）
    clampGridOffset() {
      const maxOff = this.gridBaseW || 0
      if (!maxOff) return
      if (this.gridOffsetX > maxOff) this.gridOffsetX = maxOff
      else if (this.gridOffsetX < -maxOff) this.gridOffsetX = -maxOff
    },
    // 更新限制框（容器）可用宽 gridWrapW 并夹取偏移；滑块范围与左右文字框大小随容器宽实时更新
    updateGridMetrics() {
      this.$nextTick(() => {
        const sw = this.$refs.slideWrapper
        const el = (sw && sw.$el) ? sw.$el : sw
        const parent = el ? el.parentNode : null
        const W = parent ? parent.getBoundingClientRect().width : 0
        this.gridWrapW = W
        this.clampGridOffset()
      })
    },
    resetGridSize() {
      this.gridWidth = 200
      this.gridHeight = 120
    },
    onGridGenerate() {
      if (this.imageList.length === 0) {
        uni.showToast({ title: '请先添加图片到组合', icon: 'none' })
        return
      }
      const isSingle = this.imageList.length === 1
      const comboId = ++this.comboSeq
      const imgs = this.imageList.map(img => {
        const wScale = img.wScale || 1
        const hScale = img.hScale || 1
        const x = img.x || 0
        const y = img.y || 0
        const rotation = img.rotation || 0
        const baseW = isSingle ? this.gridWidth : this.gridWidth * 0.5
        const baseH = isSingle ? this.gridHeight : this.gridHeight * 0.5
        const w = Math.round(baseW * wScale)
        const h = Math.round(baseH * hScale)
        return `<img src="${img.url}" alt="${this.escapeHtml(img.desc)}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;object-fit:cover;transform:rotate(${rotation}deg);transform-origin:center center;border-radius:3px" />`
      }).join('')
      const delBtn = `<button type="button" class="combo-del-btn" data-combo-id="${comboId}" title="删除该图片组合">✕</button>`
      // 预览把「文字+图片」当成一个整体块，用与编辑器一致的固定宽度复现相对位置
      const editing = this.showGridTextEdit
      const GW = Math.round(this.gridWrapW || 0)
      const gap = 8
      let leftW = 0, rightW = 0, comboW = 0, imgMargin = 0
      if (editing) {
        leftW = Math.max(0, Math.round(this.gridLeftW))
        rightW = Math.max(0, Math.round(this.gridRightW))
        comboW = leftW + gap + this.gridWidth + gap + rightW
      } else if (GW > 0) {
        // 非编辑：整框在限制框内居中 + gridOffsetX 偏移，预览用同宽容器内部定位复现
        comboW = GW
        imgMargin = Math.round((GW - this.gridWidth) / 2 + this.gridOffsetX)
      } else {
        comboW = this.gridWidth
        imgMargin = Math.round(this.gridOffsetX || 0)
      }
      // 编辑模式：即便文字为空，只要该侧文字框在编辑器里可见（宽度>0）就渲染占位，保证图片相对位置正确
      const leftHtml = (editing && leftW > 0)
        ? `<div class="combo-side combo-side-left" style="width:${leftW}px;flex-shrink:0">${this.renderFormattedText(this.gridLeftText, this.gridLeftFmt)}</div>` : ''
      const rightHtml = (editing && rightW > 0)
        ? `<div class="combo-side combo-side-right" style="width:${rightW}px;flex-shrink:0">${this.renderFormattedText(this.gridRightText, this.gridRightFmt)}</div>` : ''
      const imgBox = `<div class="combo-imgbox" style="position:relative;width:${this.gridWidth}px;height:${this.gridHeight}px;margin-left:${imgMargin}px;overflow:hidden;border:2px solid #C0B5A0;border-radius:6px;background:#FFFAF1;flex-shrink:0">${imgs}${delBtn}</div>`
      const html = `<div class="img-combo" data-combo-id="${comboId}" style="display:flex;align-items:center;gap:${gap}px;width:${comboW}px;margin:8px 0">${leftHtml}${imgBox}${rightHtml}</div>`
      this.insertText('\n' + html + '\n')
      uni.showToast({ title: '图片组合已生成', icon: 'none' })
    },
    // ===== 预览区：图片组合删除按钮（事件委托） =====
    setupPreviewDelegate() {
      const ref = this.$refs.previewBody
      if (!ref) return
      const el = ref.$el || ref
      if (!el || !el.addEventListener) return
      if (el._previewDelegated) return
      el._previewDelegated = true
      el.addEventListener('click', (ev) => {
        const t = ev.target
        if (!t || !t.closest) return
        const btn = t.closest('.combo-del-btn')
        if (btn) {
          const id = btn.getAttribute('data-combo-id')
          this.removeCombo(id)
        }
      })
    },
    removeCombo(id) {
      if (!id) return
      // 整块以 </div>\n 结束（生成时 '\n'+html+'\n'，html 末尾即 img-combo 的 </div>），
      // 用贪婪到首个「</div>换行」匹配，避免停在内部 combo-side 的 </div>
      const re = new RegExp('\\n?<div class="img-combo" data-combo-id="' + id + '">[\\s\\S]*?</div>\\n', 'g')
      const before = this.content
      this.content = before.replace(re, '')
      if (before !== this.content) {
        uni.showToast({ title: '已删除图片组合', icon: 'none' })
      } else {
        uni.showToast({ title: '未找到该组合', icon: 'none' })
      }
    },
    onGridClear() {
      this.saveUndoSnapshot()
      this.imageList = []
      this.gridOffsetX = 0
    },
    // 文字编辑按钮：切换左右文字框显隐；展开时聚焦左侧输入框并重新计算偏移/灰条
    toggleGridTextEdit() {
      this.showGridTextEdit = !this.showGridTextEdit
      this.$nextTick(() => {
        this.clampGridOffset()
        this.updateGridMetrics()
        if (this.showGridTextEdit) {
          const el = this.$refs.gridLeftInput
          const dom = (el && el.$el) ? el.$el : el
          if (dom && dom.focus) dom.focus()
        }
      })
    },
    // 切换文字格式（bold/italic/underline/strike），side='left'|'right'
    toggleGridFmt(side, key) {
      const fmt = side === 'left' ? this.gridLeftFmt : this.gridRightFmt
      this.$set(fmt, key, !fmt[key])
      this.saveUndoSnapshot()
    },
    // 设置文字颜色，side='left'|'right'
    setGridColor(side, color) {
      const fmt = side === 'left' ? this.gridLeftFmt : this.gridRightFmt
      this.$set(fmt, 'color', color || '')
      this.saveUndoSnapshot()
    },
    // 根据格式状态渲染带 HTML 标签的文字（用于生成组合输出）
    renderFormattedText(text, fmt) {
      let s = this.escapeHtml(text || '')
      if (!s) return ''
      const styles = []
      if (fmt.bold) styles.push('font-weight:800')
      if (fmt.italic) styles.push('font-style:italic')
      if (fmt.underline) styles.push('text-decoration:underline')
      if (fmt.strike) styles.push('text-decoration:line-through')
      if (fmt.underline && fmt.strike) styles.splice(styles.indexOf('text-decoration:underline'), 1, 'text-decoration:underline line-through')
      if (fmt.color) styles.push('color:' + fmt.color)
      if (styles.length) s = `<span style="${styles.join(';')}">${s}</span>`
      return s
    },
    pasteImageFromClipboard() {
      if (this.clipboardImage) {
        this.saveUndoSnapshot()
        this.imageList.push({
          url: this.clipboardImage.url,
          desc: this.clipboardImage.desc,
          x: 0, y: 0, wScale: 1, hScale: 1, rotation: 0
        })
        uni.showToast({ title: '已粘贴', icon: 'none' })
      }
    },
    deleteGridModule() {
      this.imageList = []
      this.selectedImageIdx = -1
      this.clipboardImage = null
      this.undoStack = []
      this.showImagePanel = false
      uni.showToast({ title: '模块已删除', icon: 'none' })
    },
    // ===== 文字编辑面板 =====
    // ===== 文字编辑面板（所见即所得）=====
    hasLiveSelection() {
      // 当前是否有一个真实、落在文字框内的选区（连续点按钮时优先用它，别被旧 Range 覆盖）
      const el = this.$refs.textMainInput
      const sel = window.getSelection()
      if (!el || !sel || !sel.rangeCount) return false
      const r = sel.getRangeAt(0)
      return el.contains(r.commonAncestorContainer)
    },
    restoreRange() {
      const el = this.$refs.textMainInput
      if (!el) return
      // 关键：若当前已有活选区在框内（连续点 B/I/U/S 时），直接沿用，不要用 stale 的 savedRange 覆盖它
      if (this.hasLiveSelection()) return
      el.focus()
      if (this.savedRange) {
        const sel = window.getSelection()
        if (sel) {
          sel.removeAllRanges()
          try { sel.addRange(this.savedRange) } catch (e) {}
        }
      }
    },
    saveRange() {
      const el = this.$refs.textMainInput
      const sel = window.getSelection()
      if (sel && sel.rangeCount) {
        const r = sel.getRangeAt(0)
        if (el && el.contains(r.commonAncestorContainer)) {
          this.savedRange = r.cloneRange()
        }
      }
      this.updateFmtState()
    },
    updateFmtState() {
      // 根据当前光标/选区所处文字的格式，点亮对应工具按钮
      try {
        this.textFmt = {
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strike: document.queryCommandState('strikeThrough')
        }
      } catch (e) {}
    },
    onTextInput() {
      this.syncContent()
    },
    syncContent() {
      const el = this.$refs.textMainInput
      if (el) this.content = this.htmlToMarkdown(el.innerHTML)
    },
    onTextFormat(type) {
      const tagMap = { bold: 'strong', italic: 'em', underline: 'u', strike: 's' }
      const tag = tagMap[type]
      if (!tag) return
      const el = this.$refs.textMainInput
      const sel = window.getSelection()
      const r0 = sel && sel.rangeCount ? sel.getRangeAt(0) : null
      const hasSel = r0 && !r0.collapsed && el && el.contains(r0.commonAncestorContainer)
      if (hasSel) {
        // 有选中：用手动 DOM Range 包裹，确定性生成 <strong>/<em>/<u>/<s>。
        // 不依赖 execCommand 在不同浏览器/styleWithCSS 状态下的玄学行为
        // （之前依赖 execCommand 时，uni-app H5 下偶尔根本不生成粗体标签，
        //  导致 content 不变、markdown 源码里没有 **）。
        this.wrapSelection(tag, type)
      } else {
        // 无选中：退回 execCommand typing mode（保持"先点按钮再输入即加粗"的原行为）
        this.restoreRange()
        const cmdMap = { bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikeThrough' }
        const cmd = cmdMap[type]
        try { document.execCommand('styleWithCSS', false, false) } catch (e) {}
        document.execCommand(cmd, false, null)
        this.saveRange()
        try { this.textFmt[type] = document.queryCommandState(cmd) } catch (e) {}
        this.syncContent()
        setTimeout(() => this.updateFmtState(), 0)
      }
    },
    wrapSelection(tag, type) {
      const el = this.$refs.textMainInput
      if (!el) return
      el.focus()
      const sel = window.getSelection()
      if (!sel || !sel.rangeCount) return
      const range = sel.getRangeAt(0)
      const keyMap = { strong: 'bold', em: 'italic', u: 'underline', s: 'strike' }
      const key = keyMap[tag]
      // 选区完全处于该标签内 → 解包（toggle 关闭）
      const p = range.commonAncestorContainer
      if (p.nodeType === 1 && p.tagName.toLowerCase() === tag) {
        const parent = p.parentNode
        while (p.firstChild) parent.insertBefore(p.firstChild, p)
        parent.removeChild(p)
        try { this.$set(this.textFmt, key, false) } catch (e) {}
        this.saveRange()
        this.syncContent()
        setTimeout(() => this.updateFmtState(), 0)
        return
      }
      // 提取选区内容并包裹成 <tag>
      const frag = range.extractContents()
      const node = document.createElement(tag)
      node.appendChild(frag)
      range.insertNode(node)
      // 重设选区到包裹后的节点内（便于继续叠加其他格式）
      const r2 = document.createRange()
      r2.selectNodeContents(node)
      sel.removeAllRanges()
      sel.addRange(r2)
      try { this.$set(this.textFmt, key, true) } catch (e) {}
      this.saveRange()
      this.syncContent()
      setTimeout(() => this.updateFmtState(), 0)
    },
    onTextColor(color) {
      this.restoreRange()
      // 颜色必须 styleWithCSS=true 才能生成 <span style="color:..">
      try { document.execCommand('styleWithCSS', false, true) } catch (e) {}
      if (color) {
        document.execCommand('foreColor', false, color)
        this.textColor = color
      } else {
        document.execCommand('foreColor', false, '#2E1D0E')
        this.textColor = '#2E1D0E'
      }
      this.showTextColorPop = false
      this.syncContent()
    },
    onTextToggleColor() {
      this.showTextColorPop = !this.showTextColorPop
    },
    onTextBgColor(color) {
      this.restoreRange()
      // 背景色必须 styleWithCSS=true 才能生成 <span style="background-color:..">
      try { document.execCommand('styleWithCSS', false, true) } catch (e) {}
      if (color) {
        document.execCommand('hiliteColor', false, color)
        this.textBgColor = color
      } else {
        document.execCommand('hiliteColor', false, 'transparent')
        this.textBgColor = 'transparent'
      }
      this.showTextBgPop = false
      this.syncContent()
    },
    onTextToggleBg() {
      this.showTextBgPop = !this.showTextBgPop
    },
    onTextFont(family) {
      this.restoreRange()
      try { document.execCommand('styleWithCSS', false, false) } catch (e) {}
      if (family) {
        document.execCommand('fontName', false, family)
        this.textFont = family
      } else {
        this.textFont = ''
      }
      this.showTextFontPop = false
      this.syncContent()
    },
    onTextToggleFont() {
      this.showTextFontPop = !this.showTextFontPop
    },
    onTextFontSize(px) {
      this.restoreRange()
      try { document.execCommand('styleWithCSS', false, false) } catch (e) {}
      const map = { 12: '1', 14: '2', 16: '3', 18: '4', 20: '5', 24: '6', 28: '7', 32: '7' }
      const n = map[px] || '3'
      document.execCommand('fontSize', false, n)
      this.textFontSize = px
      this.showTextSizePop = false
      this.syncContent()
    },
    onTextToggleSize() {
      this.showTextSizePop = !this.showTextSizePop
    },
    onTextBlur() {
      this.saveRange()
      this.syncContent()
    },
    // 上下拖动分隔条：调整所见即所得文字框与 MARKDOWN 源码框的高度（此消彼长，默认等高）
    onTextSplitStart(e) {
      const inRef = this.$refs.textMainInput
      const prevRef = this.$refs.textPreviewBox
      if (!inRef || !prevRef) return
      const inEl = inRef.$el ? inRef.$el : inRef
      const prevEl = prevRef.$el ? prevRef.$el : prevRef
      if (!inEl || !prevEl || !inEl.getBoundingClientRect) return
      const isTouch = e.touches && e.touches.length > 0
      const p0 = isTouch ? e.touches[0] : e
      const startY = p0.clientY
      const hIn = inEl.getBoundingClientRect().height
      const hPrev = prevEl.getBoundingClientRect().height
      const total = hIn + hPrev
      const minH = 60
      const onMove = (ev) => {
        if (ev && ev.preventDefault) ev.preventDefault()
        const p = (ev.touches && ev.touches.length > 0) ? ev.touches[0] : ev
        const dy = p.clientY - startY
        let newIn = hIn + dy
        newIn = Math.max(minH, Math.min(total - minH, newIn))
        this.textInputFlex = newIn
        this.textPreviewFlex = total - newIn
      }
      const onEnd = () => {
        if (typeof document !== 'undefined') {
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onEnd)
          document.removeEventListener('touchmove', onMove)
          document.removeEventListener('touchend', onEnd)
        }
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onEnd)
        document.addEventListener('touchmove', onMove, { passive: false })
        document.addEventListener('touchend', onEnd)
      }
    },
    onTextDelete() {
      const el = this.$refs.textMainInput
      if (!el) return
      el.focus()
      const sel = window.getSelection()
      if (sel && sel.rangeCount && !sel.getRangeAt(0).collapsed) {
        document.execCommand('delete')
      } else if (sel) {
        sel.modify('extend', 'backward', 'character')
        document.execCommand('delete')
      }
      this.syncContent()
    },
    htmlToMarkdown(html) {
      const tmp = document.createElement('div')
      tmp.innerHTML = html || ''
      const walk = (node) => {
        if (node.nodeType === 3) return node.textContent
        if (node.nodeType !== 1) return ''
        const tag = node.tagName.toLowerCase()
        let inner = ''
        node.childNodes.forEach((c) => { inner += walk(c) })
        switch (tag) {
          case 'strong':
          case 'b':
            // 空内容（如 <strong></strong>）不产出废标记
            if (!inner.trim()) return ''
            // 若内部已含粗体标记（如浏览器产生 <strong><strong>…</strong></strong> 嵌套），
            // 不再重复包裹，否则会生成 **** 导致预览异常
            if (/^\*\*.+\*\*$/.test(inner) || inner.includes('**')) return inner
            return '**' + inner + '**'
          case 'em':
          case 'i':
            if (!inner.trim()) return ''
            if (/^\*.+\*$/.test(inner) || inner.includes('**')) return inner
            return '*' + inner + '*'
          case 'u': return '<u>' + inner + '</u>'
          case 's':
          case 'strike':
          case 'del': return '~~' + inner + '~~'
          case 'span': {
            const st = (node.getAttribute('style') || '').toLowerCase()
            const cm = st.match(/color\s*:\s*([^;]+)/i)
            const bgm = st.match(/background(?:-color)?\s*:\s*([^;]+)/i)
            const wm = /font-weight\s*:\s*(bold|[5-9]00)/.test(st)
            const sm = /font-style\s*:\s*italic/.test(st)
            const dm = st.match(/text-decoration\s*:\s*([^;]+)/i)
            const fm = st.match(/font-family\s*:\s*([^;]+)/i)
            const szm = st.match(/font-size\s*:\s*([^;]+)/i)
            let inner2 = inner
            if (dm) {
              if (/line-through/.test(dm[1])) inner2 = '~~' + inner2 + '~~'
              if (/underline/.test(dm[1])) inner2 = '<u>' + inner2 + '</u>'
            }
            if (wm) inner2 = '**' + inner2 + '**'
            if (sm) inner2 = '*' + inner2 + '*'
            // 颜色/字体/字号无法用 markdown 符号表达，保留为 span
            const keep = []
            if (cm) keep.push('color:' + cm[1].trim())
            if (bgm) keep.push('background-color:' + bgm[1].trim())
            if (fm) keep.push('font-family:' + fm[1].trim())
            if (szm) keep.push('font-size:' + szm[1].trim())
            if (keep.length) return '<span style="' + keep.join(';') + '">' + inner2 + '</span>'
            return inner2
          }
          case 'font': {
            const face = node.getAttribute('face')
            const size = node.getAttribute('size')
            const keep = []
            if (face) keep.push('font-family:' + face)
            if (size) {
              const pxMap = { '1': 12, '2': 14, '3': 16, '4': 18, '5': 20, '6': 24, '7': 32 }
              const px = pxMap[size] || 16
              keep.push('font-size:' + px + 'px')
            }
            if (keep.length) return '<span style="' + keep.join(';') + '">' + inner + '</span>'
            return inner
          }
          case 'div':
            if (node.className && /img-combo|combo-imgbox|combo-side/.test(node.className)) {
              return node.outerHTML
            }
            return '\n' + inner + '\n'
          case 'p': return '\n' + inner + '\n'
          case 'br': return '\n'
          case 'li': return inner + '\n'
          default: return inner
        }
      }
      let md = ''
      // 顶层拼接：相邻的元素节点（如连续两行带颜色的 <span>）之间补一个换行。
      // 否则浏览器在应用 foreColor/fontName 等后，可能把两行格式文字生成
      // 相邻的 <span> 而不带 <div>/<br> 分隔，htmlToMarkdown 会直接拼成一行，
      // 导致 content 缺失 \n、右侧预览丢失换行（只在最后输出单层 <div>）。
      let prevEl = false
      tmp.childNodes.forEach((c) => {
        const out = walk(c)
        if (out && c.nodeType === 1) {
          if (prevEl) md += '\n'
          prevEl = true
        } else {
          prevEl = false
        }
        md += out
      })
      return md.replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '')
    },
    insertText(text) {
      this.content = this.content + text
    },
    goBack() {
      this.showSaveConfirm = true
    },
    leaveWithSave() {
      this.showSaveConfirm = false
      this.save()
    },
    leaveWithoutSave() {
      this.showSaveConfirm = false
      uni.navigateBack({ delta: 1 })
    },
    onReadMore() {
      uni.showToast({ title: '预览展示，发布后可以使用该按钮', icon: 'none' })
    },
    // ===== 卡片流（清空重来，全新卡片组织） =====
    toggleCardPanel() {
      this.showCardPanel = !this.showCardPanel
    },
    addTextCard() {
      this.addCard('text')
    },
    addImageCard() {
      this.addCard('image')
    },
    cardDefaults(type) {
      const defaults = {
        text: { content: '' },
        image: { imageList: [], gridWidth: 200, gridHeight: 120, gridOffsetX: 0, gridLeftText: '', gridRightText: '' },
        table: { title: '', content: '名称,用途,网址\n示例,内容卡片,https://example.com' },
        video: { url: '', name: '', caption: '' },
        document: { url: '', name: '', caption: '', mimeType: '' },
        code: { title: '', language: 'javascript', code: '// 在这里输入代码\n' + 'console' + '.log("Hello");' },
        formula: { title: '', latex: 'E = mc^2' },
        website: { url: '', title: '', description: '' },
        file: { url: '', name: '', caption: '' }
      }
      return JSON.parse(JSON.stringify(defaults[type] || {}))
    },
    addCard(type, editAfterAdd = false) {
      const card = { id: ++this.cardSeq, type, data: this.cardDefaults(type) }
      this.cardList.push(card)
      this.activeCardId = card.id
      if (editAfterAdd) this.onCardEdit(card)
      return card
    },
    cardTypeLabel(type) {
      const item = this.cardTypes.find(entry => entry.value === type)
      return item ? item.label : '内容'
    },
    moveCard(index, direction) {
      const target = index + direction
      if (target < 0 || target >= this.cardList.length) return
      const card = this.cardList.splice(index, 1)[0]
      this.cardList.splice(target, 0, card)
    },
    moveEditingCard(direction) {
      if (!this.editingCard) return
      const index = this.cardList.findIndex(card => card.id === this.editingCard.id)
      if (index < 0) return
      const target = index + direction
      if (target < 0 || target >= this.cardList.length) return
      this.moveCard(index, direction)
      this.editingCardIndex = target
      this.$nextTick(() => this.onCardLocate(this.editingCard))
    },
    cardDesc(card) {
      if (card.type === 'text') {
        const t = (card.data.content || '').replace(/[#*_~`>]/g, '').replace(/\n/g, ' ').trim()
        return t ? (t.length > 24 ? t.slice(0, 24) + '…' : t) : '空白文字卡片'
      }
      if (card.type === 'image') return (card.data.imageList || []).length + ' 张图片'
      if (card.type === 'table') return card.data.title || '数据表格'
      if (card.type === 'code') return (card.data.title || card.data.language || '代码')
      if (card.type === 'formula') return card.data.title || card.data.latex || '公式'
      if (card.type === 'website') return card.data.title || card.data.url || '网站卡片'
      return card.data.name || card.data.caption || card.data.url || ('空白' + this.cardTypeLabel(card.type) + '卡片')
    },
    onCardLocate(card) {
      this.activeCardId = card.id
      this.$nextTick(() => {
        const flow = this.$refs.cardFlow
        if (!flow) return
        const el = flow.$el || flow
        const target = el.querySelector ? el.querySelector('[data-card-id="' + card.id + '"]') : null
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },
    onCardEdit(card) {
      const idx = this.cardList.findIndex(c => c.id === card.id)
      if (idx < 0) return
      this.editingCard = JSON.parse(JSON.stringify(card))
      this.editingCardIndex = idx
      this.activeCardId = card.id
      this.cardTextFmt = { bold: false, italic: false, underline: false, strike: false }
      this.savedCardRange = null
      if (card.type === 'text') {
        this.$nextTick(() => {
          const el = this.$refs.cardTextInput
          const dom = el && el.$el ? el.$el : el
          if (dom) dom.innerHTML = this.editingCard.data.content ? this.renderMarkdown(this.editingCard.data.content) : '<br>'
          this.saveCardRange()
        })
      }
    },
    onCardDelete(card) {
      const idx = this.cardList.findIndex(c => c.id === card.id)
      if (idx < 0) return
      this.cardList.splice(idx, 1)
      if (this.activeCardId === card.id) this.activeCardId = null
    },
    onCardDragStart(card, e) {
      this.dragCardId = card.id
      if (e && e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
    },
    onCardDragOver(e) {
      if (e && e.preventDefault) e.preventDefault()
    },
    onCardDrop(targetCard, e) {
      if (e && e.preventDefault) e.preventDefault()
      const fromId = this.dragCardId
      this.dragCardId = null
      if (!fromId || fromId === targetCard.id) return
      const fromIdx = this.cardList.findIndex(c => c.id === fromId)
      const toIdx = this.cardList.findIndex(c => c.id === targetCard.id)
      if (fromIdx < 0 || toIdx < 0) return
      const moved = this.cardList.splice(fromIdx, 1)[0]
      this.cardList.splice(toIdx, 0, moved)
    },
    closeCardEditor() {
      if (this.editingCard && this.editingCardIndex >= 0) {
        this.$set(this.cardList, this.editingCardIndex, this.editingCard)
      }
      this.editingCard = null
      this.editingCardIndex = -1
      this.showCardColorPop = false
    },
    // 文字卡片编辑（contenteditable 子集）
    onCardTextInput() {
      const el = this.$refs.cardTextInput
      const dom = el && el.$el ? el.$el : el
      if (!dom) return
      this.editingCard.data.content = this.htmlToMarkdown(dom.innerHTML)
      this.updateCardFmt()
    },
    onCardTextBlur() {
      this.saveCardRange()
      this.onCardTextInput()
    },
    saveCardRange() {
      const el = this.$refs.cardTextInput
      const dom = el && el.$el ? el.$el : el
      if (!dom) return
      const sel = window.getSelection && window.getSelection()
      if (sel && sel.rangeCount) this.savedCardRange = sel.getRangeAt(0)
    },
    updateCardFmt() {
      try {
        this.cardTextFmt.bold = document.queryCommandState('bold')
        this.cardTextFmt.italic = document.queryCommandState('italic')
        this.cardTextFmt.underline = document.queryCommandState('underline')
        this.cardTextFmt.strike = document.queryCommandState('strikeThrough')
      } catch (e) {}
    },
    onCardFmt(type) {
      const map = { bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikeThrough' }
      const cmd = map[type]
      const el = this.$refs.cardTextInput
      const dom = el && el.$el ? el.$el : el
      if (!dom) return
      dom.focus()
      try { document.execCommand('styleWithCSS', false, false) } catch (e) {}
      document.execCommand(cmd, false, null)
      this.updateCardFmt()
    },
    onCardColor(val) {
      const el = this.$refs.cardTextInput
      const dom = el && el.$el ? el.$el : el
      if (!dom) return
      dom.focus()
      try { document.execCommand('styleWithCSS', true, true) } catch (e) {}
      document.execCommand('foreColor', false, val || '#2E1D0E')
      this.cardTextColor = val || '#2E1D0E'
      this.showCardColorPop = false
      this.onCardTextInput()
    },
    // 图片卡片编辑
    onCardImgPick() {
      const _this = this
      uni.chooseImage({
        count: 9,
        success(res) {
          const raw = (res.tempFilePaths && res.tempFilePaths.length) ? res.tempFilePaths
            : (res.tempFiles || []).map(f => (f && (f.path || f.url)) || f)
          const urls = (raw || []).map(u => ({ url: u, desc: '', x: 0, y: 0, wScale: 1, hScale: 1, rotation: 0 }))
          if (!_this.editingCard.data.imageList) _this.editingCard.data.imageList = []
          _this.editingCard.data.imageList = _this.editingCard.data.imageList.concat(urls)
        }
      })
    },
    onCardImgDel(i) {
      this.editingCard.data.imageList.splice(i, 1)
    },
    onCardOffsetInput(e) {
      this.editingCard.data.gridOffsetX = parseInt(e.target.value, 10) || 0
    },
    onCardLeftInput(e) {
      this.editingCard.data.gridLeftText = e.target.value
    },
    onCardRightInput(e) {
      this.editingCard.data.gridRightText = e.target.value
    },
    onGenericFilePick() {
      if (typeof uni.chooseFile !== 'function') {
        uni.showToast({ title: '当前环境请直接填写资源地址', icon: 'none' })
        return
      }
      uni.chooseFile({
        count: 1,
        success: (res) => {
          const file = (res.tempFiles || [])[0]
          const path = (res.tempFilePaths || [])[0] || (file && (file.path || file.url)) || ''
          this.editingCard.data.url = path
          this.editingCard.data.name = (file && file.name) || path.split(/[\\/]/).pop() || ''
          this.editingCard.data.mimeType = (file && file.type) || ''
        }
      })
    },
    renderCard(card) {
      const data = card.data || {}
      if (card.type === 'text') return this.renderMarkdown(data.content)
      if (card.type === 'image') return this.genImageComboHtml(data)
      if (card.type === 'table') return this.renderTable(data)
      if (card.type === 'video') return data.url
        ? '<video class="card-video" src="' + this.escapeHtml(data.url) + '" controls preload="metadata"></video>' + this.renderCaption(data.caption)
        : '<div class="md-empty">视频卡片：点击添加视频</div>'
      if (card.type === 'document' || card.type === 'file') return this.renderFileCard(card.type, data)
      if (card.type === 'code') return '<div class="content-card-title">' + this.escapeHtml(data.title || data.language || '代码') + '</div><pre class="code-card"><code>' + this.escapeHtml(data.code || '') + '</code></pre>'
      if (card.type === 'formula') return (data.title ? '<div class="content-card-title">' + this.escapeHtml(data.title) + '</div>' : '') + '<div class="formula-card">' + this.renderFormula(data.latex) + '</div>'
      if (card.type === 'website') return '<a class="website-card" href="' + this.escapeHtml(data.url || '#') + '" target="_blank" rel="noopener"><span class="website-icon">↗</span><span><strong>' + this.escapeHtml(data.title || data.url || '网站') + '</strong><small>' + this.escapeHtml(data.description || '点击访问网站') + '</small></span></a>'
      return '<div class="md-empty">未知卡片类型</div>'
    },
    renderCaption(caption) {
      return caption ? '<div class="card-caption">' + this.escapeHtml(caption) + '</div>' : ''
    },
    renderTable(data) {
      const rows = String(data.content || '').split(/\r?\n/).filter(row => row.trim()).map(row => row.split(/\t|,/).map(cell => cell.trim()))
      if (!rows.length) return '<div class="md-empty">表格卡片：暂无数据</div>'
      const head = '<tr>' + rows[0].map(cell => '<th>' + this.escapeHtml(cell) + '</th>').join('') + '</tr>'
      const body = rows.slice(1).map(row => '<tr>' + row.map(cell => '<td>' + this.escapeHtml(cell) + '</td>').join('') + '</tr>').join('')
      return (data.title ? '<div class="content-card-title">' + this.escapeHtml(data.title) + '</div>' : '') + '<div class="table-scroll"><table class="content-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>'
    },
    renderFormula(latex) {
      const value = this.escapeHtml(latex || '')
      return value ? '<span class="formula-text">' + value.replace(/\^\{?([^{}\s]+)\}?/g, '<sup>$1</sup>').replace(/_\{?([^{}\s]+)\}?/g, '<sub>$1</sub>') + '</span>' : '<span class="md-empty">暂无公式</span>'
    },
    renderFileCard(type, data) {
      const label = type === 'document' ? 'DOC' : 'FILE'
      const name = data.name || data.url || (type === 'document' ? '未命名文档' : '未命名文件')
      const body = '<span class="file-badge">' + label + '</span><span><strong>' + this.escapeHtml(name) + '</strong><small>' + this.escapeHtml(data.caption || (data.url ? '点击打开或下载' : '点击卡片添加文件')) + '</small></span>'
      return data.url ? '<a class="file-card" href="' + this.escapeHtml(data.url) + '" target="_blank" download>' + body + '</a>' : '<div class="file-card">' + body + '</div>'
    },
    // 图片卡片预览：从 data 生成 img-combo（居中 + 偏移，与正式预览一致）
    genImageComboHtml(data) {
      const list = (data && data.imageList) || []
      if (!list.length) return '<div class="md-empty">图片卡片：暂无图片</div>'
      const isSingle = list.length === 1
      const imgs = list.map(img => {
        const wScale = img.wScale || 1
        const hScale = img.hScale || 1
        const x = img.x || 0
        const y = img.y || 0
        const rot = img.rotation || 0
        const baseW = isSingle ? data.gridWidth : data.gridWidth * 0.5
        const baseH = isSingle ? data.gridHeight : data.gridHeight * 0.5
        const w = Math.round(baseW * wScale)
        const h = Math.round(baseH * hScale)
        return '<img src="' + img.url + '" alt="' + this.escapeHtml(img.desc || '') + '" style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;object-fit:cover;transform:rotate(' + rot + 'deg);transform-origin:center center;border-radius:3px" />'
      }).join('')
      const GW = Math.round(this.gridWrapW || 0)
      const comboW = GW > 0 ? GW : data.gridWidth
      const imgMargin = GW > 0 ? Math.round((GW - data.gridWidth) / 2 + (data.gridOffsetX || 0)) : Math.round(data.gridOffsetX || 0)
      const leftHtml = (data.gridLeftText && data.gridLeftText.trim())
        ? '<div class="combo-side combo-side-left" style="flex:1;min-width:0;word-break:break-word;font-size:13px;color:#5b4a32;text-align:left">' + this.escapeHtml(data.gridLeftText) + '</div>'
        : ''
      const rightHtml = (data.gridRightText && data.gridRightText.trim())
        ? '<div class="combo-side combo-side-right" style="flex:1;min-width:0;word-break:break-word;font-size:13px;color:#5b4a32;text-align:right">' + this.escapeHtml(data.gridRightText) + '</div>'
        : ''
      const imgBox = '<div class="combo-imgbox" style="position:relative;width:' + data.gridWidth + 'px;height:' + data.gridHeight + 'px;margin-left:' + imgMargin + 'px;overflow:hidden;border:2px solid #C0B5A0;border-radius:6px;background:#FFFAF1;flex-shrink:0">' + imgs + '</div>'
      return '<div class="img-combo" style="display:flex;align-items:center;gap:8px;width:' + comboW + 'px;margin:8px 0">' + leftHtml + imgBox + rightHtml + '</div>'
    },

    save() {
      setPageData('content-edit-save', {
        content: this.content,
        cardList: this.cardList
      })
      uni.navigateBack({ delta: 1 })
    },
    // 极简 Markdown 渲染
    renderMarkdown(src) {
      if (!src) return '<p class="md-empty">暂无内容</p>'
      const lines = src.split('\n')
      let html = ''
      let inList = false
      const closeList = () => { if (inList) { html += '</ul>'; inList = false } }
      for (const raw of lines) {
        const line = raw.trim()
        if (!line) { closeList(); continue }
        const h = line.match(/^(#{1,3})\s+(.*)$/)
        if (h) {
          closeList()
          const lv = h[1].length
          html += `<h${lv}>${this.inline(h[2])}</h${lv}>`
          continue
        }
        if (/^[-*]\s+/.test(line)) {
          if (!inList) { html += '<ul>'; inList = true }
          html += `<li>${this.inline(line.replace(/^[-*]\s+/, ''))}</li>`
          continue
        }
        // HTML 块级元素：用 <div> 包裹输出，避免连续两行（如两个带颜色的 span）
        // 被直接拼接、丢失换行（之前直接 inline 输出导致 a/a 变成同一行）
        if (/^<(div|span|img|u|s)\b/i.test(line)) {
          closeList()
          html += '<div>' + this.inline(line) + '</div>'
          continue
        }
        closeList()
        html += `<p>${this.inline(line)}</p>`
      }
      closeList()
      return html
    },
    inline(text) {
      return text
        // 先折叠 4+ 个 * 为一组 **，清理旧数据里可能的 **** 嵌套残留
        .replace(/\*{4,}/g, '**')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/~~(.+?)~~/g, '<s>$1</s>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
    },
    // 转义用户输入，避免破坏组合 HTML 或注入
    escapeHtml(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }
  }
}
</script>

<style scoped>
.page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #F3E4C9;
  -webkit-font-smoothing: antialiased;
}

/* 顶部导航栏 */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 3px solid #2E1D0E;
  background: rgba(255, 250, 241, 0.92);
  flex-shrink: 0;
}
.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #2E1D0E;
  background: rgba(255, 250, 241, 0.9);
  box-shadow: 3px 3px 0 #0B0A0F26;
  font-size: 15px;
  font-weight: 900;
  color: #2E1D0E;
  cursor: pointer;
}
.back-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #0B0A0F26;
}
.top-title {
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #2E1D0E;
}
.save-btn {
  height: 36px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #2E1D0E;
  background: #2E1D0E;
  box-shadow: 3px 3px 0 #0B0A0F26;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #FFFAF1;
  cursor: pointer;
}
.save-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #0B0A0F26;
}

/* 分屏容器 */
.split {
  flex: 1;
  display: flex;
  min-height: 0;
}
.pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.editor-pane {
  background: rgba(255, 250, 241, 0.6);
  overflow: hidden;
}
.preview-pane {
  background: rgba(255, 250, 241, 0.92);
  overflow: hidden;
}
.pane-head {
  flex-shrink: 0;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #8C7B5E;
  border-bottom: 2px solid #C0B5A0;
}

/* 分界线 */
.divider {
  width: 3px;
  flex-shrink: 0;
  background: #2E1D0E;
  box-shadow: 1px 0 0 #2E1D0E26, -1px 0 0 #2E1D0E26;
}

/* 工具栏 */
.toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px 6px;
  border-bottom: 2px solid #C0B5A0;
  background: rgba(243, 228, 201, 0.5);
  overflow-x: auto;
}
.tool-btn {
  flex: 1;
  min-width: 0;
  height: 38px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid #C0B5A0;
  border-radius: 3px;
  background: rgba(255, 250, 241, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
  gap: 1px;
}
.tool-btn .tool-icon {
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  color: #8C7B5E;
}
.tool-btn .tool-label {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0;
  color: #8C7B5E;
  line-height: 1;
}
.tool-btn.active {
  border-color: #2E1D0E;
  background: #FFFAF1;
  box-shadow: 2px 2px 0 #2E1D0E26;
}
.tool-btn.active .tool-icon,
.tool-btn.active .tool-label {
  color: #2E1D0E;
}
.tool-btn.active:active {
  transform: translate(1px, 1px);
  box-shadow: 0 0 0 #2E1D0E26;
}
.tool-btn.reserved {
  border-style: dashed;
  border-color: #D4C9B5;
  background: transparent;
  cursor: not-allowed;
}
.tool-btn.reserved .tool-icon,
.tool-btn.reserved .tool-label {
  color: #C0B5A0;
}
.tool-btn.reserved:active {
  opacity: 0.6;
}

/* ========== 图片格式扩展栏 ========== */
.image-panel {
  flex-shrink: 0;
  border-bottom: 2px solid #C0B5A0;
  background: rgba(255, 250, 241, 0.85);
  padding: 6px;
}
.image-input-row {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-bottom: 5px;
}
.image-url-input {
  flex: 1;
  min-width: 0;
  height: 30px;
  border: 2px solid #2E1D0E;
  border-radius: 3px;
  background: #FFFAF1;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  color: #2E1D0E;
  outline: none;
}
.image-action-btn {
  flex-shrink: 0;
  height: 30px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #2E1D0E;
  border-radius: 3px;
  background: #FFFAF1;
  box-shadow: 2px 2px 0 #2E1D0E26;
  font-size: 10px;
  font-weight: 900;
  color: #2E1D0E;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.image-action-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 0 0 0 #2E1D0E26;
}
.image-upload-row {
  margin-bottom: 6px;
}
.image-upload-btn {
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #2E1D0E;
  border-radius: 3px;
  background: rgba(255, 250, 241, 0.5);
  font-size: 11px;
  font-weight: 800;
  color: #2E1D0E;
  cursor: pointer;
  transition: background 0.15s ease;
}
.image-upload-btn:active {
  background: rgba(255, 250, 241, 0.9);
}
.image-upload-btn.dragover {
  background: rgba(243, 228, 201, 0.9);
  border-color: #8C5A2E;
  color: #8C5A2E;
}
/* 图片组合容器 */
.image-grid-section {
  margin-top: 4px;
}
.grid-section-label {
  font-size: 8px;
  font-weight: 800;
  color: #8C7B5E;
  margin-bottom: 3px;
  letter-spacing: 0.02em;
  line-height: 1.4;
}
.image-grid-box {
  position: relative;
  padding: 4px;
  border: 2px solid #2E1D0E;
  border-radius: 4px;
  background: #FFFAF1;
  overflow: hidden;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.image-grid-box.dragover {
  background: rgba(243, 228, 201, 0.9);
  border-color: #8C5A2E;
}
.grid-thumb-item {
  position: absolute;
  border: 2px solid #C0B5A0;
  border-radius: 3px;
  overflow: hidden;
  cursor: move;
  user-select: none;
  -webkit-user-drag: none;
  transition: transform 0.1s ease;
}
.grid-thumb-selected {
  border: 3px solid #ff0000;
  animation: rainbow-border 3s linear infinite;
  z-index: 10;
}
@keyframes rainbow-border {
  0%   { border-color: #ff0000 }
  16%  { border-color: #ff8800 }
  33%  { border-color: #ffff00 }
  50%  { border-color: #00ff00 }
  66%  { border-color: #0088ff }
  83%  { border-color: #8800ff }
  100% { border-color: #ff0000 }
}
/* 控制点overlay */
.resize-controls {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 20;
}
.resize-point {
  position: absolute;
  width: 16px;
  height: 16px;
  background: #FFFAF1;
  border: 2px solid #2E1D0E;
  border-radius: 3px;
  box-shadow: 2px 2px 0 #2E1D0E26;
  pointer-events: auto;
  z-index: 21;
  transition: transform 0.1s ease;
}
.resize-point:active {
  transform: scale(1.3);
}
.rp-nw { left: -9px; top: -9px; cursor: nwse-resize; }
.rp-n  { left: calc(50% - 8px); top: -9px; cursor: ns-resize; }
.rp-ne { right: -9px; top: -9px; cursor: nesw-resize; }
.rp-e  { right: -9px; top: calc(50% - 8px); cursor: ew-resize; }
.rp-se { right: -9px; bottom: -9px; cursor: nwse-resize; }
.rp-s  { left: calc(50% - 8px); bottom: -9px; cursor: ns-resize; }
.rp-sw { left: -9px; bottom: -9px; cursor: nesw-resize; }
.rp-w  { left: -9px; top: calc(50% - 8px); cursor: ew-resize; }
/* 旋转手柄 */
.rotate-handle {
  position: absolute;
  top: -28px;
  left: calc(50% - 10px);
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFAF1;
  border: 2px solid #2E1D0E;
  border-radius: 50%;
  box-shadow: 2px 2px 0 #2E1D0E26;
  font-size: 12px;
  font-weight: 900;
  color: #2E1D0E;
  cursor: grab;
  pointer-events: auto;
  z-index: 22;
}
.rotate-handle:active {
  cursor: grabbing;
  transform: scale(1.1);
}
/* 右键菜单 */
.context-menu {
  position: fixed;
  z-index: 99999;
  min-width: 120px;
  border: 2px solid #2E1D0E;
  border-radius: 4px;
  background: #FFFAF1;
  box-shadow: 4px 4px 0 #2E1D0E40;
  overflow: hidden;
}
.context-menu-item {
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 800;
  color: #2E1D0E;
  cursor: pointer;
  transition: background 0.1s ease;
  border-bottom: 1px solid #C0B5A0;
}
.context-menu-item:last-child {
  border-bottom: none;
}
.context-menu-item:hover, .context-menu-item:active {
  background: #F3E4C9;
}
.context-menu-danger {
  color: #E74C3C;
}
.grid-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}
.grid-thumb-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(46, 29, 14, 0.7);
  color: #FFFAF1;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
  z-index: 5;
}
.grid-thumb-scale {
  position: absolute;
  bottom: 2px;
  left: 2px;
  padding: 1px 4px;
  background: rgba(46, 29, 14, 0.7);
  color: #FFFAF1;
  font-size: 8px;
  font-weight: 900;
  border-radius: 2px;
  z-index: 5;
  pointer-events: none;
}
.grid-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #C0B5A0;
}
.grid-resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  font-size: 14px;
  font-weight: 900;
  color: #2E1D0E;
  cursor: nwse-resize;
  user-select: none;
  z-index: 10;
  background: rgba(255, 250, 241, 0.8);
  border-radius: 4px 0 0 0;
}
.grid-controls {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}
.grid-control-btn {
  flex: 1;
  min-width: 0;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #2E1D0E;
  border-radius: 3px;
  background: #FFFAF1;
  box-shadow: 1px 1px 0 #2E1D0E26;
  font-size: 10px;
  font-weight: 800;
  color: #2E1D0E;
  cursor: pointer;
  transition: all 0.15s ease;
}
.grid-control-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 0 0 0 #2E1D0E26;
}
.grid-control-danger {
  border-color: #E74C3C;
  color: #E74C3C;
  background: rgba(255, 250, 241, 0.5);
  flex: 1.2;
}
.grid-control-danger:active {
  background: rgba(231, 76, 60, 0.1);
}
.grid-control-active {
  border-color: #8C5A2E;
  color: #FFFAF1;
  background: #8C5A2E;
}

/* 整框左右文字编辑 */
.grid-slide-wrapper {
  display: inline-flex;
  align-items: stretch;
  gap: 8px;
  position: relative;
}
.grid-side {
  flex-shrink: 0;
  align-self: stretch;
  margin-top: -22px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.grid-side-input {
  width: 100%;
  flex: 1;
  min-height: 0;
  border: 2px solid #C0B5A0;
  border-radius: 4px;
  background: #FFF8EB;
  padding: 6px 7px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.5;
  color: #2E1D0E;
  outline: none;
  resize: none;
  box-sizing: border-box;
}
.grid-side-input:focus {
  border-color: #8C5A2E;
  background: #FFFAF1;
}

/* 文字格式工具栏（B/I/U/S + 颜色） */
.grid-text-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 2px 2px;
  flex-shrink: 0;
  border-bottom: 1px solid #E8DCC8;
  background: #FFF8EB;
}
.gtb-group {
  display: flex;
  align-items: center;
  gap: 2px;
}
.gtb-colors {
  gap: 3px;
}
.gtb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 4px;
  border: 1.5px solid #C0B5A0;
  border-radius: 3px;
  background: #FFFAF1;
  font-size: 11px;
  font-weight: 800;
  color: #2E1D0E;
  cursor: pointer;
  user-select: none;
  transition: all 0.12s;
}
.gtb-btn:active {
  transform: scale(0.92);
}
.gtb-active {
  border-color: #8C5A2E !important;
  color: #FFFAF1 !important;
  background: #8C5A2E !important;
}
.gtb-color {
  width: 22px;
  min-width: 22px;
  border-color: rgba(0,0,0,0.18) !important;
}
.gtb-color.gtb-active {
  box-shadow: inset 0 0 0 2px #fff, 0 0 0 2px currentColor;
}
.gtb-divider {
  width: 1px;
  height: 16px;
  background: #D4C8B4;
  margin: 0 3px;
  flex-shrink: 0;
}

/* 图片编辑区 + 水平滑块容器 */
.grid-with-slider {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  margin-top: 6px;
}

/* ====== 水平位置滑块（音量条样式，拖动整框左右）====== */
.hslider-col {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  padding: 6px 0 4px 0;
  border: 2px solid #C0B5A0;
  border-radius: 4px;
  background: #FFF8EB;
  margin-top: 6px;
  transition: all 0.2s ease;
  user-select: none;
  -webkit-user-select: none;
}
.hslider-col.hslider-active {
  background: #FFFAF1;
  border-color: #8C5A2E;
  box-shadow: inset 0 0 8px rgba(140, 90, 46, 0.08);
}

/* 顶部：标签 + 数值 + 回退 */
.hslider-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  margin-bottom: 5px;
}
.hslider-label {
  font-size: 10px;
  font-weight: 900;
  color: #2E1D0E;
  letter-spacing: 0.02em;
}
.hslider-val {
  min-width: 34px;
  text-align: center;
  font-size: 11px;
  font-weight: 900;
  color: #8C5A2E;
  letter-spacing: -0.02em;
}
.hslider-val-dim {
  color: #B0A088;
}
.hslider-undo {
  width: 24px;
  height: 24px;
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #8C5A2E;
  border-radius: 50%;
  background: #FFFAF1;
  cursor: pointer;
  font-size: 12px;
  color: #8C5A2E;
  transition: all 0.12s ease;
  flex-shrink: 0;
}
.hslider-undo:active {
  background: #8C5A2E;
  color: #FFFAF1;
  transform: scale(0.92);
}

/* 轨道（水平） */
.hslider-track {
  position: relative;
  width: 100%;
  height: 16px;
  background: #E8DCC8;
  border-radius: 8px;
  cursor: pointer;
  overflow: visible;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.12);
}

/* 不可滑动区域（灰色标注，长度 = 整框的 1/2；仅非文字编辑模式下显示） */
.hslider-disabled {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--grid-half, 100px);
  background: #C9C2B4;
  pointer-events: none;
  z-index: 1;
}
.hslider-disabled-left { left: 0; border-radius: 8px 0 0 8px; }
.hslider-disabled-right { right: 0; border-radius: 0 8px 8px 0; }

/* 填充区域（从左到右） */
.hslider-fill {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  background: linear-gradient(to right, #8C5A2E, #B87D4F);
  border-radius: 8px 0 0 8px;
  transition: width 0.05s linear;
  pointer-events: none;
  z-index: 2;
}

/* 滑块把手（圆形） */
.hslider-thumb {
  position: absolute;
  top: 50%;
  width: 24px;
  height: 24px;
  background: #FFFAF1;
  border: 3px solid #8C5A2E;
  border-radius: 50%;
  transform: translateY(-50%);
  cursor: grab;
  z-index: 4;
  box-shadow: 0 1px 5px rgba(0,0,0,0.18);
  transition: transform 0.05s, box-shadow 0.15s;
}
.hslider-thumb:active {
  cursor: grabbing;
  box-shadow: 0 2px 10px rgba(140, 90, 46, 0.35);
  transform: translateY(-50%) scale(1.12);
}

/* 刻度标记 */
.hslider-mark {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 9px;
  font-weight: 900;
  color: #8C7B5E;
  pointer-events: none;
}
.hslider-mark-left { left: 2px; }
.hslider-mark-mid { left: 50%; transform: translate(-50%, -50%); color: #8C5A2E; }
.hslider-mark-right { right: 2px; }

/* 提示 */
.hslider-hint {
  margin-top: 4px;
  font-size: 8px;
  font-weight: 800;
  color: #B0A088;
}

.md-input {
  flex: 1;
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #2E1D0E;
  line-height: 1.6;
  resize: none;
  box-sizing: border-box;
}

/* ========== 文字编辑面板 ========== */
.text-edit-region {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.text-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 6px;
  border-bottom: 2px solid #C0B5A0;
  background: rgba(243, 228, 201, 0.5);
  flex-wrap: wrap;
}
.tb-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #2E1D0E;
  border-radius: 3px;
  background: #FFFAF1;
  box-shadow: 2px 2px 0 #2E1D0E26;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.tb-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 0 0 0 #2E1D0E26;
}
.tb-btn.tb-on {
  background: #2E1D0E;
  transform: translate(1px, 1px);
  box-shadow: 0 0 0 #2E1D0E26;
}
.tb-btn.tb-on .tb-icon {
  color: #FFFAF1;
}
.tb-icon {
  font-size: 14px;
  font-weight: 700;
  color: #2E1D0E;
  line-height: 1;
}
.tb-sep {
  width: 2px;
  height: 20px;
  background: #C0B5A0;
  margin: 0 2px;
  flex-shrink: 0;
}
.tb-color-wrap {
  position: relative;
}
.tb-color-pop {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 30;
  display: flex;
  gap: 4px;
  padding: 6px;
  margin-top: 2px;
  background: #FFFAF1;
  border: 2px solid #2E1D0E;
  border-radius: 4px;
  box-shadow: 3px 3px 0 #2E1D0E33;
}
.tb-color-item {
  width: 22px;
  height: 22px;
  border: 2px solid #2E1D0E;
  border-radius: 3px;
  cursor: pointer;
}
.tb-color-none {
  background: #FFFAF1;
  border-style: dashed;
  border-color: #C0B5A0;
}
.tb-del {
  border-color: #C0392B;
  background: #FDECEA;
}
.tb-select {
  position: relative;
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 8px;
  border: 2px solid #2E1D0E;
  border-radius: 4px;
  background: #FFFAF1;
  color: #2E1D0E;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.tb-select.tb-on {
  background: #2E1D0E;
  color: #FFFAF1;
}
.tb-select-label {
  white-space: nowrap;
}
.tb-select-pop {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 30;
  min-width: 92px;
  max-height: 180px;
  overflow-y: auto;
  margin-top: 2px;
  background: #FFFAF1;
  border: 2px solid #2E1D0E;
  border-radius: 4px;
  box-shadow: 3px 3px 0 #2E1D0E33;
}
.tb-opt {
  padding: 4px 10px;
  font-size: 13px;
  color: #2E1D0E;
  white-space: nowrap;
  cursor: pointer;
}
.tb-opt:hover {
  background: #2E1D0E;
  color: #FFFAF1;
}
.tb-del .tb-icon {
  color: #C0392B;
}
.text-input {
  flex: 1.1;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  border: none;
  background: rgba(255, 255, 255, 0.45);
  outline: none;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #2E1D0E;
  line-height: 1.6;
  box-sizing: border-box;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
.text-input:empty:before {
  content: '在此输入文字...';
  color: #B9A982;
}
/* 上下拖动分隔条（调整文字框 / 源码框高度） */
.text-splitter {
  flex-shrink: 0;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: row-resize;
  background: rgba(243, 228, 201, 0.6);
  border-top: 1px solid #C0B5A0;
  border-bottom: 1px solid #C0B5A0;
  user-select: none;
  -webkit-user-select: none;
  transition: background 0.15s ease;
}
.text-splitter:active {
  background: rgba(140, 90, 46, 0.18);
}
.text-splitter-bar {
  position: relative;
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: #C0B5A0;
}
.text-splitter-bar:before,
.text-splitter-bar:after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 2px;
  background: #C0B5A0;
}
.text-splitter-bar:before { top: -6px; }
.text-splitter-bar:after { top: 6px; }
.text-splitter:active .text-splitter-bar,
.text-splitter:active .text-splitter-bar:before,
.text-splitter:active .text-splitter-bar:after {
  background: #8C5A2E;
}
.text-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  border-top: 2px solid #C0B5A0;
  background: rgba(255, 250, 241, 0.92);
}
.text-preview-head {
  flex-shrink: 0;
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #8C7B5E;
  border-bottom: 1px dashed #C0B5A0;
}
.text-preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px;
}
.md-source {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #2E1D0E;
}

/* 预览区 */
.preview-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 14px;
}

/* 预览区封面卡片：贴右显示，右侧不画边框（无右边框设计） */
.preview-body :deep(.edit-card) {
  border-right: none !important;
  box-shadow: 0 6px 0 #2E1D0E26 !important;
}

.preview-divider {
  height: 2px;
  background: #C0B5A0;
  margin: 14px 0;
}
.md-render {
  font-size: 13px;
  line-height: 1.7;
  color: #2E1D0E;
}
.md-render :deep(.img-combo) {
  margin: 8px 0;
  max-width: 100%;
}
.md-render :deep(.combo-imgbox) {
  position: relative;
}
.md-render :deep(.combo-side) {
  font-size: 12px;
  line-height: 1.5;
  font-weight: 800;
  color: #2E1D0E;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
.md-render :deep(.combo-side-left) {
  text-align: right;
  padding-right: 2px;
}
.md-render :deep(.combo-side-right) {
  text-align: left;
  padding-left: 2px;
}
.md-render :deep(.combo-del-btn) {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 5;
  width: 22px;
  height: 22px;
  line-height: 18px;
  text-align: center;
  padding: 0;
  border: 2px solid #2E1D0E;
  border-radius: 4px;
  background: #FFFAF1;
  color: #E74C3C;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 2px 2px 0 #2E1D0E26;
}
.md-render :deep(.combo-del-btn):active {
  transform: translate(1px, 1px);
  box-shadow: 0 0 0 #2E1D0E26;
}
.md-render :deep(h1) {
  font-size: 18px;
  font-weight: 900;
  margin: 8px 0 6px 0;
}
.md-render :deep(h2) {
  font-size: 16px;
  font-weight: 900;
  margin: 8px 0 5px 0;
}
.md-render :deep(h3) {
  font-size: 14px;
  font-weight: 900;
  margin: 6px 0 4px 0;
}
.md-render :deep(p) {
  margin: 6px 0;
}
.md-render :deep(ul) {
  padding-left: 18px;
  margin: 6px 0;
}
.md-render :deep(li) {
  margin: 3px 0;
}
.md-render :deep(strong) {
  font-weight: 900;
}
.md-render :deep(s) {
  text-decoration: line-through;
  opacity: 0.7;
}
.md-render :deep(u) {
  text-decoration: underline;
}
.md-render :deep(code) {
  font-family: 'Courier New', monospace;
  background: rgba(46, 29, 14, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}
.md-empty {
  color: #C0B5A0;
  font-weight: 800;
}
.preview-spacer {
  height: 50vh;
  flex-shrink: 0;
}
.md-raw {
  font-size: 13px;
  line-height: 1.6;
  color: #2E1D0E;
  white-space: pre-wrap;
  word-break: break-all;
}

.placeholder {
  color: #C0B5A0;
  font-weight: 700;
}

/* ========== 像素风确认弹窗 ========== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(46, 29, 14, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modal-box {
  width: 300px;
  max-width: 88vw;
  border: 3px solid #2E1D0E;
  background: #FFFAF1;
  box-shadow: 6px 6px 0 #2E1D0E;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-title-bar {
  padding: 8px 14px;
  background: #2E1D0E;
  border-bottom: 3px solid #2E1D0E;
}
.modal-title {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #FFFAF1;
}
.modal-body {
  padding: 20px 16px;
  display: flex;
  justify-content: center;
}
.modal-text {
  font-size: 14px;
  font-weight: 800;
  color: #2E1D0E;
  line-height: 1.6;
  text-align: center;
}
.modal-actions {
  display: flex;
  border-top: 3px solid #2E1D0E;
}
.modal-btn {
  flex: 1;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background 0.15s ease;
}
.modal-btn:active {
  opacity: 0.7;
}
.modal-btn-cancel {
  background: rgba(46, 29, 14, 0.08);
  color: #2E1D0E;
  border-right: 3px solid #2E1D0E;
}
.modal-btn-stay {
  background: #FFFAF1;
  color: #8C7B5E;
  border-right: 3px solid #2E1D0E;
}
.modal-btn-save {
  background: #8C5A2E;
  color: #FFFAF1;
}

/* 移动端：上下堆叠 */
@media (max-width: 768px) {
  .split {
    flex-direction: column;
  }
  .divider {
    width: 100%;
    height: 3px;
  }
  .pane-head {
    border-bottom: none;
    border-top: 2px solid #C0B5A0;
  }
  .editor-pane .pane-head {
    border-top: none;
  }
  .tool-btn .tool-icon {
    font-size: 11px;
  }
  .tool-btn .tool-label {
    font-size: 8px;
  }
}

/* ========== 卡片流（清空重来：用卡片组织内容） ========== */
.card-flow { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
.card-block { position: relative; border: 2px solid #C0B5A0; border-radius: 6px; background: rgba(255,250,241,0.6); padding: 6px; transition: box-shadow .2s, border-color .2s; cursor: pointer; }
.card-block:hover { border-color: #8C5A2E; box-shadow: 0 3px 10px #2E1D0E1A; }
.card-block.card-active { border-color: #8C5A2E; box-shadow: 0 0 0 3px #8C5A2E66; }
.card-block .md-render { padding: 4px; }

/* 右下角悬浮窗按钮 */
.card-fab {
  position: fixed; right: 18px; bottom: 18px; z-index: 50;
  width: 48px; height: 48px; border-radius: 50%;
  background: #2E1D0E; color: #FFFAF1;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 900; cursor: pointer;
  box-shadow: 3px 3px 0 #2E1D0E33; user-select: none;
}
.card-fab.open { background: #8C5A2E; }

/* 卡片总览面板 */
.card-panel {
  position: fixed; right: 18px; bottom: 74px; z-index: 50;
  width: 390px; max-width: calc(100vw - 36px); max-height: 70vh; display: flex; flex-direction: column;
  background: #FFFAF1; border: 3px solid #2E1D0E; border-radius: 8px;
  box-shadow: 6px 6px 0 #2E1D0E26; overflow: hidden;
}
.card-panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 8px 12px; border-bottom: 2px solid #2E1D0E; background: #F3E4C9; }
.card-panel-title { font-size: 13px; font-weight: 900; color: #2E1D0E; }
.card-add { display: flex; gap: 6px; }
.card-add-grid { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); }
.card-add-btn { font-size: 11px; font-weight: 800; color: #FFFAF1; background: #8C5A2E; border: 2px solid #2E1D0E; border-radius: 4px; padding: 2px 8px; cursor: pointer; }
.card-list { flex: 1; overflow-y: auto; padding: 8px; }
.card-item { display: flex; align-items: center; gap: 8px; padding: 8px; margin-bottom: 8px; background: #FFFFFF; border: 2px solid #C0B5A0; border-radius: 6px; cursor: grab; }
.card-item:active { cursor: grabbing; }
.card-item-handle { font-size: 16px; color: #BDB09B; flex-shrink: 0; }
.card-item-info { flex: 1; min-width: 0; }
.card-item-type { display: block; font-size: 11px; font-weight: 900; color: #8C5A2E; }
.card-item-desc { display: block; font-size: 12px; color: #2E1D0E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-item-actions { display: flex; gap: 4px; flex-shrink: 0; }
.card-item-btn { font-size: 11px; font-weight: 800; color: #2E1D0E; background: #F3E4C9; border: 2px solid #C0B5A0; border-radius: 4px; padding: 2px 6px; cursor: pointer; }
.card-item-btn.danger { color: #C0392B; border-color: #C0392B; }
.card-empty { font-size: 12px; color: #BDB09B; text-align: center; padding: 16px 0; }

/* 编辑抽屉 */
.card-drawer-mask { position: fixed; inset: 0; background: rgba(46,29,14,0.35); z-index: 60; }
.card-drawer {
  position: fixed; left: 0; top: 143px; bottom: 0; width: calc(50vw - 2px); max-width: none; z-index: 40;
  background: #FFFAF1; border-right: 3px solid #2E1D0E; border-top: 2px solid #2E1D0E; box-shadow: 4px 0 0 #2E1D0E12;
  display: flex; flex-direction: column;
}
.card-drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 2px solid #2E1D0E; background: #F3E4C9; }
.card-drawer-title { font-size: 14px; font-weight: 900; color: #2E1D0E; }
.card-drawer-close { font-size: 12px; font-weight: 800; color: #FFFAF1; background: #8C5A2E; border: 2px solid #2E1D0E; border-radius: 4px; padding: 3px 10px; cursor: pointer; }
.card-position-actions { display: flex; align-items: center; gap: 5px; }
.card-drawer-move { font-size: 11px; font-weight: 800; color: #2E1D0E; background: #FFFAF1; border: 2px solid #C0B5A0; border-radius: 4px; padding: 3px 7px; cursor: pointer; }
.card-drawer-body { flex: 1; overflow-y: auto; padding: 12px; }
.card-text-input { min-height: 200px; border: 2px solid #C0B5A0; border-radius: 6px; padding: 10px; font-size: 13px; line-height: 1.7; color: #2E1D0E; background: #FFFFFF; outline: none; overflow-y: auto; white-space: pre-wrap; word-break: break-all; }
.card-img-tip { font-size: 12px; color: #8C7B5E; font-weight: 700; margin-bottom: 8px; }
.card-img-add { margin-bottom: 10px; }
.card-img-preview { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.card-img-thumb { position: relative; width: 72px; height: 56px; border: 2px solid #C0B5A0; border-radius: 4px; overflow: hidden; }
.card-img-thumb-img { width: 100%; height: 100%; }
.card-img-thumb-del { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; border-radius: 50%; background: #C0392B; color: #FFFFFF; font-size: 11px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.card-img-slider { margin-bottom: 10px; }
.card-slider-label { display: block; font-size: 12px; font-weight: 800; color: #2E1D0E; margin-bottom: 4px; }
.card-img-slider input[type=range] { width: 100%; }
.card-img-row { display: flex; gap: 8px; }
.card-side-input { flex: 1; border: 2px solid #C0B5A0; border-radius: 4px; padding: 6px 8px; font-size: 12px; }
.field-group { display: flex; flex-direction: column; gap: 7px; margin-bottom: 14px; }
.field-label { font-size: 12px; font-weight: 900; color: #2E1D0E; margin-top: 4px; }
.field-hint { font-size: 11px; color: #8C7B5E; }
.card-field, .card-textarea { width: 100%; box-sizing: border-box; border: 2px solid #C0B5A0; border-radius: 5px; background: #fff; color: #2E1D0E; padding: 8px; font-size: 12px; outline: none; }
.card-field:focus, .card-textarea:focus { border-color: #8C5A2E; }
.card-textarea { min-height: 110px; line-height: 1.6; }
.code-textarea { min-height: 280px; font-family: Consolas, 'Courier New', monospace; tab-size: 2; }
.table-textarea { min-height: 180px; font-family: Consolas, monospace; }
.formula-live-preview { padding: 18px 10px; text-align: center; border: 2px dashed #C0B5A0; background: #fff; font-size: 22px; }
.content-card-title { font-size: 14px; font-weight: 900; color: #2E1D0E; margin: 2px 0 8px; }
.card-video { display: block; width: 100%; max-height: 360px; border-radius: 5px; background: #17120e; }
.card-caption { padding: 7px 3px 2px; color: #8C7B5E; font-size: 12px; }
.code-card { margin: 0; padding: 14px; overflow: auto; border-radius: 5px; background: #211b17; color: #f8ead3; font: 12px/1.65 Consolas, monospace; white-space: pre; }
.formula-card { padding: 18px; text-align: center; border: 1px solid #D8CDBA; background: #fff; font-family: 'Times New Roman', serif; font-size: 24px; overflow-x: auto; }
.table-scroll { overflow-x: auto; }
.content-table { width: 100%; border-collapse: collapse; background: #fff; font-size: 12px; }
.content-table th, .content-table td { border: 1px solid #B9AA91; padding: 8px; text-align: left; }
.content-table th { background: #E9D5B2; font-weight: 900; }
.website-card, .file-card { display: flex; align-items: center; gap: 12px; padding: 14px; border: 2px solid #C0B5A0; border-radius: 7px; background: #fff; color: #2E1D0E; text-decoration: none; }
.website-card strong, .website-card small, .file-card strong, .file-card small { display: block; word-break: break-all; }
.website-card small, .file-card small { margin-top: 4px; color: #8C7B5E; font-size: 11px; }
.website-icon, .file-badge { flex: 0 0 auto; min-width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border: 2px solid #2E1D0E; border-radius: 5px; background: #F3E4C9; font-weight: 900; }
.file-badge { font-size: 10px; }

@media (max-width: 768px) {
  .card-drawer { width: 100vw; top: 143px; border-right: 0; }
  .card-position-actions { gap: 3px; }
  .card-drawer-move { padding: 3px 5px; }
}

</style>
