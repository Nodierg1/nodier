	    <script>
// Configuration object with application settings
const CONFIG = {
    BLOG_URL: 'https://nodier.reydelapc.com/',
    DEFAULT_LANG: 'es',
    sectioncvtS: ['perfil', 'habilidades', 'experiencia', 'educacion', 'certificaciones', 'cursos', 'voluntariado', 'licencias', 'testimonios'],
    SKILLS: ['JavaScript', 'HTML5', 'CSS3', 'Python', 'React', 'Node.js', 'SQL', 'Git', 'Responsive Design'],
    CHAR_LIMITS: {
        perfil: 300,
        experiencia: 200,
        educacion: 150,
        certificaciones: 100,
        cursos: 100,
        voluntariado: 150,
        licencias: 100,
        testimonios: 250
    },
    MOBILE_BREAKPOINT: 640 // 40em * 16px
};

// Translation management
const TRANSLATIONS = {
    es: {
        perfil: 'Perfil Profesional',
        experiencia: 'Experiencia',
        educacion: 'Educación',
        habilidades: 'Habilidades',
        certificaciones: 'Certificaciones',
        cursos: 'Cursos y Seminarios',
        voluntariado: 'Voluntariado',
        licencias: 'Licencias',
        testimonios: 'Testimonios',
        print: 'Imprimir',
        share: 'Compartir',
        download: 'Descargar',
        featured: 'Destacados',
        schedule: 'Agendar',
        loading: 'Cargando...',
        error: 'Error cargando contenido',
        noResults: 'No se encontraron resultados',
        copied: 'URL copiada al portapapeles',
        noContent: 'Esta sección está vacía',
        sortBy: 'Ordenar por',
        date: 'Fecha',
        alphabetical: 'Alfabético',
        readMore: 'Leer más',
        filterBy: 'Filtrar por',
        closemodaltf: 'Cerrar'
    }
};

class CVManager {
    static #instance = null;
    
    constructor() {
        if (CVManager.#instance) {
            return CVManager.#instance;
        }
        CVManager.#instance = this;
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.loadCV();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeClock();
            this.initializeQRCode();
            this.setupLanguageChange();
            this.setupModalHandlers();
        });

        window.addEventListener('resize', () => {
            if (window.QRCode) {
                this.generateQRCodes();
            }
        });
    }

    // Previous methods remain the same
    async getBase64Image(imgElement) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = imgElement.naturalWidth;
            canvas.height = imgElement.naturalHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgElement, 0, 0);
            
            canvas.toBlob((blob) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }, 'image/jpeg');
        });
    }

    // Utility methods for post parsing
    extractDateRange(doc) {
        const dateRangeElement = doc.querySelector('.date-range');
        if (dateRangeElement) {
            return dateRangeElement.textContent.trim();
        }
        
        const publishedDate = doc.querySelector('published');
        return publishedDate ? new Date(publishedDate.textContent).getFullYear() : 'Present';
    }

    extractDescription(doc) {
        const descriptionElements = doc.querySelectorAll('p');
        const description = Array.from(descriptionElements)
            .map(p => p.textContent.trim())
            .filter(text => text.length > 50)
            .join(' ');
        return description || 'No detailed description available.';
    }

    extractAchievements(doc) {
        const achievementElements = doc.querySelectorAll('li');
        return Array.from(achievementElements)
            .map(li => li.textContent.trim())
            .filter(text => text.length > 10);
    }

    extractTechnologies(doc) {
        const techTags = doc.querySelectorAll('.tech-tag');
        return Array.from(techTags)
            .map(tag => tag.textContent.trim())
            .filter(Boolean);
    }

    async loadBloggerFeed(category) {
        const lang = document.getElementById('languageSelect')?.value || CONFIG.DEFAULT_LANG;
        const url = `${CONFIG.BLOG_URL}/feeds/posts/default/-/${category}-${lang}?alt=json`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data.feed?.entry || [];
        } catch (error) {
            console.error(`Error loading feed for category ${category}:`, error);
            return [];
        }
    }

    renderPost(post, sectioncvt) {
        if (!post) return '';
        
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(post.content.$t, 'text/html');
            
            const jobTitle = post.title.$t.trim();
            const organization = doc.querySelector('h2')?.textContent.trim() || '';
            const dateRange = this.extractDateRange(doc);
            const description = this.extractDescription(doc);
            const achievements = this.extractAchievements(doc);
            const technologies = this.extractTechnologies(doc);
            const organizationImg = doc.querySelector('img')?.src || '/path/to/default-logo.png';
            const websiteLink = doc.querySelector('a[href]')?.getAttribute('href') || '';
            
            const isFeatured = this.getFeaturedItems().some(item => item.id === post.id.$t);

            return `
                <div class="cv-experience-item ${isFeatured ? 'featured' : ''}" data-id="${post.id.$t}">
                    <div class="cv-header">
                        <div class="cv-logo">
                            <img src="${organizationImg}" alt="${organization}" class="org-image">
                        </div>
                        <div class="cv-title-section">
                            <h3 class="job-title">${jobTitle}</h3>
                            <div class="organization-name">${organization}</div>
                            <div class="date-range">${dateRange}</div>
                        </div>
                        <button class="star-btn" onclick="cvManager.toggleFeatured('${post.id.$t}', '${jobTitle}', this)">
                            <i class="fas fa-star"></i>
                        </button>
                    </div>
                    <div class="cv-body">
                        <div class="cv-description">${description}</div>
                        ${achievements.length ? `
                            <div class="cv-achievements">
                                <h4>Key Achievements</h4>
                                <ul>
                                    ${achievements.map(achievement => `<li>${achievement}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${technologies.length ? `
                            <div class="cv-technologies">
                                <h4>Technologies</h4>
                                <div class="tech-tags">
                                    ${technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="cv-footer">
                        ${websiteLink ? `<a href="${websiteLink}" class="website-link" target="_blank">Company Website</a>` : ''}
                        <button class="read-more" onclick="cvManager.showFullPostDetails('${post.id.$t}', '${sectioncvt}')">
                            View Details
                        </button>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering post:', error);
            return '';
        }
    }

    async showFullPost(postId, sectioncvt) {
        try {
            const posts = await this.loadBloggerFeed(sectioncvt);
            const post = posts.find(p => p.id.$t === postId);
            if (!post) return;

            const parser = new DOMParser();
            const doc = parser.parseFromString(post.content.$t, 'text/html');
            
            const modaltf = this.createFullPostModal(post, doc);
            document.body.appendChild(modaltf);
            this.setupModalCloseHandlers(modaltf);
        } catch (error) {
            console.error('Error showing full post:', error);
        }
    }

    showFullPostDetails(postId, sectioncvt) {
        const post = this.findPostById(postId, sectioncvt);
        if (post && post.link && post.link[0] && post.link[0].href) {
            window.open(post.link[0].href, '_blank');
        }
    }

    findPostById(postId, sectioncvt) {
        const posts = this.loadedPosts?.[sectioncvt] || [];
        return posts.find(post => post.id.$t === postId);
    }

    createFullPostModal(post, doc) {
        const modaltf = document.createElement('div');
        modaltf.className = 'modaltf full-post-modaltf';
        
        const organizationImg = doc.querySelector('img')?.src || '/path/to/default-image.jpg';
        const organization = doc.querySelector('h2')?.textContent || '';
        const dateRange = doc.querySelector('.date-range')?.textContent || post.published.$t;
        const description = doc.querySelector('p')?.textContent || '';
        const website = doc.querySelector('a[href]')?.getAttribute('href') || '';

        modaltf.innerHTML = `
            <div class="modaltf-content">
                <div class="modaltf-header">
                    <div class="modaltf-title">
                        <h2>${post.title.$t}</h2>
                        <div class="modaltf-subtitle">${organization}</div>
                        <div class="modaltf-date">${dateRange}</div>
                    </div>
                    <button onclick="this.closest('.modaltf').remove()" class="close-btn">&times;</button>
                </div>
                <div class="modaltf-body">
                    <div class="modaltf-organization-logo">
                        <img src="${organizationImg}" alt="${organization}">
                    </div>
                    <div class="modaltf-description">
                        ${description}
                    </div>
                    ${website ? `
                        <div class="modaltf-website">
                            <a href="${website}" target="_blank" class="website-button">Visitar Website</a>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        return modaltf;
    }

    setupModalCloseHandlers(modaltf) {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modaltf.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        modaltf.addEventListener('click', (e) => {
            if (e.target === modaltf) {
                modaltf.remove();
            }
        });
    }

    rendersectioncvt(sectioncvtName, posts) {
        if (sectioncvtName === 'habilidades') {
            return this.renderSkillssectioncvt();
        }

        const sortingOptions = `
            <select class="sort-select" onchange="cvManager.sortPosts('${sectioncvtName}', this.value)">
                <option value="">${TRANSLATIONS[CONFIG.DEFAULT_LANG].sortBy}</option>
                <option value="date">${TRANSLATIONS[CONFIG.DEFAULT_LANG].date}</option>
                <option value="alphabetical">${TRANSLATIONS[CONFIG.DEFAULT_LANG].alphabetical}</option>
            </select>
        `;

        return `
            <div class="sectioncvt" id="${sectioncvtName}">
                <div class="sectioncvt-header" onclick="cvManager.togglesectioncvt('${sectioncvtName}')">
                    <div class="header-left">
                        <h2>${TRANSLATIONS[CONFIG.DEFAULT_LANG][sectioncvtName]}</h2>
                        ${sortingOptions}
                    </div>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="sectioncvt-content">
                    ${posts.length ? posts.map(post => this.renderPost(post, sectioncvtName)).join('') 
                    : `<div class="empty-sectioncvt">${TRANSLATIONS[CONFIG.DEFAULT_LANG].noContent}</div>`}
                </div>
            </div>
        `;
    }

    renderSkillssectioncvt() {
        const skillsContent = CONFIG.SKILLS.map(skill => 
            `<div class="skill-tag" onclick="cvManager.showSkillResults('${skill}')">${skill}</div>`
        ).join('');

        return `
            <div class="sectioncvt" id="habilidades">
                <div class="sectioncvt-header" onclick="cvManager.togglesectioncvt('habilidades')">
                    <h2>${TRANSLATIONS[CONFIG.DEFAULT_LANG].habilidades}</h2>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="sectioncvt-content">
                    <div class="skills-grid">${skillsContent}</div>
                </div>
            </div>
        `;
    }

    async loadCV() {
        const cvContent = document.getElementById('cvContent');
        if (!cvContent) return;

        cvContent.innerHTML = `<div class="loading">${TRANSLATIONS[CONFIG.DEFAULT_LANG].loading}</div>`;
        
        try {
            this.loadedPosts = {};
            const sectioncvts = await Promise.all(CONFIG.sectioncvtS.map(async sectioncvt => {
                const posts = await this.loadBloggerFeed(sectioncvt);
                this.loadedPosts[sectioncvt] = posts;
                return this.rendersectioncvt(sectioncvt, posts);
            }));
            
            cvContent.innerHTML = sectioncvts.join('');
        } catch (error) {
            console.error('Error loading CV:', error);
            cvContent.innerHTML = `<div class="error">${TRANSLATIONS[CONFIG.DEFAULT_LANG].error}</div>`;
        }
    }

    getFeaturedItems() {
        try {
            return JSON.parse(localStorage.getItem('featuredItems')) || [];
        } catch {
            return [];
        }
    }

    toggleFeatured(id, title, button) {
        if (!id || !title || !button) return;
        
        const featured = this.getFeaturedItems();
        const item = button.closest('.sectioncvt-item');
        const content = item?.querySelector('.post-content')?.innerHTML;
        
        if (!content) return;

        const exists = featured.some(item => item.id === id);
        
        if (exists) {
            localStorage.setItem('featuredItems', JSON.stringify(
                featured.filter(item => item.id !== id)
            ));
            item.classList.remove('featured');
        } else {
            localStorage.setItem('featuredItems', JSON.stringify([
                ...featured,
                { id, title, content }
            ]));
            item.classList.add('featured');
        }
    }

    async showFeatured() {
        const featured = this.getFeaturedItems();
        const cvContent = document.getElementById('cvContent');
        const featuredResults = document.getElementById('featuredResults');
        
        if (cvContent) cvContent.style.display = 'none';
        if (featuredResults) {
            featuredResults.style.display = 'block';
            
            const content = featuredResults.querySelector('#featuredResultsContent');
            if (content) {
                content.innerHTML = featured.length ? featured.map(item => `
                    <div class="sectioncvt-item featured" data-id="${item.id}">
                        <h3>${item.title}</h3>
                        <div class="content">${item.content}</div>
                        <button class="star-btn" onclick="cvManager.toggleFeatured('${item.id}', '${item.title}', this)">
                            <i class="fas fa-star"></i>
                        </button>
                    </div>
                `).join('') : `<div class="empty-sectioncvt">${TRANSLATIONS[CONFIG.DEFAULT_LANG].noResults}</div>`;
            }
        }
    }

    async showSkillResults(skill) {
        if (!skill) return;
        
        const cvContent = document.getElementById('cvContent');
        const skillResults = document.getElementById('skillResults');
        
        if (cvContent) cvContent.style.display = 'none';
        if (skillResults) {
            skillResults.style.display = 'block';
            document.getElementById('skillResultsTitle').textContent = `Resultados para "${skill}"`;
            
            const posts = await this.loadBloggerFeed(skill);
            const content = document.getElementById('skillResultsContent');
            if (content) {
                content.innerHTML = posts.length 
                    ? posts.map(post => this.renderPost(post, 'habilidades')).join('')
                    : `<div class="empty-sectioncvt">${TRANSLATIONS[CONFIG.DEFAULT_LANG].noResults}</div>`;
            }
        }
    }

    togglesectioncvt(sectioncvtId) {
        const sectioncvt = document.getElementById(sectioncvtId);
        if (!sectioncvt) return;
        
        const content = sectioncvt.querySelector('.sectioncvt-content');
        const icon = sectioncvt.querySelector('.fa-chevron-down');
        if (!content || !icon) return;
        
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
        icon.style.transform = `rotate(${content.style.display === 'none' ? '0' : '180'}deg)`;
    }

    showFullCV() {
        const cvContent = document.getElementById('cvContent');
        const skillResults = document.getElementById('skillResults');
        const featuredResults = document.getElementById('featuredResults');
        
        if (cvContent) cvContent.style.display = 'block';
        if (skillResults) skillResults.style.display = 'none';
        if (featuredResults) featuredResults.style.display = 'none';
    }

    initializeClock() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }

    updateClock() {
        const clockElement = document.getElementById('clock');
        if (!clockElement) return;

        const now = new Date();
        const isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;

        clockElement.textContent = now.toLocaleString('es-PA', {
            ...(isMobile ? {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            } : {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            })
        });
    }

    initializeQRCode() {
        if (!window.QRCode || 
            !document.getElementById("qr-code") || 
            !document.getElementById("modaltf-qr")) {
            return;
        }

        this.setupQRElements();
        this.generateQRCodes();
        this.setupQREventListeners();
    }

    setupQRElements() {
        this.qrElement = document.getElementById("qr-code");
        this.modaltfQrElement = document.getElementById("modaltf-qr");
        this.qrmodaltf = document.getElementById("qr-modaltf");
        this.closeButton = document.querySelector(".close-button");
        this.visitUrlButton = document.getElementById("visit-url");
        this.shareButton = document.getElementById("share-qr");
        this.downloadButton = document.getElementById("download-qr");
        this.qrText = "https://www.reydelapc.com";
    }

    getQRSize() {
        const container = this.qrElement.parentElement;
        return Math.min(container.offsetWidth, container.offsetHeight);
    }

    generateQRCodes() {
        this.qrElement.innerHTML = '';
        this.modaltfQrElement.innerHTML = '';

        const mainSize = this.getQRSize();
        const modaltfSize = window.innerHeight * 0.7;

        this.generateSingleQR(this.qrElement, mainSize);
        this.generateSingleQR(this.modaltfQrElement, modaltfSize);
    }

    generateSingleQR(element, size) {
        new QRCode(element, {
            text: this.qrText,
            width: size,
            height: size,
            colorDark: "#2563eb",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    setupQREventListeners() {
        this.qrElement.addEventListener("click", () => {
            this.qrmodaltf.style.display = "flex";
        });

        this.closeButton.addEventListener("click", () => {
            this.qrmodaltf.style.display = "none";
        });

        this.visitUrlButton.addEventListener("click", () => {
            window.open(this.qrText, "_blank");
        });

        this.shareButton.addEventListener("click", async () => {
            await this.shareQRCode();
        });

        this.downloadButton.addEventListener("click", () => {
            this.downloadQRCode();
        });
    }

    async shareQRCode() {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "QR Code",
                    text: this.qrText,
                    url: this.qrText
                });
            } catch (error) {
                console.error("Error al compartir:", error);
            }
        } else {
            alert("Compartir no es compatible con este navegador.");
        }
    }

   downloadQRCode() {
    const canvas = this.modaltfQrElement.querySelector("canvas");
    if (canvas) {
        // Create a high-resolution canvas
        const highResCanvas = document.createElement('canvas');
        highResCanvas.width = 3840;  // 4K width
        highResCanvas.height = 3840; // 4K height
        const ctx = highResCanvas.getContext('2d');

        // Scale and draw the original QR code to the high-res canvas
        const scaleFactor = highResCanvas.width / canvas.width;
        ctx.drawImage(canvas, 0, 0, canvas.width * scaleFactor, canvas.height * scaleFactor);

        // Create download link
        const link = document.createElement("a");
        link.href = highResCanvas.toDataURL("image/png");
        link.download = "qr-code.png";
        link.click();
    }
}


async downloadAsPDF(content, filename) {
    try {
        // Load dependencies in parallel
        await Promise.all([
            this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
            this.loadScript('https://cdn.jsdelivr.net/npm/qrcode@1.4.4/build/qrcode.min.js')
        ]);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Page configuration
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
        };

        // Enhanced color palette with opacity support
        const colors = {
            primary: {
                main: [64, 159, 255],     // #409FFF - Modern blue
                light: [235, 245, 255],   // Lighter shade for backgrounds
                dark: [41, 98, 255],      // Darker shade for emphasis
            },
            secondary: {
                main: [51, 51, 51],       // Main text color
                light: [119, 119, 119],   // Secondary text
                dark: [34, 34, 34],       // Headers
            },
            accent: {
                success: [76, 175, 80],   // Green for positive elements
                info: [3, 169, 244],      // Blue for information
                warning: [255, 152, 0],   // Orange for warnings
            },
            background: {
                paper: [255, 255, 255],   // White
                default: [249, 250, 251], // Light gray
            }
        };

        // Enhanced typography system
        const typography = {
            h1: { size: 24, style: 'bold' },
            h2: { size: 18, style: 'bold' },
            h3: { size: 16, style: 'bold' },
            subtitle1: { size: 14, style: 'normal' },
            subtitle2: { size: 12, style: 'normal' },
            body1: { size: 10, style: 'normal' },
            body2: { size: 9, style: 'normal' },
            caption: { size: 8, style: 'normal' }
        };

        // Load professional fonts
        doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Bold.ttf', 'Roboto', 'bold');
        doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf', 'Roboto', 'italic');

        // Profile data with fallback
        const profileData = {
            name: 'NODIER ALEXANDER GARCÍA',
            profession: 'ESPECIALISTA EN SISTEMAS Y REDES INFORMÁTICAS',
            email: 'nodier@reydelapc.com',
            phone: '+507 62571141',
            location: 'Panamá',
            website: 'https://nodier.reydelapc.com'
        };

        // Header with gradient effect
        const drawGradientHeader = () => {
            const headerHeight = 50;
            const gradientSteps = 20;
            const stepHeight = headerHeight / gradientSteps;
            
            for (let i = 0; i < gradientSteps; i++) {
                const alpha = 1 - (i / gradientSteps) * 0.3;
                const color = colors.primary.main.map(c => Math.floor(c * alpha));
                doc.setFillColor(...color);
                doc.rect(0, i * stepHeight, pageWidth, stepHeight + 0.5, 'F');
            }
        };

        // Draw header
        drawGradientHeader();

        // Profile photo with enhanced circular mask
        const profileImg = document.getElementById('profile-photo');
        if (profileImg) {
            try {
                const profileImgData = await this.getBase64Image(profileImg);
                // Create circular mask with shadow
                doc.setFillColor(...colors.background.paper);
                doc.circle(margin.left + 15, 25, 15, 'F');
                
                // Add subtle shadow
                doc.setFillColor(0, 0, 0, 0.1);
                doc.circle(margin.left + 15, 25, 15.5, 'F');
                
                // Add profile image
                doc.addImage(profileImgData, 'JPEG', margin.left, 10, 30, 30, undefined, 'FAST');
            } catch (error) {
                console.warn('Profile image loading failed:', error);
            }
        }

        // Enhanced QR Code with gradient background
        const generateQRCode = async () => {
            const qrCanvas = document.createElement('canvas');
            await QRCode.toCanvas(qrCanvas, profileData.website, {
                width: 100,
                margin: 0,
                color: {
                    dark: '#FFFFFF',
                    light: '#00000000'
                }
            });
            return qrCanvas.toDataURL('image/png');
        };

        const qrImgData = await generateQRCode();
        doc.addImage(qrImgData, 'PNG', pageWidth - 40, 10, 25, 25);

        // Header text with improved typography
        const renderHeaderText = () => {
            // Name
            doc.setTextColor(255, 255, 255);
            doc.setFont('Roboto', typography.h2.style);
            doc.setFontSize(typography.h2.size);
            doc.text(profileData.name, margin.left + 40, 22);
            
            // Profession
            doc.setFont('Roboto', typography.subtitle1.style);
            doc.setFontSize(typography.subtitle1.size);
            doc.text(profileData.profession, margin.left + 40, 30);
        };

        renderHeaderText();

        // Contact information with modern icons
        const renderContactInfo = () => {
            const contactStartX = margin.left + 40;
            doc.setFontSize(typography.body2.size);
            doc.setTextColor(255, 255, 255);

            // Modern icon designs
            const icons = {
                email: (x, y) => {
                    doc.setLineWidth(0.3);
                    doc.setDrawColor(255, 255, 255);
                    const w = 3.5, h = 2.5;
                    doc.line(x, y, x + w, y);
                    doc.line(x, y, x + (w/2), y + h);
                    doc.line(x + w, y, x + (w/2), y + h);
                },
                phone: (x, y) => {
                    doc.setLineWidth(0.3);
                    doc.setDrawColor(255, 255, 255);
                    const r = 1.2;
                    doc.circle(x + r, y + r, r, 'S');
                    doc.line(x + r, y + r * 2, x + r, y + r * 3);
                },
                location: (x, y) => {
                    doc.setLineWidth(0.3);
                    doc.setDrawColor(255, 255, 255);
                    doc.circle(x + 1.5, y + 1, 1, 'S');
                    doc.line(x + 1.5, y + 2, x + 1.5, y + 3.5);
                }
            };

            // Render contact items with proper spacing
            const renderContactItem = (icon, text, x) => {
                const iconSize = 4;
                const spacing = 5;
                
                icons[icon](x, 37);
                doc.text(text, x + iconSize + spacing, 40);
                
                return x + doc.getStringUnitWidth(text) * typography.body2.size / doc.internal.scaleFactor + iconSize + spacing + 15;
            };

            let currentX = contactStartX;
            currentX = renderContactItem('email', profileData.email, currentX);
            currentX = renderContactItem('phone', profileData.phone, currentX);
            renderContactItem('location', profileData.location, currentX);
        };

        renderContactInfo();

        // Skills section with modern design
        const renderSkills = (startY) => {
            const skillCategories = {
                'Desarrollo Web': ['HTML5', 'CSS3', 'PHP', 'JavaScript', 'WordPress'],
                'Redes y Sistemas': ['Routing', 'Switching', 'Redes', 'VoIP', 'Virtualización']
            };

            let currentY = startY;
            const columns = 5;
            const boxWidth = (pageWidth - margin.left - margin.right - (columns - 1) * 4) / columns;
            const boxHeight = 10;
            const boxSpacing = 4;

            Object.entries(skillCategories).forEach(([category, skills]) => {
                // Category header with accent line
                doc.setFont('Roboto', typography.h3.style);
                doc.setFontSize(typography.h3.size);
                doc.setTextColor(...colors.primary.main);
                doc.text(category, margin.left, currentY);

                // Accent line
                doc.setDrawColor(...colors.primary.main);
                doc.setLineWidth(0.5);
                doc.line(margin.left, currentY + 1, margin.left + 40, currentY + 1);

                currentY += 8;

                // Skills with enhanced design
                doc.setFont('Roboto', typography.body1.style);
                doc.setFontSize(typography.body1.size);
                
                let currentX = margin.left;
                skills.forEach((skill, index) => {
                    // Gradient background for skill boxes
                    const drawSkillBox = (x, y, width, height) => {
                        const gradient = doc.setFillColor(...colors.primary.light);
                        doc.roundedRect(x, y, width, height, 2, 2, 'F');
                        
                        // Skill border
                        doc.setDrawColor(...colors.primary.main);
                        doc.setLineWidth(0.2);
                        doc.roundedRect(x, y, width, height, 2, 2, 'S');
                    };

                    drawSkillBox(currentX, currentY, boxWidth, boxHeight);

                    // Skill text
                    doc.setTextColor(...colors.secondary.main);
                    const textWidth = doc.getStringUnitWidth(skill) * typography.body1.size / doc.internal.scaleFactor;
                    doc.text(skill, currentX + (boxWidth - textWidth) / 2, currentY + 6.5);

                    currentX += boxWidth + boxSpacing;
                    if ((index + 1) % columns === 0) {
                        currentX = margin.left;
                        currentY += boxHeight + 4;
                    }
                });

                currentY += boxHeight + 8;
            });

            return currentY;
        };

        // Start content sections
        let yPosition = 60;
        yPosition = renderSkills(yPosition);

        // Process content sections with enhanced styling
        const renderContentSections = () => {
            const sections = content?.querySelectorAll('.sectioncvt') || [];
            
            sections.forEach(section => {
                const header = section.querySelector('.sectioncvt-header h2');
                const content = section.querySelector('.sectioncvt-content');
                
                if (header && content) {
                    // Section header with accent styling
                    doc.setFont('Roboto', typography.h3.style);
                    doc.setFontSize(typography.h3.size);
                    doc.setTextColor(...colors.primary.main);
                    doc.text(header.textContent, margin.left, yPosition);

                    // Decorative line with gradient
                    const lineWidth = 40;
                    doc.setLineWidth(0.5);
                    doc.setDrawColor(...colors.primary.main);
                    doc.line(margin.left, yPosition + 1, margin.left + lineWidth, yPosition + 1);

                    // Content with improved typography
                    doc.setFont('Roboto', typography.body1.style);
                    doc.setFontSize(typography.body1.size);
                    doc.setTextColor(...colors.secondary.main);
                    
                    const contentText = content.innerText;
                    const splitText = doc.splitTextToSize(contentText, pageWidth - margin.left - margin.right);
                    
                    yPosition += 8;
                    doc.text(splitText, margin.left, yPosition);
                    yPosition += (splitText.length * 5) + 12;
                }
            });
        };

        renderContentSections();

        // Enhanced footer with modern design
        const renderFooter = () => {
            const footerText = `© ${new Date().getFullYear()} ${profileData.name} - Professional CV`;
            doc.setFont('Roboto', typography.caption.style);
            doc.setFontSize(typography.caption.size);
            doc.setTextColor(...colors.secondary.light);
            
            const footerWidth = doc.getStringUnitWidth(footerText) * typography.caption.size / doc.internal.scaleFactor;
            doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - margin.bottom);

            // Decorative line
            doc.setDrawColor(...colors.primary.light);
            doc.setLineWidth(0.2);
            doc.line(margin.left, pageHeight - margin.bottom - 3, pageWidth - margin.right, pageHeight - margin.bottom - 3);
        };

        renderFooter();

        // Save the enhanced PDF
        doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error('PDF Generation Error:', error);
        alert('Error al generar el PDF. Por favor intente nuevamente.');
        throw error;
    }
}

// Helper functions with improved error handling
async loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = (error) => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

async getBase64Image(imgElement) {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = imgElement.width;
            canvas.height = imgElement.height;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                throw new Error('Failed to get canvas context');
            }
            
            ctx.drawImage(imgElement, 0, 0);
            
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Failed to create image blob'));
                    return;
                }

                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = (error) => reject(new Error('Failed to read image data: ' + error.message));
                reader.readAsDataURL(blob);
            }, 'image/jpeg', 0.95); // Mejor calidad de imagen
        } catch (error) {
            reject(new Error('Image processing failed: ' + error.message));
        }
    });
}

// Función auxiliar para manejar gradientes
function createGradient(doc, startColor, endColor, x, y, width, height) {
    const steps = 20;
    const stepHeight = height / steps;
    
    for (let i = 0; i < steps; i++) {
        const ratio = i / steps;
        const currentColor = startColor.map((start, index) => 
            Math.floor(start + (endColor[index] - start) * ratio)
        );
        
        doc.setFillColor(...currentColor);
        doc.rect(x, y + (i * stepHeight), width, stepHeight + 0.5, 'F');
    }
}

// Función auxiliar para crear sombras
function drawShadow(doc, x, y, width, height, radius = 0) {
    const shadowSteps = 5;
    const shadowBlur = 2;
    
    for (let i = 0; i < shadowSteps; i++) {
        const alpha = (shadowSteps - i) / (shadowSteps * 2);
        doc.setFillColor(0, 0, 0, alpha);
        
        if (radius > 0) {
            doc.roundedRect(
                x + shadowBlur - i/2,
                y + shadowBlur - i/2,
                width + i,
                height + i,
                radius,
                radius,
                'F'
            );
        } else {
            doc.rect(
                x + shadowBlur - i/2,
                y + shadowBlur - i/2,
                width + i,
                height + i,
                'F'
            );
        }
    }
}

// Función para manejar el texto responsivo
function fitTextInWidth(doc, text, maxWidth, fontSize) {
    doc.setFontSize(fontSize);
    let textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
    
    while (textWidth > maxWidth && fontSize > 8) {
        fontSize--;
        doc.setFontSize(fontSize);
        textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
    }
    
    return fontSize;
}

// Función para validar y sanitizar el contenido
function sanitizeContent(content) {
    if (!content) return '';
    
    // Eliminar caracteres especiales potencialmente problemáticos
    return content.toString()
        .replace(/[^\w\s\-.,;:!?()[\]{}@#$%&*+=/<>]/g, '')
        .trim();
}

// Función para manejar errores de forma más elegante
function handleError(error, customMessage = 'Ha ocurrido un error') {
    console.error('PDF Generation Error:', error);
    
    // Crear un mensaje de error más amigable
    const errorMessage = {
        'script-load-failed': 'No se pudieron cargar las dependencias necesarias',
        'image-processing-failed': 'Error al procesar la imagen del perfil',
        'content-processing-failed': 'Error al procesar el contenido del CV',
        'pdf-generation-failed': 'Error al generar el PDF',
        'unknown': 'Error desconocido'
    };
    
    const errorType = error.message?.toLowerCase().includes('script') ? 'script-load-failed'
        : error.message?.toLowerCase().includes('image') ? 'image-processing-failed'
        : error.message?.toLowerCase().includes('content') ? 'content-processing-failed'
        : error.message?.toLowerCase().includes('pdf') ? 'pdf-generation-failed'
        : 'unknown';
    
    alert(`${customMessage}: ${errorMessage[errorType]}`);
    throw error;
}

// Función para verificar el soporte del navegador
function checkBrowserSupport() {
    const requirements = {
        canvas: !!document.createElement('canvas').getContext,
        blob: !!window.Blob,
        fileReader: !!window.FileReader,
        promise: !!window.Promise
    };
    
    const unsupported = Object.entries(requirements)
        .filter(([, supported]) => !supported)
        .map(([feature]) => feature);
    
    if (unsupported.length > 0) {
        throw new Error(
            `Su navegador no soporta las siguientes características necesarias: ${unsupported.join(', ')}`
        );
    }
    
    return true;
}

// Función para optimizar el rendimiento
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Función para manejar la carga asíncrona de recursos
async function preloadResources(resources) {
    const loadPromises = resources.map(resource => {
        if (resource.type === 'image') {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(`Failed to load image: ${resource.url}`));
                img.src = resource.url;
            });
        } else if (resource.type === 'script') {
            return this.loadScript(resource.url);
        }
    });
    
    try {
        return await Promise.all(loadPromises);
    } catch (error) {
        handleError(error, 'Error al cargar los recursos necesarios');
    }
}

    async downloadAsWord(content, filename) {
        const htmlContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office'>
                <head>
                    <meta charset='utf-8'>
                    <title>${filename}</title>
                </head>
                <body>${content.innerHTML}</body>
            </html>
        `;
        const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.doc`;
        link.click();
        URL.revokeObjectURL(url);
    }

    async downloadAsImage(content, filename) {
        const canvas = await html2canvas(content, { scale: 2, useCORS: true });
        const imageUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `${filename}.png`;
        link.click();
    }

    shareCV() {
        const shareData = {
            title: 'CV - Nodier Alexander Garcia',
            text: 'Mira mi CV profesional',
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href)
                .then(() => alert(TRANSLATIONS[CONFIG.DEFAULT_LANG].copied))
                .catch(console.error);
        }
    }


    setupLanguageChange() {
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.addEventListener('change', () => this.loadCV());
        }
    }

    // modaltf utility functions
showPhonemodaltf() {
    const modaltf = document.getElementById('phonemodaltf');
    if (modaltf) {
        modaltf.style.display = 'flex';
    }
}

showDownloadmodaltf() {
    const modaltf = document.getElementById('downloadmodaltf');
    if (modaltf) {
        modaltf.style.display = 'flex';
    }
}

closemodaltf(modaltfId) {
    const modaltf = document.getElementById(modaltfId);
    if (modaltf) {
        modaltf.style.display = 'none';
    }
}

setupmodaltfHandlers() {
    // Cierra los modaltfes al hacer clic fuera
    window.onclick = (event) => {
        if (event.target.classList.contains('modaltf')) {
            event.target.style.display = 'none';
        }
    };

    // Cierra los modaltfes con la tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modaltf').forEach(modaltf => {
                modaltf.style.display = 'none';
            });
        }
    });
}

    openMap() {
        window.open('https://www.google.com/maps/search/David,+Chiriquí,+Panamá', '_blank');
    }

    printCV() {
        window.print();
    }
}

function downloadPhoto(style) {
    const img = document.getElementById('modal-photo');
    const link = document.createElement('a');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Apply style filter
    if (style === 'black-white') {
        ctx.globalCompositeOperation = 'saturation';
        ctx.fillStyle = 'gray';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (style === 'sepia') {
        ctx.filter = 'sepia(1)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    link.download = `photo-${style}.png`;
    link.href = canvas.toDataURL();
    link.click();
}
          
          // Función para copiar el número de teléfono al portapapeles
    function copyPhoneNumber() {
        const phoneNumber = "+50762571141";
        navigator.clipboard.writeText(phoneNumber).then(function() {
            alert('Número copiado al portapapeles');
        }).catch(function(err) {
            console.error('Error al copiar al portapapeles: ', err);
        });
    }

// Initialize the application
const cvManager = new CVManager();

// Global function exports for HTML event handlers
window.cvManager = cvManager;
window.togglesectioncvt = (sectioncvtId) => cvManager.togglesectioncvt(sectioncvtId);
window.showPhonemodaltf = () => cvManager.showPhonemodaltf();
window.openMap = () => cvManager.openMap();
window.closemodaltf = (modaltfId) => cvManager.closemodaltf(modaltfId);
window.showDownloadmodaltf = () => cvManager.showDownloadmodaltf();
window.shareCV = () => cvManager.shareCV();
window.printCV = () => cvManager.printCV();
window.downloadCV = (format) => cvManager.downloadCV(format);
window.showFeatured = () => cvManager.showFeatured();
window.showSkillResults = (skill) => cvManager.showSkillResults(skill);
window.showFullCV = () => cvManager.showFullCV();
</script>
