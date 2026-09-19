library(ggplot2)
df <- data.frame(group=LETTERS[1:8],value=1)
ggplot(df,aes(group,value,fill=group))+geom_col()+theme_void()
