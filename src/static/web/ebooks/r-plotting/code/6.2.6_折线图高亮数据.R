library(ggplot2)
ggplot(df,aes(month,value,group=group,colour=group=="B"))+geom_line(linewidth=1)+scale_colour_manual(values=c("grey80","#C33F33"))
