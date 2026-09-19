function fig = figS02c_five_dimensional_quality(cfg)
%FIGS02C_FIVE_DIMENSIONAL_QUALITY Supplementary Figure S2(c), Eq. (2).
if nargin < 1 || isempty(cfg), cfg = setup_portable_paths(); end
quality = read_demo_table(cfg, 'quality_five_dim.csv');
qColumns = {'q_preserve','q_remove','q_boundary','q_context','q_hallucination'};
required = [{'sample_id'} qColumns];
if ~all(ismember(required, quality.Properties.VariableNames))
    error('SplitPanels:InvalidQualityTable', ...
        'quality_five_dim.csv is missing one or more required columns.');
end
if numel(unique(string(quality.sample_id))) ~= height(quality)
    error('SplitPanels:DuplicateQualitySample', ...
        'quality_five_dim.csv must contain one row per sample_id.');
end
Q = zeros(height(quality), numel(qColumns));
for k = 1:numel(qColumns), Q(:, k) = quality.(qColumns{k}); end
if any(~isfinite(Q(:))) || any(Q(:) < 0 | Q(:) > 1)
    error('SplitPanels:InvalidQualityValues', ...
        'Five-dimensional quality values must be finite and in [0,1].');
end
labels = {'preserve','remove','boundary','context','hallucination'};
angles = linspace(0, 2*pi, numel(labels)+1);
fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.10 0.18 0.80 0.70]); hold(ax, 'on');
for ring = [0.25 0.50 0.75 1.00]
    plot(ax, ring*cos(angles), ring*sin(angles), ':', ...
        'Color', [0.78 0.80 0.83], 'HandleVisibility', 'off');
end
for spoke = angles(1:end-1)
    plot(ax, [0 cos(spoke)], [0 sin(spoke)], ':', ...
        'Color', [0.78 0.80 0.83], 'HandleVisibility', 'off');
end
sampleRows = 1:min(3, height(quality));
for r = sampleRows
    values = [Q(r, :) Q(r, 1)];
    plot(ax, values.*cos(angles), values.*sin(angles), '-o', ...
        'LineWidth', 1.8, 'DisplayName', char(quality.sample_id(r)));
end
for k = 1:numel(labels)
    text(ax, 1.13*cos(angles(k)), 1.13*sin(angles(k)), labels{k}, ...
        'HorizontalAlignment', 'center', 'VerticalAlignment', 'middle', ...
        'FontSize', 8.5);
end
axis(ax, 'equal'); xlim(ax, [-1.25 1.25]); ylim(ax, [-1.25 1.25]);
axis(ax, 'off');
title(ax, '(c) Five-dimensional quality evidence q, Eq. (2)');
legend(ax, 'Location', 'southoutside', 'Orientation', 'horizontal');
add_figure_note(fig, 'simulation');
end
