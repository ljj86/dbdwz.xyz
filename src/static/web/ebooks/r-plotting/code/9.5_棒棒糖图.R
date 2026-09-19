library(ggplot2)
df <- data.frame(group=paste0("Gene",1:10),value=c(18,33,25,41,29,37,22,45,31,27))
ggplot(df,aes(value,reorder(group,value)))+
  geom_segment(aes(x=0,xend=value,yend=reorder(group,value)),colour="#356AA0")+
  geom_point(size=3,colour="#C33F33")+labs(y=NULL)+theme_classic()
