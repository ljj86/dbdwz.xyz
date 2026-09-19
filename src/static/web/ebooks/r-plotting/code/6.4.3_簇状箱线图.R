library(ggplot2)
ggplot(df,aes(group,value,fill=treatment))+geom_boxplot(position=position_dodge(.8))
