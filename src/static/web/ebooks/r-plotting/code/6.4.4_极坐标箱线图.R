library(ggplot2)
set.seed(644)
df <- data.frame(
  group=factor(rep(month.abb[1:6], each=35), levels=month.abb[1:6]),
  value=unlist(lapply(1:6, function(i) rnorm(35, 5+i*.7, .75)))
)
ggplot(df,aes(group,value,fill=group))+geom_boxplot(width=.62,outlier.alpha=.35)+
  coord_polar()+theme_minimal()+guides(fill="none")
