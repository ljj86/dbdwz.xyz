library(ggplot2)
df <- data.frame(year=2018:2025, value=c(18,21,25,23,31,38,35,44))
ggplot(df, aes(year,value)) + geom_line() + geom_point() +
  annotate("text", x=2025, y=44, label="峰值 44", hjust=1) +
  theme_classic()
