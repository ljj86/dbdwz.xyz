function Hnorm = normalized_entropy(P, dim)
%NORMALIZED_ENTROPY Entropy divided by the maximum possible entropy.
if nargin < 2
    dim = 2;
end
P = max(P, realmin);
P = P ./ sum(P, dim);
H = -sum(P .* log(P), dim);
nCategory = size(P, dim);
if nCategory <= 1
    Hnorm = zeros(size(H));
else
    Hnorm = H / log(nCategory);
end
end
