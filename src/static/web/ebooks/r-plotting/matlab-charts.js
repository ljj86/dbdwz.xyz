/* 用户 MATLAB 压缩包中的 20 个拆分图。网页预览独立重绘，不嵌入 reference_svg。 */
var matlabPackageSource='downloads/04_二十个拆分图_MATLAB代码包_代码与数据.zip';
var matlabPanelSpecs=[
  ['10.1','sec-10-1','条件高斯混合概率面','fig04a_gmm_probability.m','gmm','三维概率面比较两个条件下的高斯混合密度；数值为公式机制演示值。'],
  ['10.2','sec-10-2','协方差收缩椭圆','fig04b_covariance_shrinkage.m','covariance','同一经验协方差在不同收缩系数下逐步降低各向异性。'],
  ['10.3','sec-10-3','方向保留率曲线','fig04c_directional_retention.m','retention','展示协方差特征值与保留偏差之间的非线性关系。'],
  ['10.4','sec-10-4','PMP后验均值下降路径','fig04d_pmp_descent.m','pmp','在负对数密度能量面上展示单步后验均值和多步 PMP 下降路径。'],
  ['10.5','sec-10-5','空域—频域证据融合','fig06a_spatial_frequency_fusion.m','fusion','用流程图表达空间纹理与频域证据的归一化融合。'],
  ['10.6','sec-10-6','角度间隔紧致性','fig06b_angular_compactness.m','angular','单位圆上展示已知类中心、角度间隔、已知样本与未知样本。'],
  ['10.7','sec-10-7','独立校准阈值','fig06c_calibration_threshold.m','calibration','已知类最小 Mahalanobis 分数的经验分布给出独立校准阈值。'],
  ['10.8','sec-10-8','三维Mahalanobis椭球','fig06d_mahalanobis_ellipsoids.m','ellipsoid','三维已知类特征及其类别条件 Mahalanobis 接受边界。'],
  ['10.9','sec-10-9','条件数敏感性曲面','figS01a_conditioning_sensitivity.m','surface-conditioning','收缩系数与岭项共同影响协方差矩阵条件数。'],
  ['10.10','sec-10-10','保留偏差敏感性曲面','figS01b_retention_sensitivity.m','surface-retention','噪声尺度与协方差特征值共同决定方向保留率。'],
  ['10.11','sec-10-11','PMP收缩敏感性曲面','figS01c_pmp_contraction.m','surface-pmp','步长与噪声尺度共同决定局部收缩因子。'],
  ['10.12','sec-10-12','软挖掘响应曲线','figS01d_soft_mining_response.m','softmining','不同指数参数下，历史难度如何改变样本权重。'],
  ['10.13','sec-10-13','单调质量校准曲线','figS02d_quality_calibration.m','quality-calibration','把图像级偏差单调映射为质量百分位。'],
  ['10.14','sec-10-14','原型纯度—遮罩面积曲线','figS03a_prototype_purity.m','failure-purity','三种策略的原型纯度随遮罩面积变化，并标出回退边界。'],
  ['10.15','sec-10-15','有效覆盖率—遮罩面积曲线','figS03b_effective_coverage.m','failure-coverage','三种策略的有效覆盖率随遮罩面积变化。'],
  ['10.16','sec-10-16','定位AUROC—遮罩面积曲线','figS03c_localization_auroc.m','failure-auroc','三种策略的像素级 AUROC 随遮罩面积变化。'],
  ['10.17','sec-10-17','证据感知回退状态机','figS03d_fallback_state_machine.m','fallback','证据不足时从单图原型逐级回退到人工复核的明确状态机。']
];

var matlabSections=matlabPanelSpecs.map(function(x){return{
  chapter:'第10章 MATLAB科研图形',no:x[0],id:x[1],title:x[2],type:'matlab-panel',lang:'MATLAB',stage:'使用过的图',usedFigure:true,
  source:'matlab_package/panels/'+x[3],packageSource:matlabPackageSource,engine:'echarts',githubType:'matlab-'+x[4],
  desc:x[5]+' 该图来自你提供的“二十个拆分图 MATLAB 代码包”，故标记为使用过的图。',
  code:'% 单图入口（请从完整代码包根目录运行）\ncfg = setup_portable_paths();\ncfg.visible = "on";\nfig = '+x[3].replace('.m','')+'(cfg);\n% 点击下方可下载单图 .m；运行时所需 data/helpers 请下载完整代码与数据包。'
}});

function appendMatlabSections(list){
  var heat=list.find(function(s){return s.id==='sec-9-26'});
  if(heat){
    heat.title='空间偏差与多尺度缺陷热图';heat.lang='MATLAB';heat.usedFigure=true;heat.stage='使用过的图';
    heat.engine='echarts';heat.githubType='matlab-heat-combined';heat.ref=null;
    heat.source='matlab_package/panels/figS02a_patch_deviation_heatmap.m';
    heat.sources=[
      {href:'matlab_package/panels/figS02a_patch_deviation_heatmap.m',label:'单尺度偏差热图 .m'},
      {href:'matlab_package/panels/figS02b_multiscale_defect_heatmap.m',label:'多尺度融合热图 .m'}
    ];
    heat.packageSource=matlabPackageSource;
    heat.desc='同一节并列展示单尺度遮罩块偏差热图与多尺度融合缺陷热图，避免与原有热图章节重复。两图均来自你提供的 MATLAB 包并标记为使用过的图；数值仅为公式机制演示。';
    heat.code='% 请从完整代码包根目录运行\ncfg = setup_portable_paths();\nfig1 = figS02a_patch_deviation_heatmap(cfg);\nfig2 = figS02b_multiscale_defect_heatmap(cfg);';
  }
  var radar=list.find(function(s){return s.id==='sec-9-42'});
  if(radar){
    radar.title='五维质量雷达图';radar.lang='MATLAB';radar.usedFigure=true;radar.stage='使用过的图';
    radar.engine='echarts';radar.githubType='matlab-quality-radar';radar.ref=null;
    radar.source='matlab_package/panels/figS02c_five_dimensional_quality.m';radar.packageSource=matlabPackageSource;
    radar.desc='保持、去除、边界、上下文和幻觉五维质量证据来自演示数据 quality_five_dim.csv。该图来自你提供的 MATLAB 包并标记为使用过的图；数值不是实验结果。';
    radar.code='% 请从完整代码包根目录运行\ncfg = setup_portable_paths();\nfig = figS02c_five_dimensional_quality(cfg);';
  }
  list.push.apply(list,matlabSections);
}

function matlabHeatData(multiscale){var a=[[.04,.08,.24,.13,.03],[.07,.48,1.66,.96,.09],[.10,1.55,4.40,2.70,.15],[.05,.36,1.32,.52,.07]];if(multiscale)a=a.map(function(row,y){return row.map(function(v,x){return +(v*.65+[[.12,.55,.18],[.16,1.8,.23]][Math.min(1,Math.floor(y/2))][Math.min(2,Math.floor(x/2))]*.35).toFixed(2)})});var d=[];a.forEach(function(row,y){row.forEach(function(v,x){d.push([x,y,v])})});return d}
function matlabSurface(kind){var data=[];for(var y=0;y<=26;y++)for(var x=0;x<=30;x++){var a=x/30,t=.05+y/26*1.75,z;if(kind==='conditioning')z=Math.log10(((1-a)*4+a*1.405+Math.pow(10,-6+y/26*5.7))/((1-a)*.015+a*1.405+Math.pow(10,-6+y/26*5.7)));else if(kind==='retention'){var l=Math.pow(10,-2+x/30*3.2);z=l/(l+t*t)}else z=1-a*t*t/(.35+t*t);data.push([+a.toFixed(3),+t.toFixed(3),+z.toFixed(3)])}return data}
function matlabFlow(fallback){var nodes=fallback?[{name:'单图原型'},{name:'训练条件原型'},{name:'保守区间'},{name:'人工复核'}]:[{name:'空间分支'},{name:'频率分支'},{name:'归一化融合'}],links=fallback?[{source:'单图原型',target:'训练条件原型'},{source:'训练条件原型',target:'保守区间'},{source:'保守区间',target:'人工复核'}]:[{source:'空间分支',target:'归一化融合'},{source:'频率分支',target:'归一化融合'}];return{animation:false,textStyle:baseText(),tooltip:{show:false},series:[{type:'graph',layout:'none',roam:false,symbol:'roundRect',symbolSize:fallback?[130,58]:[150,65],label:{show:true,fontSize:11,color:'#21170f'},edgeSymbol:['none','arrow'],edgeSymbolSize:10,lineStyle:{width:2,color:'#765f4d'},data:nodes.map(function(n,i){return Object.assign(n,{x:fallback?[80,250,420,590][i]:[120,120,500][i],y:fallback?[110,110,110,235][i]:[90,230,160][i],itemStyle:{color:['#dff2e9','#e2edf8','#f7e9d3','#f6dcdc'][i],borderColor:['#317f68','#356aa0','#db7a36','#c33f33'][i],borderWidth:2}})}),links:links}]} }
function matlabFailure(metric){var x=[10,20,30,40,50,60,70,80],vals={purity:[[.9,.84,.76,.66,.55,.43,.34,.27],[.94,.91,.86,.8,.72,.61,.48,.36],[.97,.95,.92,.88,.82,.73,.6,.46]],coverage:[[.96,.92,.86,.78,.68,.56,.43,.31],[.91,.86,.8,.72,.62,.5,.37,.25],[.88,.83,.77,.69,.59,.47,.34,.22]],auroc:[[.86,.82,.77,.7,.62,.54,.48,.43],[.89,.87,.84,.8,.75,.67,.58,.5],[.92,.91,.89,.87,.83,.76,.66,.55]]}[metric];return{animation:false,textStyle:baseText(),tooltip:{trigger:'axis'},legend:{top:8},grid:commonGrid(),xAxis:Object.assign(axisBase('遮罩面积（%）'),{data:x,type:'category'}),yAxis:Object.assign(axisBase(metric==='purity'?'原型纯度':metric==='coverage'?'有效覆盖率':'像素AUROC'),{min:.2,max:1}),series:['未筛选','单视图','双视图'].map(function(n,i){return{name:n,type:'line',data:vals[i],symbolSize:7,lineStyle:{width:2.5,color:['#b8b5b0','#356aa0','#c33f33'][i]},itemStyle:{color:['#b8b5b0','#356aa0','#c33f33'][i]},markLine:i?undefined:{silent:true,symbol:'none',lineStyle:{color:'#c33f33',type:'dashed'},data:[{xAxis:'60'}]}}})}}

/* ECharts-GL 真三维预览。公式与用户提供的 MATLAB 源码一致，网格仅为网页性能适度降采样。 */
var matlab3DTypes=['matlab-gmm','matlab-pmp','matlab-ellipsoid','matlab-surface-conditioning','matlab-surface-retention','matlab-surface-pmp'];
function isMatlab3DType(type){return matlab3DTypes.indexOf(type)>=0}
function m3Linspace(a,b,n){return Array.from({length:n},function(_,i){return a+(b-a)*i/(n-1)})}
function m3Axis(name,min,max){return{type:'value',name:name,min:min,max:max,nameGap:20,nameTextStyle:{fontSize:11,color:'#3b342e'},axisLine:{lineStyle:{color:'#776d64'}},axisLabel:{fontSize:9,color:'#625950'},splitLine:{lineStyle:{color:'#ddd8d1',opacity:.65}}}}
function m3Base(xName,yName,zName,ranges,view){return{
  animation:false,backgroundColor:'#fff',tooltip:{show:false},
  xAxis3D:m3Axis(xName,ranges[0][0],ranges[0][1]),yAxis3D:m3Axis(yName,ranges[1][0],ranges[1][1]),zAxis3D:m3Axis(zName,ranges[2][0],ranges[2][1]),
  grid3D:{left:18,right:18,top:8,bottom:10,boxWidth:115,boxDepth:95,boxHeight:75,environment:'#fff',axisPointer:{show:false},
    light:{main:{intensity:1.15,shadow:false,alpha:35,beta:35},ambient:{intensity:.55}},
    viewControl:{projection:'perspective',alpha:view&&view[1]||27,beta:view&&view[0]||-43,distance:185,minDistance:105,maxDistance:310,rotateSensitivity:1,zoomSensitivity:1,panSensitivity:0,autoRotate:false}}
}}
function m3Viridis(value,min,max){var stops=[[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]],t=Math.max(0,Math.min(1,(value-min)/Math.max(1e-12,max-min))),p=t*(stops.length-1),i=Math.min(stops.length-2,Math.floor(p)),f=p-i,a=stops[i],b=stops[i+1];return'rgb('+[0,1,2].map(function(k){return Math.round(a[k]+(b[k]-a[k])*f)}).join(',')+')'}
var m3Gmm={
  A:[{w:.48,mu:[-1.45,.25],s:[.72,.18,.38]},{w:.34,mu:[1.15,1.15],s:[.55,-.12,.80]},{w:.18,mu:[1.65,-1.35],s:[.38,.08,.45]}],
  B:[{w:.38,mu:[-.65,-.75],s:[.92,.25,.42]},{w:.42,mu:[1.75,.65],s:[.48,-.16,.72]},{w:.20,mu:[.35,1.75],s:[.34,.04,.36]}]
};
function m3Gaussian(x,y,c,extra){var a=c.s[0]+(extra||0),b=c.s[1],d=c.s[2]+(extra||0),det=a*d-b*b,dx=x-c.mu[0],dy=y-c.mu[1],q=(d*dx*dx-2*b*dx*dy+a*dy*dy)/det;return Math.exp(-.5*q)/(2*Math.PI*Math.sqrt(det))}
function m3Density(x,y,key,extra){return m3Gmm[key].reduce(function(sum,c){return sum+c.w*m3Gaussian(x,y,c,extra)},0)}
function m3SurfaceData(xs,ys,zAt){var data=[];ys.forEach(function(y){xs.forEach(function(x){data.push([+x.toFixed(5),+y.toFixed(5),+zAt(x,y).toFixed(6)])})});return data}
function m3WireframeSeries(xs,ys,zAt,color,name){var series=[];function line(data){series.push({name:name,type:'line3D',data:data,lineStyle:{width:1.3,color:color,opacity:.82}})}ys.forEach(function(y,j){if(j%2===0)line(xs.map(function(x){return[x,y,zAt(x,y)]}))});xs.forEach(function(x,i){if(i%2===0)line(ys.map(function(y){return[x,y,zAt(x,y)]}))});return series}
function m3SurfaceSeries(name,data,min,max,opacity){return{name:name,type:'surface',silent:true,wireframe:{show:false},shading:'lambert',data:data,itemStyle:{opacity:opacity==null?.94:opacity,color:function(p){return m3Viridis(p.value[2],min,max)}}}}
function m3GmmOption(){var xs=m3Linspace(-4,4,39),ys=m3Linspace(-3.5,3.5,35),a=m3SurfaceData(xs,ys,function(x,y){return m3Density(x,y,'A')}),zMax=.17,opt=m3Base('feature z₁','feature z₂','pₗ(z|c)',[[-4,4],[-3.5,3.5],[0,zMax]],[-43,29]);opt.series=[m3SurfaceSeries('context A',a,0,zMax,.96)].concat(m3WireframeSeries(xs,ys,function(x,y){return m3Density(x,y,'B')},'#db7a36','context B'));return opt}
function m3Inv2(s,extra){var a=s[0]+extra,b=s[1],d=s[2]+extra,det=a*d-b*b;return[d/det,-b/det,a/det]}
function m3Posterior(point){var tau2=.64,logs=[],cms=[];m3Gmm.A.forEach(function(c){var inv=m3Inv2(c.s,tau2),dx=point[0]-c.mu[0],dy=point[1]-c.mu[1],det=(c.s[0]+tau2)*(c.s[2]+tau2)-c.s[1]*c.s[1],log=Math.log(c.w)-Math.log(2*Math.PI)-.5*Math.log(det)-.5*(inv[0]*dx*dx+2*inv[1]*dx*dy+inv[2]*dy*dy);logs.push(log);var invObs=inv,ga=c.s[0]*invObs[0]+c.s[1]*invObs[1],gb=c.s[0]*invObs[1]+c.s[1]*invObs[2],gc=c.s[1]*invObs[0]+c.s[2]*invObs[1],gd=c.s[1]*invObs[1]+c.s[2]*invObs[2];cms.push([c.mu[0]+ga*dx+gb*dy,c.mu[1]+gc*dx+gd*dy])});var mx=Math.max.apply(null,logs),ww=logs.map(function(v){return Math.exp(v-mx)}),sum=ww.reduce(function(a,b){return a+b},0);return[ww.reduce(function(s,w,i){return s+w*cms[i][0]},0)/sum,ww.reduce(function(s,w,i){return s+w*cms[i][1]},0)/sum]}
function m3PmpOption(){var xs=m3Linspace(-4,4,39),ys=m3Linspace(-3.5,3.5,35),raw=[];ys.forEach(function(y){xs.forEach(function(x){raw.push(-Math.log(Math.max(m3Density(x,y,'A'),Number.MIN_VALUE)))})});var sorted=raw.slice().sort(function(a,b){return a-b}),cap=sorted[Math.ceil(.97*sorted.length)-1],idx=0,data=m3SurfaceData(xs,ys,function(){return Math.min(raw[idx++],cap)}),path=[[3.1,-2.6]],p=path[0];for(var i=0;i<8;i++){var q=m3Posterior(p);p=[.35*p[0]+.65*q[0],.35*p[1]+.65*q[1]];path.push(p)}function energy(pt){return Math.min(-Math.log(Math.max(m3Density(pt[0],pt[1],'A'),Number.MIN_VALUE)),cap)+.08}var single=m3Posterior(path[0]),opt=m3Base('feature z₁','feature z₂','−log pₗ(z|c)',[[-4,4],[-3.5,3.5],[0,cap]],[-38,28]);opt.legend={show:true,left:14,top:10,orient:'vertical',textStyle:{fontSize:10}};opt.series=[m3SurfaceSeries('energy',data,0,cap,.88),{name:'multi-step PMP',type:'line3D',data:path.map(function(v){return[v[0],v[1],energy(v)]}),lineStyle:{width:6,color:'#7655a6',opacity:1}},{name:'observation',type:'scatter3D',data:[[path[0][0],path[0][1],energy(path[0])]],symbol:'circle',symbolSize:11,itemStyle:{color:'#21170f'}},{name:'single posterior mean',type:'scatter3D',data:[[single[0],single[1],energy(single)]],symbolSize:12,itemStyle:{color:'#db7a36'}},{name:'component means',type:'scatter3D',data:m3Gmm.A.map(function(c){return[c.mu[0],c.mu[1],energy(c.mu)]}),symbolSize:12,itemStyle:{color:'#3c9a58'}}];return opt}
var m3Known=[
  [[-1.90,-.42,.32],[-1.55,-.18,.64],[-1.35,-.62,.48],[-1.72,-.78,.10],[-1.20,-.30,.18],[-1.48,-.52,.86],[-1.85,-.10,.52],[-1.05,-.70,.35],[-1.62,-.35,-.05]],
  [[1.20,1.32,.15],[1.55,1.10,.48],[1.82,1.42,.32],[1.38,.84,.72],[1.92,1.02,.60],[1.65,1.58,.05],[1.10,1.05,.45],[1.75,.72,.26],[1.42,1.26,.88]],
  [[.05,-1.22,-1.52],[.38,-1.48,-1.10],[-.18,-1.62,-1.28],[.55,-1.05,-1.72],[-.42,-1.30,-1.42],[.22,-1.78,-.92],[.62,-1.35,-1.22],[-.10,-.92,-1.86],[.30,-1.12,-1.38]]
],m3Unknown=[[2.85,-1.90,1.82],[-2.75,1.85,-1.60],[2.45,2.52,-1.72],[-2.30,-2.48,1.92],[.20,2.92,2.35],[2.92,.05,-2.62]],m3Ellipsoids=[
  {mu:[-1.52444444,-.44111111,.37777778],L:[[.61509149,0,0],[-.09104915,.54783931,0],[.01306729,.05553327,.60670151]]},
  {mu:[1.53222222,1.14555556,.43444444],L:[[.61049321,0,0],[.00254473,.60569128,0],[-.02901785,-.12040001,.58576651]]},
  {mu:[.15777778,-1.31555556,-1.38],L:[[.70468558,0,0],[.01422424,.62097027,0],[.07052711,-.29738447,.56373586]]}
];
function m3EllipsoidLines(e,color){var out=[],steps=48;function map(u){return[e.mu[0]+e.L[0][0]*u[0],e.mu[1]+e.L[1][0]*u[0]+e.L[1][1]*u[1],e.mu[2]+e.L[2][0]*u[0]+e.L[2][1]*u[1]+e.L[2][2]*u[2]]}[-1.15,-.65,0,.65,1.15].forEach(function(lat){var phi=lat,cp=Math.cos(phi),sp=Math.sin(phi),ring=[];for(var i=0;i<=steps;i++){var t=i/steps*Math.PI*2;ring.push(map([cp*Math.cos(t),cp*Math.sin(t),sp]))}out.push({type:'line3D',silent:true,data:ring,lineStyle:{width:1.5,color:color,opacity:.8}})});for(var m=0;m<12;m++){var t=m/12*Math.PI*2,line=[];for(var j=0;j<=24;j++){var phi=-Math.PI/2+j/24*Math.PI;line.push(map([Math.cos(phi)*Math.cos(t),Math.cos(phi)*Math.sin(t),Math.sin(phi)]))}out.push({type:'line3D',silent:true,data:line,lineStyle:{width:1.1,color:color,opacity:.62}})}return out}
function m3EllipsoidOption(){var colors=['#356aa0','#db7a36','#3c9a58'],opt=m3Base('h₁','h₂','h₃',[[-3.3,3.3],[-3.1,3.3],[-3,2.8]],[-42,24]),series=[];opt.legend={top:6,right:10,orient:'vertical',textStyle:{fontSize:10}};m3Known.forEach(function(rows,i){series.push({name:'known class '+(i+1),type:'scatter3D',data:rows,symbolSize:7,itemStyle:{color:colors[i],borderColor:'#fff',borderWidth:1}});series=series.concat(m3EllipsoidLines(m3Ellipsoids[i],colors[i]))});series.push({name:'unknown / rejected',type:'scatter3D',data:m3Unknown,symbol:'diamond',symbolSize:10,itemStyle:{color:'#c33f33',borderColor:'#6e1919',borderWidth:1.5}});opt.series=series;return opt}
function m3SensitivityOption(kind){var xs,ys,zAt,xName,yName,zName,zRange;if(kind==='conditioning'){xs=m3Linspace(0,1,36);ys=m3Linspace(-6,-.3,34);zAt=function(a,logE){var e=Math.pow(10,logE),v=[.015,.20,4].map(function(l){return(1-a)*l+a*1.405+e});return Math.log10(Math.max.apply(null,v)/Math.min.apply(null,v))};xName='shrinkage α';yName='log₁₀ ε';zName='log₁₀ condition number';zRange=[0,2.45]}else if(kind==='retention'){xs=m3Linspace(-2,1.2,38);ys=m3Linspace(.05,1.8,34);zAt=function(logL,t){var l=Math.pow(10,logL);return l/(l+t*t)};xName='log₁₀ eigenvalue λ';yName='noise scale τ';zName='λ/(λ+τ²)';zRange=[0,1]}else{xs=m3Linspace(.05,1,38);ys=m3Linspace(.05,1.8,34);zAt=function(b,t){return 1-b*t*t/(.35+t*t)};xName='step size β';yName='noise scale τ';zName='local contraction ρ';zRange=[0,1]}var data=m3SurfaceData(xs,ys,zAt),opt=m3Base(xName,yName,zName,[[xs[0],xs[xs.length-1]],[ys[0],ys[ys.length-1]],zRange],[-43,27]);opt.visualMap={show:true,type:'continuous',dimension:2,min:zRange[0],max:zRange[1],right:4,top:'middle',itemHeight:130,itemWidth:10,textStyle:{fontSize:9},inRange:{color:['#440154','#3b528b','#21918c','#5ec962','#fde725']}};opt.series=[{type:'surface',silent:true,shading:'lambert',wireframe:{show:false},data:data,itemStyle:{opacity:.96}}];return opt}
function matlab3DOption(type){if(typeof echarts==='undefined')return null;switch(type){case'matlab-gmm':return m3GmmOption();case'matlab-pmp':return m3PmpOption();case'matlab-ellipsoid':return m3EllipsoidOption();case'matlab-surface-conditioning':return m3SensitivityOption('conditioning');case'matlab-surface-retention':return m3SensitivityOption('retention');case'matlab-surface-pmp':return m3SensitivityOption('pmp')}return null}
function m3EllipseFromCov(alpha){var sh=[.015,.20,4].map(function(l){return(1-alpha)*l+alpha*1.405+.03}),major=Math.sqrt(Math.max.apply(null,sh))*1.55,minor=Math.sqrt(Math.min.apply(null,sh))*1.55,angle=.58,c=Math.cos(angle),s=Math.sin(angle);return Array.from({length:121},function(_,j){var a=j/120*Math.PI*2,u=major*Math.cos(a),v=minor*Math.sin(a);return[u*c-v*s,u*s+v*c]})}
function matlabPanelOption(type,seed){
  var option3d=isMatlab3DType(type)?matlab3DOption(type):null;if(option3d)return option3d;
  var k=type.replace('matlab-','');
  if(k==='fusion')return matlabFlow(false);
  if(k==='fallback')return matlabFlow(true);
  if(k.indexOf('failure-')===0)return matlabFailure(k.replace('failure-',''));
  if(k.indexOf('surface-')===0){
    var surf=matlabSurface(k.replace('surface-','')),surfaceLines=[];
    for(var row=0;row<=26;row+=3){
      var slice=surf.slice(row*31,(row+1)*31).map(function(p){return[p[0],p[2]]});
      surfaceLines.push({name:'τ'+(row/26*1.75+.05).toFixed(2),type:'line',showSymbol:false,data:slice,lineStyle:{width:2,color:['#443983','#31688e','#21918c','#35b779','#90d743','#fde725'][Math.floor(row/3)%6]}});
    }
    return{animation:false,textStyle:baseText(),tooltip:{trigger:'axis'},grid:commonGrid(),xAxis:axisBase(k==='surface-conditioning'?'收缩系数α':k==='surface-retention'?'标准化特征值':'步长β'),yAxis:axisBase(k==='surface-conditioning'?'log条件数':k==='surface-retention'?'保留率':'收缩因子'),series:surfaceLines};
  }
  if(k==='heat-combined')return{animation:false,textStyle:baseText(),title:[{text:'单尺度遮罩块偏差',left:'25%',top:10,textAlign:'center',textStyle:{fontSize:12}},{text:'多尺度融合缺陷',left:'75%',top:10,textAlign:'center',textStyle:{fontSize:12}}],grid:[{left:45,right:'54%',top:42,bottom:42},{left:'54%',right:54,top:42,bottom:42}],xAxis:[{type:'category',data:[1,2,3,4,5],gridIndex:0},{type:'category',data:[1,2,3,4,5],gridIndex:1}],yAxis:[{type:'category',data:[1,2,3,4],gridIndex:0},{type:'category',data:[1,2,3,4],gridIndex:1}],visualMap:{min:0,max:4.5,right:4,top:'middle',inRange:{color:['#443983','#31688e','#35b779','#fde725']}},series:[{type:'heatmap',xAxisIndex:0,yAxisIndex:0,data:matlabHeatData(false),itemStyle:{borderColor:'#fff',borderWidth:2}},{type:'heatmap',xAxisIndex:1,yAxisIndex:1,data:matlabHeatData(true),itemStyle:{borderColor:'#fff',borderWidth:2}}]};
  if(k.indexOf('heat-')===0)return{animation:false,textStyle:baseText(),grid:{left:75,right:65,top:35,bottom:45},xAxis:{type:'category',data:[1,2,3,4,5],name:'块列'},yAxis:{type:'category',data:[1,2,3,4],name:'块行'},visualMap:{min:0,max:4.5,right:5,top:'middle',inRange:{color:['#443983','#31688e','#35b779','#fde725']}},series:[{type:'heatmap',data:matlabHeatData(k==='heat-multiscale'),itemStyle:{borderColor:'#fff',borderWidth:2}}]};
  if(k==='quality-radar')return{animation:false,textStyle:baseText(),legend:{top:5},radar:{center:['50%','55%'],radius:'67%',indicator:['保持','去除','边界','上下文','幻觉'].map(function(n){return{name:n,max:1}})},series:[{type:'radar',data:[{name:'优质',value:[.92,.89,.86,.91,.93]},{name:'边界问题',value:[.9,.86,.48,.57,.88]},{name:'语义问题',value:[.85,.42,.7,.54,.35]}]}]};
  if(k==='calibration'){
    var vals=[.42,.68,.91,1.17,1.44,1.76,2.08,2.41,2.79,3.22,.51,.73,.98,1.25,1.52,1.88,2.19,2.56,2.96,3.46,.47,.71,1.03,1.31,1.65,1.94,2.32,2.71,3.08,3.81].sort(function(a,b){return a-b});
    var ec=vals.map(function(v,i){return[v,(i+1)/vals.length]});
    return{animation:false,textStyle:baseText(),grid:commonGrid(),xAxis:axisBase('最小Mahalanobis分数'),yAxis:Object.assign(axisBase('经验累积概率'),{min:0,max:1}),series:[{type:'line',step:'end',symbol:'none',data:ec,lineStyle:{width:3,color:'#356aa0'},markLine:{silent:true,symbol:'none',data:[{xAxis:3.46,name:'η'},{yAxis:.95}]}}]};
  }
  if(k==='retention'||k==='softmining'||k==='quality-calibration'){
    var lineSeries=[];
    if(k==='retention')[.25,.7,1.4].forEach(function(t,i){lineSeries.push({name:'τ='+t,type:'line',showSymbol:false,data:Array.from({length:80},function(_,j){var x=Math.pow(10,-2+j/79*3.5);return[x,x/(x+t*t)]}),lineStyle:{width:2.6,color:['#356aa0','#db7a36','#d2a126'][i]},markLine:i?undefined:{silent:true,symbol:'none',label:{show:true,formatter:'50% retention'},lineStyle:{color:'#7c756e',type:'dotted'},data:[{yAxis:.5}]}})});
    else if(k==='softmining')[.3,.7,1.2,2].forEach(function(g,i){lineSeries.push({name:'γ='+g,type:'line',showSymbol:false,data:Array.from({length:80},function(_,j){var x=j/79;return[x,Math.pow(.05+x,g)]}),lineStyle:{width:2.6,color:['#356aa0','#db7a36','#d2a126','#7655a6'][i]}})});
    else lineSeries=[{type:'line',showSymbol:false,data:Array.from({length:100},function(_,i){var x=.4+i/99*7.1;return[x,100*(1-(x-.4)/7.1)]}),lineStyle:{width:3,color:'#7655a6'}}];
    return{animation:false,textStyle:baseText(),legend:{top:k==='softmining'?8:5,left:k==='softmining'?55:'center'},grid:commonGrid(),xAxis:Object.assign(axisBase(k==='retention'?'协方差特征值 λ':k==='softmining'?'历史难度 aᵢ':'图像级偏差Q'),{type:k==='retention'?'log':'value',logBase:10,min:k==='retention'?.01:undefined,max:k==='retention'?Math.pow(10,1.5):undefined}),yAxis:Object.assign(axisBase(k==='quality-calibration'?'质量百分位':k==='retention'?'λ / (λ + τ²)':k==='softmining'?'wᵢ = (δ + aᵢ)ᵞ':'响应'),{min:k==='retention'?0:undefined,max:k==='retention'?1.02:undefined}),series:lineSeries};
  }
  if(k==='covariance'||k==='angular'){
    var geomSeries=[];
    if(k==='covariance')[[0,'α=0'],[.35,'α=.35'],[.80,'α=.80']].forEach(function(e,i){geomSeries.push({name:e[1],type:'line',showSymbol:false,data:m3EllipseFromCov(e[0]),lineStyle:{width:3,color:['#c33f33','#db7a36','#3c9a58'][i],type:['solid','dashed','dotted'][i]}})});
    else{
      [20,145,260].forEach(function(a,i){var q=a*Math.PI/180;geomSeries.push({type:'line',data:[[0,0],[Math.cos(q),Math.sin(q)]],showSymbol:false,lineStyle:{width:4,color:['#356aa0','#db7a36','#3c9a58'][i]}})});
      geomSeries.push({type:'scatter',data:[8,27,132,151,247,268,278].map(function(a){return[Math.cos(a*Math.PI/180),Math.sin(a*Math.PI/180)]}),symbolSize:8});
      geomSeries.push({type:'scatter',data:[82,205,326].map(function(a){return[Math.cos(a*Math.PI/180),Math.sin(a*Math.PI/180)]}),symbol:'x',symbolSize:13,itemStyle:{color:'#c33f33'}});
    }
    return{animation:false,textStyle:baseText(),legend:{top:5},grid:{left:55,right:30,top:45,bottom:45},xAxis:Object.assign(axisBase('特征方向1'),{min:-4,max:4}),yAxis:Object.assign(axisBase('特征方向2'),{min:-3,max:3}),series:geomSeries};
  }
  if(k==='ellipsoid')return chartScatterOption('pca',seed);
  if(k==='gmm'||k==='pmp'){
    var contour=[];
    for(var c=0;c<7;c++)contour.push({type:'line',showSymbol:false,data:Array.from({length:80},function(_,i){var x=-4+i/79*8,y=(c-3)*.45+Math.sin(i/13+c)*.18;return[x,y]}),lineStyle:{color:['#443983','#31688e','#21918c','#35b779','#90d743','#fde725','#db7a36'][c],width:2},areaStyle:c===3?{opacity:.08}:undefined});
    if(k==='pmp')contour.push({name:'PMP路径',type:'line',data:[[3.1,-2.6],[2.4,-1.9],[1.8,-1.2],[1.1,-.55],[.5,-.1],[0,.2]],lineStyle:{width:4,color:'#c33f33'},symbolSize:9});
    return{animation:false,textStyle:baseText(),grid:commonGrid(),xAxis:axisBase('特征z1'),yAxis:axisBase('特征z2'),series:contour};
  }
  return{};
}

var oldGithubOption=githubOption;
githubOption=function(sec,seed){if(sec.githubType&&sec.githubType.indexOf('matlab-')===0)return matlabPanelOption(sec.githubType,seed);return oldGithubOption(sec,seed)};
