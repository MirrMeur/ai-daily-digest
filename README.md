# AI Daily Digest

每天自动从 90 个顶级技术博客抓取最新文章 + 30中文圈X上爆款文章（关注列表可自定义），通过 Gemini AI 评分筛选，生成结构化的每日精选日报。

通过 GitHub Actions 自动化部署。

## 运行方式

- **自动运行**：每天北京时间 8:00（UTC 0:00）自动触发
- **手动触发**：在 GitHub Actions 页面点击 "Run workflow"

## 日报存放

所有日报保存在 `digests/` 目录下，文件名格式 `digest-YYYYMMDD.md`。

## 配置

在仓库 Settings → Secrets and variables → Actions 中配置：

| Secret | 说明 |
|--------|------|
| `GEMINI_API_KEY` | Gemini API Key（[免费获取](https://aistudio.google.com/apikey)） |
