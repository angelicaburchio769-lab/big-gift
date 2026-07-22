class Modal {
    constructor() {
        this.container = null;
        this.overlay = null;
        this.modal = null;
        this.init();
    }

    init() {
        this.container = document.createElement('div');
        this.container.className = 'modal-container';
        
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay';
        
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        
        this.container.appendChild(this.overlay);
        this.container.appendChild(this.modal);
        document.body.appendChild(this.container);

        this.overlay.addEventListener('click', () => this.close());
    }

    show(options) {
        const { title, content, buttons = [], onClose } = options;
        
        this.modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close" aria-label="Close">✕</button>
            </div>
            <div class="modal-body">${content}</div>
            <div class="modal-footer">
                ${buttons.map((btn, index) => `
                    <button class="modal-btn ${btn.primary ? 'modal-btn-primary' : ''}" data-index="${index}">
                        ${btn.text}
                    </button>
                `).join('')}
            </div>
        `;

        const closeBtn = this.modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.close(onClose));

        const btnElements = this.modal.querySelectorAll('.modal-btn');
        btnElements.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                const button = buttons[index];
                if (button.onClick) {
                    button.onClick();
                }
                this.close(onClose);
            });
        });

        this.container.classList.add('modal-visible');
    }

    close(onClose) {
        this.container.classList.remove('modal-visible');
        if (onClose) {
            onClose();
        }
    }

    confirm(title, message) {
        return new Promise((resolve) => {
            this.show({
                title,
                content: `<p>${message}</p>`,
                buttons: [
                    { text: '取消', onClick: () => resolve(false) },
                    { text: '确定', primary: true, onClick: () => resolve(true) }
                ]
            });
        });
    }

    prompt(title, message, defaultValue = '') {
        return new Promise((resolve) => {
            const content = `
                <p>${message}</p>
                <input type="text" class="modal-input" value="${defaultValue}" autofocus>
            `;
            
            this.show({
                title,
                content,
                buttons: [
                    { text: '取消', onClick: () => resolve(null) },
                    { text: '确定', primary: true, onClick: () => {
                        const input = this.modal.querySelector('.modal-input');
                        resolve(input ? input.value.trim() : null);
                    }}
                ]
            });

            setTimeout(() => {
                const input = this.modal.querySelector('.modal-input');
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 100);
        });
    }

    alert(title, message) {
        return new Promise((resolve) => {
            this.show({
                title,
                content: `<p>${message}</p>`,
                buttons: [
                    { text: '确定', primary: true, onClick: () => resolve() }
                ]
            });
        });
    }
}

export default Modal;
