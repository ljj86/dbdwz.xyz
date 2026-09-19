library(ggplot2); library(ggdist)
set.seed(930)
df <- data.frame(group=rep(c("A","B","C"),each=45),
 value=c(rnorm(45,4.7,.75),rnorm(45,5.6,.85),rnorm(45,6.4,.95)))
ggplot(df,aes(group,value,fill=group))+
  stat_halfeye(adjust=.7,width=.65,justification=-.25,point_colour=NA,alpha=.55)+
  geom_boxplot(width=.14,outlier.shape=NA,alpha=.7)+
  geom_point(position=position_jitter(width=.07),alpha=.35,size=1.4)+
  guides(fill="none")+theme_classic()
