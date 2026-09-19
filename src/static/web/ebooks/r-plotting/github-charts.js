/*
 * Browser rendering engine: Apache ECharts 6, Apache-2.0.
 * Chart methods are independently implemented from public package documentation;
 * no screenshots or copied example assets are embedded.
 */
var githubChartRefs={
  echarts:{name:'Apache ECharts',url:'https://github.com/apache/echarts',license:'Apache-2.0'},
  patchwork:{name:'patchwork',url:'https://github.com/thomasp85/patchwork',license:'MIT'},
  ggforce:{name:'ggforce',url:'https://github.com/thomasp85/ggforce',license:'MIT'},
  ggpubr:{name:'ggpubr',url:'https://github.com/kassambara/ggpubr',license:'GPL-2'},
  ggbump:{name:'ggbump',url:'https://github.com/davidsjoberg/ggbump',license:'MIT'},
  ggally:{name:'GGally / ggpairs',url:'https://github.com/ggobi/ggally',license:'GPL-2/3'},
  ggsurvfit:{name:'ggsurvfit',url:'https://github.com/pharmaverse/ggsurvfit',license:'MIT'},
  ggridges:{name:'ggridges',url:'https://github.com/wilkelab/ggridges',license:'GPL-2'},
  ggdist:{name:'ggdist',url:'https://github.com/mjskay/ggdist',license:'GPL-3'},
  enhancedvolcano:{name:'EnhancedVolcano',url:'https://github.com/kevinblighe/EnhancedVolcano',license:'GPL-3'},
  complexheatmap:{name:'ComplexHeatmap',url:'https://github.com/jokergoo/ComplexHeatmap',license:'MIT'},
  complexupset:{name:'ComplexUpset',url:'https://github.com/krassowski/complex-upset',license:'MIT'}
};

function upgradeGithubSections(list){
  var map={
    'sec-4-12':['composition','patchwork'],
    'sec-6-1-8':['zoom','ggforce'],
    'sec-6-1-13':['matrix','ggally'],
    'sec-7-1':['ttest','ggpubr'],
    'sec-7-2':['wilcox','ggpubr'],
    'sec-7-3':['anova','ggpubr'],
    'sec-7-4':['pca','echarts'],
    'sec-7-5':['pcoa','echarts'],
    'sec-7-6':['nmds','echarts'],
    'sec-7-7':['survival','ggsurvfit'],
    'sec-9-1':['bubble','echarts'],
    'sec-9-2':['marginal','echarts'],
    'sec-9-3':['density','echarts'],
    'sec-9-7':['bump','ggbump'],
    'sec-9-9':['volcano','enhancedvolcano'],
    'sec-9-10':['diverging','echarts'],
    'sec-9-14':['pyramid','echarts'],
    'sec-9-24':['ridge','ggridges'],
    'sec-9-25':['upset','complexupset'],
    'sec-9-26':['heatmap','complexheatmap'],
    'sec-9-30':['raincloud','ggdist'],
    'sec-9-32':['treemap','echarts'],
    'sec-9-42':['radar','echarts']
  };
  list.forEach(function(sec){
    var item=map[sec.id]; if(!item)return;
    sec.engine='echarts'; sec.githubType=item[0]; sec.ref=githubChartRefs[item[1]];
    sec.stage='GitHub方法重构';
  });
}

var githubChartInstances={};
function seededNormal(seed){var r=rng(seed),spare=null;return function(){if(spare!==null){var v=spare;spare=null;return v}var u=Math.max(r(),1e-9),v=r(),mag=Math.sqrt(-2*Math.log(u));spare=mag*Math.sin(2*Math.PI*v);return mag*Math.cos(2*Math.PI*v)}}
function baseText(){return{fontFamily:'Microsoft YaHei, sans-serif',color:'#3f352c'}}
function commonGrid(){return{left:58,right:28,top:44,bottom:48,containLabel:true}}
function axisBase(name){return{name:name,nameTextStyle:{color:'#66594a'},axisLine:{lineStyle:{color:'#4a4037'}},axisTick:{show:false},splitLine:{lineStyle:{color:'#eee8df'}},axisLabel:{color:'#66594a'}}}
function groupData(seed,n){
  var z=seededNormal(seed),groups=['A','B','C'],colors=['#356aa0','#db7a36','#3c9a58'],out=[];
  for(var g=0;g<3;g++){var data=[];for(var i=0;i<n;i++){var x=z()+g*.9,y=.55*x+z()*.7+g*.65;data.push([+x.toFixed(3),+y.toFixed(3),+(Math.abs(z())*18+8).toFixed(2)])}out.push({name:groups[g],color:colors[g],data:data})}
  return out;
}
function ellipseSeries(cx,cy,rx,ry,color){
  var pts=[];for(var i=0;i<=80;i++){var a=i/80*Math.PI*2;pts.push([cx+rx*Math.cos(a),cy+ry*Math.sin(a)])}
  return{name:'95%置信椭圆',type:'line',data:pts,symbol:'none',silent:true,lineStyle:{color:color,width:2,type:'dashed'},tooltip:{show:false}}
}
function chartScatterOption(type,seed){
  var groups=groupData(seed,34),series=[];
  groups.forEach(function(g,idx){
    series.push({name:g.name,type:'scatter',data:g.data,symbolSize:type==='bubble'?function(v){return 5+Math.sqrt(v[2])*2.2}:8,itemStyle:{color:g.color,opacity:.75},emphasis:{focus:'series'}});
    if(type==='pca'||type==='pcoa'||type==='nmds')series.push(ellipseSeries(idx*.9,idx*.65,1.35,1.05,g.color));
  });
  if(type==='density'){
    var z=seededNormal(seed+400),dense=[];for(var i=0;i<380;i++){var c=i<240?0:1,x=z()*.55+(c?1.8:0),y=z()*.55+(c?1.2:0);dense.push([x,y])}
    series=[{type:'scatter',data:dense,symbolSize:6,progressive:500,itemStyle:{color:function(p){var x=p.value[0],y=p.value[1],d=Math.min(Math.hypot(x,y),Math.hypot(x-1.8,y-1.2));return d<.5?'#c33f33':d<1?'#db7a36':'#356aa0'},opacity:.62}}];
  }
  var names={pca:['PC1 (42.6%)','PC2 (21.3%)'],pcoa:['PCoA1 (38.4%)','PCoA2 (19.7%)'],nmds:['NMDS1','NMDS2'],bubble:['效应量','显著性'],density:['变量X','变量Y']};
  var labels=names[type]||['变量X','变量Y'];
  var subtitle=type==='nmds'?'Stress = 0.086':type==='bubble'?'气泡面积表示第三变量':'';
  return{animation:false,textStyle:baseText(),title:{text:subtitle,left:'center',textStyle:{fontSize:12,color:'#765f4d'}},tooltip:{trigger:'item'},legend:{top:8,right:15},grid:commonGrid(),xAxis:axisBase(labels[0]),yAxis:axisBase(labels[1]),series:series};
}
function matrixOption(seed){
  var z=seededNormal(seed),vars=['花萼长','花萼宽','花瓣长','花瓣宽'],series=[],grids=[],xAxes=[],yAxes=[];
  for(var row=0;row<4;row++)for(var col=0;col<4;col++){
    var idx=row*4+col,left=5+col*23.5,top=5+row*23,grid={left:left+'%',top:top+'%',width:'20%',height:'18%'},data=[];
    for(var i=0;i<28;i++){var base=z(),x=base*.55+z()*.55+col*.1,y=base*(.2+row*.15)+z()*.7;data.push([x,y])}
    grids.push(grid);xAxes.push({gridIndex:idx,type:'value',show:row===3,axisLabel:{fontSize:8},splitLine:{show:false}});yAxes.push({gridIndex:idx,type:'value',show:col===0,axisLabel:{fontSize:8},splitLine:{show:false}});
    if(row===col){
      var hist=[3,7,13,19,15,9,4,2].map(function(v){return v+(idx%3)});
      series.push({type:'bar',xAxisIndex:idx,yAxisIndex:idx,data:hist.map(function(v,i){return[i-4,v/8]}),barWidth:'82%',itemStyle:{color:'#356aa0',opacity:.58},silent:true});
    }else{
      series.push({type:'scatter',xAxisIndex:idx,yAxisIndex:idx,data:data,symbolSize:4,itemStyle:{color:['#356aa0','#db7a36','#3c9a58'][idx%3],opacity:.6},silent:true});
    }
  }
  return{animation:false,textStyle:baseText(),title:vars.map(function(v,i){return{text:v,left:(10+i*23.5)+'%',top:0,textStyle:{fontSize:9}}}),grid:grids,xAxis:xAxes,yAxis:yAxes,series:series};
}
function survivalOption(){
  var a=[[0,1],[2,.97],[4,.93],[6,.88],[8,.84],[10,.78],[12,.74],[14,.69],[16,.64],[18,.60],[20,.57],[22,.53],[24,.49]];
  var b=[[0,1],[2,.95],[4,.88],[6,.82],[8,.74],[10,.69],[12,.61],[14,.55],[16,.48],[18,.42],[20,.38],[22,.34],[24,.30]];
  return{animation:false,textStyle:baseText(),tooltip:{trigger:'axis'},legend:{top:8},grid:{left:62,right:25,top:52,bottom:92},xAxis:axisBase('随访时间（月）'),yAxis:Object.assign(axisBase('生存概率'),{min:0,max:1,axisLabel:{formatter:function(v){return Math.round(v*100)+'%'}}}),series:[
    {name:'治疗组',type:'line',step:'end',data:a,symbol:'none',lineStyle:{width:3,color:'#356aa0'},itemStyle:{color:'#356aa0'}},
    {name:'对照组',type:'line',step:'end',data:b,symbol:'none',lineStyle:{width:3,color:'#c33f33'},itemStyle:{color:'#c33f33'}},
    {name:'删失',type:'scatter',data:[[9,.78],[15,.69],[21,.57],[7,.82],[13,.61],[19,.42]],symbol:'path://M-6,0 L6,0 M0,-6 L0,6',symbolSize:10,itemStyle:{color:'#21170f'}}
  ],graphic:[{type:'text',left:64,bottom:52,style:{text:'风险人数',font:'bold 11px Microsoft YaHei',fill:'#21170f'}},{type:'text',left:138,bottom:51,style:{text:'治疗组  48     42     34     26     18',font:'10px Microsoft YaHei',fill:'#356aa0'}},{type:'text',left:138,bottom:32,style:{text:'对照组  47     38     27     19     11',font:'10px Microsoft YaHei',fill:'#c33f33'}}]};
}
function heatmapOption(seed){
  var z=seededNormal(seed),rows=Array.from({length:12},function(_,i){return'Gene '+(i+1)}),cols=Array.from({length:10},function(_,i){return'S'+(i+1)}),data=[];
  for(var y=0;y<rows.length;y++)for(var x=0;x<cols.length;x++){var cluster=y<6?(x<5?1.4:-.7):(x<5?-.8:1.2),v=Math.max(-2.5,Math.min(2.5,cluster+z()*.55));data.push([x,y,+v.toFixed(2)])}
  return{animation:false,textStyle:baseText(),tooltip:{position:'top'},grid:{left:84,right:62,top:34,bottom:54},xAxis:{type:'category',data:cols,splitArea:{show:true},axisLabel:{fontSize:9}},yAxis:{type:'category',data:rows,splitArea:{show:true},axisLabel:{fontSize:9}},visualMap:{min:-2.5,max:2.5,calculable:false,orient:'vertical',right:5,top:'middle',inRange:{color:['#356aa0','#eaf0f4','#fffaf1','#f1c0a9','#c33f33']}},series:[{name:'Z-score',type:'heatmap',data:data,label:{show:false},itemStyle:{borderColor:'#fff',borderWidth:1},emphasis:{itemStyle:{shadowBlur:8,shadowColor:'rgba(0,0,0,.35)'}}}]};
}
function ridgeOption(seed){
  var z=seededNormal(seed),cats=['T1','T2','T3','T4','T5','T6'],series=[];
  cats.forEach(function(cat,g){var data=[];for(var i=0;i<=80;i++){var x=-3+i*.075,mu=-.9+g*.34,d=Math.exp(-.5*Math.pow((x-mu)/(.55+g*.025),2));data.push([x,g+d*.78])}series.push({name:cat,type:'line',data:data,symbol:'none',lineStyle:{color:'#4d3f35',width:1.5},areaStyle:{color:['#356aa0','#38969c','#3c9a58','#d39d2b','#db7a36','#c33f33'][g],opacity:.76}})});
  return{animation:false,textStyle:baseText(),tooltip:{trigger:'axis'},grid:commonGrid(),xAxis:axisBase('表达量'),yAxis:{type:'value',min:-.05,max:6,interval:1,axisLabel:{formatter:function(v){return cats[Math.round(v)]||''}},axisLine:{show:false},splitLine:{show:false}},series:series};
}
function raincloudOption(seed){
  var z=seededNormal(seed),cats=['A','B','C'],scatter=[],boxes=[],violin=[];
  cats.forEach(function(c,g){var vals=[];for(var i=0;i<45;i++){var v=4.7+g*.85+z()*(.75+g*.1);vals.push(v);scatter.push([g+.18+(i%7)*.018,v])}vals.sort(function(a,b){return a-b});var q=function(p){return vals[Math.floor((vals.length-1)*p)]};boxes.push([g,q(.1),q(.25),q(.5),q(.75),q(.9)]);for(var k=0;k<=40;k++){var y=2.5+k*.16,den=Math.exp(-.5*Math.pow((y-(4.7+g*.85))/(.75+g*.1),2));violin.push([g-den*.34,y,g])}});
  return{animation:false,textStyle:baseText(),tooltip:{trigger:'item'},grid:commonGrid(),xAxis:{type:'category',data:cats,axisLine:{lineStyle:{color:'#4a4037'}}},yAxis:axisBase('观测值'),series:[
    {type:'custom',name:'半小提琴',data:violin,renderItem:function(params,api){var p=api.coord([api.value(0),api.value(1)]),base=api.coord([api.value(2),api.value(1)]);return{type:'line',shape:{x1:p[0],y1:p[1],x2:base[0],y2:base[1]},style:{stroke:['#356aa0','#db7a36','#3c9a58'][api.value(2)],lineWidth:4,opacity:.42}}}},
    {type:'boxplot',data:boxes.map(function(b){return b.slice(1)}),boxWidth:[18,32],itemStyle:{color:'#fffaf1',borderColor:'#21170f',borderWidth:2}},
    {type:'scatter',data:scatter,symbolSize:5,itemStyle:{color:'#21170f',opacity:.34}}
  ]};
}
function volcanoOption(seed){
  var z=seededNormal(seed),r=rng(seed+909),data=[],up=[],down=[],ns=[];
  for(var i=0;i<520;i++){
    var fc=z()*1.18,p=Math.max(1e-8,Math.pow(r(),3.1)),score=-Math.log10(p),row=[+fc.toFixed(3),+score.toFixed(3),'Gene'+(i+1)];
    if(p<.05&&fc>1)up.push(row);else if(p<.05&&fc< -1)down.push(row);else ns.push(row);data.push(row);
  }
  var top=data.slice().sort(function(a,b){return b[1]-a[1]}).slice(0,8);
  return{animation:false,textStyle:baseText(),tooltip:{trigger:'item',formatter:function(p){return p.value[2]+'<br/>log2FC: '+p.value[0]+'<br/>-log10(P): '+p.value[1]}},legend:{top:8,data:['上调','不显著','下调']},grid:{left:62,right:26,top:50,bottom:52},xAxis:axisBase('log2 倍数变化'),yAxis:axisBase('-log10(P)'),series:[
    {name:'不显著',type:'scatter',data:ns,symbolSize:6,itemStyle:{color:'#b8b5b0',opacity:.5},markLine:{silent:true,symbol:'none',lineStyle:{color:'#765f4d',type:'dashed'},data:[{xAxis:-1},{xAxis:1},{yAxis:+(-Math.log10(.05)).toFixed(3)}]}},
    {name:'上调',type:'scatter',data:up,symbolSize:7,itemStyle:{color:'#c33f33',opacity:.72}},
    {name:'下调',type:'scatter',data:down,symbolSize:7,itemStyle:{color:'#356aa0',opacity:.72}},
    {name:'重点基因',type:'scatter',data:top,symbolSize:9,itemStyle:{color:'#21170f'},label:{show:true,formatter:function(p){return p.value[2]},position:'top',fontSize:9},tooltip:{show:false}}
  ]};
}
function treemapOption(){
  var data=[{name:'转录组',value:40,children:[{name:'差异基因',value:23},{name:'通路富集',value:17}]},{name:'蛋白组',value:28,children:[{name:'定量蛋白',value:18},{name:'互作网络',value:10}]},{name:'代谢组',value:20},{name:'表型',value:12}];
  return{animation:false,textStyle:baseText(),tooltip:{formatter:'{b}<br/>数值：{c}'},series:[{type:'treemap',data:data,roam:false,nodeClick:false,breadcrumb:{show:false},label:{show:true,formatter:'{b}\\n{c}',fontSize:12},upperLabel:{show:true,height:25},itemStyle:{borderColor:'#fffaf1',borderWidth:3,gapWidth:2},levels:[{}, {color:['#356aa0','#db7a36','#3c9a58','#7655a6'],itemStyle:{borderWidth:4,gapWidth:3}}]}]};
}
function radarOption(){
  return{animation:false,textStyle:baseText(),legend:{top:8,data:['方法A','方法B']},radar:{center:['50%','55%'],radius:'68%',splitNumber:5,indicator:[{name:'准确度',max:100},{name:'稳定性',max:100},{name:'速度',max:100},{name:'可解释性',max:100},{name:'易用性',max:100},{name:'成本控制',max:100}],axisName:{color:'#4a4037'},splitArea:{areaStyle:{color:['#fff','#f8f2e8']}}},series:[{type:'radar',data:[{name:'方法A',value:[88,72,84,62,76,55],areaStyle:{color:'rgba(53,106,160,.28)'},lineStyle:{color:'#356aa0'},itemStyle:{color:'#356aa0'}},{name:'方法B',value:[76,89,62,83,70,78],areaStyle:{color:'rgba(195,63,51,.22)'},lineStyle:{color:'#c33f33'},itemStyle:{color:'#c33f33'}}]}]};
}
function upsetOption(){
  var labels=['A∩B','A∩C','B∩C','A','B','C'],counts=[18,13,11,34,29,25],sets=[[1,1,0],[1,0,1],[0,1,1],[1,0,0],[0,1,0],[0,0,1]],series=[{type:'bar',xAxisIndex:0,yAxisIndex:0,data:counts,itemStyle:{color:'#356aa0'},label:{show:true,position:'top'}}];
  for(var row=0;row<3;row++)series.push({type:'scatter',xAxisIndex:1,yAxisIndex:1,data:sets.map(function(s,i){return[i,row,s[row]]}),symbolSize:function(v){return v[2]?10:5},itemStyle:{color:function(p){return p.value[2]?'#21170f':'#d7d0c7'}}});
  return{animation:false,textStyle:baseText(),grid:[{left:70,right:30,top:35,height:'42%'},{left:70,right:30,top:'62%',height:'25%'}],xAxis:[{type:'category',data:labels,gridIndex:0,axisLabel:{show:false}},{type:'category',data:labels,gridIndex:1,axisLabel:{rotate:30,fontSize:9}}],yAxis:[axisBase('交集大小'),{type:'category',gridIndex:1,data:['集合A','集合B','集合C'],axisTick:{show:false},splitLine:{show:false}}],series:series};
}
function marginalOption(seed){
  var groups=groupData(seed,45),scatter=groups.map(function(g){return{name:g.name,type:'scatter',xAxisIndex:0,yAxisIndex:0,data:g.data,symbolSize:6,itemStyle:{color:g.color,opacity:.58}}}),bins=Array.from({length:14},function(_,i){return i-7}),hx=bins.map(function(_,i){return Math.round(8+30*Math.exp(-Math.pow((i-7)/3.7,2)))}),hy=bins.map(function(_,i){return Math.round(6+27*Math.exp(-Math.pow((i-8)/3.4,2)))});
  return{animation:false,textStyle:baseText(),grid:[{left:70,right:90,top:70,bottom:55},{left:70,right:90,top:18,height:42},{right:20,top:70,bottom:55,width:52}],xAxis:[axisBase('变量X'),{type:'category',gridIndex:1,data:bins,show:false},{type:'value',gridIndex:2,show:false}],yAxis:[axisBase('变量Y'),{type:'value',gridIndex:1,show:false},{type:'category',gridIndex:2,data:bins,show:false}],series:scatter.concat([{type:'bar',xAxisIndex:1,yAxisIndex:1,data:hx,itemStyle:{color:'#356aa0',opacity:.55}},{type:'bar',xAxisIndex:2,yAxisIndex:2,data:hy,itemStyle:{color:'#db7a36',opacity:.55}}])};
}
function compositionOption(seed){
  var z=seededNormal(seed),pts=[],bars=[12,21,16,27,19];
  for(var i=0;i<42;i++){var x=z(),y=.65*x+z()*.7;pts.push([x,y])}
  return{animation:false,textStyle:baseText(),title:[{text:'散点关系',left:'24%',top:15,textAlign:'center',textStyle:{fontSize:13}},{text:'类别计数',left:'75%',top:15,textAlign:'center',textStyle:{fontSize:13}}],grid:[{left:48,right:'53%',top:54,bottom:48},{left:'55%',right:28,top:54,bottom:48}],xAxis:[axisBase('变量X'),{type:'category',gridIndex:1,data:['A','B','C','D','E'],axisTick:{show:false}}],yAxis:[axisBase('变量Y'),Object.assign(axisBase('计数'),{gridIndex:1})],series:[{type:'scatter',data:pts,symbolSize:7,itemStyle:{color:'#356aa0',opacity:.65}},{type:'bar',xAxisIndex:1,yAxisIndex:1,data:bars,itemStyle:{color:'#db7a36'},label:{show:true,position:'top'}}]};
}
function zoomOption(seed){
  var groups=groupData(seed,36),all=[];groups.forEach(function(g){g.data.forEach(function(v){all.push(v)})});
  var detail=all.filter(function(v){return v[0]>.1&&v[0]<1.55&&v[1]>.05&&v[1]<1.55});
  return{animation:false,textStyle:baseText(),title:[{text:'完整数据',left:'25%',top:12,textAlign:'center',textStyle:{fontSize:12}},{text:'红框区域放大',left:'75%',top:12,textAlign:'center',textStyle:{fontSize:12}}],grid:[{left:48,right:'53%',top:48,bottom:45},{left:'56%',right:25,top:48,bottom:45}],xAxis:[axisBase('X'),Object.assign(axisBase('X'),{gridIndex:1,min:.1,max:1.55})],yAxis:[axisBase('Y'),Object.assign(axisBase('Y'),{gridIndex:1,min:.05,max:1.55})],series:[{type:'scatter',data:all,symbolSize:6,itemStyle:{color:'#356aa0',opacity:.55}},{type:'line',data:[[.1,.05],[1.55,.05],[1.55,1.55],[.1,1.55],[.1,.05]],symbol:'none',silent:true,lineStyle:{color:'#c33f33',width:2},tooltip:{show:false}},{type:'scatter',xAxisIndex:1,yAxisIndex:1,data:detail,symbolSize:8,itemStyle:{color:'#c33f33',opacity:.7}}]};
}
function significanceOption(type,seed){
  var z=seededNormal(seed),names=type==='anova'?['A','B','C','D']:['对照','处理'],means=type==='anova'?[4.8,5.6,6.5,7.1]:type==='wilcox'?[4.6,6]:[5,6.15],data=[],series=[];
  names.forEach(function(name,g){var vals=[];for(var i=0;i<30;i++){var v=means[g]+z()*(type==='wilcox'?Math.max(.35,Math.abs(z())*.35):.72);vals.push([g+(i%7-3)*.025,+v.toFixed(3)])}series.push({name:name,type:'scatter',data:vals,symbolSize:5,itemStyle:{color:['#356aa0','#db7a36','#3c9a58','#7655a6'][g],opacity:.45}})});
  var ymax=8.8,graphics=[];
  if(type==='anova'){
    ['b','ab','a','a'].forEach(function(t,i){graphics.push({type:'text',left:(17+i*21.5)+'%',top:34,style:{text:t,font:'bold 14px Microsoft YaHei',fill:'#21170f'}})});
  }else{
    graphics=[{type:'polyline',shape:{points:[[230,52],[230,38],[450,38],[450,52]]},style:{stroke:'#21170f',lineWidth:2,fill:null}},{type:'text',left:'46%',top:15,style:{text:type==='ttest'?'t 检验  P = 0.002':'Wilcoxon  P = 0.006',font:'bold 11px Microsoft YaHei',fill:'#21170f'}}];
  }
  return{animation:false,textStyle:baseText(),grid:{left:55,right:28,top:65,bottom:48},xAxis:{type:'category',data:names,axisTick:{show:false},axisLine:{lineStyle:{color:'#4a4037'}}},yAxis:Object.assign(axisBase('观测值'),{max:ymax}),series:series,graphic:graphics};
}
function bumpOption(){
  var years=[2021,2022,2023,2024,2025],ranks={A:[1,2,2,3,2],B:[2,1,3,2,4],C:[3,4,1,1,1],D:[4,3,5,4,3],E:[5,5,4,5,5]},colors=['#356aa0','#db7a36','#3c9a58','#7655a6','#c33f33'];
  return{animation:false,textStyle:baseText(),tooltip:{trigger:'axis'},legend:{top:8},grid:{left:55,right:35,top:48,bottom:48},xAxis:{type:'category',data:years,axisTick:{show:false},axisLine:{lineStyle:{color:'#4a4037'}}},yAxis:{type:'value',inverse:true,min:.5,max:5.5,interval:1,name:'排名',axisLabel:{formatter:function(v){return Number.isInteger(v)?'第'+v+'名':''}},splitLine:{lineStyle:{color:'#eee8df'}}},series:Object.keys(ranks).map(function(k,i){return{name:k,type:'line',smooth:.35,data:ranks[k],symbolSize:8,lineStyle:{width:3,color:colors[i]},itemStyle:{color:colors[i]},endLabel:{show:true,formatter:k}}})};
}
function divergingOption(){
  var cats=['A','B','C','D','E','F','G','H','I','J'],vals=[-2.8,2.2,-1.8,3.4,-1.1,2.6,-3.2,1.5,2.9,-2.1];
  return{animation:false,textStyle:baseText(),grid:{left:58,right:42,top:28,bottom:42},xAxis:Object.assign(axisBase('净效应'),{min:-4,max:4}),yAxis:{type:'category',data:cats,axisTick:{show:false}},series:[{type:'bar',data:vals,itemStyle:{color:function(p){return p.value<0?'#356aa0':'#c33f33'}},label:{show:true,position:function(p){return p.value<0?'left':'right'}}}]};
}
function pyramidOption(){
  var ages=['0–9','10–19','20–29','30–39','40–49','50–59','60–69','70+'],male=[-8,-9,-12,-14,-13,-10,-7,-4],female=[7,8,11,13,14,11,8,6];
  return{animation:false,textStyle:baseText(),tooltip:{trigger:'axis',axisPointer:{type:'shadow'},valueFormatter:function(v){return Math.abs(v)+'%'}},legend:{top:6},grid:{left:58,right:38,top:43,bottom:45},xAxis:Object.assign(axisBase('人口比例（%）'),{min:-16,max:16,axisLabel:{formatter:function(v){return Math.abs(v)}}}),yAxis:{type:'category',data:ages,axisTick:{show:false}},series:[{name:'男',type:'bar',stack:'total',data:male,itemStyle:{color:'#356aa0'}},{name:'女',type:'bar',stack:'total',data:female,itemStyle:{color:'#c33f33'}}]};
}
function githubOption(sec,seed){
  switch(sec.githubType){
    case'composition':return compositionOption(seed);
    case'zoom':return zoomOption(seed);
    case'ttest':case'wilcox':case'anova':return significanceOption(sec.githubType,seed);
    case'matrix':return matrixOption(seed);
    case'pca':case'pcoa':case'nmds':case'bubble':case'density':return chartScatterOption(sec.githubType,seed);
    case'marginal':return marginalOption(seed);
    case'bump':return bumpOption();
    case'diverging':return divergingOption();
    case'pyramid':return pyramidOption();
    case'survival':return survivalOption();
    case'heatmap':return heatmapOption(seed);
    case'ridge':return ridgeOption(seed);
    case'raincloud':return raincloudOption(seed);
    case'volcano':return volcanoOption(seed);
    case'treemap':return treemapOption();
    case'radar':return radarOption();
    case'upset':return upsetOption();
  }
  return{};
}
function renderGithubChart(sec){
  var el=document.querySelector('[data-chart="'+sec.id+'"]');if(!el||!window.echarts)return;
  var renderer=(typeof isMatlab3DType==='function'&&isMatlab3DType(sec.githubType))?'canvas':'svg';
  var chart=githubChartInstances[sec.id];
  if(chart&&chart.getZr&&chart.getZr().painter&&chart.getZr().painter.type!==renderer){chart.dispose();delete githubChartInstances[sec.id];chart=null}
  if(!chart){chart=echarts.init(el,null,{renderer:renderer});githubChartInstances[sec.id]=chart}
  try{
    chart.clear();chart.setOption(githubOption(sec,stableSeed(sec.id)),true);
  }catch(error){
    chart.dispose();delete githubChartInstances[sec.id];
    el.innerHTML='<div style="padding:28px;text-align:center;color:#a33b2b">本图预览绘制失败，请使用下方 R 源码生成。</div>';
    console.error('图表绘制失败：'+sec.id,error);
  }
}
function initGithubCharts(list){
  list.filter(function(s){return s.engine==='echarts'}).forEach(renderGithubChart);
  if(!window.__githubResizeBound){window.__githubResizeBound=true;window.addEventListener('resize',function(){Object.values(githubChartInstances).forEach(function(c){c.resize()})})}
}
