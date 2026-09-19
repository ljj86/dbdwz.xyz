export function createFeatureTestArticle() {
  return {
    content: '',
    cover: {
      title: '从灵感到发布：一个数字研究工作台的完整实践',
      cover: '/static/logo.png',
      author: '测试员',
      weekDay: '周一',
      time: '20：26',
      date: '20260713',
      summary: '这是一篇用于验证内容编辑器全部能力的测试文章。文章通过九种卡片记录一个研究项目从资料收集、数据整理、公式推导、代码实验到成果发布的全过程。',
      commentsEnabled: true
    },
    cardList: [
      {
        id: 1,
        type: 'text',
        data: {
          content: '# 从问题出发\n\n一个可靠的数字研究工作台，不只是存放文件的仓库。它应该让文字、图像、数据、公式和程序共同讲述同一个故事。\n\n**本次实践目标：** 用一篇正式文章组织不同形式的研究材料，让论述、数据与证据保持一致。\n\n- 资料能够被快速理解\n- 数据能够被清晰比较\n- 过程能够被重复验证\n- 结果能够被方便分享'
        }
      },
      {
        id: 2,
        type: 'image',
        data: {
          imageList: [
            { url: '/static/logo.png', desc: '数字研究工作台标识', x: 38, y: 12, wScale: 0.72, hScale: 0.82, rotation: -3 }
          ],
          gridWidth: 320,
          gridHeight: 190,
          gridOffsetX: 10,
          gridLeftText: '灵感从左侧进入',
          gridRightText: '成果从右侧输出'
        }
      },
      {
        id: 3,
        type: 'table',
        data: {
          title: '一周研究节奏',
          content: '阶段,主要任务,交付物\n周一,确定问题与关键词,研究提纲\n周二,收集并筛选资料,资料清单\n周三,整理数据与公式,分析笔记\n周四,编写和运行代码,实验结果\n周五,复盘并发布文章,完整报告'
        }
      },
      {
        id: 4,
        type: 'video',
        data: {
          url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
          name: '观察记录示例',
          caption: '视频卡片用于保存实验过程、演示步骤或阶段性汇报。'
        }
      },
      {
        id: 5,
        type: 'document',
        data: {
          url: 'data:text/plain;charset=utf-8,%E6%95%B0%E5%AD%97%E7%A0%94%E7%A9%B6%E5%B7%A5%E4%BD%9C%E5%8F%B0%0A%0A%E8%BF%99%E6%98%AF%E4%B8%80%E4%BB%BD%E6%B5%8B%E8%AF%95%E6%96%87%E6%A1%A3%E3%80%82',
          name: '研究计划与方法说明.txt',
          caption: '文档卡片可以承载报告、论文、演示稿和研究笔记。',
          mimeType: 'text/plain'
        }
      },
      {
        id: 6,
        type: 'code',
        data: {
          title: '计算每日任务完成率',
          language: 'javascript',
          code: "const tasks = [true, true, false, true, true]\nconst completed = tasks.filter(Boolean).length\nconst rate = completed / tasks.length * 100\nconsole.log(`本周完成率：${rate}%`)"
        }
      },
      {
        id: 7,
        type: 'formula',
        data: {
          title: '综合研究质量评分',
          latex: 'Q = 0.35D + 0.25R + 0.25V + 0.15S'
        }
      },
      {
        id: 8,
        type: 'website',
        data: {
          url: 'https://developer.mozilla.org/zh-CN/',
          title: 'MDN Web Docs',
          description: '用于查阅 Web 标准、JavaScript、HTML 与 CSS 的权威参考资料。'
        }
      },
      {
        id: 9,
        type: 'file',
        data: {
          url: 'data:text/csv;charset=utf-8,%E9%98%B6%E6%AE%B5%2C%E5%AE%8C%E6%88%90%E7%8E%87%0A%E8%B5%84%E6%96%99%E6%94%B6%E9%9B%86%2C100%25%0A%E6%95%B0%E6%8D%AE%E5%88%86%E6%9E%90%2C80%25%0A%E6%88%90%E6%9E%9C%E5%8F%91%E5%B8%83%2C60%25',
          name: 'research-progress.csv',
          caption: '项目阶段完成率原始数据，可点击下载。'
        }
      },
      {
        id: 10,
        type: 'text',
        data: {
          content: '## 结语\n\n当九类内容被组织在同一篇文章中，资料不再是彼此分散的附件，而会形成一条可以阅读、验证和持续积累的知识链。\n\n这正是数字研究工作台的价值：让复杂过程拥有清晰结构，让阶段成果可以被长期复用。'
        }
      }
    ]
  }
}
