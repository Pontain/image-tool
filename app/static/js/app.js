// ============================================================
// IMAGE TOOL
// Frontend logic for:
// - File upload / drag & drop
// - Image analysis
// - WebP conversion + resize
// - Background transparency
// - Cropping
// ============================================================


// ============================================================
// 1. APPLICATION STATE
// ============================================================

let currentFile = null;

let originalImageUrl = null;
let transparentPreviewUrl = null;

let cropper = null;


// ============================================================
// 2. DOM ELEMENTS
// ============================================================

// ------------------------------------------------------------
// File upload
// ------------------------------------------------------------

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const chooseNewImage = document.getElementById("chooseNewImage");


// ------------------------------------------------------------
// Image preview
// ------------------------------------------------------------

const previewPanel = document.getElementById("previewPanel");
const previewImage = document.getElementById("previewImage");


// ------------------------------------------------------------
// Image information
// ------------------------------------------------------------

const fileName = document.getElementById("fileName");
const fileType = document.getElementById("fileType");
const fileSize = document.getElementById("fileSize");
const imageDimensions = document.getElementById("imageDimensions");

const colorMode = document.getElementById("colorMode");
const transparency = document.getElementById("transparency");


// ------------------------------------------------------------
// WebP conversion
// ------------------------------------------------------------

const qualitySlider = document.getElementById("qualitySlider");
const qualityValue = document.getElementById("qualityValue");
const convertWebp = document.getElementById("convertWebp");

const conversionResult = document.getElementById("conversionResult");
const originalSizeResult = document.getElementById("originalSizeResult");
const webpSizeResult = document.getElementById("webpSizeResult");
const savingResult = document.getElementById("savingResult");


// ------------------------------------------------------------
// Resize
// ------------------------------------------------------------

const maxWidth = document.getElementById("maxWidth");
const resizePercent = document.getElementById("resizePercent");

const resizeModeInputs = document.querySelectorAll(
    'input[name="resizeMode"]'
);


// ------------------------------------------------------------
// Transparency
// ------------------------------------------------------------

const transparentColor = document.getElementById("transparentColor");
const transparentColorValue = document.getElementById(
    "transparentColorValue"
);

const toleranceSlider = document.getElementById("toleranceSlider");
const toleranceValue = document.getElementById("toleranceValue");

const previewTransparency = document.getElementById(
    "previewTransparency"
);

const showOriginal = document.getElementById("showOriginal");

const downloadTransparent = document.getElementById(
    "downloadTransparent"
);


// ------------------------------------------------------------
// Crop
// ------------------------------------------------------------

const startCrop = document.getElementById("startCrop");
const cancelCrop = document.getElementById("cancelCrop");
const downloadCrop = document.getElementById("downloadCrop");

const cropSize = document.getElementById("cropSize");

const cropRatioButtons = document.querySelectorAll(".crop-ratio");


// ============================================================
// 3. FILE UPLOAD EVENTS
// ============================================================

// Click on drop zone -> open file picker
dropZone.addEventListener("click", () => {
    fileInput.click();
});


// File selected through file picker
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];

    if (file) {
        handleImage(file);
    }
});


// Highlight drop zone while dragging file over it
dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();

    dropZone.classList.add("drag-over");
});


// Remove drag highlight when leaving
dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
});


// File dropped into drop zone
dropZone.addEventListener("drop", (event) => {
    event.preventDefault();

    dropZone.classList.remove("drag-over");

    const file = event.dataTransfer.files[0];

    if (file) {
        handleImage(file);
    }
});


// Choose another image
chooseNewImage.addEventListener("click", () => {
    fileInput.click();
});


// ============================================================
// 4. WEBP + RESIZE EVENTS
// ============================================================

// Update quality number while slider moves
qualitySlider.addEventListener("input", () => {
    qualityValue.textContent = qualitySlider.value;
});


// Recalculate WebP estimate after quality changes
qualitySlider.addEventListener("change", () => {
    if (currentFile) {
        previewWebp(currentFile);
    }
});


// Recalculate after max width changes
maxWidth.addEventListener("change", () => {
    if (currentFile) {
        previewWebp(currentFile);
    }
});


// Recalculate after percentage changes
resizePercent.addEventListener("change", () => {
    if (currentFile) {
        previewWebp(currentFile);
    }
});


// Switch between max-width and percentage resize
resizeModeInputs.forEach((input) => {
    input.addEventListener("change", () => {
        const mode = input.value;

        if (mode === "percent") {
            resizePercent.disabled = false;
            maxWidth.disabled = true;
        } else {
            resizePercent.disabled = true;
            maxWidth.disabled = false;
        }

        if (currentFile) {
            previewWebp(currentFile);
        }
    });
});


// Export final WebP
convertWebp.addEventListener("click", async () => {
    if (!currentFile) {
        return;
    }

    const formData = createImageFormData(currentFile);

    const quality = qualitySlider.value;
    const resize = getResizeSettings();

    let convertUrl =
        `/api/images/convert/webp?quality=${quality}`;

    if (
        resize.mode === "width" &&
        resize.value
    ) {
        convertUrl +=
            `&max_width=${resize.value}`;
    }

    if (
        resize.mode === "percent" &&
        resize.value
    ) {
        convertUrl +=
            `&resize_percent=${resize.value}`;
    }

    setButtonLoading(
        convertWebp,
        true,
        "Konverterar..."
    );

    try {
        const response = await fetch(
            convertUrl,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error(
                "Konverteringen misslyckades."
            );
        }

        const blob = await response.blob();

        const filenameWithoutExtension =
            getFilenameWithoutExtension(
                currentFile.name
            );

        downloadBlob(
            blob,
            `${filenameWithoutExtension}.webp`
        );
    }

    catch (error) {
        console.error(error);

        alert(
            "Kunde inte konvertera bilden."
        );
    }

    finally {
        setButtonLoading(
            convertWebp,
            false,
            "Konvertera till WebP"
        );
    }
});


// ============================================================
// 5. TRANSPARENCY EVENTS
// ============================================================

// Update displayed HEX color
transparentColor.addEventListener("input", () => {
    transparentColorValue.textContent =
        transparentColor.value.toUpperCase();
});


// Update displayed tolerance number
toleranceSlider.addEventListener("input", () => {
    toleranceValue.textContent =
        toleranceSlider.value;
});


// Create transparent preview
previewTransparency.addEventListener(
    "click",
    async () => {
        if (!currentFile) {
            return;
        }

        // Cropping and transparency preview should not
        // operate on the same <img> at the same time.
        stopCrop();

        const formData =
            createImageFormData(currentFile);

        const color =
            getTransparencyColor();

        const tolerance =
            toleranceSlider.value;

        const url =
            `/api/images/transparent/preview` +
            `?color=${color}` +
            `&tolerance=${tolerance}`;

        setButtonLoading(
            previewTransparency,
            true,
            "Bearbetar..."
        );

        try {
            const response = await fetch(
                url,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Kunde inte skapa transparens-preview."
                );
            }

            const blob =
                await response.blob();

            if (transparentPreviewUrl) {
                URL.revokeObjectURL(
                    transparentPreviewUrl
                );
            }

            transparentPreviewUrl =
                URL.createObjectURL(blob);

            previewImage.src =
                transparentPreviewUrl;

            showOriginal.classList.remove(
                "hidden"
            );
        }

        catch (error) {
            console.error(error);

            alert(
                "Kunde inte skapa transparens-preview."
            );
        }

        finally {
            setButtonLoading(
                previewTransparency,
                false,
                "Förhandsvisa transparens"
            );
        }
    }
);


// Return preview to original image
showOriginal.addEventListener("click", () => {
    if (!originalImageUrl) {
        return;
    }

    stopCrop();

    previewImage.src =
        originalImageUrl;

    showOriginal.classList.add(
        "hidden"
    );
});


// Export transparent PNG
downloadTransparent.addEventListener(
    "click",
    async () => {
        if (!currentFile) {
            return;
        }

        const formData =
            createImageFormData(currentFile);

        const color =
            getTransparencyColor();

        const tolerance =
            toleranceSlider.value;

        const url =
            `/api/images/transparent` +
            `?color=${color}` +
            `&tolerance=${tolerance}`;

        setButtonLoading(
            downloadTransparent,
            true,
            "Skapar PNG..."
        );

        try {
            const response = await fetch(
                url,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Kunde inte skapa transparent PNG."
                );
            }

            const blob =
                await response.blob();

            const filenameWithoutExtension =
                getFilenameWithoutExtension(
                    currentFile.name
                );

            downloadBlob(
                blob,
                `${filenameWithoutExtension}-transparent.png`
            );
        }

        catch (error) {
            console.error(error);

            alert(
                "Kunde inte skapa transparent PNG."
            );
        }

        finally {
            setButtonLoading(
                downloadTransparent,
                false,
                "Spara transparent PNG"
            );
        }
    }
);


// ============================================================
// 6. CROP EVENTS
// ============================================================

// Start interactive cropping
startCrop.addEventListener("click", () => {
    if (!currentFile) {
        return;
    }

    stopCrop();

    cropper = new Cropper(
        previewImage,
        {
            viewMode: 1,
            dragMode: "move",

            autoCropArea: 0.8,

            responsive: true,
            background: false,

            movable: true,
            zoomable: true,

            scalable: false,
            rotatable: false,

            crop(event) {
                const width =
                    Math.round(
                        event.detail.width
                    );

                const height =
                    Math.round(
                        event.detail.height
                    );

                cropSize.textContent =
                    `${width} × ${height} px`;
            },
        }
    );

    startCrop.classList.add("hidden");
    cancelCrop.classList.remove("hidden");
    downloadCrop.classList.remove("hidden");
});


// Change crop aspect ratio
cropRatioButtons.forEach((button) => {
    button.addEventListener("click", () => {
        cropRatioButtons.forEach((item) => {
            item.classList.remove("active");
        });

        button.classList.add("active");

        if (!cropper) {
            return;
        }

        const ratio =
            button.dataset.ratio;

        if (ratio === "free") {
            cropper.setAspectRatio(NaN);
        } else {
            cropper.setAspectRatio(
                Number(ratio)
            );
        }
    });
});


// Cancel cropping
cancelCrop.addEventListener("click", () => {
    stopCrop();
});


// Export cropped PNG
downloadCrop.addEventListener(
    "click",
    async () => {
        if (!currentFile || !cropper) {
            return;
        }

        const cropData =
            cropper.getData(true);

        const formData =
            createImageFormData(currentFile);

        const cropUrl =
            `/api/images/crop` +
            `?x=${cropData.x}` +
            `&y=${cropData.y}` +
            `&width=${cropData.width}` +
            `&height=${cropData.height}`;

        setButtonLoading(
            downloadCrop,
            true,
            "Beskär..."
        );

        try {
            const response = await fetch(
                cropUrl,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Kunde inte beskära bilden."
                );
            }

            const blob =
                await response.blob();

            const filenameWithoutExtension =
                getFilenameWithoutExtension(
                    currentFile.name
                );

            const originalExtension =
                currentFile.name
                    .split(".")
                    .pop()
                    .toLowerCase();

            let outputExtension =
                originalExtension;

            if (outputExtension === "jpeg") {
                outputExtension = "jpg";
            }

            if (
                outputExtension !== "png" &&
                outputExtension !== "webp" &&
                outputExtension !== "jpg"
            ) {
                outputExtension = "png";
            }

            downloadBlob(
                blob,
                `${filenameWithoutExtension}-cropped.${outputExtension}`
            );
        }

        catch (error) {
            console.error(error);

            alert(
                "Kunde inte beskära bilden."
            );
        }

        finally {
            setButtonLoading(
                downloadCrop,
                false,
                "Spara beskuren bild"
            );
        }
    }
);


// ============================================================
// 7. IMAGE LOADING
// ============================================================

async function handleImage(file) {
    if (!file.type.startsWith("image/")) {
        alert("Filen måste vara en bild.");
        return;
    }

    // Stop cropper before replacing the preview image.
    stopCrop();

    currentFile = file;

    cleanupPreviewUrls();

    originalImageUrl =
        URL.createObjectURL(file);

    previewImage.src =
        originalImageUrl;

    showOriginal.classList.add("hidden");

    // Show immediate browser information while Pillow analyses.
    fileName.textContent =
        file.name;

    fileType.textContent =
        getReadableFormat(file);

    fileSize.textContent =
        formatFileSize(file.size);

    colorMode.textContent =
        "Analyserar...";

    transparency.textContent =
        "Analyserar...";

    previewImage.onload = () => {
        imageDimensions.textContent =
            `${previewImage.naturalWidth} × ` +
            `${previewImage.naturalHeight} px`;
    };

    dropZone.classList.add("hidden");
    previewPanel.classList.remove("hidden");

    // Let backend/Pillow provide authoritative image info.
    await analyzeImage(file);

    // Calculate initial WebP estimate.
    await previewWebp(file);
}


// ============================================================
// 8. IMAGE ANALYSIS
// ============================================================

async function analyzeImage(file) {
    const formData =
        createImageFormData(file);

    try {
        const response = await fetch(
            "/api/images/analyze",
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error(
                "Kunde inte analysera bilden."
            );
        }

        const data =
            await response.json();

        fileType.textContent =
            data.format;

        imageDimensions.textContent =
            `${data.width} × ${data.height} px`;

        fileSize.textContent =
            formatFileSize(data.size);

        colorMode.textContent =
            data.mode;

        transparency.textContent =
            data.has_transparency
                ? "Ja"
                : "Nej";
    }

    catch (error) {
        console.error(error);

        colorMode.textContent = "Fel";
        transparency.textContent = "Fel";
    }
}


// ============================================================
// 9. WEBP PREVIEW
// ============================================================

async function previewWebp(file) {
    const formData =
        createImageFormData(file);

    const quality =
        qualitySlider.value;

    const resize =
        getResizeSettings();

    let previewUrl =
        `/api/images/convert/webp/preview` +
        `?quality=${quality}`;

    if (
        resize.mode === "width" &&
        resize.value
    ) {
        previewUrl +=
            `&max_width=${resize.value}`;
    }

    if (
        resize.mode === "percent" &&
        resize.value
    ) {
        previewUrl +=
            `&resize_percent=${resize.value}`;
    }

    try {
        const response = await fetch(
            previewUrl,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error(
                "Kunde inte skapa WebP-preview."
            );
        }

        const data =
            await response.json();

        originalSizeResult.textContent =
            formatFileSize(
                data.original_size
            );

        webpSizeResult.textContent =
            formatFileSize(
                data.webp_size
            );

        savingResult.textContent =
            `${data.saving_percent} %`;

        conversionResult.classList.remove(
            "hidden"
        );
    }

    catch (error) {
        console.error(error);
    }
}


// ============================================================
// 10. CROP HELPERS
// ============================================================

function stopCrop() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }

    cropSize.textContent = "-";

    startCrop.classList.remove("hidden");
    cancelCrop.classList.add("hidden");
    downloadCrop.classList.add("hidden");
}


// ============================================================
// 11. RESIZE HELPERS
// ============================================================

function getResizeSettings() {
    const resizeMode =
        document.querySelector(
            'input[name="resizeMode"]:checked'
        ).value;

    if (resizeMode === "percent") {
        return {
            mode: "percent",
            value: resizePercent.value,
        };
    }

    return {
        mode: "width",
        value: maxWidth.value,
    };
}


// ============================================================
// 12. TRANSPARENCY HELPERS
// ============================================================

function getTransparencyColor() {
    return transparentColor.value.replace(
        "#",
        ""
    );
}


// ============================================================
// 13. FILE / DOWNLOAD HELPERS
// ============================================================

function createImageFormData(file) {
    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );

    return formData;
}


function getFilenameWithoutExtension(filename) {
    return filename.replace(
        /\.[^/.]+$/,
        ""
    );
}


function downloadBlob(blob, filename) {
    const downloadUrl =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href =
        downloadUrl;

    link.download =
        filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(
        downloadUrl
    );
}


// ============================================================
// 14. PREVIEW URL CLEANUP
// ============================================================

function cleanupPreviewUrls() {
    if (originalImageUrl) {
        URL.revokeObjectURL(
            originalImageUrl
        );

        originalImageUrl = null;
    }

    if (transparentPreviewUrl) {
        URL.revokeObjectURL(
            transparentPreviewUrl
        );

        transparentPreviewUrl = null;
    }
}


// ============================================================
// 15. UI HELPERS
// ============================================================

function setButtonLoading(
    button,
    loading,
    text
) {
    button.disabled =
        loading;

    button.textContent =
        text;
}


// ============================================================
// 16. FORMAT HELPERS
// ============================================================

function getReadableFormat(file) {
    switch (file.type) {
        case "image/png":
            return "PNG";

        case "image/jpeg":
            return "JPEG";

        case "image/webp":
            return "WebP";

        default:
            return file.type;
    }
}


function formatFileSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const kilobytes =
        bytes / 1024;

    if (kilobytes < 1024) {
        return `${kilobytes.toFixed(1)} KB`;
    }

    const megabytes =
        kilobytes / 1024;

    return `${megabytes.toFixed(2)} MB`;
}