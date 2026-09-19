library(ggplot2); library(ggforce)
ggplot(mtcars,aes(wt,mpg))+geom_point()+facet_zoom(x=wt>3 & wt<4,y=mpg>15 & mpg<25)
