/**
 * @module markdownService
 * Configures and provides functions for Markdown rendering, syntax highlighting, and diagram generation.
 * This module relies on `marked`, `mermaid`, and `hljs` (highlight.js) being available in the global scope.
 */

/**
 * Initializes the Markdown rendering libraries with specific configurations.
 * @param {boolean} isDarkMode - Whether to initialize in dark mode for theming.
 */
export function initializeMarkdownServices(isDarkMode = false) {
  // 1. Configure marked.js
  const renderer = new marked.Renderer();

  // Custom renderer for code blocks to support Mermaid and syntax highlighting
  renderer.code = (code, language) => {
    const lang = language ? language.toLowerCase() : '';

    if (lang === 'mermaid') {
      return `<div class="mermaid">${code}</div>`;
    }
    if (lang === 'schema') {
      return `<div class="mermaid schema-diagram">${code}</div>`;
    }

    // Syntax highlighting with highlight.js if available
    if (window.hljs && lang && window.hljs.getLanguage(lang)) {
      try {
        const highlightedCode = window.hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
        return `<pre><code class="hljs language-${lang}">${highlightedCode}</code></pre>`;
      } catch (e) {
        console.error(`Error highlighting language ${lang}:`, e);
      }
    }

    // Fallback for no language or if hljs fails
    const escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre><code class="language-${lang}">${escapedCode}</code></pre>`;
  };

  marked.setOptions({
    renderer: renderer,
    pedantic: false,
    gfm: true,
    breaks: true,
    sanitize: false,
    smartLists: true,
    smartypants: true,
    xhtml: true,
    headerIds: true,
    mangle: false,
  });

  // 2. Configure mermaid.js
  mermaid.initialize({
    startOnLoad: false,
    theme: isDarkMode ? 'dark' : 'default',
    securityLevel: 'strict',
    fontFamily: 'Inter, sans-serif',
  });
}

/**
 * Updates the theme for Mermaid diagrams. This is useful for light/dark mode toggling.
 * @param {boolean} isDarkMode - Whether to use the dark theme.
 */
export function updateMermaidTheme(isDarkMode) {
  // Re-initialize with the new theme.
  mermaid.initialize({
    startOnLoad: false,
    theme: isDarkMode ? 'dark' : 'default',
    securityLevel: 'strict',
    fontFamily: 'Inter, sans-serif',
  });
}

/**
 * Parses a Markdown string into an HTML string.
 * @param {string} markdownText - The Markdown text to parse.
 * @returns {string} The resulting HTML.
 */
export function parseMarkdown(markdownText) {
  try {
    return marked.parse(markdownText);
  } catch (error) {
    console.error("Error parsing Markdown:", error);
    return "<p>Error rendering Markdown. Please check your syntax.</p>";
  }
}

/**
 * Renders all Mermaid diagrams within a given DOM element.
 * It finds elements with the `.mermaid` class and processes them.
 * @param {HTMLElement} element - The container element to search for diagrams.
 */
export function renderMermaidDiagrams(element) {
  try {
    const diagrams = element.querySelectorAll('.mermaid');
    if (diagrams.length > 0) {
      // For Mermaid v9+, `run` is the recommended method.
      mermaid.run({
        nodes: diagrams,
      });
    }
  } catch (error) {
    console.error("Error rendering Mermaid diagrams:", error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
    const markdownInput = document.getElementById('markdown-input');
    const preview = document.getElementById('preview');
    const downloadPdfBtn = document.getElementById('download-pdf');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const layoutToggleBtn = document.getElementById('layout-toggle');
    const editorContainer = document.querySelector('.editor-container');

    // --- Marked.js Setup ---
    const renderer = new marked.Renderer();
    renderer.code = (code, language) => {
        if (language === 'mermaid') {
            return `<div class="mermaid">${code}</div>`;
        }
        if (hljs.getLanguage(language)) {
            try {
                const highlightedCode = hljs.highlight(code, { language, ignoreIllegals: true }).value;
                return `<pre><code class="hljs ${language}">${highlightedCode}</code></pre>`;
            } catch (__) {}
        }
        // Fallback for no language or error
        const escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<pre><code class="hljs">${escapedCode}</code></pre>`;
    };

    marked.setOptions({
        renderer: renderer,
        pedantic: false,
        gfm: true,
        breaks: true,
        sanitize: false,
        smartLists: true,
        smartypants: false,
        xhtml: false
    });

    // --- Mermaid.js Setup ---
    mermaid.initialize({ 
        startOnLoad: false,
        theme: 'default',
    });

    // --- Core Functions ---
    function updatePreview() {
        const markdownText = markdownInput.value;
        preview.innerHTML = marked.parse(markdownText);
        
        try {
            mermaid.run({
                nodes: preview.querySelectorAll('.mermaid')
            });
        } catch (e) {
            console.error("Error rendering Mermaid diagrams:", e);
        }
    }

    function saveContent() {
        localStorage.setItem('markdown-content', markdownInput.value);
    }

    // --- Event Listeners ---
    markdownInput.addEventListener('input', () => {
        updatePreview();
        saveContent();
    });

    downloadPdfBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'pt',
            format: 'a4'
        });

        downloadPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        downloadPdfBtn.disabled = true;

        html2canvas(preview, {
            scale: 2,
            useCORS: true,
            backgroundColor: document.body.classList.contains('dark-theme') ? '#1a1a1a' : '#ffffff',
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const imgProps = doc.getImageProperties(imgData);
            const pdfWidth = doc.internal.pageSize.getWidth() - 80; // A4 width in pt minus margins
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = pdfHeight;
            let position = 40; // Top margin
            const pageHeight = doc.internal.pageSize.getHeight() - 80;

            doc.addImage(imgData, 'PNG', 40, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = -heightLeft - 40; // Adjust position for subsequent pages
                doc.addPage();
                doc.addImage(imgData, 'PNG', 40, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }

            doc.save('markdown-export.pdf');
        }).catch(err => {
            console.error("Error generating PDF:", err);
            alert("Sorry, there was an error generating the PDF. Check the console for details.");
        }).finally(() => {
            downloadPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Download PDF';
            downloadPdfBtn.disabled = false;
        });
    });

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        themeToggleBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default'
        });
        updatePreview();
    });

    layoutToggleBtn.addEventListener('click', () => {
        editorContainer.classList.toggle('vertical-layout');
        const isVertical = editorContainer.classList.contains('vertical-layout');
        layoutToggleBtn.innerHTML = isVertical ? '<i class="fas fa-columns"></i>' : '<i class="fas fa-arrows-alt-v"></i>';
        localStorage.setItem('layout', isVertical ? 'vertical' : 'horizontal');
    });

    // --- Initial Load ---
    function loadPreferences() {
        const savedTheme = localStorage.getItem('theme');
        const isDark = savedTheme === 'dark';
        if (isDark) {
            document.body.classList.add('dark-theme');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        }
        mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default'
        });

        const savedLayout = localStorage.getItem('layout');
        if (savedLayout === 'vertical') {
            editorContainer.classList.add('vertical-layout');
            layoutToggleBtn.innerHTML = '<i class="fas fa-columns"></i>';
        }

        const savedMarkdown = localStorage.getItem('markdown-content');
        if (savedMarkdown) {
            markdownInput.value = savedMarkdown;
        } else {
            markdownInput.value = `# Welcome to Markdown Pro!

This is a live preview editor. Type your Markdown in the left panel, and see it rendered on the right.

## Features

- **Live Preview**: Updates as you type.
- **GitHub Flavored Markdown**: With support for tables, code blocks, and more.
- **Syntax Highlighting**: For various programming languages.
\`\`\`javascript
function helloWorld() {
  console.log("Hello, world!");
}
\`\`\`
- **Mermaid.js Support**: Create diagrams directly in your markdown.

\`\`\`mermaid
graph TD;
    A[Start] --> B{Is it?};
    B -- Yes --> C[OK];
    C --> D[End];
    B -- No --> E[Find out];
    E --> B;
\`\`\`

- **PDF Export**: Download your rendered markdown as a PDF.
- **Theme Toggle**: Switch between light and dark modes.
- **Layout Toggle**: Switch between horizontal and vertical split views.

Enjoy creating!
`;
        }
    }

    loadPreferences();
    updatePreview();
});
