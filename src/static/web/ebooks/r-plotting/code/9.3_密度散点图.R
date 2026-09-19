library(ggplot2); library(ggpointdensity)
set.seed(903)
df <- diamonds[sample(nrow(diamonds),5000),]
ggplot(df,aes(carat,price))+geom_pointdensity(size=.8)+
  scale_color_viridis_c(name="局部密度")+theme_classic()
