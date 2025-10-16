/**
 * Helper function to wait for a specified time.
 * This is useful to ensure that all elements, especially dynamically rendered ones like Mermaid diagrams,
 * are fully rendered before capturing the content for the PDF.
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise<void>}
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generates a PDF from the provided HTML element using the html2pdf.js library.
 * It handles UI updates, settings application, and notifications.
 *
 * @param {HTMLElement} previewElement - The HTML element containing the content to be converted to PDF.
 * @param {HTMLElement} buttonElement - The button element that triggers the PDF generation, used for UI feedback.
 * @param {object} settings - An object containing PDF settings like filename, format, orientation, and margins.
 * @param {function} showToast - A callback function to display toast notifications to the user.
 */
export async function generatePdf(previewElement, buttonElement, settings, showToast) {
    if (!previewElement || previewElement.innerHTML.trim() === '') {
        showToast('Please add some Markdown content first', 'warning');
        return;
    }

    const originalButtonContent = buttonElement.innerHTML;
    buttonElement.innerHTML = '<div class="spinner"></div> Generating...';
    buttonElement.disabled = true;

    try {
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

        // Configure options for html2pdf.js
        const pdfOptions = {
            margin: [settings.margin, settings.margin],
            filename: settings.filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                allowTaint: true,
                // Set background color based on theme for accurate PDF rendering
                backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            },
            jsPDF: {
                unit: 'mm',
                format: settings.format,
                orientation: settings.orientation,
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        };

        // Wait a moment for any final rendering, like Mermaid diagrams, to complete
        await wait(1000);

        // Use the globally available html2pdf library to generate and save the PDF
        await html2pdf().set(pdfOptions).from(previewElement).save();

        showToast('PDF generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Error generating PDF. Please try again.', 'error');
    } finally {
        // Restore the button to its original state
        buttonElement.innerHTML = originalButtonContent;
        buttonElement.disabled = false;
    }
}