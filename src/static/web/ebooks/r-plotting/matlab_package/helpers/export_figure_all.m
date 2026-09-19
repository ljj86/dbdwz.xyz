function out = export_figure_all(fig, exportDir, baseName, useOptionalExportFig)
%EXPORT_FIGURE_ALL Export mandatory PNG/SVG/PDF/EPS/FIG and optional EMF.
if nargin < 4
    useOptionalExportFig = false;
end
if ~isfolder(exportDir)
    mkdir(exportDir);
end
drawnow;
out = struct('mandatory_files', {{}}, 'optional_files', {{}}, ...
    'warnings', {{}});

pngPath = fullfile(exportDir, [baseName '.png']);
svgPath = fullfile(exportDir, [baseName '.svg']);
pdfPath = fullfile(exportDir, [baseName '.pdf']);
epsPath = fullfile(exportDir, [baseName '.eps']);
figPath = fullfile(exportDir, [baseName '.fig']);

exportgraphics(fig, pngPath, 'Resolution', 300, 'BackgroundColor', 'white');
% Allow MATLAB to rasterize dense 3-D surfaces while retaining vector text
% and line art where practical. This avoids the very slow pure-vector path.
exportgraphics(fig, svgPath, 'ContentType', 'auto', 'BackgroundColor', 'white');
exportgraphics(fig, pdfPath, 'ContentType', 'auto', 'BackgroundColor', 'white');
print(fig, epsPath, '-depsc', '-opengl');
savefig(fig, figPath);
out.mandatory_files = {pngPath, svgPath, pdfPath, epsPath, figPath};

if useOptionalExportFig && exist('export_fig', 'file') == 2
    try
        thirdPartyPreview = fullfile(exportDir, [baseName '_export_fig.png']);
        export_fig(fig, thirdPartyPreview, '-png', '-r300', '-transparent');
        if isfile(thirdPartyPreview)
            out.optional_files{end+1} = thirdPartyPreview;
        end
    catch ME
        out.warnings{end+1} = ['Optional export_fig fallback skipped: ' ME.message];
    end
end

if ispc
    emfPath = fullfile(exportDir, [baseName '.emf']);
    try
        print(fig, emfPath, '-dmeta', '-opengl');
        if isfile(emfPath)
            out.optional_files{end+1} = emfPath;
        else
            out.warnings{end+1} = 'EMF driver returned without creating a file.';
        end
    catch ME
        out.warnings{end+1} = ['EMF export skipped: ' ME.message];
    end
end
end
