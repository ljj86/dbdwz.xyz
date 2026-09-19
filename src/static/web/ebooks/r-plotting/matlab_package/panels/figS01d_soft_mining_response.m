function fig = figS01d_soft_mining_response(cfg)
%FIGS01D_SOFT_MINING_RESPONSE Supplementary Figure S1(d), Eq. (10).
if nargin < 1 || isempty(cfg), cfg = setup_portable_paths(); end
fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.11 0.14 0.80 0.76]); hold(ax, 'on');
difficulty = linspace(0, 1, 220);
gammas = [0.3 0.7 1.2 2.0];
for i = 1:numel(gammas)
    plot(ax, difficulty, (0.05+difficulty).^gammas(i), ...
        'LineWidth', 2, 'DisplayName', sprintf('\\gamma=%.1f', gammas(i)));
end
xlabel(ax, 'historical difficulty a_i');
ylabel(ax, 'weight w_i=(\delta+a_i)^\gamma');
title(ax, '(d) Eq. (10): Soft Mining response');
legend(ax, 'Location', 'northwest'); grid(ax, 'on');
apply_axes_style(ax, cfg);
add_figure_note(fig, 'simulation');
end
