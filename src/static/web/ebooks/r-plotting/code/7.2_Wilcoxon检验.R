library(ggplot2); library(ggpubr)
set.seed(702)
df <- data.frame(group=rep(c("对照","处理"),each=32),
                 value=c(rlnorm(32,1.25,.35),rlnorm(32,1.55,.38)))
ggplot(df,aes(group,value,fill=group))+geom_violin(trim=FALSE,alpha=.45)+
  geom_jitter(width=.08,alpha=.55)+stat_compare_means(method="wilcox.test",label="p.format")+
  guides(fill="none")+theme_classic()
