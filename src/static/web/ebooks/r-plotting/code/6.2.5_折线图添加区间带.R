library(ggplot2)
df <- data.frame(x=1:20,mean=sin((1:20)/3),se=.15+.02*(1:20))
ggplot(df,aes(x,mean))+geom_ribbon(aes(ymin=mean-se,ymax=mean+se),alpha=.2)+geom_line()
