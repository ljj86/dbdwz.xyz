library(ggplot2); library(ggridges)
ggplot(lincoln_weather,aes(x=Mean.TemperatureF,y=Month,fill=after_stat(x)))+geom_density_ridges_gradient()
