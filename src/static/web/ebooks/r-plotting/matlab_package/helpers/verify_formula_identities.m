function checks = verify_formula_identities()
%VERIFY_FORMULA_IDENTITIES Numerical checks for the implemented formulas.
SigmaHat = [3.0 1.8; 1.8 1.2];
Sigma = shrink_covariance(SigmaHat, 0.25, 1e-7);
assert(all(eig(Sigma) > 0), 'Equation (5) covariance is not positive definite.');

weights = [0.55; 0.45];
means = [-1.1 1.3; 0.2 0.8];
covariances = zeros(2, 2, 2);
covariances(:, :, 1) = [1.2 0.35; 0.35 0.45];
covariances(:, :, 2) = [0.55 -0.18; -0.18 1.0];
Y = [-1.7 -0.2 0.8 2.0; 0.7 -0.5 1.1 0.0];
tau = 0.65;
[D, R] = gmm_posterior_mean(Y, weights, means, covariances, tau);
assert(max(abs(sum(R, 1) - 1)) < 1e-12, ...
    'Equation (6) responsibilities do not sum to one.');

score = zeros(size(Y));
for k = 1:numel(weights)
    obsSigma = covariances(:, :, k) + tau^2 * eye(2);
    centered = Y - repmat(means(:, k), 1, size(Y, 2));
    componentScore = -(obsSigma \ centered);
    score = score + componentScore .* repmat(R(k, :), 2, 1);
end
DfromScore = Y + tau^2 * score;
eq6Error = max(abs(D(:) - DfromScore(:)));
assert(eq6Error < 1e-10, 'Equation (6) Tweedie identity failed.');

lambda = [0.05 0.5 5.0];
beta = 0.7;
rho = 1 - beta * tau^2 ./ (lambda + tau^2);
assert(all(rho >= 0 & rho <= 1), 'Equation (7) contraction is invalid.');

P = [0.80 0.15 0.05; 0.20 0.50 0.30; 0.05 0.10 0.85];
assert(all(normalized_entropy(P, 2) >= 0 & ...
    normalized_entropy(P, 2) <= 1 + 1e-12), ...
    'Equation (9) normalized entropy is outside [0,1].');

nll = [1.0 1.5 2.0];
residual2 = [0.2 0.4 0.8];
gamma = 0.6;
a = nll + gamma * residual2;
mask = [0.2 0.7 1.0];
omega = [1.0 0.8 1.2];
Q = sum(omega .* mask .* a) / (sum(omega .* mask) + eps);
assert(isfinite(Q) && Q > 0, 'Equation (8) aggregation failed.');

difficulty = [0.1 0.4 0.8];
softWeight = (0.05 + difficulty).^0.7;
recon2 = [0.2 0.5 1.2];
A = sum(omega .* softWeight .* recon2) / ...
    (sum(omega .* softWeight) + eps);
assert(isfinite(A) && A > 0, 'Equation (10) normalization failed.');

angles = [0.1 0.7 1.3];
scale = 16;
margin = 0.25;
logits = scale * cos(angles);
logits(1) = scale * cos(angles(1) + margin);
loss = -logits(1) + logsumexp_stable(logits, 2);
assert(isfinite(loss) && loss >= 0, 'Equation (11) loss failed.');

mu = [0; 0];
C = [1.5 0.3; 0.3 0.7];
h = [1.2; -0.2];
distance = (h-mu).' * (C \ (h-mu));
assert(distance >= 0 && isfinite(distance), ...
    'Equation (12) Mahalanobis distance failed.');

checks = struct();
checks.eq5_min_eigenvalue = min(eig(Sigma));
checks.eq6_max_abs_error = eq6Error;
checks.eq7_max_contraction = max(rho);
checks.eq8_demo_score = Q;
checks.eq10_demo_score = A;
checks.eq11_demo_loss = loss;
checks.eq12_demo_distance = distance;
end
