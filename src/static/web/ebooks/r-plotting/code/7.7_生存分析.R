library(survival); library(ggsurvfit)
lung2 <- transform(lung,sex=factor(sex,labels=c("Male","Female")))
fit <- survfit2(Surv(time,status)~sex,data=lung2)
fit |> ggsurvfit() + add_confidence_interval() + add_censor_mark() +
  add_risktable() + labs(x="随访时间（天）",y="生存概率")
