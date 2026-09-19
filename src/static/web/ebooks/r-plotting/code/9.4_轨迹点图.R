library(ggplot2); library(grid)
df <- data.frame(time=1:8,x=c(1,2,2.8,4,4.8,6,7.1,8),
                 y=c(2,3.3,2.9,4.5,4.1,5.8,6.4,7.3))
ggplot(df,aes(x,y))+geom_path(arrow=arrow(length=unit(2,"mm")))+
  geom_point(size=3)+geom_text(aes(label=time),nudge_y=.25)+coord_equal()+theme_classic()
