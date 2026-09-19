library(ggplot2); library(patchwork)
p1 <- ggplot(mtcars,aes(wt,mpg))+geom_point()
p2 <- ggplot(mtcars,aes(factor(cyl)))+geom_bar()
p1+p2
