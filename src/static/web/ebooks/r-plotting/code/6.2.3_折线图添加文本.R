library(ggplot2)
ggplot(df,aes(month,value,colour=group))+geom_line()+geom_text(data=subset(df,month==10),aes(label=group),hjust=0)
