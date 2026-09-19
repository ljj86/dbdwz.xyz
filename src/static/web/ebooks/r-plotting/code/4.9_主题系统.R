library(ggplot2)
p <- ggplot(mtcars,aes(wt,mpg))+geom_point(colour="#356AA0")
p+theme_classic()
p+theme_minimal()
