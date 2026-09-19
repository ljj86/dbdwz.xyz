library(ggplot2)
df <- data.frame(group=paste0("Pathway ",LETTERS[1:10]),
                 value=c(-2.8,2.2,-1.8,3.4,-1.1,2.6,-3.2,1.5,2.9,-2.1))
ggplot(df,aes(value,reorder(group,value),fill=value>0))+geom_col(width=.7)+
  geom_vline(xintercept=0)+scale_fill_manual(values=c("#356AA0","#C33F33"))+
  labs(y=NULL)+guides(fill="none")+theme_classic()
