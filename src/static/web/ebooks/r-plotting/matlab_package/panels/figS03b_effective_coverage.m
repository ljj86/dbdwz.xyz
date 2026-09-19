function fig = figS03b_effective_coverage(cfg)
%FIGS03B_EFFECTIVE_COVERAGE Effective coverage versus mask area.
if nargin < 1 || isempty(cfg), cfg = setup_portable_paths(); end
T = read_demo_table(cfg, 'failure_curves.csv');
fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.11 0.14 0.80 0.76]); hold(ax, 'on');
methods = unique(T.method, 'stable'); colors = lines(numel(methods));
for m = 1:numel(methods)
    rows = T.method == methods(m);
    [maskRatio, order] = sort(T.mask_ratio(rows)); values = T.coverage(rows);
    plot(ax, 100*maskRatio, values(order), '-o', 'Color', colors(m,:), ...
        'MarkerFaceColor', 'white', 'LineWidth', 1.8, ...
        'DisplayName', char(methods(m)));
end
boundaryLine = xline(ax, 60, '--', 'proposal fallback boundary', ...
    'Color', cfg.colors.red, 'LineWidth', 1.5);
boundaryLine.HandleVisibility = 'off';
xlabel(ax, 'mask area (% of image)'); ylabel(ax, 'effective coverage');
title(ax, '(b) Effective coverage versus mask area');
xlim(ax, [0 80]); ylim(ax, [0 1.03]); grid(ax, 'on');
legend(ax, 'Location', 'southwest'); apply_axes_style(ax, cfg);
add_figure_note(fig, 'simulation');
end
