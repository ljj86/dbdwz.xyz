library(ggplot2)
set.seed(18)
df <- data.frame(group=rep(c("A","B","C"),each=30), value=c(rnorm(30,5),rnorm(30,7),rnorm(30,6)))
ggplot(df,aes(group,value,fill=group))+geom_boxplot(width=.55)+
  geom_jitter(width=.1,alpha=.45)+theme_classic()+guides(fill="none")
