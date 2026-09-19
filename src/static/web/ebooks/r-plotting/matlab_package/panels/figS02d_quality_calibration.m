function fig = figS02d_quality_calibration(cfg)
%FIGS02D_QUALITY_CALIBRATION Supplementary Figure S2(d), Eq. (8) extension E3.
if nargin < 1 || isempty(cfg), cfg = setup_portable_paths(); end
Qcal = linspace(0.4, 7.5, 80) + 0.12*sin(1:80);
Qcal = sort(Qcal);
Qquery = linspace(min(Qcal), max(Qcal), 220);
score = zeros(size(Qquery));
n = numel(Qcal);
for i = 1:numel(Qquery)
    score(i) = 100 * (1 + sum(Qcal >= Qquery(i))) / (n+1);
end
fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.11 0.14 0.80 0.76]);
plot(ax, Qquery, score, 'Color', cfg.colors.purple, 'LineWidth', 2.2);
xlabel(ax, 'image-level deviation Q (larger = worse)');
ylabel(ax, 'calibrated quality percentile S_Q (larger = better)');
title(ax, '(d) Extension E3: monotone calibration of Eq. (8)');
ylim(ax, [0 102]); grid(ax, 'on'); apply_axes_style(ax, cfg);
add_figure_note(fig, 'simulation');
end
