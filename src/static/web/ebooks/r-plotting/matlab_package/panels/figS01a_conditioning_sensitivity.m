function fig = figS01a_conditioning_sensitivity(cfg)
%FIGS01A_CONDITIONING_SENSITIVITY Supplementary Figure S1(a), Eq. (5).
if nargin < 1 || isempty(cfg), cfg = setup_portable_paths(); end
alpha = linspace(0, 1, 48);
epsilon = logspace(-6, -0.3, 44);
[A, E] = meshgrid(alpha, epsilon);
rawEigenvalues = [0.015 0.20 4.0];
meanEigenvalue = mean(rawEigenvalues);
conditionNumber = zeros(size(A));
for i = 1:numel(A)
    shrunk = (1-A(i))*rawEigenvalues + A(i)*meanEigenvalue + E(i);
    conditionNumber(i) = max(shrunk) / min(shrunk);
end
fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.10 0.14 0.78 0.76]);
surf(ax, A, log10(E), log10(conditionNumber), 'EdgeColor', 'none');
colormap(ax, nsfc_colormap(cfg, 'viridis', 256)); colorbar(ax);
view(ax, [-42 27]);
xlabel(ax, 'shrinkage \alpha'); ylabel(ax, 'log_{10} \epsilon');
zlabel(ax, 'log_{10} condition number');
title(ax, '(a) Eq. (5): conditioning improves with shrinkage/ridge');
grid(ax, 'on'); apply_axes_style(ax, cfg);
add_figure_note(fig, 'simulation');
end
