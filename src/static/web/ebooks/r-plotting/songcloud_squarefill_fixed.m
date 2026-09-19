clc;
clear;
close all;

%% =========================
%  歌单
%  深蓝背景 - 正方形填满版（无阴影）
%  特点：
%  1. 使用“方形层级”而不是圆形层级，四个角也会被利用
%  2. 每个歌名只测量一次尺寸
%  3. 排版阶段只做数值碰撞检测，速度较快
%  4. 中间更大更鲜艳，越外面越小越柔和
%  5. 全横向、正方形、无标题、无底部说明、无阴影
%% =========================

songs = {
    'Falling You'
    '还是会想你'
    '我怀念的'
    '爱你没差'
    '提瓦特民谣'
    '吹梦到西洲'
    '雨爱'
    '我的好兄弟'
    '快乐的扑满'
    '开心往前飞'
    '红尘情歌'
    '雪Distance'
    '飘向北方'
    '我从草原来'
    '水手'
    '无敌'
    '我是真的爱上你'
    '罗生门2024'
    '纸短情长'
    '爱错'
    '我用什么把你留住'
    '烟火里的尘埃'
    '只对你有感觉'
    '我和你'
    '讨厌红楼梦'
    '黑夜问白天'
    '匿名的好友'
    '梦的翅膀受了伤'
    '童话镇'
    '晨间新闻'
    '晴天'
    '七里香'
    '夜曲'
    '他不懂'
    '奇迹再现'
    '凤凰传奇'
    '一笑倾城'
    '说好的幸福呢'
    '告白气球'
    '有点甜'
    'Always Online'
    '天下'
    '爱李兆明'
    '果宝机甲'
    '超级棒棒糖'
    '奢香夫人'
    '最炫民族风'
    '甲乙丙丁'
    '认真的雪'
    '意外'
    '演员'
    '情歌'
    '像晴天像雨天'
    '万有引力'
    '爱上上海滩'
    '一格格'
    '美人鱼'
    '爱我还是他'
    '找自己'
    'Super Star'
    '晴'
    '永远的奥特曼'
    '留白'
    '带我走'
    '知我'
    '红色高跟鞋'
    'Night Dancer'
    '须尽欢'
    '天龙八部之宿敌'
    '丝路'
    '忘情牛肉面'
};

songs = unique(songs, 'stable');
n = numel(songs);

%% 权重（决定先后和基础大小）
rng(20260810);
weights = 1 + rand(n,1) * 1.4;

mainSongs = {
    '晴天','七里香','夜曲','水手','提瓦特民谣','雪Distance', ...
    '烟火里的尘埃','告白气球','爱错','演员','天下','Night Dancer'
};

for k = 1:numel(mainSongs)
    idx = find(strcmp(songs, mainSongs{k}));
    if ~isempty(idx)
        weights(idx) = weights(idx) + 3.4 + 0.7*rand();
    end
end

[weights, order] = sort(weights, 'descend');
songs = songs(order);

%% 画布
bg = [0.09 0.14 0.25];   % 深蓝背景

fig = figure( ...
    'Color', bg, ...
    'Position', [100 60 1100 1100], ...
    'Renderer', 'opengl');

ax = axes('Parent', fig, 'Position', [0 0 1 1], 'Color', bg);
hold(ax,'on');
axis(ax,[0 1 0 1]);
axis(ax,'off');

cx = 0.5;
cy = 0.5;

%% 每个歌名只测量一次尺寸
measureFontSize = 20;
tmp = gobjects(n,1);

for i = 1:n
    tmp(i) = text(ax, 0.5, 0.5, songs{i}, ...
        'Units','normalized', ...
        'FontSize',measureFontSize, ...
        'FontWeight','bold', ...
        'FontName','Microsoft YaHei', ...
        'HorizontalAlignment','center', ...
        'Visible','off');
end

drawnow limitrate;

baseW = zeros(n,1);
baseH = zeros(n,1);

for i = 1:n
    e = get(tmp(i),'Extent');
    baseW(i) = e(3);
    baseH(i) = e(4);
end
delete(tmp);

%% 基础字号（排名越前越大）
rankT = (0:n-1)' / max(n-1,1);
baseFont = 14.5 + 27 * (1 - rankT).^0.72;

%% 生成覆盖整个正方形的候选点（包含角落）
% 用抖动网格 + 方形层级距离（Chebyshev distance）
gridN = 28;
xv = linspace(0.05, 0.95, gridN);
yv = linspace(0.05, 0.95, gridN);
[X, Y] = meshgrid(xv, yv);

% 加轻微抖动，避免过于死板
dx = (rand(size(X)) - 0.5) * 0.014;
dy = (rand(size(Y)) - 0.5) * 0.014;
X = X + dx;
Y = Y + dy;

candX = X(:);
candY = Y(:);

% 候选点按方形距离定义层级：max(|x-cx|, |y-cy|)
candCheb = max(abs(candX - cx), abs(candY - cy));
candChebNorm = candCheb / 0.45;   % 大致归一化到 0~1
candChebNorm = min(candChebNorm, 1);

% 记录候选点是否已被占用
candUsed = false(numel(candX), 1);

%% 排版参数
edgePad = 0.010;   % 边缘保留很少，方便填满四角
gapX = 0.0023;
gapY = 0.0023;

boxes = zeros(n,4);
posX = nan(n,1);
posY = nan(n,1);
fontSizeFinal = nan(n,1);
distNormFinal = nan(n,1);

placed = 0;

%% 排版：按“方形层级”从中心往外填，四角也会被利用
for i = 1:n

    t = (i - 1) / max(n - 1, 1);

    % 目标层级：按正方形向外扩展，而不是按圆向外扩展
    targetShell = 0.02 + 0.93 * t;

    % 中心更大，外圈更小（方形层级版）
    % 实际字号仍会跟最终位置的 dist 做关联
    ok = false;

    % 先找“接近目标方形层级”的候选点
    prefScore = abs(candChebNorm - targetShell);

    % 加一点角度多样性，避免某一方向堆积
    ang = atan2(candY - cy, candX - cx);
    prefScore = prefScore + 0.010 * sin(7 * ang + 0.3 * i);

    [~, idxOrder] = sort(prefScore, 'ascend');

    for kk = 1:numel(idxOrder)
        c = idxOrder(kk);

        if candUsed(c)
            continue;
        end

        x = candX(c);
        y = candY(c);

        % 用 Chebyshev 距离控制层级，另外混合少量欧氏距离让视觉更自然
        chebD = max(abs(x-cx), abs(y-cy));
        euD = hypot(x-cx, y-cy);

        chebN = min(chebD / 0.45, 1);
        euN = min(euD / 0.64, 1);
        distNorm = 0.75 * chebN + 0.25 * euN;

        centerScale = 1.34 - 0.58 * distNorm;
        fs = baseFont(i) * centerScale;
        fs = max(fs, 9.5);

        scale = fs / measureFontSize;
        w = baseW(i) * scale * 1.01;
        h = baseH(i) * scale * 1.02;

        left   = x - w/2 - gapX;
        right  = x + w/2 + gapX;
        bottom = y - h/2 - gapY;
        top    = y + h/2 + gapY;

        if left < edgePad || right > 1-edgePad || ...
           bottom < edgePad || top > 1-edgePad
            continue;
        end

        overlap = false;
        for j = 1:placed
            b = boxes(j,:);
            if ~(right < b(1) || left > b(3) || top < b(2) || bottom > b(4))
                overlap = true;
                break;
            end
        end

        if overlap
            continue;
        end

        placed = placed + 1;
        boxes(placed,:) = [left bottom right top];
        posX(i) = x;
        posY(i) = y;
        fontSizeFinal(i) = fs;
        distNormFinal(i) = distNorm;
        candUsed(c) = true;
        ok = true;
        break;
    end

    % 兜底：如果严格按层级没放下，就在所有未用点里找任何能放下的位置
    if ~ok
        freeIdx = find(~candUsed);
        for kk = 1:numel(freeIdx)
            c = freeIdx(kk);

            x = candX(c);
            y = candY(c);

            chebD = max(abs(x-cx), abs(y-cy));
            euD = hypot(x-cx, y-cy);
            chebN = min(chebD / 0.45, 1);
            euN = min(euD / 0.64, 1);
            distNorm = 0.75 * chebN + 0.25 * euN;

            centerScale = 1.34 - 0.58 * distNorm;
            fs = max(9.2, baseFont(i) * centerScale * 0.96);

            scale = fs / measureFontSize;
            w = baseW(i) * scale * 1.01;
            h = baseH(i) * scale * 1.02;

            left   = x - w/2 - gapX;
            right  = x + w/2 + gapX;
            bottom = y - h/2 - gapY;
            top    = y + h/2 + gapY;

            if left < edgePad || right > 1-edgePad || ...
               bottom < edgePad || top > 1-edgePad
                continue;
            end

            overlap = false;
            for j = 1:placed
                b = boxes(j,:);
                if ~(right < b(1) || left > b(3) || top < b(2) || bottom > b(4))
                    overlap = true;
                    break;
                end
            end

            if ~overlap
                placed = placed + 1;
                boxes(placed,:) = [left bottom right top];
                posX(i) = x;
                posY(i) = y;
                fontSizeFinal(i) = fs;
                distNormFinal(i) = distNorm;
                candUsed(c) = true;
                ok = true;
                break;
            end
        end
    end

    if ~ok
        fprintf('未成功放置：%s\n', songs{i});
    end
end

%% 绘制（无阴影）
for i = 1:n
    if isnan(posX(i))
        continue;
    end

    d = distNormFinal(i);

    hue = mod(0.04 + 0.115 * i + 0.03 * sin(i), 1.0);

    % 中心高饱和，外圈低饱和
    sat = 0.92 - 0.60 * d;
    sat = max(0.32, min(0.95, sat));

    % 深色背景下保持整体亮度
    val = 0.97 - 0.08 * d;
    val = max(0.83, min(0.99, val));

    rgb = hsv2rgb([hue, sat, val]);

    text(ax, posX(i), posY(i), songs{i}, ...
        'Units','normalized', ...
        'FontSize',fontSizeFinal(i), ...
        'FontWeight','bold', ...
        'FontName','Microsoft YaHei', ...
        'HorizontalAlignment','center', ...
        'VerticalAlignment','middle', ...
        'Color',rgb, ...
        'Clipping','on');
end

drawnow;

%% 导出
exportgraphics(fig, 'songcloud_squarefill.png', 'Resolution', 300);
disp('完成：songcloud_squarefill.png');
