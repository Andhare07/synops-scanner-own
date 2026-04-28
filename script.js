// ============================
// SynOps — script.js (Rectified)
// ============================

// --- Config ---
// 1. Replace the URL below with your actual Render/Heroku URL
// 2. Keep the "/analyze" at the end.
const BACKEND_URL = "https://synops-scanner-own.onrender.com";

// --- DOM refs ---
const fileInput       = document.getElementById("fileInput");
const uploadZone      = document.getElementById("uploadZone");
const previewWrap     = document.getElementById("previewWrap");
const previewImg      = document.getElementById("previewImg");
const previewFilename = document.getElementById("previewFilename");
const removeBtn       = document.getElementById("removeBtn");
const scanBtn         = document.getElementById("scanBtn");
const resultSection   = document.getElementById("resultSection");
const loadingState    = document.getElementById("loadingState");
const loadingText     = document.getElementById("loadingText");
const resultContent   = document.getElementById("resultContent");
const errorState      = document.getElementById("errorState");
const errorText       = document.getElementById("errorText");
const resultBadge     = document.getElementById("resultBadge");
const descText        = document.getElementById("descText");
const sportsText      = document.getElementById("sportsText");
const dupeText        = document.getElementById("dupeText");
const rawPre          = document.getElementById("rawPre");
const toggleRaw       = document.getElementById("toggleRaw");

let selectedFile = null;

const loadingMessages = [
  "Uploading image…",
  "Sending to Gemini AI…",
  "Analyzing content…",
  "Checking for sports media…",
  "Almost done…"
];

// --- File Handling ---
fileInput.addEventListener("change", () => {
  if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
});

uploadZone.addEventListener("dragover", (e) => { e.preventDefault(); uploadZone.classList.add("drag-over"); });
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-over"));
uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) handleFile(file);
  else showError("Please drop a valid image file.");
});

function handleFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    showError("File is too large (Max 10MB).");
    return;
  }
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewWrap.classList.add("show");
    uploadZone.style.display = "none";
    previewFilename.textContent = file.name;
  };
  reader.readAsDataURL(file);
  scanBtn.disabled = false;
  resetResults();
}

removeBtn.addEventListener("click", () => {
  selectedFile = null;
  previewWrap.classList.remove("show");
  uploadZone.style.display = "";
  fileInput.value = "";
  scanBtn.disabled = true;
  resetResults();
});

// --- Scan Logic ---
scanBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  
  scanBtn.disabled = true;
  scanBtn.classList.add("scanning");
  
  resultSection.classList.add("show");
  loadingState.classList.add("show");
  resultContent.classList.remove("show");
  errorState.classList.remove("show");

  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[msgIdx];
  }, 1800);

  const formData = new FormData();
  formData.append("image", selectedFile);

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      body: formData,
      // Note: Do NOT set Content-Type header manually when sending FormData
    });

    clearInterval(msgInterval);

    if (!response.ok) {
      let errMsg = `Error ${response.status}`;
      try {
        const errData = await response.json();
        if (errData.error) errMsg = errData.error;
      } catch (e) {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    displayResults(data);

  } catch (err) {
    clearInterval(msgInterval);
    showError(err.message || "Connection failed. Check if backend is awake.");
  } finally {
    scanBtn.classList.remove("scanning");
    scanBtn.disabled = false;
  }
});

function displayResults(data) {
  loadingState.classList.remove("show");
  resultContent.classList.add("show");
  descText.textContent = data.description || "No description.";
  const isSports = data.is_sports_related;
  sportsText.textContent = data.sports_explanation || (isSports ? "Yes" : "No");
  dupeText.textContent = data.reuse_risk || "No assessment.";
  resultBadge.textContent = isSports ? "⚽ Sports Content" : "✗ Not Sports";
  resultBadge.className = "result-badge " + (isSports ? "sports" : "nonsports");
  rawPre.textContent = JSON.stringify(data, null, 2);
}

function showError(message) {
  loadingState.classList.remove("show");
  errorState.classList.add("show");
  errorText.textContent = message;
}

function resetResults() {
  resultSection.classList.remove("show");
  errorState.classList.remove("show");
}

toggleRaw.addEventListener("click", () => {
  const isOpen = rawPre.classList.toggle("show");
  toggleRaw.textContent = isOpen ? "Hide raw response ↑" : "Show raw response ↓";
});
