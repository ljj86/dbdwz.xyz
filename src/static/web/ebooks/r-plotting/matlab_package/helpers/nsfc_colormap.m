function cmap = nsfc_colormap(cfg, mapName, n)
%NSFC_COLORMAP Prefer an optional third-party cm.m, otherwise use MATLAB.
if nargin < 3
    n = 256;
end
cmap = [];
if isfield(cfg, 'optional') && cfg.optional.cm_available
    try
        cmap = cm(mapName, n);
    catch
        try
            cmap = cm(mapName);
        catch
            cmap = [];
        end
    end
end
if isempty(cmap) || size(cmap,2) ~= 3
    switch lower(mapName)
        case {'viridis','parula'}
            cmap = parula(n);
        case {'gray','greys'}
            cmap = gray(n);
        otherwise
            cmap = turbo(n);
    end
end
if size(cmap,1) ~= n
    old = linspace(0,1,size(cmap,1));
    target = linspace(0,1,n);
    cmap = interp1(old, cmap, target, 'linear');
end
cmap = min(max(cmap, 0), 1);
end
