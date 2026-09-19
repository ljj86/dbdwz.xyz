function [D, responsibility, logDensity] = ...
    gmm_posterior_mean(Y, weights, means, covariances, tau)
%GMM_POSTERIOR_MEAN Equation (6) for a finite Gaussian mixture.
% Y is D-by-N; means is D-by-K; covariances is D-by-D-by-K.
[d, n] = size(Y);
K = numel(weights);
weights = weights(:);
if size(means, 1) ~= d || size(means, 2) ~= K || ...
        ~isequal(size(covariances), [d d K])
    error('NSFC:DimensionMismatch', 'GMM dimensions do not agree.');
end
if any(weights <= 0)
    error('NSFC:InvalidWeights', 'All GMM weights must be positive.');
end
weights = weights / sum(weights);
logJoint = zeros(K, n);
componentMean = zeros(d, n, K);
for k = 1:K
    Sigma = covariances(:, :, k);
    obsSigma = Sigma + tau^2 * eye(d);
    logJoint(k, :) = log(weights(k)) + ...
        gaussian_logpdf_chol(Y, means(:, k), obsSigma);
    gain = Sigma / obsSigma;
    componentMean(:, :, k) = repmat(means(:, k), 1, n) + ...
        gain * (Y - repmat(means(:, k), 1, n));
end
logDensity = logsumexp_stable(logJoint, 1);
responsibility = exp(logJoint - repmat(logDensity, K, 1));
D = zeros(d, n);
for k = 1:K
    D = D + componentMean(:, :, k) .* repmat(responsibility(k, :), d, 1);
end
end
