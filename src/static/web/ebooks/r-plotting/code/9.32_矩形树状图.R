library(ggplot2); library(treemapify)
df <- data.frame(parent=c("转录组","转录组","蛋白组","蛋白组","代谢组","表型"),
 group=c("差异基因","通路富集","定量蛋白","互作网络","差异代谢物","形态指标"),
 value=c(23,17,18,10,20,12))
ggplot(df,aes(area=value,fill=parent,subgroup=parent,label=group))+geom_treemap()+
  geom_treemap_subgroup_border(colour="white",linewidth=3)+geom_treemap_text(reflow=TRUE)+theme_void()
