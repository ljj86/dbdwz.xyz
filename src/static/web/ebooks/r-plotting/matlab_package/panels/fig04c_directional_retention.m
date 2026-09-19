function fig = fig04c_directional_retention(cfg)
%FIG04C_DIRECTIONAL_RETENTION Figure 4(c), Eq. (6).
if nargin < 1 || isempty(cfg)
    cfg = setup_portable_paths();
end

fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.11 0.14 0.80 0.76]);
hold(ax, 'on');
lambda = logspace(-2, 1.5, 240);
taus = [0.25 0.70 1.40];
for i = 1:numel(taus)
    retention = lambda ./ (lambda + taus(i)^2);
    semilogx(ax, lambda, retention, 'LineWidth', 2, ...
        'DisplayName', sprintf('\\tau = %.2f', taus(i)));
end
referenceLine = yline(ax, 0.5, ':', '50% retention', ...
    'LabelHorizontalAlignment', 'left');
referenceLine.HandleVisibility = 'off';
xlabel(ax, 'covariance eigenvalue \lambda');
ylabel(ax, 'retained deviation \lambda/(\lambda+\tau^2)');
title(ax, '(c) Stronger contraction in low-variance directions, Eq. (6)');
ylim(ax, [0 1.02]);
grid(ax, 'on');
legend(ax, 'Location', 'southeast');
apply_axes_style(ax, cfg);
add_figure_note(fig, 'simulation');
end
