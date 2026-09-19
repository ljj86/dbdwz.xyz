library(ggplot2)
df <- data.frame(group=c("对照","处理A","处理B","处理C"), value=c(18,27,23,34))
ggplot(df,aes(group,value,fill=group))+geom_col(width=.7)+
  geom_text(aes(label=value),vjust=-.5)+theme_classic()+guides(fill="none")
