function fig = fig06c_calibration_threshold(cfg)
%FIG06C_CALIBRATION_THRESHOLD Figure 6(c), independent calibration.
if nargin < 1 || isempty(cfg), cfg = setup_portable_paths(); end
cal = read_demo_table(cfg, 'calibration_scores.csv');
required = {'is_known','min_mahalanobis','target_alpha'};
if ~all(ismember(required, cal.Properties.VariableNames))
    error('SplitPanels:InvalidCalibrationTable', ...
        'calibration_scores.csv is missing required columns.');
end
knownScores = cal.min_mahalanobis(cal.is_known == 1);
alphaValues = unique(cal.target_alpha);
if isempty(knownScores) || any(~isfinite(knownScores))
    error('SplitPanels:InvalidKnownScores', 'Known calibration scores are required.');
end
if numel(alphaValues) ~= 1 || ~isfinite(alphaValues) || ...
        alphaValues <= 0 || alphaValues >= 1
    error('SplitPanels:InvalidTargetAlpha', ...
        'target_alpha must be one unique value in (0,1).');
end
targetAlpha = alphaValues(1);
eta = empirical_quantile(knownScores, 1-targetAlpha);
knownSorted = sort(knownScores);
knownCdf = (1:numel(knownSorted)) / numel(knownSorted);
fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.11 0.14 0.80 0.76]); hold(ax, 'on');
stairs(ax, knownSorted, knownCdf, 'Color', cfg.colors.blue, ...
    'LineWidth', 2, 'DisplayName', 'known calibration ECDF');
thresholdLine = xline(ax, eta, '--', sprintf('\\eta = %.2f', eta), ...
    'Color', cfg.colors.red, 'LineWidth', 1.8, ...
    'LabelVerticalAlignment', 'bottom');
thresholdLine.HandleVisibility = 'off';
targetLine = yline(ax, 1-targetAlpha, ':', ...
    sprintf('1-\\alpha = %.2f', 1-targetAlpha));
targetLine.HandleVisibility = 'off';
xlabel(ax, 'minimum Mahalanobis score');
ylabel(ax, 'empirical cumulative probability');
title(ax, '(c) Independent calibration threshold');
xlim(ax, [0 max(cal.min_mahalanobis)*1.05]); ylim(ax, [0 1.02]);
grid(ax, 'on'); legend(ax, 'Location', 'southeast'); apply_axes_style(ax, cfg);
add_figure_note(fig, 'simulation');
end
