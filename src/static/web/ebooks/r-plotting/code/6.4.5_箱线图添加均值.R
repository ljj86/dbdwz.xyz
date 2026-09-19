library(ggplot2)
ggplot(df,aes(group,value,fill=group))+geom_boxplot()+stat_summary(fun=mean,geom="point",shape=23,fill="white")
