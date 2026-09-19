library(ggplot2); library(ggpmisc)
ggplot(mtcars,aes(wt,mpg))+geom_point()+geom_smooth(method="lm")+stat_poly_eq(aes(label=after_stat(eq.label)))
