library(ggplot2)
df <- data.frame(angle=seq(0,330,30),value=c(4,6,5,8,7,9,6,5,8,7,6,9))
ggplot(df,aes(angle,value))+geom_point(size=3)+coord_polar()
