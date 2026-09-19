library(ggplot2)
set.seed(3)
df <- data.frame(x=rnorm(55),y=rnorm(55),value=runif(55))
ggplot(df,aes(x,y,colour=value,size=value))+geom_point()+scale_colour_viridis_c()
