function fig = fig04d_pmp_descent(cfg)
%FIG04D_PMP_DESCENT Figure 4(d), posterior mean/PMP path in Eqs. (6)-(7).
if nargin < 1 || isempty(cfg)
    cfg = setup_portable_paths();
end

T = select_gmm_scale(read_demo_table(cfg, 'gmm_components.csv'), cfg);
[weights, means, covariances, tau, beta] = context_parameters(T, "A");
x = linspace(-4, 4, 76);
y = linspace(-3.5, 3.5, 68);
[X, Y] = meshgrid(x, y);
Z = mixture_density(weights, means, covariances, X, Y);
energy = -log(max(Z, realmin));
energy = min(energy, empirical_quantile(energy(:), 0.97));

x0 = [3.1; -2.6];
[singleStep, ~] = gmm_posterior_mean(x0, weights, means, covariances, tau);
path = zeros(2, 9);
path(:, 1) = x0;
for t = 1:8
    posterior = gmm_posterior_mean(path(:, t), ...
        weights, means, covariances, tau);
    path(:, t+1) = (1-beta) * path(:, t) + beta * posterior;
end
z0 = interp2(X, Y, energy, x0(1), x0(2), 'linear');
zSingle = interp2(X, Y, energy, singleStep(1), singleStep(2), 'linear');
zPath = interp2(X, Y, energy, path(1, :), path(2, :), 'linear');
zMeans = interp2(X, Y, energy, means(1, :), means(2, :), 'linear');

fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.10 0.14 0.82 0.76]);
hold(ax, 'on');
surf(ax, X, Y, energy, 'EdgeColor', 'none', 'HandleVisibility', 'off');
colormap(ax, nsfc_colormap(cfg, 'viridis', 256));
plot3(ax, x0(1), x0(2), z0, 'kx', 'MarkerSize', 10, 'LineWidth', 2, ...
    'DisplayName', 'observation');
plot3(ax, singleStep(1), singleStep(2), zSingle, 'o', ...
    'Color', cfg.colors.orange, 'MarkerFaceColor', cfg.colors.orange, ...
    'DisplayName', 'single posterior mean');
plot3(ax, path(1, :), path(2, :), zPath, '-o', ...
    'Color', cfg.colors.purple, 'MarkerFaceColor', 'white', ...
    'LineWidth', 1.8, 'DisplayName', 'multi-step PMP, Eq. (7)');
plot3(ax, means(1, :), means(2, :), zMeans, 'p', 'MarkerSize', 12, ...
    'Color', cfg.colors.green, 'MarkerFaceColor', cfg.colors.green, ...
    'DisplayName', 'component means');
xlim(ax, [-4 4]);
ylim(ax, [-3.5 3.5]);
xlabel(ax, 'feature z_1');
ylabel(ax, 'feature z_2');
zlabel(ax, '-log p_l(z|c)');
title(ax, '(d) 3-D posterior mean/PMP descent, Eqs. (6)-(7)');
view(ax, [-38 28]);
legend(ax, 'Location', 'southwest');
grid(ax, 'on');
apply_axes_style(ax, cfg);
add_figure_note(fig, 'simulation');
end

function T = select_gmm_scale(T, cfg)
required = {'context_id','scale_id','component_id','weight', ...
    'mu1','mu2','sigma11','sigma12','sigma22','tau','beta'};
if ~all(ismember(required, T.Properties.VariableNames))
    error('SplitPanels:InvalidGMMTable', ...
        'gmm_components.csv is missing one or more required columns.');
end
scaleIds = unique(T.scale_id, 'stable');
if isfield(cfg, 'gmm_scale_id') && ~isempty(cfg.gmm_scale_id)
    scaleId = cfg.gmm_scale_id;
    if ~isscalar(scaleId) || ~ismember(scaleId, scaleIds)
        error('SplitPanels:InvalidGMMScale', ...
            'cfg.gmm_scale_id must identify one scale in gmm_components.csv.');
    end
elseif numel(scaleIds) == 1
    scaleId = scaleIds(1);
else
    error('SplitPanels:AmbiguousGMMScale', ...
        'Multiple scale_id values found; set scalar cfg.gmm_scale_id.');
end
T = T(T.scale_id == scaleId, :);
end

function Z = mixture_density(weights, means, covariances, X, Y)
points = [X(:).'; Y(:).'];
z = zeros(1, size(points, 2));
for k = 1:numel(weights)
    z = z + weights(k) * exp(gaussian_logpdf_chol( ...
        points, means(:, k), covariances(:, :, k)));
end
Z = reshape(z, size(X));
end

function [weights, means, covariances, tau, beta] = ...
    context_parameters(T, contextName)
rows = string(T.context_id) == string(contextName);
S = sortrows(T(rows, :), 'component_id');
if isempty(S)
    error('SplitPanels:MissingGMMContext', ...
        'No GMM components found for context %s.', string(contextName));
end
if numel(unique(S.component_id)) ~= height(S)
    error('SplitPanels:DuplicateGMMComponent', ...
        'Context %s contains duplicate component_id values.', string(contextName));
end
weights = S.weight.';
if any(~isfinite(weights) | weights <= 0) || abs(sum(weights) - 1) > 1e-6
    error('SplitPanels:InvalidGMMWeights', ...
        'Context %s weights must be positive and sum to one.', string(contextName));
end
means = [S.mu1.'; S.mu2.'];
K = height(S);
covariances = zeros(2, 2, K);
for k = 1:K
    covariances(:, :, k) = [S.sigma11(k) S.sigma12(k); ...
        S.sigma12(k) S.sigma22(k)];
end
tauValues = unique(S.tau);
betaValues = unique(S.beta);
if numel(tauValues) ~= 1 || ~isfinite(tauValues) || tauValues <= 0
    error('SplitPanels:InvalidTau', ...
        'Selected context/scale must define one positive tau value.');
end
if numel(betaValues) ~= 1 || ~isfinite(betaValues) || ...
        betaValues <= 0 || betaValues > 1
    error('SplitPanels:InvalidBeta', ...
        'Selected context/scale must define one beta value in (0,1].');
end
tau = tauValues(1);
beta = betaValues(1);
end
