function T = read_demo_table(cfg, fileName)
%READ_DEMO_TABLE Read a documented mechanism-simulation CSV.
path = fullfile(cfg.demo_dir, fileName);
if ~isfile(path)
    error('NSFC:MissingDemoData', 'Demo data file not found: %s', path);
end
T = readtable(path, 'TextType', 'string', 'VariableNamingRule', 'preserve');
end
