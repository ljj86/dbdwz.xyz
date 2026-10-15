<template>
  <div class="team-all-members">
    <header><h1>团队项目</h1><p>每位成员一行，浏览团队的作品与在线应用。</p></header>
    <p v-if="loadError" role="status">{{ loadError }}</p>
    <TeamProjectRow v-for="member in members" :key="member.id" :owner="member.id" :owner-name="member.name" :project-list="projects.filter(p => p.owner === member.id)" />
  </div>
</template>
<script>
import TeamProjectRow from './TeamProjectRow.vue'
import { teamProjects } from '../data/team-projects.js'
export default {
  name: 'TeamProjects', components: { TeamProjectRow },
  data() { return { projects: teamProjects, members: [{id:'lijunjie',name:'李俊杰'},{id:'mahao',name:'马昊'}], loadError:'' } },
  async mounted() {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      const get = async url => { const r = await fetch(url,{cache:'no-store',signal:controller.signal}); if(!r.ok) throw new Error('unavailable'); return r.json() }
      const data = await get('/team-apps/members.json')
      if (!Array.isArray(data.members)) throw new Error('invalid')
      const members = data.members.filter(m => /^[a-z0-9-]+$/.test(m.id))
      const catalogs = await Promise.all(members.map(m => get('/team-apps/'+m.id+'/catalog.json')))
      if(catalogs.some(c=>!Array.isArray(c.projects))) throw new Error('invalid')
      this.projects = catalogs.flatMap(c=>c.projects); this.members=members
    } catch { this.loadError='项目清单暂时无法刷新，当前展示上次发布的清单。' }
    finally { clearTimeout(timeout) }
  }
}
</script>
<style scoped>
.team-all-members {display:flex;flex-direction:column;gap:24px;min-width:0;width:100%;box-sizing:border-box;padding:24px 28px 100px}
.team-all-members > section {width:100%;box-sizing:border-box;min-width:0}
h1{margin:0 0 8px;color:var(--ink,#241c14);font-size:28px}header p{margin:0;color:var(--muted,#8d8071);font-size:13px}
@media(max-width:640px){.team-all-members{padding:20px 16px 110px;gap:20px}}
</style>
