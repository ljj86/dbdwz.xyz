library(ggplot2); library(ggExtra)
p <- ggplot(iris,aes(Sepal.Length,Sepal.Width,colour=Species))+geom_point()
ggMarginal(p,type="histogram")
