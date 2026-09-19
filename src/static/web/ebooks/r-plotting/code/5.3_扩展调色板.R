library(ggplot2); library(ggsci)
ggplot(df,aes(group,value,fill=group))+geom_col()+scale_fill_npg()
