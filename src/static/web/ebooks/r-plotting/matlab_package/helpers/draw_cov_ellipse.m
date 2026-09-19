function h = draw_cov_ellipse(ax, mu, Sigma, level, color, lineStyle, lineWidth)
%DRAW_COV_ELLIPSE Draw x' Sigma^{-1} x = level for a 2-D covariance.
if nargin < 4 || isempty(level)
    level = 1;
end
if nargin < 5 || isempty(color)
    color = [0.2 0.4 0.7];
end
if nargin < 6
    lineStyle = '-';
end
if nargin < 7
    lineWidth = 1.5;
end
Sigma = (Sigma + Sigma.') / 2;
[V, D] = eig(Sigma);
d = max(diag(D), 0);
theta = linspace(0, 2*pi, 240);
circle = [cos(theta); sin(theta)];
points = repmat(mu(:), 1, numel(theta)) + ...
    V * diag(sqrt(level * d)) * circle;
h = plot(ax, points(1, :), points(2, :), ...
    'Color', color, 'LineStyle', lineStyle, 'LineWidth', lineWidth);
end
