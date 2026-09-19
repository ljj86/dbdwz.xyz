library(GGally)
ggpairs(iris,columns=1:4,aes(colour=Species,alpha=.6))
