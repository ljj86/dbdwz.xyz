function fig = figS01b_retention_sensitivity(cfg)
%FIGS01B_RETENTION_SENSITIVITY Supplementary Figure S1(b), Eq. (6).
if nargin < 1 || isempty(cfg), cfg = setup_portable_paths(); end
lambda = logspace(-2, 1.2, 54);
tau = linspace(0.05, 1.8, 48);
[L, Tau] = meshgrid(lambda, tau);
retention = L ./ (L + Tau.^2);
fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.10 0.14 0.78 0.76]);
surf(ax, log10(L), Tau, retention, 'EdgeColor', 'none');
colormap(ax, nsfc_colormap(cfg, 'viridis', 256)); colorbar(ax);
view(ax, [-43 27]);
xlabel(ax, 'log_{10} covariance eigenvalue \lambda');
ylabel(ax, 'noise scale \tau'); zlabel(ax, '\lambda/(\lambda+\tau^2)');
title(ax, '(b) Eq. (6): direction-dependent retained deviation');
grid(ax, 'on'); apply_axes_style(ax, cfg);
add_figure_note(fig, 'simulation');
end
