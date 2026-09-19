function cfg = setup_portable_paths()
%SETUP_PORTABLE_PATHS Add this portable package to the MATLAB path.
packageDir = fileparts(mfilename('fullpath'));
folders = {
    packageDir
    fullfile(packageDir, 'panels')
    fullfile(packageDir, 'composites')
    fullfile(packageDir, 'helpers')
    };
for i = 1:numel(folders)
    if isfolder(folders{i})
        addpath(folders{i}, '-begin');
    end
end
cfg = nsfc_figure_config();
end
