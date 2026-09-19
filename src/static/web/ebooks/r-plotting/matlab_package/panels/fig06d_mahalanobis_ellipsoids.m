function fig = fig06d_mahalanobis_ellipsoids(cfg)
%FIG06D_MAHALANOBIS_ELLIPSOIDS Figure 6(d), Eq. (12).
if nargin < 1 || isempty(cfg), cfg = setup_portable_paths(); end
cal = read_demo_table(cfg, 'calibration_scores.csv');
features = read_demo_table(cfg, 'openset_features.csv');
alphaValues = unique(cal.target_alpha);
knownScores = cal.min_mahalanobis(cal.is_known == 1);
if numel(alphaValues) ~= 1 || ~isfinite(alphaValues) || ...
        alphaValues <= 0 || alphaValues >= 1 || isempty(knownScores)
    error('SplitPanels:InvalidCalibrationData', ...
        'A unique target_alpha in (0,1) and known scores are required.');
end
eta = empirical_quantile(knownScores, 1-alphaValues(1));
classIds = unique(features.class_id(features.is_known == 1), 'stable');
if isempty(classIds), error('SplitPanels:NoKnownClasses', 'No known classes found.'); end
classColors = lines(numel(classIds));
fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.08 0.14 0.84 0.76]); hold(ax, 'on');
[sphereX, sphereY, sphereZ] = sphere(24);
spherePoints = [sphereX(:).'; sphereY(:).'; sphereZ(:).'];
for i = 1:numel(classIds)
    rows = features.class_id == classIds(i) & features.is_known == 1;
    H = [features.f001(rows).'; features.f002(rows).'; features.f003(rows).'];
    if size(H, 2) < 2 || any(~isfinite(H), 'all')
        error('SplitPanels:InvalidClassFeatures', ...
            'Each known class requires at least two finite feature vectors.');
    end
    mu = mean(H, 2);
    centered = H - mu;
    SigmaHat = (centered * centered.') / (size(H, 2)-1);
    Sigma = shrink_covariance(SigmaHat, 0.28, 0.03);
    [V, D] = eig(Sigma);
    boundary = repmat(mu, 1, size(spherePoints, 2)) + ...
        V * diag(sqrt(eta * max(diag(D), 0))) * spherePoints;
    surf(ax, reshape(boundary(1, :), size(sphereX)), ...
        reshape(boundary(2, :), size(sphereY)), ...
        reshape(boundary(3, :), size(sphereZ)), ...
        'FaceColor', 'none', 'EdgeColor', classColors(i, :), ...
        'HandleVisibility', 'off');
    scatter3(ax, H(1, :), H(2, :), H(3, :), 28, classColors(i, :), ...
        'filled', 'MarkerEdgeColor', 'white', ...
        'DisplayName', sprintf('known class %g', classIds(i)));
end
unknownRows = features.is_known == 0;
if any(unknownRows)
    scatter3(ax, features.f001(unknownRows), features.f002(unknownRows), ...
        features.f003(unknownRows), 75, cfg.colors.red, 'x', ...
        'LineWidth', 2.2, 'DisplayName', 'unknown / rejected');
end
xlabel(ax, 'h_1'); ylabel(ax, 'h_2'); zlabel(ax, 'h_3');
title(ax, '(d) 3-D class-conditional Mahalanobis ellipsoids, Eq. (12)');
view(ax, [-42 24]); grid(ax, 'on'); axis(ax, 'vis3d');
legend(ax, 'Location', 'northeast'); apply_axes_style(ax, cfg);
add_figure_note(fig, 'simulation');
end
