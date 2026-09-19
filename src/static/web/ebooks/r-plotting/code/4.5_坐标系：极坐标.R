library(ggplot2)
df <- data.frame(group=LETTERS[1:8], value=c(8,5,9,6,11,7,4,10))
ggplot(df, aes(group, value, fill=group)) +
  geom_col(width=.82) + coord_polar() + theme_void()
