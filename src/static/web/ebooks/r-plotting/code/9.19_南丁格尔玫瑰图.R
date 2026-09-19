library(ggplot2)
df <- data.frame(month=month.abb,value=c(12,25,18,34,22,39,29,16,36,24,31,42))
ggplot(df,aes(month,sqrt(value),fill=month))+geom_col(width=1,colour="white")+coord_polar(start=-pi/2)+theme_void()
