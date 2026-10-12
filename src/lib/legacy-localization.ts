// Exact values from the former UI, used only to migrate stored defaults.
// These strings are never offered as a language or rendered as UI copy.
export const LEGACY_DEFAULT_RULE_NAMES: Record<string, string> = {
  'chrome-management-default': 'Chrome 与扩展页面',
  'github-default': 'GitHub 工作流',
  'docs-default': '文档与知识库',
  'ai-default': 'AI 助手',
  'design-default': '设计工具',
  'notes-default': '笔记与知识管理',
  'mail-default': '邮箱与日程',
  'video-default': '视频与流媒体',
  'assets-default': '图片与静态资源',
  'local-dev-default': '本地开发服务',
}

export const LEGACY_DOCS_PATTERN = '(docs|documentation|文档|指南|guide|manual|reference)'

export const LEGACY_AI_GROUPING_PROMPT = [
  '按用户意图对标签页进行分组，而不仅仅按域名。',
  '用{{language}}返回分组名称和说明。',
  '当多个标签页服务于同一个任务或项目时，即使来自不同工具或域名也应归为一组。',
  '对于开发工作，将本地/开发页面、GitHub Issue 或 PR、部署仪表盘、日志、监控、API 文档、产品需求、设计稿和相关聊天视为同一工作流（当它们明显关联同一功能、Bug、发布或产品时）。',
  '优先使用基于项目、产品、功能、工作流或意图的实用分组名；其次使用类别名如 Code、Research、Design、AI、Docs、Social、Shopping、Travel 或 Finance。',
  '独立的页面保持未分组，除非它明显属于另一个标签页的上下文。',
  '使用简洁的分组名，使其在 Chrome 标签分组中一目了然。',
].join('\n')
