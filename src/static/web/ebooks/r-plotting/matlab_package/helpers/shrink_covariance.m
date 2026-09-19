function SigmaTilde = shrink_covariance(SigmaHat, alpha, epsilon)
%SHRINK_COVARIANCE Equation (5): isotropic shrinkage plus ridge.
if nargin < 3
    epsilon = 1e-6;
end
if alpha < 0 || alpha > 1 || epsilon <= 0
    error('NSFC:InvalidShrinkage', 'Require 0 <= alpha <= 1 and epsilon > 0.');
end
d = size(SigmaHat, 1);
if size(SigmaHat, 2) ~= d
    error('NSFC:InvalidCovariance', 'Covariance must be square.');
end
SigmaHat = (SigmaHat + SigmaHat.') / 2;
SigmaTilde = (1-alpha) * SigmaHat + ...
    alpha * trace(SigmaHat) / d * eye(d) + epsilon * eye(d);
SigmaTilde = (SigmaTilde + SigmaTilde.') / 2;
end
