class CanvasManager {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = null;
        this.ctx = null;
        this.originalImage = null;
        this.processedImage = null;
        this.processedCanvas = null;
        this.initialize();
    }

    initialize() {
        this.canvas = document.getElementById(this.canvasId);
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }
    }

    setCanvasSize(width, height) {
        if (!this.canvas) return;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    drawImage(img, x = 0, y = 0, width = null, height = null) {
        if (!this.ctx || !img) return;
        
        const w = width || img.width;
        const h = height || img.height;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, x, y, w, h);
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

    saveImage(filename = 'image.png') {
        if (!this.canvas) return;
        
        const link = document.createElement('a');
        link.download = filename;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    resizeCanvasToImage(img) {
        if (!this.canvas || !img) return;
        
        const maxWidth = 800;
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
        
        this.setCanvasSize(width, height);
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
}

export default CanvasManager;
