library(ggplot2)
ggplot(mtcars,aes(wt,mpg))+geom_point()+geom_smooth(method="lm",se=TRUE,colour="#C33F33")
