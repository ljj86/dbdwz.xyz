library(ComplexHeatmap); library(circlize)
set.seed(926)
mat <- matrix(rnorm(120),nrow=12,dimnames=list(paste0("Gene",1:12),paste0("S",1:10)))
mat[1:6,1:5] <- mat[1:6,1:5]+1.4; mat[7:12,6:10] <- mat[7:12,6:10]+1.2
group <- factor(rep(c("对照","处理"),each=5))
Heatmap(t(scale(t(mat))),name="Z-score",top_annotation=HeatmapAnnotation(group=group),
 col=colorRamp2(c(-2,0,2),c("#356AA0","white","#C33F33")))
