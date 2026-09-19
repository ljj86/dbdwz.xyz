function apply_axes_style(ax, cfg)
%APPLY_AXES_STYLE Apply the common publication style to an axes.
set(ax, 'FontName', cfg.font_name, 'FontSize', cfg.font_size, ...
    'LineWidth', 0.9, 'Box', 'off', 'Layer', 'top', ...
    'TickDir', 'out', 'XColor', cfg.colors.dark, ...
    'YColor', cfg.colors.dark, 'ZColor', cfg.colors.dark, ...
    'Color', 'white', 'GridColor', [0.82 0.84 0.87], ...
    'MinorGridColor', [0.90 0.91 0.93]);
if isprop(ax, 'Title') && isgraphics(ax.Title)
    ax.Title.Color = cfg.colors.dark;
end
if isprop(ax, 'XLabel') && isgraphics(ax.XLabel)
    ax.XLabel.Color = cfg.colors.dark;
end
if isprop(ax, 'YLabel') && isgraphics(ax.YLabel)
    ax.YLabel.Color = cfg.colors.dark;
end
if isprop(ax, 'ZLabel') && isgraphics(ax.ZLabel)
    ax.ZLabel.Color = cfg.colors.dark;
end
end
