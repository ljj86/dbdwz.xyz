library(ggplot2)
df <- data.frame(month=1:12, value=c(12,15,14,18,22,21,27,29,26,32,35,38))
ggplot(df,aes(month,value))+geom_line(linewidth=1)+
  geom_point(size=2.5)+theme_classic()
