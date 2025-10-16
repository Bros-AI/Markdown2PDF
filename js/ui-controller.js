/**
 * @module UIController
 * Handles all DOM interactions, event listeners, and UI updates.
 * This module is responsible for the "View" part of the application,
 * keeping the DOM manipulation logic separate from the business logic.
 */

import { generatePdf } from './pdf-generator.js';
import { initializeMarkdownServices, updateMermaidTheme, parseMarkdown, renderMermaidDiagrams } from './markdown-service.js';

// --- DOM Element References ---
export const elements = {
    markdownInput: document.getElementById('markdown-input'),
    previewContent: document.getElementById('preview-content'),
    themeToggle: document.getElementById('theme-toggle'),
    sunIcon: document.getElementById('sun-icon'),
    moonIcon: document.getElementById('moon-icon'),
    generatePdfBtn: document.getElementById('generate-pdf-btn'),
    clearBtn: document.getElementById('clear-btn'),
    saveMarkdownBtn: document.getElementById('save-markdown-btn'),
    uploadBtn: document.getElementById('upload-btn'),
    fileInput: document.getElementById('file-input'),
    printBtn: document.getElementById('print-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    keyboardShortcutsBtn: document.getElementById('keyboard-shortcuts'),
    settingsModal: document.getElementById('settings-modal'),
    keyboardShortcutsModal: document.getElementById('keyboard-shortcuts-modal'),
    modalOverlays: document.querySelectorAll('.modal-overlay'),
    modalCloseBtns: document.querySelectorAll('.modal-close'),
    saveSettingsBtn: document.getElementById('save-settings'),
    pdfFilenameInput: document.getElementById('pdf-filename'),
    pdfFormatSelect: document.getElementById('pdf-format'),
    pdfOrientationSelect: document.getElementById('pdf-orientation'),
    pdfMarginInput: document.getElementById('pdf-margin'),
    toastContainer: document.getElementById('toast-container'),
    toolbarBtns: document.querySelectorAll('.toolbar-btn'),
    // New elements for resizable splitter and viewer mode
    mainContainer: document.querySelector('.main-container'),
    editorPane: document.querySelector('.editor-pane'),
    splitter: document.getElementById('splitter'),
    viewerModeBtn: document.getElementById('viewer-mode-btn'),
};

// --- Toast Notifications ---
export function showToast(message, type = 'success') {
    if (!elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else if (type === 'warning' || type === 'info') {
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    }

    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-message">${message}</div>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// --- Local Storage Persistence ---
export function savePreferences(state) {
    try {
        localStorage.setItem('markdownContent', state.markdownContent);
        localStorage.setItem('pdfSettings', JSON.stringify(state.pdfSettings));
        localStorage.setItem('darkMode', state.darkMode);
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        showToast('Could not save preferences', 'error');
    }
}

export function loadPreferences() {
    try {
        const savedContent = localStorage.getItem('markdownContent');
        const savedSettings = localStorage.getItem('pdfSettings');
        const savedDarkMode = localStorage.getItem('darkMode');

        const defaultState = {
            pdfSettings: {
                filename: 'document.pdf',
                format: 'a4',
                orientation: 'portrait',
                margin: 20
            },
            darkMode: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
        };

        return {
            markdownContent: savedContent || null,
            pdfSettings: savedSettings ? JSON.parse(savedSettings) : defaultState.pdfSettings,
            darkMode: savedDarkMode !== null ? (savedDarkMode === 'true') : defaultState.darkMode,
        };
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        showToast('Could not load saved preferences', 'error');
        return { markdownContent: null };
    }
}

// --- Theme Management ---
export function updateThemeUI(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (elements.sunIcon) elements.sunIcon.style.display = isDark ? 'inline' : 'none';
    if (elements.moonIcon) elements.moonIcon.style.display = isDark ? 'none' : 'inline';
}

// --- Modal Management ---
function openModal(modal) {
    if (modal) modal.classList.add('active');
}

function closeModal(modal) {
    if (modal) modal.classList.remove('active');
}

function closeAllModals() {
    elements.modalOverlays.forEach(closeModal);
}

// --- Editor and Form Updates ---
export function updateEditorContent(content) {
    if (elements.markdownInput.value !== content) {
        elements.markdownInput.value = content;
    }
}

export function updatePdfSettingsForm(settings) {
    if (!settings) return;
    elements.pdfFilenameInput.value = settings.filename;
    elements.pdfFormatSelect.value = settings.format;
    elements.pdfOrientationSelect.value = settings.orientation;
    elements.pdfMarginInput.value = settings.margin;
}

function getPdfSettingsFromForm() {
    return {
        filename: elements.pdfFilenameInput.value || 'document.pdf',
        format: elements.pdfFormatSelect.value,
        orientation: elements.pdfOrientationSelect.value,
        margin: parseInt(elements.pdfMarginInput.value, 10) || 20,
    };
}

// --- Toolbar Actions ---
function handleToolbarAction(action, onUpdate) {
    const textarea = elements.markdownInput;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let replacement = '';

    switch (action) {
        case 'bold':
            replacement = `**${selectedText || 'bold text'}**`;
            break;
        case 'italic':
            replacement = `*${selectedText || 'italic text'}*`;
            break;
        case 'heading':
            replacement = `\n## ${selectedText || 'Heading'}\n`;
            break;
        case 'link':
            replacement = `[${selectedText || 'link text'}](https://example.com)`;
            break;
        case 'ul':
            replacement = selectedText ? selectedText.split('\n').map(line => `- ${line}`).join('\n') : '- List item';
            break;
        case 'ol':
            replacement = selectedText ? selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n') : '1. List item';
            break;
        case 'code':
            replacement = `\`\`\`\n${selectedText || 'code'}\n\`\`\``;
            break;
        case 'quote':
            replacement = selectedText ? selectedText.split('\n').map(line => `> ${line}`).join('\n') : '> Blockquote';
            break;
        case 'table':
            replacement = `| Header 1 | Header 2 | Header 3 |\n| -------- | -------- | -------- |\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |`;
            break;
        case 'mermaid':
            replacement = `\`\`\`mermaid\ngraph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Do Something]\n    B -->|No| D[Do Something Else]\n    C --> E[End]\n    D --> E\n\`\`\``;
            break;
        default:
            return;
    }

    textarea.setRangeText(replacement, start, end, 'end');
    textarea.focus();
    onUpdate(textarea.value);
}

// --- Default Content ---
export function getDefaultMarkdown() {
    return `# Markdown to PDF Converter 🚀
> Transform your ideas into beautiful PDFs in seconds

## About This Project
This tool converts Markdown (including diagrams) into professional PDFs. It supports:
- Standard Markdown syntax
- Mermaid diagrams for graphs and schemas
- Tables, lists, and code blocks

## Example Mermaid Diagram
\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Check the code]
    D --> B
\`\`\`

## Features
- ⚡ Real-time preview
- 🎨 Clean, modern styling
- 📱 Responsive design
- 🖨️ One-click PDF export
- 💾 Auto-save functionality

## Example Table

| Feature | Description | Status |
|---------|-------------|--------|
| Markdown Support | Renders standard markdown | ✅ |
| Mermaid Diagrams | Flowcharts and sequences | ✅ |
| PDF Export | Generate downloadable PDF | ✅ |
| Dark Mode | For comfortable night editing | ✅ |
| Keyboard Shortcuts | Faster editing | ✅ |

## Code Example

\`\`\`javascript
// Simple JavaScript function
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

---
*Created with ❤️ by [Gauthier Bros](https://bros.ai) | Contact: gauthier.bros@gmail.com*`;
}

// --- Dynamic Element Creation ---
function createModalElements() {
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = `
        <!-- Settings Modal -->
        <div id="settings-modal" class="modal-overlay">
            <div class="modal-content">
                <button class="modal-close" aria-label="Close settings modal">&times;</button>
                <h2>PDF Settings</h2>
                <form id="pdf-settings-form">
                    <div class="form-group">
                        <label for="pdf-filename">Filename</label>
                        <input type="text" id="pdf-filename" placeholder="document.pdf">
                    </div>
                    <div class="form-group">
                        <label for="pdf-format">Page Format</label>
                        <select id="pdf-format">
                            <option value="a4">A4</option>
                            <option value="letter">Letter</option>
                            <option value="legal">Legal</option>
                            <option value="tabloid">Tabloid</option>
                            <option value="a3">A3</option>
                            <option value="a5">A5</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="pdf-orientation">Orientation</label>
                        <select id="pdf-orientation">
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="pdf-margin">Margin (mm)</label>
                        <input type="number" id="pdf-margin" value="20" min="0" max="100">
                    </div>
                    <button type="button" id="save-settings" class="btn btn-primary">Save Settings</button>
                </form>
            </div>
        </div>

        <!-- Keyboard Shortcuts Modal -->
        <div id="keyboard-shortcuts-modal" class="modal-overlay">
            <div class="modal-content">
                <button class="modal-close" aria-label="Close keyboard shortcuts modal">&times;</button>
                <h2>Keyboard Shortcuts</h2>
                <ul class="shortcuts-list">
                    <li><strong>Ctrl/Cmd + B:</strong> Bold</li>
                    <li><strong>Ctrl/Cmd + I:</strong> Italic</li>
                    <li><strong>Ctrl/Cmd + K:</strong> Link</li>
                    <li><strong>Ctrl/Cmd + H:</strong> Heading</li>
                    <li><strong>Ctrl/Cmd + U:</strong> Unordered List</li>
                    <li><strong>Ctrl/Cmd + O:</strong> Ordered List</li>
                    <li><strong>Ctrl/Cmd + Q:</strong> Blockquote</li>
                    <li><strong>Ctrl/Cmd + Shift + C:</strong> Code Block</li>
                    <li><strong>Ctrl/Cmd + S:</strong> Save as Markdown</li>
                    <li><strong>Ctrl/Cmd + P:</strong> Generate PDF</li>
                </ul>
            </div>
        </div>
    `;
    document.body.appendChild(modalContainer);

    // Re-populate modal-related elements
    elements.settingsModal = document.getElementById('settings-modal');
    elements.keyboardShortcutsModal = document.getElementById('keyboard-shortcuts-modal');
    elements.modalOverlays = document.querySelectorAll('.modal-overlay');
    elements.modalCloseBtns = document.querySelectorAll('.modal-close');
    elements.saveSettingsBtn = document.getElementById('save-settings');
    elements.pdfFilenameInput = document.getElementById('pdf-filename');
    elements.pdfFormatSelect = document.getElementById('pdf-format');
    elements.pdfOrientationSelect = document.getElementById('pdf-orientation');
    elements.pdfMarginInput = document.getElementById('pdf-margin');
}

// --- Event Listener Initialization ---
export function initializeEventListeners(handlers) {
    elements.themeToggle.addEventListener('click', handlers.onThemeToggle);
    elements.markdownInput.addEventListener('input', (e) => handlers.onMarkdownInput(e.target.value));
    elements.generatePdfBtn.addEventListener('click', handlers.onGeneratePdf);
    elements.clearBtn.addEventListener('click', handlers.onClearEditor);
    elements.saveMarkdownBtn.addEventListener('click', handlers.onSaveMarkdown);
    elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handlers.onFileUpload(e.target.files[0]);
    });
    elements.printBtn.addEventListener('click', handlers.onPrint);
    elements.settingsBtn.addEventListener('click', () => openModal(elements.settingsModal));
    elements.keyboardShortcutsBtn.addEventListener('click', () => openModal(elements.keyboardShortcutsModal));
    elements.saveSettingsBtn.addEventListener('click', () => {
        const newSettings = getPdfSettingsFromForm();
        handlers.onSettingsSave(newSettings);
        closeModal(elements.settingsModal);
        showToast('PDF settings saved', 'success');
    });

    elements.modalCloseBtns.forEach(btn => btn.addEventListener('click', closeAllModals));
    elements.modalOverlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeAllModals();
        });
    });

    elements.toolbarBtns.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.getAttribute('data-action');
            handleToolbarAction(action, handlers.onMarkdownInput);
        });
    });

    document.body.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.add('drop-active');
    });

    document.body.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.remove('drop-active');
    });

    document.body.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.remove('drop-active');
        handlers.onFileDrop(e);
    });

    // --- Viewer Mode ---
    if (elements.viewerModeBtn && elements.mainContainer) {
        elements.viewerModeBtn.addEventListener('click', () => {
            elements.mainContainer.classList.toggle('viewer-mode');
        });
    }

    // --- Resizable Splitter ---
    if (elements.splitter && elements.editorPane && elements.mainContainer) {
        let isDragging = false;

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const containerRect = elements.mainContainer.getBoundingClientRect();
            let newEditorWidth = e.clientX - containerRect.left;
            
            const splitterWidth = elements.splitter.offsetWidth;
            const minWidth = 100; // Minimum pane width in pixels
            const maxWidth = elements.mainContainer.offsetWidth - minWidth - splitterWidth;

            if (newEditorWidth < minWidth) newEditorWidth = minWidth;
            if (newEditorWidth > maxWidth) newEditorWidth = maxWidth;

            const newEditorFlexBasis = (newEditorWidth / elements.mainContainer.offsetWidth) * 100;
            elements.editorPane.style.flexBasis = `${newEditorFlexBasis}%`;
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        elements.splitter.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
            switch (e.key.toLowerCase()) {
                case 'b': e.preventDefault(); handleToolbarAction('bold', handlers.onMarkdownInput); break;
                case 'i': e.preventDefault(); handleToolbarAction('italic', handlers.onMarkdownInput); break;
                case 'k': e.preventDefault(); handleToolbarAction('link', handlers.onMarkdownInput); break;
                case 'h': e.preventDefault(); handleToolbarAction('heading', handlers.onMarkdownInput); break;
                case 'u': e.preventDefault(); handleToolbarAction('ul', handlers.onMarkdownInput); break;
                case 'o': e.preventDefault(); handleToolbarAction('ol', handlers.onMarkdownInput); break;
                case 'q': e.preventDefault(); handleToolbarAction('quote', handlers.onMarkdownInput); break;
                case 's': e.preventDefault(); handlers.onSaveMarkdown(); break;
                case 'p': e.preventDefault(); handlers.onGeneratePdf(); break;
                case 'z': e.preventDefault(); handlers.onUndo(); break;
                case 'y': e.preventDefault(); handlers.onRedo(); break;
            }
        } else if (e.ctrlKey && e.shiftKey) {
            if (e.key.toLowerCase() === 'c') {
                e.preventDefault();
                handleToolbarAction('code', handlers.onMarkdownInput);
            }
        }
    });
}

// --- Application Initialization ---
export function initializeApp() {
    // Create dynamic elements that were previously in index.html
    createModalElements();

    // Application state
    let state = {
        markdownContent: '',
        pdfSettings: {},
        darkMode: false,
    };

    // --- Core Functions ---
    const updatePreview = (content) => {
        const html = parseMarkdown(content);
        elements.previewContent.innerHTML = html;
        renderMermaidDiagrams();
    };

    // --- Event Handlers ---
    const handlers = {
        onMarkdownInput: (content) => {
            state.markdownContent = content;
            updatePreview(content);
            savePreferences(state);
        },
        onThemeToggle: () => {
            state.darkMode = !state.darkMode;
            updateThemeUI(state.darkMode);
            updateMermaidTheme(state.darkMode);
            savePreferences(state);
        },
        onGeneratePdf: () => {
            generatePdf(elements.previewContent, state.pdfSettings, showToast);
        },
        onClearEditor: () => {
            if (confirm('Are you sure you want to clear the editor?')) {
                const newContent = '';
                state.markdownContent = newContent;
                updateEditorContent(newContent);
                updatePreview(newContent);
                savePreferences(state);
                showToast('Editor cleared', 'info');
            }
        },
        onSaveMarkdown: () => {
            try {
                const blob = new Blob([state.markdownContent], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'document.md';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('Markdown file saved', 'success');
            } catch (error) {
                console.error('Error saving markdown file:', error);
                showToast('Could not save file', 'error');
            }
        },
        onFileUpload: (file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                state.markdownContent = content;
                updateEditorContent(content);
                updatePreview(content);
                savePreferences(state);
                showToast('File loaded successfully', 'success');
            };
            reader.onerror = () => {
                showToast('Error reading file', 'error');
            };
            reader.readAsText(file);
        },
        onPrint: () => {
            window.print();
        },
        onSettingsSave: (newSettings) => {
            state.pdfSettings = newSettings;
            savePreferences(state);
        },
        onFileDrop: (e) => {
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
                    handlers.onFileUpload(file);
                } else {
                    showToast('Please drop a Markdown file (.md)', 'warning');
                }
                e.dataTransfer.clearData();
            }
        },
        onUndo: () => { showToast("Undo not implemented", "info"); },
        onRedo: () => { showToast("Redo not implemented", "info"); },
    };

    // --- Initialization Logic ---

    // Load initial state from localStorage
    const loadedPrefs = loadPreferences();
    state.pdfSettings = loadedPrefs.pdfSettings;
    state.darkMode = loadedPrefs.darkMode;
    state.markdownContent = loadedPrefs.markdownContent || getDefaultMarkdown();

    // Initialize services
    initializeMarkdownServices();

    // Set up initial UI
    updateThemeUI(state.darkMode);
    updateMermaidTheme(state.darkMode);
    updatePdfSettingsForm(state.pdfSettings);
    updateEditorContent(state.markdownContent);
    updatePreview(state.markdownContent);

    // Attach all event listeners
    initializeEventListeners(handlers);
}