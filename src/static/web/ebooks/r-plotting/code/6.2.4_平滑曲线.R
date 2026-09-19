library(ggplot2)
ggplot(economics,aes(date,unemploy))+geom_line(alpha=.35)+geom_smooth(se=FALSE,span=.2)
