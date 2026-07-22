class CanvasManager {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = null;
        this.ctx = null;
        this.originalImage = null;
        this.processedImage = null;
        this.processedCanvas = null;
        this.dpr = window.devicePixelRatio || 1;
        this.initialize();
    }

    initialize() {
        this.canvas = document.getElementById(this.canvasId);
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.ctx.imageSmoothingEnabled = false;
        }
    }

    setCanvasSize(width, height, useDpr = false) {
        if (!this.canvas) return;
        
        if (useDpr) {
            this.canvas.width = width * this.dpr;
            this.canvas.height = height * this.dpr;
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${height}px`;
            this.ctx.scale(this.dpr, this.dpr);
        } else {
            this.canvas.width = width;
            this.canvas.height = height;
            this.canvas.style.width = '';
            this.canvas.style.height = '';
        }
    }

    drawImage(img, x = 0, y = 0, width = null, height = null, pixelated = true) {
        if (!this.ctx || !img) return;
        
        const w = width || img.width;
        const h = height || img.height;
        
        this.ctx.imageSmoothingEnabled = !pixelated;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, x, y, w, h);
        this.ctx.imageSmoothingEnabled = false;
    }

    getImageData() {
        if (!this.ctx) return null;
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    putImageData(imageData) {
        if (!this.ctx) return;
        this.ctx.putImageData(imageData, 0, 0);
    }

    clear() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    saveImage(filename = 'image.png', quality = 1.0) {
        if (!this.canvas) return;
        
        const link = document.createElement('a');
        link.download = filename;
        link.href = this.canvas.toDataURL('image/png', quality);
        link.click();
    }

    resizeCanvasToImage(img, maxWidth = null, maxHeight = null, useDpr = false) {
        if (!this.canvas || !img) return;
        
        let width = img.width;
        let height = img.height;
        
        if (maxWidth && width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (maxHeight && height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        this.setCanvasSize(width, height, useDpr);
        this.drawImage(img, 0, 0, width, height);
        
        this.originalImage = img;
        
        return { width, height };
    }

    getCanvas() {
        return this.canvas;
    }

    getContext() {
        return this.ctx;
    }

    getDpr() {
        return this.dpr;
    }
}

export default CanvasManager;
