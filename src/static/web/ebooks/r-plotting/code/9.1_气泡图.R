library(ggplot2); library(gapminder)
df <- subset(gapminder,year==2007)
ggplot(df,aes(gdpPercap,lifeExp,size=pop,colour=continent))+
  geom_point(alpha=.65)+scale_x_log10()+scale_size_area(max_size=18)+theme_classic()
