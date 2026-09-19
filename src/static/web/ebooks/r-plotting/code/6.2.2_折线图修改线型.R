library(ggplot2)
df <- expand.grid(month=1:10,group=c("A","B","C")); df$value <- cumsum(runif(30))
ggplot(df,aes(month,value,colour=group,linetype=group))+geom_line(linewidth=1)
