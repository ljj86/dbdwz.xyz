library(ggplot2)
set.seed(2)
df <- data.frame(x=rnorm(45),y=rnorm(45),group=rep(c("A","B","C"),each=15))
ggplot(df,aes(x,y,colour=group,shape=group))+geom_point(size=3)
