library(ggplot2); library(scico)
ggplot(faithfuld,aes(waiting,eruptions,fill=density))+geom_raster()+scale_fill_scico(palette="batlow")
