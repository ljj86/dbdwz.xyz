library(ggplot2)
set.seed(10)
df <- data.frame(group=rep(c("A","B","C"),each=25),value=c(rnorm(25,5),rnorm(25,7),rnorm(25,6)))
ggplot(df,aes(group,value,colour=group))+geom_jitter(width=.15)
