function h = draw_arrow(ax, p1, p2, color, lineWidth)
%DRAW_ARROW Draw an arrow between two points in axes coordinates.
if nargin < 4 || isempty(color)
    color = [0.25 0.28 0.31];
end
if nargin < 5
    lineWidth = 1.3;
end
d = p2 - p1;
h = quiver(ax, p1(1), p1(2), d(1), d(2), 0, ...
    'Color', color, 'LineWidth', lineWidth, ...
    'MaxHeadSize', 0.35, 'AutoScale', 'off');
end
