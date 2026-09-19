library(ggplot2); library(ggbeeswarm)
ggplot(df,aes(group,value,colour=group))+geom_quasirandom(width=.25)
