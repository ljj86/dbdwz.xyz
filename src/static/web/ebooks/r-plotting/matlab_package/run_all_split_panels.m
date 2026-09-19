function summary = run_all_split_panels()
%RUN_ALL_SPLIT_PANELS Generate and export all 20 independent panels.
cfg = setup_portable_paths();
cfg.export_dir = fullfile(cfg.package_dir, 'exports', 'split_panels');
jobs = {
    @fig04a_gmm_probability,              'fig04a_gmm_probability';
    @fig04b_covariance_shrinkage,         'fig04b_covariance_shrinkage';
    @fig04c_directional_retention,        'fig04c_directional_retention';
    @fig04d_pmp_descent,                  'fig04d_pmp_descent';
    @fig06a_spatial_frequency_fusion,     'fig06a_spatial_frequency_fusion';
    @fig06b_angular_compactness,          'fig06b_angular_compactness';
    @fig06c_calibration_threshold,        'fig06c_calibration_threshold';
    @fig06d_mahalanobis_ellipsoids,       'fig06d_mahalanobis_ellipsoids';
    @figS01a_conditioning_sensitivity,    'figS01a_conditioning_sensitivity';
    @figS01b_retention_sensitivity,       'figS01b_retention_sensitivity';
    @figS01c_pmp_contraction,             'figS01c_pmp_contraction';
    @figS01d_soft_mining_response,        'figS01d_soft_mining_response';
    @figS02a_patch_deviation_heatmap,     'figS02a_patch_deviation_heatmap';
    @figS02b_multiscale_defect_heatmap,   'figS02b_multiscale_defect_heatmap';
    @figS02c_five_dimensional_quality,    'figS02c_five_dimensional_quality';
    @figS02d_quality_calibration,         'figS02d_quality_calibration';
    @figS03a_prototype_purity,            'figS03a_prototype_purity';
    @figS03b_effective_coverage,          'figS03b_effective_coverage';
    @figS03c_localization_auroc,           'figS03c_localization_auroc';
    @figS03d_fallback_state_machine,      'figS03d_fallback_state_machine'
    };
summary = run_portable_jobs(cfg, jobs, 'split_panels');
end
