const crypto = require('crypto');

const icon = (name) => name ? `/static/resource-icons/${name}` : '';

const recommendedResources = [
  ['GitHub', 'https://github.com/', '代码托管、协作开发与开源项目检索平台', 'development', icon('github.png')],
  ['Visual Studio Code', 'https://code.visualstudio.com/', '轻量、可扩展的跨平台代码编辑器', 'development', icon('vscode.png')],
  ['npm', 'https://www.npmjs.com/', 'JavaScript 与 Node.js 包管理和插件检索平台', 'development', icon('npm.png')],
  ['Mathcha', 'https://www.mathcha.io/', 'LaTeX、Word、PDF、画图和公式编辑', 'development', icon('mathcha.png')],
  ['uni-app', 'https://uniapp.dcloud.net.cn/', '创建 Vue 3 项目和网站', 'development', icon('uniapp.png')],
  ['anyrouter', 'https://anyrouter.top/', 'API Key 服务', 'development', icon('anyrouter.png')],
  ['MinerU', 'https://mineru.net/', 'PDF、Word、PPT 等转换为 Markdown', 'development', icon('mineru.png')],
  ['There’s An AI For That', 'https://theresanaiforthat.com/', 'AI 工具搜索网站', 'development', icon('theresanaiforthat.png')],
  ['Qoder', 'https://qoder.com/zh', 'AI 编程工具', 'development', icon('qoder.png')],
  ['AI Vocal Remover', 'https://aivocalremover.com/', 'AI 分离人声和伴奏', 'development', icon('aivocalremover.png')],
  ['樱花穿透', 'https://www.natfrp.com/', '内网穿透服务', 'development', icon('natfrp.png')],
  ['全国互联网安全管理服务平台', 'https://beian.mps.gov.cn/#/', '公安联网备案', 'development', icon('mps-beian.png')],
  ['ICP/IP 地址/域名信息备案管理系统', 'https://beian.miit.gov.cn/#/Integrated/index', '工信部 ICP 备案', 'development', icon('miit-beian.png')],
  ['LaTeX 在线编辑', 'https://www.latexlive.com/', '公式识别、编辑、预览与多格式导出', 'development', icon('latexlive.png')],
  ['RAR', 'https://www.rarlab.com/download.htm', '压缩软件官方下载', 'development', 'https://www.rarlab.com/favicon.ico'],
  ['shadcn 中文站', 'https://www.shadcn.com.cn/', '开源 UI 设计系统基础', 'development', icon('shadcn.png')],
  ['ChatGPT', 'https://chatgpt.com/', 'AI 对话网站', 'ai', icon('chatgpt.png')],
  ['DeepSeek', 'https://chat.deepseek.com/', 'AI 学习与生活助手', 'ai', 'https://www.deepseek.com/favicon.ico'],
  ['豆包', 'https://www.doubao.com/', 'AI 助手', 'ai', 'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/favicon/new-doubao/64x64.png'],
  ['Yandex', 'https://yandex.com/', '搜索与 AI 服务网站', 'ai', icon('yandex.png')],
  ['雾象', 'https://fogsight.ai/', '一句话生成动画视频', 'ai', icon('fogsight.png')],
  ['Claude', 'https://claude.ai/new', 'AI 对话与复杂任务处理', 'ai', icon('claude.png')],
  ['Gemini', 'https://gemini.google.com/', 'Google AI 助手', 'ai', icon('gemini.png')],
  ['腾讯混元', 'https://aistudio.tencent.com/chat/', '腾讯开发的 AI 助手', 'ai', 'https://cdn-portal.hunyuan.tencent.com/public/static/logo/favicon.png'],
  ['AI4Scholar', 'https://ai4scholar.net/auth/sign-in', '学术文献搜索', 'academic', icon('ai4scholar.png')],
  ['同花顺数据中心', 'https://data.10jqka.com.cn/', '同花顺官方金融数据', 'academic', icon('10jqka.png')],
  ['萝卜投研', 'https://robo.datayes.com/', '研报与投研平台', 'academic', icon('datayes.png')],
  ['金融界', 'https://www.jrj.com.cn/', '金融资讯与数据', 'academic', icon('jrj.png')],
  ['东方财富数据中心', 'https://data.eastmoney.com/', '东方财富金融数据', 'academic', icon('eastmoney.png')],
  ['Loot Drop', 'https://www.loot-drop.io/', '创业失败经验总结', 'academic', icon('loot-drop.png')],
  ['CrazyGames', 'https://crazygames.com/', '国外 H5 在线游戏网站', 'game', icon('crazygames.png')],
  ['Meowa', 'https://www.meowa.ai', '像素游戏素材库', 'game', icon('meowa.png')],
  ['OpenGameArt', 'https://opengameart.org/', '免费开源游戏素材库', 'game', icon('opengameart.png')],
  ['1Games', 'https://1games.io/', '免费即开在线游戏库', 'game', icon('1games.png')],
  ['Neural4D', 'https://www.neural4d.com/', '免费 3D 模型生成器', 'game', icon('neural4d.png')],
  ['七卡瓦', 'https://perlerbeads.zippland.com/', '拼豆图案生成网站', 'game', icon('perlerbeads.png')]
].map(([name, url, description, category, resourceIcon]) => ({ name, url, description, category, icon: resourceIcon }));

async function seedRecommendedResources(pool, userId) {
  for (const resource of recommendedResources) {
    const normalizedUrl = new URL(resource.url).toString();
    const urlHash = crypto.createHash('sha256').update(normalizedUrl.toLowerCase()).digest('hex');
    await pool.query(
      `INSERT INTO recommended_resources (name, description, url, url_hash, category, icon, user_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         icon = IF(icon IS NULL OR icon = '', VALUES(icon), icon)`,
      [resource.name, resource.description, normalizedUrl, urlHash, resource.category, resource.icon, userId]
    );
  }
  return recommendedResources.length;
}

module.exports = { recommendedResources, seedRecommendedResources };
