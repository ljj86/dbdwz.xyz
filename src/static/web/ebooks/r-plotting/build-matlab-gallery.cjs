#!/usr/bin/env node
/* 将 05_论文图表提取与MATLAB重绘 的 figure_registry.csv 转换为静态图库数据，
 * 并生成 matlab-figure-gallery.js（嵌入元数据 + 画廊渲染 + 灯箱）。 */
'use strict';
const fs = require('fs');
const path = require('path');

const CSV = path.resolve(__dirname, 'matlab_figures', 'figure_registry.csv');
const OUT = path.resolve(__dirname, 'matlab-figure-gallery.js');

function parseCsv(text) {
  const rows = []; let row = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; rows.push(row); row = []; }
      else cur += c;
    }
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const groupMeta = [
  { key: '2023', seq: '11.1', label: '2023 高教社杯 C 题 · 商超补货与定价',
    desc: '蔬菜类商品自动定价与补货决策的 26 个非表格图件：流程图、统计时序、热力矩阵与优化敏感性等 MATLAB 重绘模板。',
    code: '% 由 run_registry_batch(inf) 批量重绘（131 个注册图，每图导出 PNG 与 SVG）。' },
  { key: '2024', seq: '11.2', label: '2024 高教社杯 B 题 · 多工序生产决策',
    desc: '多工序生产决策的 25 个非表格图件：抽样检测流程、阈值曲线、OC 曲线、策略热图与利润响应曲面等。',
    code: '% 由 run_registry_batch(inf) 批量重绘（131 个注册图，每图导出 PNG 与 SVG）。' },
  { key: '2025', seq: '11.3', label: '2025 A 题 · 烟幕弹遮蔽',
    desc: '无人机烟幕弹遮蔽的 25 个非表格图件：视线束时序、遮蔽区间、弹药分配网络与参数平行坐标等。',
    code: '% 由 run_registry_batch(inf) 批量重绘（131 个注册图，每图导出 PNG 与 SVG）。' },
  { key: 'finance', seq: '11.4', label: '金融资产组合论文',
    desc: '多目标资产配置的 23 个非表格图件：收益率分布、有效前沿、风险偏好雷达与参数灵敏度分析等。',
    code: '% 由 run_registry_batch(inf) 批量重绘（131 个注册图，每图导出 PNG 与 SVG）。' },
  { key: 'APMCM', seq: '11.5', label: 'APMCM B 题 · 微通道多目标优化',
    desc: '微通道多目标优化的 32 个拆分重绘单元：代理优化流程、响应切片、Pareto 前沿、全局敏感性与稳健推荐等。',
    code: '% 由 run_registry_batch(inf) 批量重绘（131 个注册图，每图导出 PNG 与 SVG）。' }
];

const rows = parseCsv(fs.readFileSync(CSV, 'utf8'));
const header = rows[0];
const records = rows.slice(1).filter(r => r.length === header.length && r[0]);

const groups = groupMeta.map(m => Object.assign({}, m, { standalone: false, figures: [] }));
records.forEach(r => {
  const [paper, no, page, caption, type] = r;
  const g = groups.find(x => x.key === paper);
  if (!g) return;
  g.figures.push({ no, page, caption, type });
});

// 5 个独立高阶 3D 脚本（run_all_redraws）
groups.push({
  key: '3d', seq: '11.6', label: '高阶三维重绘（独立脚本）', standalone: true,
  desc: '由 5 个独立高级 3D 脚本生成的结果：需求/利润响应曲面、均值-方差有效前沿与三目标 Pareto 前沿。',
  code: '% 由 run_all_redraws() 生成，每个独立脚本导出 PNG / SVG / PDF / FIG。',
  figures: [
    { no: '2023', file: '2023_demand_surface3d.png', caption: '2023 C 题 · 花叶类加成率需求收益响应曲面', type: '三维响应曲面' },
    { no: '2024', file: '2024_decision_surface3d.png', caption: '2024 B 题 · 检测成本与次品率的利润响应曲面', type: '三维响应曲面' },
    { no: '2025', file: '2025_smoke_geometry3d.png', caption: '2025 A 题 · 坐标系与烟幕弹运动轨迹三维几何', type: '三维几何' },
    { no: 'finance', file: 'finance_frontier3d.png', caption: '金融资产组合 · 均值-方差有效前沿', type: '三维几何' },
    { no: 'apmcm', file: 'apmcm_pareto3d.png', caption: 'APMCM · 三目标 Pareto 前沿', type: '三维几何' }
  ]
});

const dataJson = JSON.stringify(groups);

const js = `/* 数学建模论文·MATLAB 重绘图库。
 * 图片来自“05_论文图表提取与MATLAB重绘/03_MATLAB重绘/exports”，
 * 元数据由 build-matlab-gallery.cjs 从 figure_registry.csv 生成（请勿手改数据）。 */
var MATLAB_FIGURE_GROUPS = ${dataJson};

(function(){
  var css = '.mg-wrap{width:100%;min-width:0}.mg-head{display:flex;justify-content:space-between;align-items:center;width:100%;margin-bottom:10px;font-size:12px;font-weight:1000;color:#21170f}.mg-count{font-size:10px;font-weight:900;color:#bd4d34}.mg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;width:100%;max-height:620px;overflow:auto;padding:4px}.mg-card{margin:0;border:2px solid #e2d8c6;background:#fff;border-radius:4px;overflow:hidden;cursor:zoom-in;transition:transform .08s ease}.mg-card:hover{transform:translateY(-2px);box-shadow:0 4px 10px rgba(33,23,15,.15)}.mg-card img{display:block;width:100%;height:132px;object-fit:contain;background:#fbf6ec;padding:6px}.mg-card figcaption{padding:5px 8px;font-size:10px;font-weight:900;color:#655746;text-align:center;background:#f4ead7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mg-modal{position:fixed;inset:0;display:none;z-index:1000}.mg-modal.open{display:block}.mg-modal-back{position:absolute;inset:0;background:rgba(26,22,18,.9)}.mg-modal-stage{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,920px);max-height:92vh;display:flex;flex-direction:column;align-items:center}.mg-modal-stage img{max-width:100%;max-height:76vh;background:#fff;border:3px solid #ead7b7;box-shadow:0 12px 40px rgba(0,0,0,.55)}.mg-caption{width:100%;margin-top:10px;color:#f8ecda;font-size:12px;line-height:1.6;text-align:center}.mg-tag{display:inline-block;margin:0 8px;padding:2px 7px;border:1px solid #d77856;color:#f3c2ad;font-size:10px;border-radius:3px}.mg-nav,.mg-close{position:absolute;background:#21170f;color:#fff;border:2px solid #ead7b7;cursor:pointer;line-height:1;padding:6px 12px}.mg-close{top:6px;right:6px;font-size:20px;padding:4px 11px}.mg-nav{top:50%;transform:translateY(-50%);font-size:26px}.mg-prev{left:6px}.mg-next{right:6px}';
  var style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
})();

function mgEsc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return{'&':'&'+'amp;','<':'&'+'lt;','>':'&'+'gt;','"':'&'+'quot;'}[c]})}

function mgGroup(sec){return MATLAB_FIGURE_GROUPS.find(function(g){return g.seq===sec.no;});}

function mgFile(g,f){return g.standalone ? ('matlab_figures/standalone3d/'+f.file) : ('matlab_figures/registered/'+g.key+'/'+g.key+'_fig'+f.no+'.png');}

function matlabGalleryHtml(sec){
  var g=mgGroup(sec);
  if(!g) return '<div style="padding:24px">图库数据缺失</div>';
  var cards='';
  g.figures.forEach(function(f,idx){
    var src=mgFile(g,f);
    var tip=(f.type?('['+f.type+'] '):'')+(f.caption||'');
    cards+='<figure class="mg-card" data-group="'+g.key+'" data-idx="'+idx+'">'
      +'<img loading="lazy" src="'+src+'" alt="'+mgEsc(f.caption||f.no)+'" title="'+mgEsc(tip)+'">'
      +'<figcaption>'+mgEsc(f.no)+'</figcaption></figure>';
  });
  return '<div class="mg-wrap"><div class="mg-head"><span>'+mgEsc(g.label)+'</span><span class="mg-count">'+g.figures.length+' 张</span></div><div class="mg-grid">'+cards+'</div></div>';
}

function appendMatlabGallerySections(list){
  MATLAB_FIGURE_GROUPS.forEach(function(g){
    list.push({
      chapter:'第11章 数学建模·MATLAB重绘图库',
      no:g.seq, id:'sec-matlab-'+g.key, title:g.label,
      type:'matlab-gallery', lang:'MATLAB', stage:'使用过的图', usedFigure:true,
      desc:g.desc+' 图片来自你提供的“05_论文图表提取与MATLAB重绘”项目，模板使用演示值，不等同于论文原始实验数据。',
      code:g.code+'\\n% 完整运行入口见该项目 03_MATLAB重绘 目录（run_*.m）。',
      sources:[
        {href:'matlab_figures/figure_registry.csv', label:'图件注册清单 CSV'},
        {href:'matlab_figures/batch_summary.csv', label:'批量重绘结果 CSV'}
      ]
    });
  });
}

var __mgState=null;
function mgModal(){
  var m=document.getElementById('mg-modal');
  if(!m){
    m=document.createElement('div'); m.id='mg-modal'; m.className='mg-modal';
    m.innerHTML='<div class="mg-modal-back" data-mg-close></div>'
      +'<div class="mg-modal-stage"><img id="mg-img" alt="">'
      +'<div class="mg-caption" id="mg-caption"></div>'
      +'<button class="mg-nav mg-prev" data-mg-prev>&#8249;</button>'
      +'<button class="mg-nav mg-next" data-mg-next>&#8250;</button>'
      +'<button class="mg-close" data-mg-close>&#215;</button></div>';
    document.body.appendChild(m);
  }
  return m;
}
function mgShow(){
  var g=__mgState.g, f=g.figures[__mgState.idx];
  var img=document.getElementById('mg-img');
  img.src=mgFile(g,f);
  document.getElementById('mg-caption').innerHTML='<b>'+mgEsc(g.label)+'</b>'
    +(f.type?'<span class="mg-tag">'+mgEsc(f.type)+'</span>':'')
    +'<div>'+mgEsc('图 '+f.no+(f.page?' · 第'+f.page+'页':'')+(f.caption?' · '+f.caption:''))+'</div>';
}
function mgOpen(key,idx){
  var g=MATLAB_FIGURE_GROUPS.find(function(x){return x.key===key;});
  if(!g) return;
  __mgState={g:g,idx:idx};
  mgShow();
  mgModal().classList.add('open');
}
document.addEventListener('click',function(e){
  var card=e.target.closest('.mg-card');
  if(card){ mgOpen(card.getAttribute('data-group'), +card.getAttribute('data-idx')); return; }
  if(e.target.closest('[data-mg-close]')){ mgModal().classList.remove('open'); return; }
  if(e.target.closest('[data-mg-prev]')&&__mgState){ __mgState.idx=(__mgState.idx-1+__mgState.g.figures.length)%__mgState.g.figures.length; mgShow(); return; }
  if(e.target.closest('[data-mg-next]')&&__mgState){ __mgState.idx=(__mgState.idx+1)%__mgState.g.figures.length; mgShow(); return; }
});
document.addEventListener('keydown',function(e){
  if(!__mgState||!document.getElementById('mg-modal').classList.contains('open')) return;
  if(e.key==='Escape'){ document.getElementById('mg-modal').classList.remove('open'); }
  else if(e.key==='ArrowLeft'){ __mgState.idx=(__mgState.idx-1+__mgState.g.figures.length)%__mgState.g.figures.length; mgShow(); }
  else if(e.key==='ArrowRight'){ __mgState.idx=(__mgState.idx+1)%__mgState.g.figures.length; mgShow(); }
});
`;

fs.writeFileSync(OUT, js, 'utf8');
console.log('生成完成:', OUT);
console.log('分组数量:', groups.length);
groups.forEach(g => console.log('  '+g.seq+' '+g.key+': '+g.figures.length+' 图'));
