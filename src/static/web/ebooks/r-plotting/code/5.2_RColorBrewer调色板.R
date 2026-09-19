library(ggplot2); library(RColorBrewer)
display.brewer.pal(8,"Set2")
ggplot(df,aes(group,value,fill=group))+geom_col()+scale_fill_brewer(palette="Set2")
