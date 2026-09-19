function fig = fig06b_angular_compactness(cfg)
%FIG06B_ANGULAR_COMPACTNESS Figure 6(b), angular-margin geometry, Eq. (11).
if nargin < 1 || isempty(cfg), cfg = setup_portable_paths(); end
fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.13 0.14 0.74 0.76]); hold(ax, 'on');
theta = linspace(0, 2*pi, 360);
plot(ax, cos(theta), sin(theta), '-', 'Color', [0.80 0.83 0.87]);
classAngles = deg2rad([20 145 260]);
margin = deg2rad(18);
classColors = [cfg.colors.blue; cfg.colors.orange; cfg.colors.green];
for c = 1:numel(classAngles)
    w = [cos(classAngles(c)); sin(classAngles(c))];
    plot(ax, [0 w(1)], [0 w(2)], '-', 'Color', classColors(c, :), ...
        'LineWidth', 2.3);
    arc = linspace(classAngles(c)-margin, classAngles(c)+margin, 50);
    plot(ax, 0.87*cos(arc), 0.87*sin(arc), '-', ...
        'Color', classColors(c, :), 'LineWidth', 4);
end
knownAngles = [8 27 132 151 247 268 278];
scatter(ax, cosd(knownAngles), sind(knownAngles), 34, ...
    cfg.colors.blue, 'filled', 'MarkerEdgeColor', 'white');
unknownAngles = [82 205 326];
scatter(ax, cosd(unknownAngles), sind(unknownAngles), 45, ...
    cfg.colors.red, 'x', 'LineWidth', 2);
axis(ax, 'equal'); xlim(ax, [-1.15 1.15]); ylim(ax, [-1.15 1.15]);
xlabel(ax, 'normalized feature h_1'); ylabel(ax, 'normalized feature h_2');
title(ax, '(b) Known-class angular compactness, Eq. (11)');
grid(ax, 'on'); apply_axes_style(ax, cfg);
add_figure_note(fig, 'simulation');
end
