function fig = fig04a_gmm_probability(cfg)
%FIG04A_GMM_PROBABILITY Figure 4(a), context-conditioned GMM density.
if nargin < 1 || isempty(cfg)
    cfg = setup_portable_paths();
end

T = select_gmm_scale(read_demo_table(cfg, 'gmm_components.csv'), cfg);
x = linspace(-4, 4, 76);
y = linspace(-3.5, 3.5, 68);
[X, Y] = meshgrid(x, y);
ZA = mixture_density(T, "A", X, Y);
ZB = mixture_density(T, "B", X, Y);

fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.10 0.14 0.82 0.76]);
hold(ax, 'on');
surf(ax, X, Y, ZA, 'EdgeColor', 'none');
surf(ax, X, Y, ZB, 'EdgeColor', cfg.colors.orange, ...
    'FaceColor', 'none', 'LineStyle', ':', 'LineWidth', 0.45);
colormap(ax, nsfc_colormap(cfg, 'viridis', 256));
view(ax, [-43 29]);
xlim(ax, [-4 4]);
ylim(ax, [-3.5 3.5]);
xlabel(ax, 'feature z_1');
ylabel(ax, 'feature z_2');
zlabel(ax, 'p_l(z|c)');
title(ax, '(a) 3-D context-conditioned GMM probability, Eq. (4)');
grid(ax, 'on');
apply_axes_style(ax, cfg);
add_figure_note(fig, 'simulation');
end

function T = select_gmm_scale(T, cfg)
required = {'context_id','scale_id','component_id','weight', ...
    'mu1','mu2','sigma11','sigma12','sigma22'};
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

function Z = mixture_density(T, contextName, X, Y)
[weights, means, covariances] = context_parameters(T, contextName);
points = [X(:).'; Y(:).'];
z = zeros(1, size(points, 2));
for k = 1:numel(weights)
    z = z + weights(k) * exp(gaussian_logpdf_chol( ...
        points, means(:, k), covariances(:, :, k)));
end
Z = reshape(z, size(X));
end

function [weights, means, covariances] = context_parameters(T, contextName)
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
end
