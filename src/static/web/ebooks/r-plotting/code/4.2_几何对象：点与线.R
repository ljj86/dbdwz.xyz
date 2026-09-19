library(ggplot2)

df <- data.frame(x=1:12, y=c(2,3,2.8,4,4.4,5.2,5,6.3,6.8,7.1,8,8.7))
ggplot(df, aes(x, y)) +
  geom_point(size=3, colour="#356AA0") +
  theme_classic()
