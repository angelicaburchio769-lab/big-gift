import ImageLoader from '../core/imageLoader.js';
import CanvasManager from '../core/canvasManager.js';
import Utils from '../core/utils.js';

class PixelTool {
    constructor(appState = null, toast = null) {
        this.appState = appState;
        this.toast = toast;
        this.imageLoader = new ImageLoader();
        this.originalCanvasManager = new CanvasManager('pixel-original-canvas');
        this.resultCanvasManager = new CanvasManager('pixel-result-canvas');
        this.currentImage = null;
        this.pixelSize = 10;
        this.isActive = false;
        this.MAX_DIMENSION = 4000;
        this.MAX_FILE_SIZE = 10 * 1024 * 1024;
        this.processCanvas = null;
        this.initEvents();
    }

    initEvents() {
        const uploadInput = document.getElementById('pixel-upload');
        const uploadArea = document.getElementById('pixel-upload-area');
        const pixelSizeInput = document.getElementById('pixel-size');
        const pixelSizeValue = document.getElementById('pixel-size-value');
        const processBtn = document.getElementById('pixel-process');
        const downloadBtn = document.getElementById('pixel-download');
        const useCurrentBtn = document.getElementById('pixel-use-current');
        const continueBtn = document.getElementById('pixel-continue');

        const debouncedProcess = Utils.debounce(() => {
            if (this.currentImage) {
                this.processImage();
            }
        }, 100);

        uploadInput && uploadInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileUpload(files[0]);
                }
            });
        }

        pixelSizeInput && pixelSizeInput.addEventListener('input', (e) => {
            this.pixelSize = parseInt(e.target.value);
            if (pixelSizeValue) pixelSizeValue.textContent = this.pixelSize;
            this.appState && this.appState.updateToolSettings('pixel', { pixelSize: this.pixelSize });
            debouncedProcess();
        });

        processBtn && processBtn.addEventListener('click', () => {
            this.processImage();
        });

        downloadBtn && downloadBtn.addEventListener('click', () => {
            this.downloadImage();
        });

        useCurrentBtn && useCurrentBtn.addEventListener('click', () => {
            this.useCurrentImage();
        });

        continueBtn && continueBtn.addEventListener('click', () => {
            this.continueProcessing();
        });
    }

    handleFileUpload(file) {
        if (!file) return;
        
        if (file.size > this.MAX_FILE_SIZE) {
            this.toast && this.toast.error('文件大小超过限制（最大10MB）');
            return;
        }
        
        this.imageLoader.loadFromFile(file, (error, img) => {
            if (error) {
                this.toast && this.toast.error(error.message || '图片加载失败');
                return;
            }
            
            try {
                this.currentImage = img;
                
                if (this.appState) {
                    this.appState.setOriginalImage(img.src);
                    this.appState.addToHistory(img.src, 'upload');
                }
                
                this.prepareProcessCanvas(img);
                this.displayOriginalImage(img);
                this.processImage();
                
                const downloadBtn = document.getElementById('pixel-download');
                const continueBtn = document.getElementById('pixel-continue');
                const useCurrentBtn = document.getElementById('pixel-use-current');
                
                if (downloadBtn) downloadBtn.disabled = false;
                if (continueBtn) continueBtn.disabled = false;
                if (useCurrentBtn) useCurrentBtn.style.display = 'none';
                
                this.toast && this.toast.success('图片上传成功');
            } catch (e) {
                console.error('图片处理失败:', e);
                this.toast && this.toast.error('图片处理失败，请重试');
            }
        });
    }

    useCurrentImage() {
        if (!this.appState || !this.appState.hasImage()) {
            this.toast && this.toast.warning('当前项目没有可用的图片');
            return;
        }
        
        const currentImageData = this.appState.get('images.currentImage');
        if (!currentImageData) {
            this.toast && this.toast.warning('当前项目没有可用的图片');
            return;
        }
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.prepareProcessCanvas(img);
            this.displayOriginalImage(img);
            this.processImage();
            
            document.getElementById('pixel-download').disabled = false;
            document.getElementById('pixel-continue').disabled = false;
            document.getElementById('pixel-use-current').style.display = 'none';
            
            const uploadArea = document.getElementById('pixel-upload-area');
            if (uploadArea) uploadArea.style.display = 'none';
        };
        img.src = currentImageData;
    }

    continueProcessing() {
        const resultCanvas = this.resultCanvasManager.processedCanvas || document.getElementById('pixel-result-canvas');
        if (!resultCanvas || resultCanvas.width === 0) {
            this.toast && this.toast.warning('请先生成处理结果');
            return;
        }
        
        const processedDataUrl = resultCanvas.toDataURL('image/png');
        
        if (this.appState) {
            this.appState.setProcessedImage(processedDataUrl);
            this.appState.addToHistory(processedDataUrl, 'pixelate');
            this.appState.continueProcessing();
        }
        
        this.toast && this.toast.success('处理结果已保存，可以继续使用其他工具');
    }

    prepareProcessCanvas(img) {
        let width = img.width;
        let height = img.height;
        
        if (width > this.MAX_DIMENSION) {
            height = Math.round((height * this.MAX_DIMENSION) / width);
            width = this.MAX_DIMENSION;
        }
        
        if (height > this.MAX_DIMENSION) {
            width = Math.round((width * this.MAX_DIMENSION) / height);
            height = this.MAX_DIMENSION;
        }
        
        this.processCanvas = document.createElement('canvas');
        this.processCanvas.width = width;
        this.processCanvas.height = height;
        
        const ctx = this.processCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
    }

    displayOriginalImage(img) {
        const maxWidth = 600;
        const maxHeight = 600;
        
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        this.originalCanvasManager.setCanvasSize(width, height);
        const ctx = this.originalCanvasManager.getContext();
        ctx.imageSmoothingEnabled = false;
        this.originalCanvasManager.drawImage(img, 0, 0, width, height);
    }

    processImage() {
        if (!this.currentImage || !this.processCanvas) {
            if (this.appState && this.appState.hasImage()) {
                this.useCurrentImage();
                return;
            }
            this.toast && this.toast.warning('请先上传图片或使用当前项目图片');
            return;
        }

        const pixelatedCanvas = this.pixelateImage(this.processCanvas, this.pixelSize);
        
        const maxDisplayWidth = 400;
        const maxDisplayHeight = 400;
        let displayWidth = pixelatedCanvas.width;
        let displayHeight = pixelatedCanvas.height;
        
        if (displayWidth > maxDisplayWidth) {
            displayHeight = Math.round((displayHeight * maxDisplayWidth) / displayWidth);
            displayWidth = maxDisplayWidth;
        }
        
        if (displayHeight > maxDisplayHeight) {
            displayWidth = Math.round((displayWidth * maxDisplayHeight) / displayHeight);
            displayHeight = maxDisplayHeight;
        }
        
        this.resultCanvasManager.setCanvasSize(displayWidth, displayHeight);
        const ctx = this.resultCanvasManager.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(pixelatedCanvas, 0, 0, displayWidth, displayHeight);
        
        this.resultCanvasManager.processedCanvas = pixelatedCanvas;
        
        if (this.appState) {
            this.appState.setProcessedImage(pixelatedCanvas.toDataURL('image/png'));
        }
        
        this.toast && this.toast.success('像素化完成');
    }

    pixelateImage(sourceCanvas, pixelSize) {
        const ctx = sourceCanvas.getContext('2d');
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        
        const pixelatedCanvas = document.createElement('canvas');
        pixelatedCanvas.width = width;
        pixelatedCanvas.height = height;
        const pixelatedCtx = pixelatedCanvas.getContext('2d');
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        for (let y = 0; y < height; y += pixelSize) {
            for (let x = 0; x < width; x += pixelSize) {
                const avgColor = this.getAverageColor(pixels, x, y, pixelSize, pixelSize, width, height);
                
                pixelatedCtx.fillStyle = `rgb(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`;
                pixelatedCtx.fillRect(x, y, pixelSize, pixelSize);
            }
        }
        
        return pixelatedCanvas;
    }

    getAverageColor(pixels, startX, startY, blockWidth, blockHeight, imageWidth, imageHeight) {
        let r = 0, g = 0, b = 0;
        let count = 0;
        
        for (let y = startY; y < startY + blockHeight && y < imageHeight; y++) {
            for (let x = startX; x < startX + blockWidth && x < imageWidth; x++) {
                const idx = (y * imageWidth + x) * 4;
                if (idx < pixels.length) {
                    r += pixels[idx];
                    g += pixels[idx + 1];
                    b += pixels[idx + 2];
                    count++;
                }
            }
        }
        
        if (count === 0) {
            return { r: 0, g: 0, b: 0 };
        }
        
        return {
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count)
        };
    }

    downloadImage() {
        const canvas = this.resultCanvasManager.processedCanvas || this.resultCanvasManager.getCanvas();
        if (!canvas) return;
        
        const link = document.createElement('a');
        link.download = 'pixel-art.png';
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    }

    activate() {
        this.isActive = true;
        
        if (this.appState && this.appState.hasImage() && !this.currentImage) {
            this.useCurrentImage();
        }
        
        const pixelSizeInput = document.getElementById('pixel-size');
        const pixelSizeValue = document.getElementById('pixel-size-value');
        if (pixelSizeInput) pixelSizeInput.value = this.pixelSize;
        if (pixelSizeValue) pixelSizeValue.textContent = this.pixelSize;
    }

    deactivate() {
        this.isActive = false;
    }
}

export default PixelTool;
