function fig = fig04b_covariance_shrinkage(cfg)
%FIG04B_COVARIANCE_SHRINKAGE Figure 4(b), Eq. (5).
if nargin < 1 || isempty(cfg)
    cfg = setup_portable_paths();
end

fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.11 0.14 0.80 0.76]);
hold(ax, 'on');
SigmaHat = [3.0 1.75; 1.75 1.15];
alphas = [0 0.35 0.80];
styles = {'-', '--', ':'};
colors = [cfg.colors.red; cfg.colors.orange; cfg.colors.green];
for i = 1:numel(alphas)
    Sigma = shrink_covariance(SigmaHat, alphas(i), 0.02);
    ellipseHandle = draw_cov_ellipse(ax, [0; 0], Sigma, 4.0, ...
        colors(i, :), styles{i}, 2.0);
    ellipseHandle.HandleVisibility = 'off';
    plot(ax, nan, nan, styles{i}, 'Color', colors(i, :), ...
        'LineWidth', 2, 'DisplayName', sprintf('\\alpha = %.2f', alphas(i)));
end
axis(ax, 'equal');
xlim(ax, [-4 4]);
ylim(ax, [-3 3]);
xlabel(ax, 'feature direction 1');
ylabel(ax, 'feature direction 2');
title(ax, '(b) Covariance shrinkage stabilizes anisotropy, Eq. (5)');
legend(ax, 'Location', 'northeast');
grid(ax, 'on');
apply_axes_style(ax, cfg);
add_figure_note(fig, 'simulation');
end
