function add_figure_note(fig, kind)
%ADD_FIGURE_NOTE Label conceptual or simulated content explicitly.
if nargin < 2
    kind = 'simulation';
end
switch lower(kind)
    case 'concept'
        msg = ['CONCEPTUAL SCHEMATIC BASED ON PROPOSAL FORMULAS - ' ...
            'NO PERFORMANCE CLAIM'];
        color = [0.30 0.34 0.38];
    otherwise
        msg = ['MECHANISM SIMULATION - DEMONSTRATION VALUES ONLY - ' ...
            'NOT EXPERIMENTAL RESULTS'];
        color = [0.72 0.18 0.14];
end
annotation(fig, 'textbox', [0.01 0.003 0.98 0.026], ...
    'String', msg, 'Interpreter', 'none', ...
    'HorizontalAlignment', 'center', 'VerticalAlignment', 'middle', ...
    'EdgeColor', 'none', 'Color', color, ...
    'FontName', 'Arial', 'FontSize', 8.5, 'FontWeight', 'bold');
end
