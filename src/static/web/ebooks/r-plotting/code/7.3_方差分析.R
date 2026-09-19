library(ggplot2); library(multcompView)
df <- PlantGrowth
fit <- aov(weight~group,data=df)
tk <- TukeyHSD(fit)
cld <- multcompLetters4(fit,tk)
label_df <- aggregate(weight~group,df,max)
label_df$label <- cld$group$Letters[as.character(label_df$group)]
ggplot(df,aes(group,weight,fill=group))+geom_boxplot(outlier.shape=NA)+
  geom_jitter(width=.08,alpha=.55)+geom_text(data=label_df,aes(y=weight+.25,label=label),fontface="bold")+
  guides(fill="none")+theme_classic()
