function value = logsumexp_stable(A, dim)
%LOGSUMEXP_STABLE Numerically stable log(sum(exp(A),dim)).
if nargin < 2
    dim = 1;
end
m = max(A, [], dim);
shifted = A - m;
value = m + log(sum(exp(shifted), dim));
end
