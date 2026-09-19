function summary = run_portable_jobs(cfg, jobs, groupName)
%RUN_PORTABLE_JOBS Shared batch runner for composite and split-panel figures.
if nargin < 3
    groupName = 'figure';
end
if ~isfolder(cfg.export_dir)
    mkdir(cfg.export_dir);
end
if ~isfolder(cfg.log_dir)
    mkdir(cfg.log_dir);
end

startedAt = datetime('now');
stamp = char(datetime(startedAt, 'Format', 'yyyyMMdd_HHmmss'));
logPath = fullfile(cfg.log_dir, sprintf('%s_run_%s.log', groupName, stamp));
diary(logPath);
diaryCleanup = onCleanup(@() diary('off')); %#ok<NASGU>

fprintf('Portable MATLAB figure run: %s\n', groupName);
fprintf('Started: %s\nMATLAB: %s\nPackage: %s\nExports: %s\n\n', ...
    char(startedAt), version, cfg.package_dir, cfg.export_dir);
checks = verify_formula_identities();
fprintf('Formula checks passed; Eq. (6) maximum identity error = %.3e\n\n', ...
    checks.eq6_max_abs_error);

n = size(jobs, 1);
names = strings(n, 1);
mandatory = zeros(n, 1);
optional = zeros(n, 1);
for i = 1:n
    names(i) = string(jobs{i, 2});
    fprintf('[%d/%d] %s\n', i, n, names(i));
    fig = jobs{i, 1}(cfg);
    cleanupFig = onCleanup(@() close_if_valid(fig));
    out = export_figure_all(fig, cfg.export_dir, char(names(i)), ...
        cfg.use_optional_export_fig);
    mandatory(i) = numel(out.mandatory_files);
    optional(i) = numel(out.optional_files);
    for j = 1:numel(out.warnings)
        fprintf('  warning: %s\n', out.warnings{j});
    end
    clear cleanupFig;
end

summary = table(names, mandatory, optional, ...
    'VariableNames', {'name','mandatory_count','optional_count'});
if sum(mandatory) ~= 5*n
    error('PortableFigures:MissingExports', ...
        'Expected %d mandatory files but found %d.', 5*n, sum(mandatory));
end
fprintf('\nCompleted %d figures; mandatory=%d optional=%d\nLog: %s\n', ...
    n, sum(mandatory), sum(optional), logPath);
end

function close_if_valid(fig)
if ~isempty(fig) && isgraphics(fig)
    close(fig);
end
end
