library(vegan); library(ggplot2)
set.seed(706)
fit <- metaMDS(iris[,1:4],distance="bray",trymax=100,trace=FALSE)
score <- data.frame(scores(fit,display="sites"),Species=iris$Species)
ggplot(score,aes(NMDS1,NMDS2,colour=Species))+geom_point()+stat_ellipse()+
  labs(subtitle=sprintf("Stress = %.3f",fit$stress))+theme_classic()
stressplot(fit)
