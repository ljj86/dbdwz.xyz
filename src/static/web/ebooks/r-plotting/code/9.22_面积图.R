library(ggplot2)
df <- expand.grid(year=2015:2024,group=c("海水养殖","淡水养殖","捕捞"))
df$value <- c(22,24,26,29,31,34,36,38,41,44, 18,19,21,23,25,27,30,32,34,36, 15,16,15,17,18,17,19,20,19,21)
ggplot(df,aes(year,value,fill=group))+geom_area(alpha=.85)+
  scale_x_continuous(breaks=2015:2024)+labs(y="产量",x=NULL)+theme_classic()
