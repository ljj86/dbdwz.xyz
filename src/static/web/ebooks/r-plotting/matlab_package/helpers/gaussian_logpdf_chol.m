function logp = gaussian_logpdf_chol(X, mu, Sigma)
%GAUSSIAN_LOGPDF_CHOL Stable multivariate Gaussian log-density.
% X is D-by-N, mu is D-by-1, and Sigma is D-by-D.
mu = mu(:);
[d, n] = size(X);
if numel(mu) ~= d || ~isequal(size(Sigma), [d d])
    error('NSFC:DimensionMismatch', 'Gaussian input dimensions do not agree.');
end
Sigma = (Sigma + Sigma.') / 2;
jitter = 0;
for attempt = 1:8
    [L, flag] = chol(Sigma + jitter * eye(d), 'lower');
    if flag == 0
        break;
    end
    jitter = max(1e-12, 10^(attempt - 12));
end
if flag ~= 0
    error('NSFC:NonPositiveCovariance', 'Covariance is not positive definite.');
end
Z = L \ (X - repmat(mu, 1, n));
logDet = 2 * sum(log(diag(L)));
logp = -0.5 * (d * log(2*pi) + logDet + sum(Z.^2, 1));
end
