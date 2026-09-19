function fig = figS02b_multiscale_defect_heatmap(cfg)
%FIGS02B_MULTISCALE_DEFECT_HEATMAP Supplementary Figure S2(b), Eq. (8).
if nargin < 1 || isempty(cfg), cfg = setup_portable_paths(); end
patches = select_patch_sample(read_demo_table(cfg, 'patch_scores.csv'), cfg);
[~, maps] = build_maps(patches);
fine = maps{1};
coarse = maps{min(2, numel(maps))};
if min(size(fine)) < 2 || min(size(coarse)) < 2
    error('SplitPanels:PatchGridTooSmall', ...
        'Fine and coarse maps require at least two rows and two columns.');
end
[xc, yc] = meshgrid(linspace(1, size(fine, 2), size(coarse, 2)), ...
    linspace(1, size(fine, 1), size(coarse, 1)));
[xf, yf] = meshgrid(1:size(fine, 2), 1:size(fine, 1));
coarseUp = interp2(xc, yc, coarse, xf, yf, 'linear');
fused = 0.65*fine + 0.35*coarseUp;
fig = new_figure(cfg, [80 80 900 700]);
ax = axes(fig, 'Position', [0.11 0.14 0.72 0.76]);
imagesc(ax, fused); axis(ax, 'image'); set(ax, 'YDir', 'normal');
colormap(ax, nsfc_colormap(cfg, 'viridis', 256)); colorbar(ax);
xlabel(ax, 'pixel-space proxy column');
ylabel(ax, 'pixel-space proxy row');
title(ax, '(b) Multi-scale upsampled defect heatmap A, Eq. (8)');
apply_axes_style(ax, cfg);
add_figure_note(fig, 'simulation');
end

function T = select_patch_sample(T, cfg)
required = {'sample_id','scale_id','x','y','mask_ratio','nll', ...
    'gamma','posterior_residual2'};
if ~all(ismember(required, T.Properties.VariableNames))
    error('SplitPanels:InvalidPatchTable', ...
        'patch_scores.csv is missing one or more required columns.');
end
sampleIds = unique(string(T.sample_id), 'stable');
if isfield(cfg, 'patch_sample_id') && strlength(string(cfg.patch_sample_id)) > 0
    sampleId = string(cfg.patch_sample_id);
    if ~isscalar(sampleId) || ~ismember(sampleId, sampleIds)
        error('SplitPanels:InvalidPatchSample', ...
            'cfg.patch_sample_id must identify one sample in patch_scores.csv.');
    end
elseif numel(sampleIds) == 1
    sampleId = sampleIds(1);
else
    error('SplitPanels:AmbiguousPatchSample', ...
        'Multiple sample_id values found; set scalar cfg.patch_sample_id.');
end
T = T(string(T.sample_id) == sampleId, :);
end

function [scaleIds, maps] = build_maps(T)
scaleIds = unique(T.scale_id, 'stable');
if isempty(scaleIds), error('SplitPanels:EmptyPatchTable', 'No patch rows found.'); end
maps = cell(numel(scaleIds), 1);
for s = 1:numel(scaleIds)
    S = T(T.scale_id == scaleIds(s), :);
    xs = unique(S.x, 'sorted'); ys = unique(S.y, 'sorted');
    if any(~isfinite([S.x; S.y; S.mask_ratio; S.nll; ...
            S.gamma; S.posterior_residual2]))
        error('SplitPanels:NonfinitePatchData', 'Patch inputs must be finite.');
    end
    pairs = unique([S.x S.y], 'rows');
    if height(S) ~= numel(xs)*numel(ys) || size(pairs, 1) ~= height(S)
        error('SplitPanels:IrregularPatchGrid', ...
            'Every scale must contain one value for each x-y grid location.');
    end
    map = nan(numel(ys), numel(xs));
    for i = 1:height(S)
        xi = find(xs == S.x(i), 1); yi = find(ys == S.y(i), 1);
        map(yi, xi) = S.mask_ratio(i) * ...
            (S.nll(i) + S.gamma(i)*S.posterior_residual2(i));
    end
    maps{s} = map;
end
end
