library(ggplot2); library(ggpubr)
set.seed(701)
df <- data.frame(group=rep(c("对照","处理"),each=30),
                 value=c(rnorm(30,5,.9),rnorm(30,6.1,.9)))
ggplot(df,aes(group,value,fill=group))+geom_boxplot(width=.5,outlier.shape=NA)+
  geom_jitter(width=.1,alpha=.55)+stat_compare_means(method="t.test",label="p.format")+
  guides(fill="none")+theme_classic()
