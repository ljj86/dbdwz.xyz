library(ggplot2)
set.seed(42)
df <- data.frame(x=c(rnorm(15,0),rnorm(15,2),rnorm(15,1)), y=c(rnorm(15,0),rnorm(15,1),rnorm(15,2.5)), group=rep(c("G1","G2","G3"),each=15))
ggplot(df,aes(x,y,colour=group))+geom_point(size=3)+theme_classic()
