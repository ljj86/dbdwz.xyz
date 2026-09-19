library(ggradar)
df <- data.frame(group=c("A","B"),速度=c(.8,.5),稳定性=c(.6,.9),准确度=c(.9,.7),成本=c(.4,.6),易用性=c(.7,.8))
ggradar(df)
