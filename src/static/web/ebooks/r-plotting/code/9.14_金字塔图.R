library(ggplot2)
df <- data.frame(age=rep(c("0–9","10–19","20–29","30–39","40–49","50–59","60–69","70+"),2),
 sex=rep(c("男","女"),each=8),value=c(8,9,12,14,13,10,7,4, 7,8,11,13,14,11,8,6))
df$value[df$sex=="男"] <- -df$value[df$sex=="男"]
ggplot(df,aes(value,factor(age,levels=unique(age)),fill=sex))+geom_col()+
  scale_x_continuous(labels=abs)+labs(x="比例（%）",y="年龄")+theme_classic()
