library(ggplot2); library(ggpattern)
ggplot(df,aes(group,value,pattern=type))+geom_col_pattern(fill="white",colour="black")
