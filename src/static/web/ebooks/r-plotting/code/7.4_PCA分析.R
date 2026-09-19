library(ggplot2)
pca <- prcomp(iris[,1:4],scale.=TRUE)
score <- data.frame(pca$x[,1:2],Species=iris$Species)
loading <- data.frame(pca$rotation[,1:2],variable=rownames(pca$rotation))
ve <- round(100*summary(pca)$importance[2,1:2],1)
ggplot(score,aes(PC1,PC2,colour=Species))+geom_point()+stat_ellipse()+
  geom_segment(data=loading,aes(x=0,y=0,xend=PC1*3,yend=PC2*3),
               inherit.aes=FALSE,arrow=arrow(length=unit(2,"mm")))+
  geom_text(data=loading,aes(PC1*3,PC2*3,label=variable),inherit.aes=FALSE)+
  labs(x=paste0("PC1 (",ve[1],"%)"),y=paste0("PC2 (",ve[2],"%)"))+theme_classic()
