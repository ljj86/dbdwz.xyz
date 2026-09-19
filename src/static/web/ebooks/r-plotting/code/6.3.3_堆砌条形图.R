library(ggplot2)
ggplot(df,aes(group,value,fill=type))+geom_col()
