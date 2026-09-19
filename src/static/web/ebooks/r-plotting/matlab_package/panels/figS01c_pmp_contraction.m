function fig = figS01c_pmp_contraction(cfg)
%FIGS01C_PMP_CONTRACTION Supplementary Figure S1(c), Eq. (7) extension E1.
if nargin < 1 || isempty(cfg), cfg = setup_portable_paths(); end
beta = linspace(0.05, 1, 50);
tau = linspace(0.05, 1.8, 48);
[B, Tau] = meshgrid(beta, tau);
lambdaFixed = 0.35;
rho = 1 - B .* Tau.^2 ./ (lambdaFixed + Tau.^2);
fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.10 0.14 0.78 0.76]);
surf(ax, B, Tau, rho, 'EdgeColor', 'none');
colormap(ax, nsfc_colormap(cfg, 'viridis', 256)); colorbar(ax);
view(ax, [-43 27]);
xlabel(ax, 'step size \beta'); ylabel(ax, 'noise scale \tau');
zlabel(ax, 'local contraction \rho');
title(ax, '(c) Extension E1 from Eq. (7): PMP contraction');
grid(ax, 'on'); apply_axes_style(ax, cfg);
add_figure_note(fig, 'simulation');
end
