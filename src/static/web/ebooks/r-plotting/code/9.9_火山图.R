library(EnhancedVolcano)
set.seed(909)
res <- data.frame(log2FoldChange=rnorm(800,0,1.25),
                  padj=p.adjust(runif(800)^4,method="BH"))
rownames(res) <- paste0("Gene",seq_len(nrow(res)))
res$padj <- pmax(res$padj,1e-300)
EnhancedVolcano(res,lab=rownames(res),x="log2FoldChange",y="padj",
  pCutoff=.05,FCcutoff=1,pointSize=1.8,labSize=3,drawConnectors=TRUE)
