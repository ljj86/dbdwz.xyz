library(ggplot2)
set.seed(21)
df <- data.frame(group=rep(c("A","B","C"),each=80), value=c(rnorm(80,5,1),rnorm(80,7,.8),rnorm(80,6,1.3)))
ggplot(df,aes(group,value,fill=group))+geom_violin(trim=FALSE)+
  stat_summary(fun=median,geom="point",colour="white")+theme_classic()
