library(ggplot2); library(ggrepel)
set.seed(4)
df <- data.frame(x=rnorm(30),y=rnorm(30),name=paste0("S",1:30))
ggplot(df,aes(x,y))+geom_point()+geom_text_repel(data=subset(df,y>1),aes(label=name))
