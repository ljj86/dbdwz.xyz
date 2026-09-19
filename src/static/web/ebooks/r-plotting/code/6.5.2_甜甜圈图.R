library(ggplot2)
df <- data.frame(group=c("A","B","C","D"), value=c(38,24,20,18))
ggplot(df,aes(x=2,y=value,fill=group))+geom_col(width=1)+
  coord_polar(theta="y")+xlim(.5,2.5)+theme_void()
