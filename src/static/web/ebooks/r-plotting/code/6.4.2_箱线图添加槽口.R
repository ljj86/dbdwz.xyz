library(ggplot2)
ggplot(df,aes(group,value,fill=group))+geom_boxplot(notch=TRUE)
