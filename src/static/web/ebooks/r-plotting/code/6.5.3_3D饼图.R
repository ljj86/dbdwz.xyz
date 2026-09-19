library(plotrix)
value <- c(38,24,20,18)
labels <- c("A","B","C","D")
pie3D(value, labels=labels, explode=.05, height=.12,
      col=c("#356AA0","#DB7A36","#3C9A58","#C33F33"))
