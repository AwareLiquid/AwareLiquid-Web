# web/ — 官网前端（awareliquid.ai）

本目录是官网的完整前端：静态 HTML/CSS/JS/SVG，由 M1 仓库的推理服务
（`serve/server.py`）作为静态文件挂载服务。**官网改动只提交到这里，不要改 M1 仓库。**

## 页面

| 路径 | 内容 |
|---|---|
| `index.html` | 首页 —— 极简产品落地页（hero + demo + footer），类 claude.ai 风格 |
| `research.html` | 研究页 —— 全部技术细节（优势/机制/实测数据/对比/模型阵容） |
| `demo.html` | 全屏演示页 |
| `api.html` / `about.html` | API 文档 / 关于 |
| `privacy.html` / `terms.html` | 法务页 |
| `llms.txt` / `llms-full.txt` | AI crawler 摘要 |

## 部署

Vultr 服务器：`/root/AwareLiquid-Web/web` bind-mount 到 mtlnn 容器
`/app/serve/static`。更新流程：

```bash
cd /root/AwareLiquid-Web && git pull --ff-only origin main
docker restart mtlnn_prod   # 静态文件是只读 mount，restart 后生效
```

## 设计原则

- 首页不呈现技术细节 —— 细节在 `/research` 按需取用
- 双语文案全部走 i18n 键（`I18N` 对象），不许硬编码
- 改动前读 `index.html` 顶部的设计系统注释（editorial monochrome 风格）
