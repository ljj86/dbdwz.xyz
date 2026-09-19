library(ggplot2)
df <- data.frame(group=LETTERS[1:12],value=c(8,15,11,19,13,22,17,10,20,14,18,24))
ggplot(df,aes(group,value,fill=group))+geom_col(width=.62)+coord_polar(start=-pi/2)+ylim(-4,28)+theme_void()
