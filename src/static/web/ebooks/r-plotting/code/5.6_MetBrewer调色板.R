library(ggplot2); library(MetBrewer)
ggplot(df,aes(group,value,fill=group))+geom_col()+scale_fill_manual(values=met.brewer("Hiroshige",8))
