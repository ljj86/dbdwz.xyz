function q = empirical_quantile(x, probability)
%EMPIRICAL_QUANTILE Conservative empirical quantile without toolboxes.
if probability < 0 || probability > 1
    error('NSFC:InvalidProbability', 'Probability must be in [0,1].');
end
x = sort(x(isfinite(x)));
if isempty(x)
    error('NSFC:EmptySample', 'Quantile input is empty.');
end
index = max(1, min(numel(x), ceil(probability * numel(x))));
q = x(index);
end
