library(ggplot2); library(ggbump)
rank <- data.frame(year=rep(2021:2025,each=5),
 group=rep(LETTERS[1:5],5),rank=c(1,2,3,4,5, 2,1,4,3,5, 2,3,1,5,4, 3,2,1,4,5, 2,4,1,3,5))
ggplot(rank,aes(year,rank,colour=group,group=group))+geom_bump(linewidth=1.4)+
  geom_point(size=3)+scale_y_reverse(breaks=1:5)+theme_classic()
