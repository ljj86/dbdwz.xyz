library(ggplot2)
df <- data.frame(group=paste0("地区",1:8),before=c(32,41,27,35,46,31,39,29),
                 after=c(45,47,38,42,50,43,44,40))
ggplot(df,aes(y=reorder(group,after)))+geom_segment(aes(x=before,xend=after,yend=group),
  linewidth=2,colour="grey70")+geom_point(aes(x=before),size=3,colour="#356AA0")+
  geom_point(aes(x=after),size=3,colour="#C33F33")+labs(x="数值",y=NULL)+theme_classic()
