library(ggplot2)
set.seed(42)
df <- data.frame(x=rnorm(45), y=rnorm(45), group=rep(c("A","B","C"), each=15))
ggplot(df, aes(x, y, colour=group)) +
  geom_point(size=3) + theme_classic()
