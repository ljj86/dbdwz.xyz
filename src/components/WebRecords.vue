<template>
  <!-- #ifdef H5 -->
  <footer class="web-records">
    <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">皖ICP备2026013884号-1</a>
    <a href="https://beian.mps.gov.cn/#/query/webSearch" target="_blank" rel="noopener noreferrer">皖公网安备34120202001653号</a>
  </footer>
  <!-- #endif -->
</template>
<style scoped>
.web-records{box-sizing:border-box;display:flex;flex-wrap:wrap;justify-content:center;gap:8px 20px;width:100%;padding:16px 12px;color:var(--muted,#6f6558);font-size:12px;line-height:1.8;position:relative;z-index:1}
.web-records a{color:inherit;text-decoration:none;overflow-wrap:anywhere}.web-records a:hover{text-decoration:underline}
@media(max-width:600px){.web-records{flex-direction:column;align-items:center;gap:2px;padding-bottom:max(18px,env(safe-area-inset-bottom))}}
</style>
