library(ggplot2)
df <- data.frame(x=1:12,y=c(2,4,3,6,5,8,7,10,9,11,10,12),group=rep(c("A","B"),6))
ggplot(df,aes(x,y,colour=group))+geom_point(size=3)+theme(legend.position="top")
