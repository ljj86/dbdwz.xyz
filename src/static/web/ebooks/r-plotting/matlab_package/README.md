# 20 个拆分图 MATLAB 可移植代码包

本包把 5 张四面板组合图拆成了 **20 个可独立运行、独立修改、独立导出的 MATLAB 函数**，同时保留 5 个原始组合版脚本。图中数值均为公式机制演示值，不是实验结果。

## 最快使用

在 MATLAB 命令窗口运行：

```matlab
cd(fullfile('path', 'to', 'matlab_package'))
summary = run_all_split_panels();     % 生成 20 张独立图
% summary = run_composite_figures(); % 生成 5 张原组合图
```

导出结果分别进入：

- `exports/split_panels/`
- `exports/composites/`

每张图默认导出 PNG、SVG、PDF、EPS、FIG；Windows 下会额外尝试 EMF。程序会在 `logs/` 保存批处理日志。

## 单独调用某一张

```matlab
cfg = setup_portable_paths();
cfg.visible = 'on';
fig = fig04d_pmp_descent(cfg);
export_figure_all(fig, fullfile(pwd,'my_exports'), 'my_pmp_figure', false);
```

## 目录说明

- `panels/`：20 个拆分后的独立 `.m`。
- `composites/`：5 个原始四面板 `.m`。
- `helpers/`：绘图、公式和导出依赖；复制包时不要漏掉。
- `data/demo/`：可替换的演示 CSV。
- `reference_svg/`：用户指定的 5 张原 SVG，用于视觉对照。
- `MANIFEST.csv`：面板、公式、数据文件和脚本的精确映射。

## 换成自己的数据

保持 CSV 列名不变，替换 `data/demo/` 中对应文件即可。若需改路径，请编辑 `helpers/nsfc_figure_config.m` 的 `cfg.demo_dir`。纯公式面板不依赖 CSV，详见 `MANIFEST.csv`。

## 迁移注意事项

- 已在 MATLAB R2025b 验证；使用 `tiledlayout`、`exportgraphics` 等基础 MATLAB 功能，不要求额外工具箱。
- 请从包根目录调用 `setup_portable_paths()`，它会优先加入本包的 `panels`、`composites` 与 `helpers`。
- 若目标项目中有同名函数，请保持本包路径优先，或按项目命名规范统一重命名。
- SVG 适合 Visio/Adobe Illustrator/Inkscape 后期编辑，FIG 适合 MATLAB 二次调整，EMF 适合 Windows Office/Visio。
