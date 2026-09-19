library(ggplot2)
ggplot(df,aes(group,value,fill=type))+geom_col(position="fill")+scale_y_continuous(labels=scales::percent)
