library(ggplot2)
set.seed(10)
df <- data.frame(value=rnorm(300))
ggplot(df,aes(value))+geom_histogram(bins=18,fill="#356AA0",colour="white")
