library(ggplot2)
df <- data.frame(group=c("A","B","C","D"),mean=c(5.2,7.1,6.4,8.2),se=c(.5,.7,.4,.6))
ggplot(df,aes(group,mean))+geom_point(size=3)+geom_errorbar(aes(ymin=mean-se,ymax=mean+se),width=.15)
