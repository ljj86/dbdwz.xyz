library(ggplot2); library(wesanderson)
ggplot(df,aes(group,value,fill=group))+geom_col()+scale_fill_manual(values=wes_palette("Zissou1",8,type="continuous"))
