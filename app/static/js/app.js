let currentFile = null;
let previewTimer = null;

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

const previewPanel = document.getElementById("previewPanel");
const previewImage = document.getElementById("previewImage");

const fileName = document.getElementById("fileName");
const fileType = document.getElementById("fileType");
const fileSize = document.getElementById("fileSize");
const imageDimensions = document.getElementById("imageDimensions");

const chooseNewImage = document.getElementById("chooseNewImage");

const colorMode = document.getElementById("colorMode");
const transparency = document.getElementById("transparency");

const conversionResult =
    document.getElementById("conversionResult");

const originalSizeResult =
    document.getElementById("originalSizeResult");

const webpSizeResult =
    document.getElementById("webpSizeResult");

const savingResult =
    document.getElementById("savingResult");

const qualitySlider =
    document.getElementById("qualitySlider");

const qualityValue =
    document.getElementById("qualityValue");

const convertWebp =
    document.getElementById("convertWebp");



dropZone.addEventListener("click", () => {
    fileInput.click();
});


fileInput.addEventListener("change", () => {

    const file = fileInput.files[0];

    if (file) {
        handleImage(file);
    }

});


dropZone.addEventListener("dragover", (event) => {

    event.preventDefault();

    dropZone.classList.add("drag-over");

});


dropZone.addEventListener("dragleave", () => {

    dropZone.classList.remove("drag-over");

});


dropZone.addEventListener("drop", (event) => {

    event.preventDefault();

    dropZone.classList.remove("drag-over");

    const file = event.dataTransfer.files[0];

    if (file) {
        handleImage(file);
    }

});


chooseNewImage.addEventListener("click", () => {
    fileInput.click();
});

qualitySlider.addEventListener("input", () => {

    qualityValue.textContent =
        qualitySlider.value;


    clearTimeout(previewTimer);


    previewTimer = setTimeout(() => {

        if (currentFile) {
            previewWebp(currentFile);
        }

    }, 300);

});

convertWebp.addEventListener("click", async () => {

    if (!currentFile) {
        return;
    }


    const formData = new FormData();

    formData.append(
        "file",
        currentFile
    );


    const quality =
        qualitySlider.value;


    convertWebp.disabled = true;

    convertWebp.textContent =
        "Konverterar...";


    try {

        const response = await fetch(
            `/api/images/convert/webp?quality=${quality}`,
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


        const blob =
            await response.blob();


        const downloadUrl =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        const originalName =
            currentFile.name;


        const filenameWithoutExtension =
            originalName.replace(
                /\.[^/.]+$/,
                ""
            );


        link.href =
            downloadUrl;

        link.download =
            `${filenameWithoutExtension}.webp`;


        document.body.appendChild(link);

        link.click();

        link.remove();


        URL.revokeObjectURL(
            downloadUrl
        );

    }

    catch (error) {

        console.error(error);

        alert(
            "Kunde inte konvertera bilden."
        );

    }

    finally {

        convertWebp.disabled = false;

        convertWebp.textContent =
            "Konvertera till WebP";

    }

});

async function handleImage(file) {

    
    if (!file.type.startsWith("image/")) {
        alert("Filen måste vara en bild.");
        return;
    }
    
    currentFile = file;

    const imageUrl = URL.createObjectURL(file);

    previewImage.src = imageUrl;

    fileName.textContent = file.name;
    fileType.textContent = getReadableFormat(file);
    fileSize.textContent = formatFileSize(file.size);

    colorMode.textContent = "Analyserar...";
    transparency.textContent = "Analyserar...";


    previewImage.onload = () => {

        imageDimensions.textContent =
            `${previewImage.naturalWidth} × ${previewImage.naturalHeight} px`;

    };


    dropZone.classList.add("hidden");

    previewPanel.classList.remove("hidden");


    await analyzeImage(file);
    await previewWebp(file);
}


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


    const kilobytes = bytes / 1024;

    if (kilobytes < 1024) {
        return `${kilobytes.toFixed(1)} KB`;
    }


    const megabytes = kilobytes / 1024;

    return `${megabytes.toFixed(2)} MB`;
}

async function analyzeImage(file) {

    const formData = new FormData();

    formData.append("file", file);


    try {

        const response = await fetch(
            "/api/images/analyze",
            {
                method: "POST",
                body: formData,
            }
        );


        if (!response.ok) {
            throw new Error("Kunde inte analysera bilden.");
        }


        const data = await response.json();


        fileType.textContent = data.format;

        imageDimensions.textContent =
            `${data.width} × ${data.height} px`;

        fileSize.textContent =
            formatFileSize(data.size);

        colorMode.textContent =
            data.mode;

        transparency.textContent =
            data.has_transparency ? "Ja" : "Nej";

    }

    catch (error) {

        console.error(error);

        colorMode.textContent = "Fel";
        transparency.textContent = "Fel";

    }

}

async function previewWebp(file) {

    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );


    const quality =
        qualitySlider.value;


    try {

        const response = await fetch(
            `/api/images/convert/webp/preview?quality=${quality}`,
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