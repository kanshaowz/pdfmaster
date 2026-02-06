        // PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const { PDFDocument } = PDFLib;

        // Tool configurations
        const tools = {
            merge: {
                icon: 'fa-object-group',
                title: '合并 PDF',
                desc: '将多个 PDF 文件合并为一个文件',
                multiple: true,
                options: []
            },
            split: {
                icon: 'fa-cut',
                title: '拆分 PDF',
                desc: '按页码范围提取页面',
                multiple: false,
                options: [
                    { type: 'number', id: 'fromPage', label: '起始页', value: 1, min: 1 },
                    { type: 'number', id: 'toPage', label: '结束页', value: 1, min: 1 }
                ]
            },
            compress: {
                icon: 'fa-compress-alt',
                title: '压缩 PDF',
                desc: '优化 PDF 文件大小',
                multiple: false,
                options: []
            },
            rotate: {
                icon: 'fa-sync-alt',
                title: '旋转 PDF',
                desc: '旋转页面方向',
                multiple: false,
                options: [
                    { type: 'select', id: 'rotation', label: '旋转角度', options: [
                        { value: 90, label: '顺时针 90°' },
                        { value: 180, label: '180°' },
                        { value: 270, label: '逆时针 90°' }
                    ]}
                ]
            },
            delete: {
                icon: 'fa-trash-alt',
                title: '删除页面',
                desc: '删除 PDF 中的指定页面',
                multiple: false,
                options: [],
                showPagesGrid: true
            },
            extract: {
                icon: 'fa-file-export',
                title: '提取页面',
                desc: '将指定页面保存为新文件',
                multiple: false,
                options: [],
                showPagesGrid: true
            }
        };

        // State
        let currentTool = null;
        let uploadedFiles = [];
        let currentPdfDoc = null;
        let currentPageNum = 1;
        let totalPages = 0;
        let selectedPages = new Set();
        let resultBlob = null;
        let resultFileName = '';

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            setupDragDrop();
            setupFileInput();
        });

        // Tool selection
        function selectTool(toolId) {
            currentTool = toolId;
            
            // Update UI
            document.querySelectorAll('.tool-card').forEach(card => {
                card.classList.remove('active');
            });
            document.querySelector(`[data-tool="${toolId}"]`).classList.add('active');

            // Show workspace
            const workspace = document.getElementById('workspace');
            const tool = tools[toolId];
            
            document.getElementById('workspace-icon').className = `fas ${tool.icon}`;
            document.getElementById('workspace-title').textContent = tool.title;
            document.getElementById('workspace-desc').textContent = tool.desc;
            
            workspace.classList.add('active');
            workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Reset state
            resetToolState();
            
            // Setup options
            setupOptions(tool);
            
            // Setup file input
            const fileInput = document.getElementById('fileInput');
            fileInput.multiple = tool.multiple;
            fileInput.value = '';
        }

        function closeWorkspace() {
            document.getElementById('workspace').classList.remove('active');
            document.querySelectorAll('.tool-card').forEach(card => {
                card.classList.remove('active');
            });
            currentTool = null;
            resetToolState();
        }

        function showHome() {
            closeWorkspace();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function scrollToTools() {
            document.getElementById('tools').scrollIntoView({ behavior: 'smooth' });
        }

        function setupOptions(tool) {
            const optionsGrid = document.getElementById('optionsGrid');
            optionsGrid.innerHTML = '';
            
            if (tool.options && tool.options.length > 0) {
                document.getElementById('optionsSection').classList.remove('hidden');
                
                tool.options.forEach(opt => {
                    const group = document.createElement('div');
                    group.className = 'option-group';
                    
                    const label = document.createElement('label');
                    label.className = 'option-label';
                    label.textContent = opt.label;
                    
                    let input;
                    if (opt.type === 'select') {
                        input = document.createElement('select');
                        input.className = 'option-input';
                        opt.options.forEach(o => {
                            const option = document.createElement('option');
                            option.value = o.value;
                            option.textContent = o.label;
                            input.appendChild(option);
                        });
                    } else {
                        input = document.createElement('input');
                        input.type = opt.type;
                        input.className = 'option-input';
                        input.value = opt.value;
                        if (opt.min !== undefined) input.min = opt.min;
                    }
                    
                    input.id = opt.id;
                    
                    group.appendChild(label);
                    group.appendChild(input);
                    optionsGrid.appendChild(group);
                });
            } else {
                document.getElementById('optionsSection').classList.add('hidden');
            }
        }

        // Drag & Drop
        function setupDragDrop() {
            const dropZone = document.getElementById('dropZone');
            
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });
            
            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.add('dragover');
                });
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.remove('dragover');
                });
            });
            
            dropZone.addEventListener('drop', handleDrop);
            dropZone.addEventListener('click', () => {
                document.getElementById('fileInput').click();
            });
        }

        function setupFileInput() {
            const fileInput = document.getElementById('fileInput');
            fileInput.addEventListener('change', handleFileSelect);
        }

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
        }

        function handleFileSelect(e) {
            const files = e.target.files;
            handleFiles(files);
        }

        async function handleFiles(files) {
            if (!currentTool) return;
            
            const tool = tools[currentTool];
            const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');
            
            if (pdfFiles.length === 0) {
                showToast('请选择 PDF 文件', 'error');
                return;
            }
            
            if (!tool.multiple && pdfFiles.length > 1) {
                showToast('此工具仅支持单个文件', 'warning');
            }
            
            const filesToAdd = tool.multiple ? pdfFiles : [pdfFiles[0]];
            uploadedFiles = filesToAdd;
            
            // Show file list
            updateFileList();
            
            // Load PDF for preview
            if (uploadedFiles.length > 0) {
                await loadPdfForPreview(uploadedFiles[0]);
            }
            
            // Update UI
            document.getElementById('uploadSection').classList.add('hidden');
            document.getElementById('fileListSection').classList.remove('hidden');
            document.getElementById('previewSection').classList.remove('hidden');
            
            if (tool.showPagesGrid) {
                document.getElementById('pagesGridSection').classList.remove('hidden');
                await renderPagesGrid();
            }
            
            updateStep(1);
            document.getElementById('processBtn').disabled = false;
            
            showToast(`已加载 ${uploadedFiles.length} 个文件`, 'success');
        }

        function updateFileList() {
            const fileList = document.getElementById('fileList');
            const fileCount = document.getElementById('fileCount');
            
            fileCount.textContent = `${uploadedFiles.length} 个文件`;
            
            fileList.innerHTML = uploadedFiles.map((file, index) => `
                <div class="file-item">
                    <div class="file-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">
                            <span>${(file.size / 1024).toFixed(1)} KB</span>
                            <span>${new Date(file.lastModified).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="file-actions">
                        ${tools[currentTool].multiple ? `
                            <button class="file-btn ${index === 0 ? '' : ''}" onclick="moveFile(${index}, -1)" ${index === 0 ? 'disabled' : ''}>
                                <i class="fas fa-arrow-up"></i>
                            </button>
                            <button class="file-btn" onclick="moveFile(${index}, 1)" ${index === uploadedFiles.length - 1 ? 'disabled' : ''}>
                                <i class="fas fa-arrow-down"></i>
                            </button>
                        ` : ''}
                        <button class="file-btn remove" onclick="removeFile(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        function moveFile(index, direction) {
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= uploadedFiles.length) return;
            
            const temp = uploadedFiles[index];
            uploadedFiles[index] = uploadedFiles[newIndex];
            uploadedFiles[newIndex] = temp;
            
            updateFileList();
        }

        function removeFile(index) {
            uploadedFiles.splice(index, 1);
            
            if (uploadedFiles.length === 0) {
                resetTool();
            } else {
                updateFileList();
                loadPdfForPreview(uploadedFiles[0]);
            }
        }

        function addMoreFiles() {
            document.getElementById('fileInput').click();
        }

        // PDF Preview
        async function loadPdfForPreview(file) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                currentPdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                totalPages = currentPdfDoc.numPages;
                currentPageNum = 1;
                
                updatePageCounter();
                await renderPage(currentPageNum);
                
                // Update split options
                if (currentTool === 'split') {
                    document.getElementById('toPage').value = totalPages;
                    document.getElementById('toPage').max = totalPages;
                }
            } catch (error) {
                showToast('无法加载 PDF 文件', 'error');
                console.error(error);
            }
        }

        async function renderPage(pageNum) {
            if (!currentPdfDoc) return;
            
            try {
                const page = await currentPdfDoc.getPage(pageNum);
                const canvas = document.getElementById('previewCanvas');
                const ctx = canvas.getContext('2d');
                
                const viewport = page.getViewport({ scale: 1.5 });
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                await page.render({
                    canvasContext: ctx,
                    viewport: viewport
                }).promise;
                
                updatePageNav();
            } catch (error) {
                console.error('Error rendering page:', error);
            }
        }

        function prevPage() {
            if (currentPageNum > 1) {
                currentPageNum--;
                renderPage(currentPageNum);
                updatePageCounter();
            }
        }

        function nextPage() {
            if (currentPageNum < totalPages) {
                currentPageNum++;
                renderPage(currentPageNum);
                updatePageCounter();
            }
        }

        function updatePageCounter() {
            document.getElementById('pageCounter').textContent = `${currentPageNum} / ${totalPages}`;
        }

        function updatePageNav() {
            document.getElementById('prevPage').disabled = currentPageNum <= 1;
            document.getElementById('nextPage').disabled = currentPageNum >= totalPages;
        }

        // Pages Grid for delete/extract
        async function renderPagesGrid() {
            const grid = document.getElementById('pagesGrid');
            grid.innerHTML = '';
            
            if (!currentPdfDoc) return;
            
            for (let i = 1; i <= totalPages; i++) {
                const thumbnail = document.createElement('div');
                thumbnail.className = 'page-thumbnail';
                thumbnail.dataset.page = i;
                thumbnail.onclick = () => togglePageSelection(i);
                
                const canvas = document.createElement('canvas');
                canvas.width = 120;
                canvas.height = 170;
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'page-checkbox';
                checkbox.checked = currentTool === 'extract';
                checkbox.onclick = (e) => {
                    e.stopPropagation();
                    togglePageSelection(i);
                };
                
                const pageNum = document.createElement('div');
                pageNum.className = 'page-number';
                pageNum.textContent = `第 ${i} 页`;
                
                thumbnail.appendChild(canvas);
                thumbnail.appendChild(checkbox);
                thumbnail.appendChild(pageNum);
                grid.appendChild(thumbnail);
                
                // Render thumbnail
                try {
                    const page = await currentPdfDoc.getPage(i);
                    const viewport = page.getViewport({ scale: 0.2 });
                    const ctx = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    await page.render({
                        canvasContext: ctx,
                        viewport: viewport
                    }).promise;
                } catch (error) {
                    console.error('Error rendering thumbnail:', error);
                }
            }
            
            // Initialize selection
            if (currentTool === 'extract') {
                for (let i = 1; i <= totalPages; i++) {
                    selectedPages.add(i);
                }
            }
        }

        function togglePageSelection(pageNum) {
            const thumbnail = document.querySelector(`.page-thumbnail[data-page="${pageNum}"]`);
            const checkbox = thumbnail.querySelector('.page-checkbox');
            
            if (selectedPages.has(pageNum)) {
                selectedPages.delete(pageNum);
                thumbnail.classList.remove('selected');
                checkbox.checked = false;
            } else {
                selectedPages.add(pageNum);
                thumbnail.classList.add('selected');
                checkbox.checked = true;
            }
        }

        function selectAllPages() {
            for (let i = 1; i <= totalPages; i++) {
                selectedPages.add(i);
                const thumbnail = document.querySelector(`.page-thumbnail[data-page="${i}"]`);
                if (thumbnail) {
                    thumbnail.classList.add('selected');
                    thumbnail.querySelector('.page-checkbox').checked = true;
                }
            }
        }

        function deselectAllPages() {
            selectedPages.clear();
            document.querySelectorAll('.page-thumbnail').forEach(thumb => {
                thumb.classList.remove('selected');
                thumb.querySelector('.page-checkbox').checked = false;
            });
        }

        // Processing
        async function processFiles() {
            if (uploadedFiles.length === 0) {
                showToast('请先上传文件', 'error');
                return;
            }
            
            // Validation
            if (currentTool === 'delete' || currentTool === 'extract') {
                if (selectedPages.size === 0) {
                    showToast('请至少选择一个页面', 'error');
                    return;
                }
            }
            
            // Show progress
            document.getElementById('fileListSection').classList.add('hidden');
            document.getElementById('previewSection').classList.add('hidden');
            document.getElementById('pagesGridSection')?.classList.add('hidden');
            document.getElementById('optionsSection').classList.add('hidden');
            document.getElementById('actionBar').classList.add('hidden');
            document.getElementById('progressSection').classList.remove('hidden');
            
            updateStep(2);
            
            try {
                let result;
                
                switch (currentTool) {
                    case 'merge':
                        result = await processMerge();
                        break;
                    case 'split':
                        result = await processSplit();
                        break;
                    case 'compress':
                        result = await processCompress();
                        break;
                    case 'rotate':
                        result = await processRotate();
                        break;
                    case 'delete':
                        result = await processDelete();
                        break;
                    case 'extract':
                        result = await processExtract();
                        break;
                }
                
                resultBlob = result.blob;
                resultFileName = result.fileName;
                
                // Show result
                showResult(result);
                updateStep(3);
                
            } catch (error) {
                showToast('处理失败: ' + error.message, 'error');
                console.error(error);
                resetTool();
            }
        }

        async function processMerge() {
            updateProgress(0, '正在合并文件...');
            
            const mergedPdf = await PDFDocument.create();
            let totalSize = 0;
            
            for (let i = 0; i < uploadedFiles.length; i++) {
                const file = uploadedFiles[i];
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                
                pages.forEach(page => mergedPdf.addPage(page));
                totalSize += file.size;
                
                updateProgress(((i + 1) / uploadedFiles.length) * 100, `正在处理: ${file.name}`);
            }
            
            const mergedBytes = await mergedPdf.save();
            const blob = new Blob([mergedBytes], { type: 'application/pdf' });
            
            return {
                blob,
                fileName: `merged_${Date.now()}.pdf`,
                stats: {
                    '原始文件数': uploadedFiles.length,
                    '原始大小': formatBytes(totalSize),
                    '合并后大小': formatBytes(blob.size),
                    '总页数': mergedPdf.getPageCount()
                }
            };
        }

        async function processSplit() {
            updateProgress(20, '正在读取文件...');
            
            const fromPage = parseInt(document.getElementById('fromPage').value);
            const toPage = parseInt(document.getElementById('toPage').value);
            
            if (fromPage > toPage || fromPage < 1 || toPage > totalPages) {
                throw new Error('无效的页码范围');
            }
            
            const file = uploadedFiles[0];
            const arrayBuffer = await file.arrayBuffer();
            
            updateProgress(50, '正在提取页面...');
            
            const pdf = await PDFDocument.load(arrayBuffer);
            const newPdf = await PDFDocument.create();
            
            const pageIndices = [];
            for (let i = fromPage - 1; i < toPage; i++) {
                pageIndices.push(i);
            }
            
            const pages = await newPdf.copyPages(pdf, pageIndices);
            pages.forEach(page => newPdf.addPage(page));
            
            updateProgress(80, '正在保存...');
            
            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            const originalName = file.name.replace('.pdf', '');
            
            return {
                blob,
                fileName: `${originalName}_pages_${fromPage}-${toPage}.pdf`,
                stats: {
                    '原始页数': totalPages,
                    '提取页数': toPage - fromPage + 1,
                    '页码范围': `${fromPage} - ${toPage}`
                }
            };
        }

        async function processCompress() {
            updateProgress(20, '正在分析文件...');
            
            const file = uploadedFiles[0];
            const arrayBuffer = await file.arrayBuffer();
            const originalSize = file.size;
            
            updateProgress(50, '正在压缩...');
            
            const pdf = await PDFDocument.load(arrayBuffer);
            
            updateProgress(80, '正在优化...');
            
            const pdfBytes = await pdf.save({
                useObjectStreams: true,
                addDefaultPage: false
            });
            
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const compressionRatio = ((originalSize - blob.size) / originalSize * 100).toFixed(1);
            
            const originalName = file.name.replace('.pdf', '');
            
            return {
                blob,
                fileName: `${originalName}_compressed.pdf`,
                stats: {
                    '原始大小': formatBytes(originalSize),
                    '压缩后大小': formatBytes(blob.size),
                    '压缩率': compressionRatio + '%'
                }
            };
        }

        async function processRotate() {
            updateProgress(20, '正在读取文件...');
            
            const rotation = parseInt(document.getElementById('rotation').value);
            const file = uploadedFiles[0];
            const arrayBuffer = await file.arrayBuffer();
            
            updateProgress(50, '正在旋转页面...');
            
            const pdf = await PDFDocument.load(arrayBuffer);
            const pages = pdf.getPages();
            
            pages.forEach(page => {
                page.setRotation({ angle: rotation });
            });
            
            updateProgress(80, '正在保存...');
            
            const pdfBytes = await pdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            const originalName = file.name.replace('.pdf', '');
            const rotationText = rotation === 90 ? '顺时针90' : rotation === 180 ? '180' : '逆时针90';
            
            return {
                blob,
                fileName: `${originalName}_rotated_${rotationText}.pdf`,
                stats: {
                    '总页数': pages.length,
                    '旋转角度': rotation + '°',
                    '文件大小': formatBytes(blob.size)
                }
            };
        }

        async function processDelete() {
            updateProgress(20, '正在读取文件...');
            
            if (selectedPages.size === totalPages) {
                throw new Error('不能删除所有页面');
            }
            
            const file = uploadedFiles[0];
            const arrayBuffer = await file.arrayBuffer();
            
            updateProgress(50, '正在删除页面...');
            
            const pdf = await PDFDocument.load(arrayBuffer);
            const newPdf = await PDFDocument.create();
            
            const pagesToKeep = [];
            for (let i = 0; i < totalPages; i++) {
                if (!selectedPages.has(i + 1)) {
                    pagesToKeep.push(i);
                }
            }
            
            const pages = await newPdf.copyPages(pdf, pagesToKeep);
            pages.forEach(page => newPdf.addPage(page));
            
            updateProgress(80, '正在保存...');
            
            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            const originalName = file.name.replace('.pdf', '');
            
            return {
                blob,
                fileName: `${originalName}_deleted.pdf`,
                stats: {
                    '原始页数': totalPages,
                    '删除页数': selectedPages.size,
                    '剩余页数': pagesToKeep.length
                }
            };
        }

        async function processExtract() {
            updateProgress(20, '正在读取文件...');
            
            const file = uploadedFiles[0];
            const arrayBuffer = await file.arrayBuffer();
            
            updateProgress(50, '正在提取页面...');
            
            const pdf = await PDFDocument.load(arrayBuffer);
            const newPdf = await PDFDocument.create();
            
            const pageIndices = Array.from(selectedPages).map(p => p - 1).sort((a, b) => a - b);
            const pages = await newPdf.copyPages(pdf, pageIndices);
            pages.forEach(page => newPdf.addPage(page));
            
            updateProgress(80, '正在保存...');
            
            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            const originalName = file.name.replace('.pdf', '');
            
            return {
                blob,
                fileName: `${originalName}_extracted.pdf`,
                stats: {
                    '原始页数': totalPages,
                    '提取页数': selectedPages.size,
                    '页码': Array.from(selectedPages).sort((a, b) => a - b).join(', ')
                }
            };
        }

        // Progress
        function updateProgress(percent, text) {
            document.getElementById('progressBar').style.width = percent + '%';
            document.getElementById('progressPercent').textContent = Math.round(percent) + '%';
            if (text) {
                document.getElementById('progressText').textContent = text;
            }
        }

        // Result
        function showResult(result) {
            document.getElementById('progressSection').classList.add('hidden');
            document.getElementById('resultSection').classList.remove('hidden');
            
            const statsContainer = document.getElementById('resultStats');
            statsContainer.innerHTML = Object.entries(result.stats).map(([key, value]) => `
                <div class="stat">
                    <div class="stat-value">${value}</div>
                    <div class="stat-label">${key}</div>
                </div>
            `).join('');
        }

        function downloadResult() {
            if (!resultBlob) return;
            
            const url = URL.createObjectURL(resultBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = resultFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('文件下载已开始', 'success');
        }

        // Steps
        function updateStep(step) {
            document.querySelectorAll('.step').forEach((el, i) => {
                el.classList.remove('active', 'completed');
                if (i < step - 1) {
                    el.classList.add('completed');
                } else if (i === step - 1) {
                    el.classList.add('active');
                }
            });
            
            document.querySelectorAll('.step-connector').forEach((el, i) => {
                el.classList.toggle('completed', i < step - 1);
            });
        }

        // Reset
        function resetTool() {
            resetToolState();
            document.getElementById('uploadSection').classList.remove('hidden');
            document.getElementById('fileListSection').classList.add('hidden');
            document.getElementById('previewSection').classList.add('hidden');
            document.getElementById('pagesGridSection')?.classList.add('hidden');
            document.getElementById('optionsSection').classList.add('hidden');
            document.getElementById('progressSection').classList.add('hidden');
            document.getElementById('resultSection').classList.add('hidden');
            document.getElementById('actionBar').classList.remove('hidden');
            document.getElementById('processBtn').disabled = true;
            
            updateProgress(0, '请稍候');
            updateStep(1);
            
            // Re-setup options
            if (currentTool) {
                setupOptions(tools[currentTool]);
            }
        }

        function resetToolState() {
            uploadedFiles = [];
            currentPdfDoc = null;
            currentPageNum = 1;
            totalPages = 0;
            selectedPages.clear();
            resultBlob = null;
            resultFileName = '';
            document.getElementById('fileInput').value = '';
        }

        // Toast
        function showToast(message, type = 'info') {
            const toast = document.getElementById('toast');
            const toastMessage = document.getElementById('toastMessage');
            
            toast.className = `toast ${type}`;
            toastMessage.textContent = message;
            
            const icons = {
                success: 'fa-check-circle',
                error: 'fa-times-circle',
                warning: 'fa-exclamation-circle',
                info: 'fa-info-circle'
            };
            
            toast.querySelector('i').className = `fas ${icons[type]}`;
            
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        // Utilities
        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }
