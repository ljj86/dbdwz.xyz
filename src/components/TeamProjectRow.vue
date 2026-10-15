<template>
  <section class="team-projects" :aria-labelledby="`team-projects-title-${owner}`">

    <div class="team-projects-toolbar">
      <div class="team-member">
        <span class="team-member-avatar" aria-hidden="true">{{ activeMemberName.slice(0, 1) }}</span>
        <div><h2 :id="`team-projects-title-${owner}`">{{ activeMemberName }}</h2><span>成员作品集</span></div>
      </div>
      <span class="team-projects-count">{{ projects.length }} 个项目</span>
    </div>

    <div v-if="projects.length" class="team-carousel" role="region" aria-label="团队项目浏览">
      <NativeButton
        class="team-carousel-arrow"
        type="button"
        aria-label="查看上一组项目"
        :aria-controls="`team-projects-track-${owner}`"
        :disabled="!canPrevious"
        @click="move(-1)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
      </NativeButton>

      <ul
        :id="`team-projects-track-${owner}`"
        ref="track"
        class="team-projects-track"
        :style="{ '--cards-per-view': perPage }"
        tabindex="0"
        aria-label="项目列表，可左右滑动或使用方向键浏览"
        @scroll.passive="updatePosition"
        @keydown.left.prevent="move(-1)"
        @keydown.right.prevent="move(1)"
        @keydown.home.prevent="scrollToIndex(0)"
        @keydown.end.prevent="scrollToIndex(projects.length - perPage)"
      >
        <li v-for="(project, index) in projects" :key="project.id" class="team-project-card">
          <div class="team-project-card-top">
            <img v-if="project.cover" class="team-project-cover" :src="project.cover" alt="" loading="lazy">
            <span v-else class="team-project-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path v-for="(path, pathIndex) in iconPaths(project.icon)" :key="pathIndex" :d="path" />
              </svg>
            </span>
            <span class="team-project-number" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
          </div>
          <h3>{{ project.name }}</h3>
          <p>{{ project.description }}</p>
          <div class="team-project-card-footer">
            <span>{{ project.ownerName }}</span>
            <a v-if="project.link" :href="project.link" class="team-project-open" :aria-label="`打开项目：${project.name}`" :tabindex="index >= firstVisible && index < lastVisible ? 0 : -1">
              打开项目 <span aria-hidden="true">↗</span>
            </a>
            <NativeButton v-else class="team-project-open" disabled :aria-label="`${project.name}，访问链接待接入`">待接入</NativeButton>
          </div>
        </li>
      </ul>

      <NativeButton
        class="team-carousel-arrow"
        type="button"
        aria-label="查看下一组项目"
        :aria-controls="`team-projects-track-${owner}`"
        :disabled="!canNext"
        @click="move(1)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg>
      </NativeButton>
    </div>
    <p v-else class="team-projects-empty">这位成员还没有添加项目。</p>

    <footer v-if="projects.length" class="team-projects-footer">
      <span>左右滑动，发现更多作品</span>
      <span aria-live="polite" aria-atomic="true">{{ firstVisible + 1 }}–{{ lastVisible }} / {{ projects.length }}</span>
    </footer>
  </section>
</template>

<script>
import { teamProjects } from '../data/team-projects.js'
import NativeButton from './NativeButton.vue'

const icons = {
  brain: ['M12 4a3 3 0 0 0-5-1 3 3 0 0 0-3 5 4 4 0 0 0 0 7 3 3 0 0 0 3 5 3 3 0 0 0 5-1V4Z', 'M12 4a3 3 0 0 1 5-1 3 3 0 0 1 3 5 4 4 0 0 1 0 7 3 3 0 0 1-3 5 3 3 0 0 1-5-1', 'M7 8c3 0 3 4 0 4m10-4c-3 0-3 4 0 4M8 16h4m0-3h4'],
  calendar: ['M8 2v4m8-4v4M4 9h16', 'M5 4h14a1 1 0 0 1 1 1v15H4V5a1 1 0 0 1 1-1Z', 'm8 15 3 3 5-6'],
  chart: ['M4 3v17h17', 'm7 14 4-4 4 3 5-7', 'M16 6h4v4'],
  folder: ['M3 7V5h7l2 3h9v12H3V7Z', 'M8 14h8m-3-3 3 3-3 3'],
  game: ['M7 7h10c3 0 5 11 3 12-2 1-4-3-5-3H9c-1 0-3 4-5 3-2-1 0-12 3-12Z', 'M8 10v5m-2.5-2.5h5M16 11h.01M18 14h.01'],
  store: ['M4 8h16l-2-5H6L4 8Z', 'M4 8v3a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0V8', 'M5 13v8h14v-8M10 21v-5h4v5'],
  face: ['M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3', 'M9 10h.01M15 10h.01', 'M9 15c.9.7 2 1 3 1s2.1-.3 3-1'],
}

export default {
  name: 'TeamProjectRow',
  props: { owner: String, ownerName: String, projectList: { type: Array, default: () => [] } },
  components: { NativeButton },
  data() {
    return {
      perPage: 3,
      firstVisible: 0,
      canPrevious: false,
      canNext: false,
    }
  },
  computed: {
    members() {
      return Array.from(new Map(teamProjects.map(project => [project.owner, { id: project.owner, name: project.ownerName }])).values())
    },
    activeMemberName() {
      return this.ownerName || '团队成员'
    },
    projects() {
      return this.projectList.slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, 'zh-CN'))
    },
    lastVisible() {
      return Math.min(this.firstVisible + this.perPage, this.projects.length)
    },
  },
  watch: { projectList() { this.$nextTick(this.measure) } },
  mounted() {
    this.measure()
    if (typeof ResizeObserver !== 'undefined' && this.$refs.track) {
      this.resizeObserver = new ResizeObserver(this.measure)
      this.resizeObserver.observe(this.$refs.track)
    }
    window.addEventListener('resize', this.measure)
  },
  beforeUnmount() {
    this.resizeObserver?.disconnect()
    window.removeEventListener('resize', this.measure)
  },
  methods: {
    iconPaths(icon) {
      return icons[icon] || icons.folder
    },
    cardStep() {
      const track = this.$refs.track
      const card = track?.querySelector('.team-project-card')
      return card ? card.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0) : 0
    },
    measure() {
      const track = this.$refs.track
      if (!track || !track.clientWidth) return
      const count = track.clientWidth >= 780 ? 3 : track.clientWidth >= 500 ? 2 : 1
      if (count !== this.perPage) {
        const previousIndex = this.firstVisible
        this.perPage = count
        this.$nextTick(() => this.scrollToIndex(previousIndex, 'instant'))
      } else {
        this.updatePosition()
      }
    },
    updatePosition() {
      const track = this.$refs.track
      if (!track) return
      const max = track.scrollWidth - track.clientWidth
      this.canPrevious = track.scrollLeft > 1
      this.canNext = max - track.scrollLeft > 1
      const step = this.cardStep()
      this.firstVisible = step ? Math.max(0, Math.min(this.projects.length - 1, Math.round(track.scrollLeft / step))) : 0
    },
    scrollToIndex(index, behavior) {
      const track = this.$refs.track
      if (!track) return
      const boundedIndex = Math.max(0, Math.min(index, this.projects.length - this.perPage))
      const motion = behavior || (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth')
      track.scrollTo({ left: boundedIndex * this.cardStep(), behavior: motion })
      this.updatePosition()
    },
    move(direction) {
      this.scrollToIndex(this.firstVisible + direction * this.perPage)
    },
  },
}
</script>

<style scoped>
.team-projects {
  max-width: 1280px;
  margin: 0 auto;
  color: var(--ink, #241c14);
}

.team-projects-header {
  padding: 16px 0 30px;
  border-bottom: 1px solid var(--line, #241c14);
}

.team-projects-eyebrow {
  color: var(--accent, #8c5a2e);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
}

.team-projects-header h2 {
  margin: 12px 0;
  font-size: clamp(25px, 3vw, 34px);
  letter-spacing: -0.6px;
}

.team-projects-header p {
  margin: 0;
  color: var(--muted, #8d8071);
  font-size: 14px;
  line-height: 1.8;
}

.team-projects-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 26px 0;
}

.team-member,
.team-member-picker {
  display: flex;
  align-items: center;
  gap: 12px;
}

.team-member-avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 2px solid var(--line, #241c14);
  border-radius: 50%;
  background: var(--surface-muted, #e9d5b2);
  color: var(--green, #3f7d5c);
  font-size: 17px;
  font-weight: 600;
}

.team-member strong,
.team-member span:not(.team-member-avatar) {
  display: block;
}

.team-member h2 {
  margin: 0;
  font-size: 15px;
}

.team-member div span {
  margin-top: 5px;
  color: var(--muted, #8d8071);
  font-size: 11px;
}

.team-member-picker,
.team-projects-count {
  color: var(--muted, #8d8071);
  font-size: 13px;
}

.team-member-picker select {
  padding: 8px 12px;
  border: 2px solid var(--line, #241c14);
  border-radius: var(--radius-sm, 4px);
  background: var(--paper-2, #fffaf1);
  color: var(--ink, #241c14);
}

.team-carousel {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 12px;
}

.team-carousel-arrow {
  box-sizing: border-box;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 2px solid var(--line, #241c14);
  border-radius: 50%;
  background: var(--paper-2, #fffaf1);
  color: var(--ink, #241c14);
}

.team-carousel-arrow svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.team-carousel-arrow:disabled {
  opacity: 0.3;
  cursor: default;
}

.team-carousel-arrow:not(:disabled):hover {
  border-color: var(--green, #3f7d5c);
  color: var(--green, #3f7d5c);
}

.team-projects-track {
  --card-gap: 16px;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: calc((100% - (var(--cards-per-view) - 1) * var(--card-gap)) / var(--cards-per-view));
  gap: var(--card-gap);
  min-width: 0;
  margin: 0;
  padding: 0 4px 5px 0;
  list-style: none;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.team-projects-track::-webkit-scrollbar {
  display: none;
}

.team-project-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 206px;
  box-shadow: 3px 3px 0 var(--shadow, rgba(36,28,20,.2));
  padding: 20px;
  border: 2px solid var(--line, #241c14);
  border-radius: var(--radius, 6px);
  background: var(--paper-2, #fffaf1);
  scroll-snap-align: start;
}

.team-project-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.team-project-icon,
.team-project-cover {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--green, #3f7d5c) 12%, transparent);
  color: var(--green, #3f7d5c);
  object-fit: cover;
}

.team-project-icon {
  display: grid;
  place-items: center;
}

.team-project-icon svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.65;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.team-project-number {
  color: var(--muted, #8d8071);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.team-project-card h3 {
  margin: 0 0 8px;
  font-size: 18px;
  line-height: 1.4;
}

.team-project-card p {
  margin: 0 0 20px;
  color: var(--muted, #8d8071);
  font-size: 12px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.team-project-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
}

.team-project-card-footer > span {
  color: var(--muted, #8d8071);
  font-size: 11px;
}

.team-project-open {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--green, #3f7d5c);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.team-project-open:disabled {
  color: var(--muted, #8d8071);
  cursor: default;
}

.team-project-open:hover {
  text-decoration: underline;
}

.team-project-open:disabled:hover {
  text-decoration: none;
}

.team-projects :focus-visible {
  outline: 2px solid var(--green, #3f7d5c);
  outline-offset: 3px;
}

.team-projects-track:focus-visible {
  outline-offset: 5px;
}

.team-projects-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 20px 48px 0;
  color: var(--muted, #8d8071);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.team-projects-empty {
  padding: 40px 0;
  color: var(--muted, #8d8071);
  text-align: center;
}

@media (max-width: 640px) {
  .team-projects-header {
    padding-top: 10px;
  }

  .team-carousel {
    grid-template-columns: minmax(0, 1fr) 44px 44px;
    gap: 12px;
  }

  .team-carousel-arrow {
    width: 44px;
    height: 44px;
    grid-row: 1;
  }

  .team-carousel-arrow:first-child {
    grid-column: 2;
  }

  .team-carousel-arrow:last-child {
    grid-column: 3;
  }

  .team-projects-track {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .team-project-card {
    padding: 16px;
  }

  .team-projects-footer {
    margin-left: 0;
    margin-right: 0;
  }
}
</style>
