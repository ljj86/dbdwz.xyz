library(ggplot2)
d <- dist(scale(iris[,1:4]))
p <- cmdscale(d,k=2,eig=TRUE,add=TRUE)
score <- data.frame(Axis1=p$points[,1],Axis2=p$points[,2],Species=iris$Species)
ve <- round(100*p$eig[1:2]/sum(p$eig[p$eig>0]),1)
ggplot(score,aes(Axis1,Axis2,colour=Species))+geom_point()+stat_ellipse()+
  labs(x=paste0("PCoA1 (",ve[1],"%)"),y=paste0("PCoA2 (",ve[2],"%)"))+theme_classic()
