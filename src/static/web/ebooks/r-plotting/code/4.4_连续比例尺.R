library(ggplot2)
df <- expand.grid(x=1:12, y=1:8)
df$value <- with(df, sin(x/2)+cos(y/2))
ggplot(df, aes(x, y, fill=value)) +
  geom_tile() +
  scale_fill_gradient2(low="#356AA0", mid="white", high="#C33F33") +
  theme_minimal()
