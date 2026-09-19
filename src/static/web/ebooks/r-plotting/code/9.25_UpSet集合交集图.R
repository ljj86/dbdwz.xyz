library(ggplot2); library(ComplexUpset)
set.seed(925)
df <- data.frame(A=sample(c(TRUE,FALSE),80,TRUE,c(.55,.45)),
                 B=sample(c(TRUE,FALSE),80,TRUE,c(.48,.52)),
                 C=sample(c(TRUE,FALSE),80,TRUE,c(.42,.58)))
upset(df,c("A","B","C"),name="集合",base_annotations=list(
  "交集大小"=intersection_size(counts=TRUE)))
