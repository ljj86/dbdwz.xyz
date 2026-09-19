library(ggplot2)
df <- data.frame(group=rep(c("A","B","C"),each=2),type=rep(c("对照","处理"),3),value=c(12,18,15,22,17,25))
ggplot(df,aes(group,value,fill=type))+geom_col(position="dodge")
