# dbdwz.xyz

这是一个记录学习、科研、开发与创造过程的个人数字空间。这里汇集项目作品、科研绘图、链接推荐、技术实践与成长记录。

## 公开范围

本仓库公开网站通用代码、科研绘图电子书和链接推荐功能。以下内容仅保存在私有部署环境中，不进入公开 Git 历史：

- 组会资料、成员上传文件、个人资料和数据库数据；
- 私有电子教程正文、截图和视频；
- 服务器环境变量、数据库密码、JWT 密钥、安卓签名证书及证书密码。

公开仓库中的界面代码可能保留私有模块的入口或加载逻辑，但不包含这些模块的实际内容与生产数据。

网站与安卓 APP 的全部页面均要求登录。科研绘图和私有电子教程资源由服务器鉴权；安卓包只包含应用界面，通过腾讯云后端读取数据，不内置私有教程文件。

科研绘图位于 `src/static/web/ebooks/r-plotting/`。`static/web` 只进入网站构建，uni-app 构建安卓资源时会自动忽略，因此不会增大 APK。

## 本地运行

```bash
npm install
npm run dev:h5
```

后端配置请从 `deploy/server.env.example` 复制到 `server/.env`。数据库账号、数据库密码、数据库名和不少于 32 位的 JWT 密钥均为必填项。项目不会自动创建任何用户；管理员必须通过显式环境变量创建：

```bash
ADMIN_USERNAME=your_admin ADMIN_PASSWORD=your_strong_password npm --prefix server run admin:create
```

更多内容见 `docs/DEPLOYMENT.md` 和 `docs/ANDROID.md`。公开 ZIP 请使用 `git archive` 生成，不要直接压缩工作目录。
