library(ggplot2)
set.seed(7)
df <- data.frame(x=rep(1:10,3), y=c(cumsum(rnorm(10)),cumsum(rnorm(10)),cumsum(rnorm(10))), group=rep(c("处理A","处理B","对照"),each=10))
ggplot(df,aes(x,y))+geom_line()+geom_point()+
  facet_wrap(~group,nrow=1)+theme_classic()
