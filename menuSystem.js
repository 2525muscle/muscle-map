// 動的メニュー生成システム
// menuConfig.jsを使用してメニューを動的に生成

class MenuSystem {
    constructor() {
        this.config = window.menuConfig;
        this.currentPage = 'map';
        this.menuContainer = null;
        this.hamburgerButton = null;
    }

    // メニューシステムの初期化
    init() {
        this.createHamburgerButton();
        this.createMenuContainer();
        this.renderMenu();
        this.setupEventListeners();
    }

    // ハンバーガーボタンの作成
    createHamburgerButton() {
        if (!this.config.settings.hamburger.enabled) return;

        const headerContent = document.querySelector('.header-content');
        if (!headerContent) return;

        // ハンバーガーボタンを作成
        this.hamburgerButton = document.createElement('button');
        this.hamburgerButton.className = 'hamburger-menu';
        this.hamburgerButton.id = 'hamburgerMenu';
        this.hamburgerButton.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;

        headerContent.appendChild(this.hamburgerButton);
    }

    // メニューコンテナの作成
    createMenuContainer() {
        // 既存のメニューがあれば削除
        const existingMenu = document.getElementById('dynamicNavMenu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // 新しいメニューコンテナを作成
        this.menuContainer = document.createElement('nav');
        this.menuContainer.className = 'nav-menu';
        this.menuContainer.id = 'dynamicNavMenu';

        // ヘッダーの後に挿入
        const header = document.querySelector('.header');
        header.insertAdjacentElement('afterend', this.menuContainer);
    }

    // メニューの動的レンダリング
    renderMenu() {
        if (!this.menuContainer) return;

        const visibleItems = this.config.getVisibleItems();
        
        const menuHTML = `
            <ul>
                ${visibleItems.map(item => this.renderMenuItem(item)).join('')}
            </ul>
        `;

        this.menuContainer.innerHTML = menuHTML;
    }

    // 個別メニュー項目のレンダリング
    renderMenuItem(item) {
        const hasChildren = item.children && item.children.some(child => child.visible);
        
        if (hasChildren) {
            // 子項目がある場合（将来のカテゴリ階層対応）
            return `
                <li class="menu-item-with-children">
                    <a href="${item.route}" data-page="${item.page}" data-type="${item.type}">
                        ${item.name}
                    </a>
                    <ul class="submenu">
                        ${item.children
                            .filter(child => child.visible)
                            .map(child => `
                                <li>
                                    <a href="${child.route}" data-page="${child.page}" data-type="${child.type}">
                                        ${child.name}
                                    </a>
                                </li>
                            `).join('')}
                    </ul>
                </li>
            `;
        } else {
            // 通常のメニュー項目
            return `
                <li>
                    <a href="${item.route}" data-page="${item.page}" data-type="${item.type}" data-id="${item.id}">
                        ${item.name}
                    </a>
                </li>
            `;
        }
    }

    // イベントリスナーの設定
    setupEventListeners() {
        // ハンバーガーボタンのクリック
        if (this.hamburgerButton) {
            this.hamburgerButton.addEventListener('click', () => {
                this.toggleMenu();
            });
        }

        // メニュー項目のクリック
        const menuLinks = this.menuContainer.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleMenuClick(e);
            });
        });

        // 外部クリックでメニューを閉じる
        document.addEventListener('click', (e) => {
            if (this.config.settings.hamburger.closeOnClick) {
                this.handleOutsideClick(e);
            }
        });
    }

    // メニューの開閉
    toggleMenu() {
        if (!this.hamburgerButton || !this.menuContainer) return;

        this.hamburgerButton.classList.toggle('active');
        this.menuContainer.classList.toggle('active');
    }

    // メニューを閉じる
    closeMenu() {
        if (this.hamburgerButton) this.hamburgerButton.classList.remove('active');
        if (this.menuContainer) this.menuContainer.classList.remove('active');
    }

    // メニュークリックの処理
    handleMenuClick(e) {
        const link = e.target;
        const type = link.getAttribute('data-type');
        const page = link.getAttribute('data-page');
        const route = link.getAttribute('href');

        if (type === 'page' && page) {
            // 内部ページの場合
            e.preventDefault();
            this.showPage(page);
            this.closeMenu();
        } else if (type === 'external') {
            // 外部リンクの場合（articles.htmlなど）
            // そのまま遷移させる
            this.closeMenu();
        }
    }

    // 外部クリックの処理
    handleOutsideClick(e) {
        if (!this.menuContainer || !this.hamburgerButton) return;

        if (!this.menuContainer.contains(e.target) && !this.hamburgerButton.contains(e.target)) {
            this.closeMenu();
        }
    }

    // ページ表示の処理
    showPage(pageId) {
        // 既存のshowPage関数を呼び出す
        if (typeof window.showPage === 'function') {
            window.showPage(pageId, true);
        } else {
            // フォールバック処理
            this.fallbackShowPage(pageId);
        }
        this.currentPage = pageId;
    }

    // フォールバック用のページ表示
    fallbackShowPage(pageId) {
        // 全てのページを非表示
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.remove('active'));

        // 指定されたページを表示
        const targetPage = document.getElementById(pageId + 'Page');
        if (targetPage) {
            targetPage.classList.add('active');
        }
    }

    // メニュー項目の動的追加
    addMenuItem(item) {
        this.config.items.push(item);
        this.renderMenu();
        this.setupEventListeners();
    }

    // メニュー項目の動的削除
    removeMenuItem(itemId) {
        this.config.items = this.config.items.filter(item => item.id !== itemId);
        this.renderMenu();
        this.setupEventListeners();
    }

    // メニュー項目の表示/非表示切り替え
    toggleMenuItem(itemId, visible) {
        const item = this.config.getItemById(itemId);
        if (item) {
            item.visible = visible;
            this.renderMenu();
            this.setupEventListeners();
        }
    }
}

// グローバルに公開
window.MenuSystem = MenuSystem;
