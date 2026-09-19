library(ggplot2)
set.seed(12)
df <- data.frame(x=1:40); df$y <- 1.4*df$x + rnorm(40,0,7)
ggplot(df,aes(x,y))+geom_point(colour="#356AA0")+
  geom_smooth(method="lm",se=TRUE,colour="#C33F33")+theme_classic()
