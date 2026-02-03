# PDF Master - 免费在线 PDF 工具箱

一个专业、美观、功能完整的在线 PDF 处理工具，参考 iLovePDF/Smallpdf 的设计风格。所有操作都在浏览器本地完成，100% 保护您的隐私。

![PDF Master](screenshot.png)

## ✨ 特性

- 🎨 **专业设计** - 参考 iLovePDF/Smallpdf 的现代化界面
- 🔒 **隐私安全** - 所有文件处理都在浏览器本地完成，不上传服务器
- ⚡ **极速处理** - 利用 WebAssembly 技术，本地快速处理 PDF
- 🆓 **完全免费** - 无文件数量或大小限制
- 📱 **跨平台** - 支持桌面和移动设备，无需安装软件

## 🛠️ 功能

| 工具 | 描述 |
|------|------|
| 📎 **合并 PDF** | 将多个 PDF 文件合并为一个文件 |
| ✂️ **拆分 PDF** | 按页码范围提取页面 |
| 🗜️ **压缩 PDF** | 优化 PDF 文件大小 |
| 🔄 **旋转 PDF** | 旋转页面方向 90° / 180° / 270° |
| 🗑️ **删除页面** | 删除 PDF 中的指定页面 |
| 📤 **提取页面** | 将指定页面保存为新文件 |

## 🚀 技术栈

- **pdf-lib** - PDF 创建和修改
- **PDF.js** - PDF 渲染和预览
- **原生 JavaScript** - 无框架依赖
- **CSS3** - 现代化样式和动画

## 📦 使用方法

### 在线使用

直接访问: `https://kanshaowz.github.io/pdfmaster`

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/kanshaowz/pdfmaster.git

# 进入目录
cd pdfmaster

# 用浏览器打开 index.html
open index.html
```

### 部署到 GitHub Pages

```bash
# 推送到 main 分支
git add .
git commit -m "Update PDF Master"
git push origin main

# 在 GitHub 仓库设置中启用 GitHub Pages
```

## 🏗️ 项目结构

```
pdfmaster/
├── index.html      # 主页面（单页应用）
└── README.md       # 项目说明
```

## 🔧 核心功能实现

### 合并 PDF
```javascript
const mergedPdf = await PDFDocument.create();
for (const file of files) {
    const pdf = await PDFDocument.load(await file.arrayBuffer());
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(page => mergedPdf.addPage(page));
}
const pdfBytes = await mergedPdf.save();
```

### 拆分 PDF
```javascript
const newPdf = await PDFDocument.create();
const pageIndices = Array.from({length: toPage - fromPage + 1}, (_, i) => fromPage - 1 + i);
const pages = await newPdf.copyPages(pdf, pageIndices);
pages.forEach(page => newPdf.addPage(page));
```

### 旋转 PDF
```javascript
const pages = pdf.getPages();
pages.forEach(page => {
    page.setRotation({ angle: rotation });
});
```

## 🎨 设计亮点

1. **工具网格布局** - 类似 iLovePDF 首页的卡片式布局
2. **大图标+简洁描述** - 直观展示每个工具的功能
3. **拖拽上传区域** - 优化的大面积拖拽区域，支持视觉反馈
4. **步骤流程可视化** - 清晰的上传→处理→下载流程指示器
5. **文件预览功能** - 使用 PDF.js 实现页面预览和缩略图
6. **专业红色主题** - 采用 #e31b23 主色调，配合渐变效果
7. **处理进度动画** - 平滑的进度条和加载动画
8. **页面网格选择** - 可视化页面缩略图，支持多选

## 📝 浏览器支持

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 📄 许可

MIT License - 自由使用和修改

## 🙏 致谢

- [pdf-lib](https://pdf-lib.js.org/) - PDF 操作库
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF 渲染库
- [Font Awesome](https://fontawesome.com/) - 图标库

---

Made with ❤️ by kanshaowz
