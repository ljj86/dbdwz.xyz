library(ggplot2); library(ggbreak)
ggplot(df,aes(group,value))+geom_col()+scale_y_break(c(25,80))
