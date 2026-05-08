const elements = {
  body: document.body,
  video: document.getElementById("webcam"),
  snapshotCanvas: document.getElementById("snapshotCanvas"),
  tripCanvas: document.getElementById("tripCanvas"),
  captureStoreCanvas: document.getElementById("captureStoreCanvas"),
  verifyBtn: document.getElementById("verifyBtn"),
  tripBtn: document.getElementById("tripBtn"),
  raveBtn: document.getElementById("raveBtn"),
  resetBtn: document.getElementById("resetBtn"),
  flashOverlay: document.getElementById("flashOverlay"),
  lavaLamp: document.getElementById("lavaLamp"),
  cameraFallback: document.getElementById("cameraFallback"),
  fallbackImage: document.getElementById("fallbackImage"),
  statusLine: document.getElementById("statusLine"),
  canvasStage: document.getElementById("canvasStage"),
  laserShow: document.getElementById("laserShow"),
  mantraOverlay: document.getElementById("mantraOverlay"),
  raveTextOverlay: document.getElementById("raveTextOverlay"),
  acidNoise: document.getElementById("acidNoise"),
  displace: document.getElementById("displace"),
  shutterAudio: document.getElementById("shutterAudio"),
  folkAudio: document.getElementById("folkAudio"),
  raveAudio: document.getElementById("raveAudio"),
  cameraStage: document.getElementById("cameraStage"),
};

const snapshotCtx = elements.snapshotCanvas.getContext("2d");
const tripCtx = elements.tripCanvas.getContext("2d");
const captureStoreCtx = elements.captureStoreCanvas.getContext("2d");

const state = {
  stream: null,
  sourceReady: false,
  usingFallback: false,
  fallbackReady: false,
  audioReady: false,
  audioContext: null,
  timeoutIds: [],
  rafId: null,
  acidWaveRafId: null,
  capturedDataUrl: "",
  phase: 0,
  acidWaveActive: false,
};

function init() {
  bindEvents();
  resizeCanvases();
  setDisplacementScale(0);
  bootAudioGraph();
  bootCamera();
}

function bindEvents() {
  window.addEventListener("resize", handleResize);
  elements.verifyBtn.addEventListener("click", handleVerify);
  elements.tripBtn.addEventListener("click", startTripSequence);
  elements.raveBtn.addEventListener("click", startRaveSequence);
  elements.resetBtn.addEventListener("click", resetExperience);
}

function handleResize() {
  resizeCanvases();

  if (state.capturedDataUrl) {
    redrawSnapshotPreview();
    if (state.phase >= 2) {
      if (elements.body.classList.contains("rave-mode")) {
        renderRaveStill();
      } else {
        renderTripStill();
      }
    }
  }
}

function resizeCanvases() {
  elements.tripCanvas.width = window.innerWidth;
  elements.tripCanvas.height = window.innerHeight;

  const previewBounds = elements.cameraStage.getBoundingClientRect();
  elements.snapshotCanvas.width = Math.max(1, Math.round(previewBounds.width));
  elements.snapshotCanvas.height = Math.max(1, Math.round(previewBounds.height));

  if (!state.capturedDataUrl) {
    snapshotCtx.clearRect(0, 0, elements.snapshotCanvas.width, elements.snapshotCanvas.height);
    tripCtx.clearRect(0, 0, elements.tripCanvas.width, elements.tripCanvas.height);
  }
}

function bootAudioGraph() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  try {
    const context = new AudioContextClass();
    const shutterSource = context.createMediaElementSource(elements.shutterAudio);
    const folkSource = context.createMediaElementSource(elements.folkAudio);
    const raveSource = context.createMediaElementSource(elements.raveAudio);
    const shutterGain = context.createGain();
    const folkGain = context.createGain();
    const raveGain = context.createGain();

    shutterGain.gain.value = 0.9;
    folkGain.gain.value = 0.74;
    raveGain.gain.value = 0.82;

    shutterSource.connect(shutterGain);
    shutterGain.connect(context.destination);

    folkSource.connect(folkGain);
    folkGain.connect(context.destination);

    raveSource.connect(raveGain);
    raveGain.connect(context.destination);

    state.audioContext = context;
    state.audioReady = true;
  } catch (error) {
    console.log(error);
  }
}

async function wakeAudio() {
  if (state.audioReady && state.audioContext && state.audioContext.state === "suspended") {
    await state.audioContext.resume().catch((error) => console.log(error));
  }
}

async function bootCamera() {
  updateStatus("Awaiting camera permission...");

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("getUserMedia is not supported in this browser.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
      audio: false,
    });

    state.stream = stream;
    elements.video.srcObject = stream;

    await elements.video.play();

    elements.video.addEventListener(
      "loadedmetadata",
      () => {
        state.sourceReady = true;
        elements.verifyBtn.disabled = false;
        updateStatus("Camera live. Continue when ready.");
      },
      { once: true }
    );

    if (elements.video.readyState >= 1) {
      state.sourceReady = true;
      elements.verifyBtn.disabled = false;
      updateStatus("Camera live. Continue when ready.");
    }
  } catch (error) {
    console.log(error);
    activateFallback(error);
  }
}

function activateFallback(error) {
  state.usingFallback = true;
  state.sourceReady = false;
  elements.verifyBtn.disabled = true;

  const fallbackSvg = createFallbackSvg(error?.message || "Camera permission denied");
  elements.fallbackImage.src = fallbackSvg;
  elements.cameraFallback.classList.remove("hidden");
  elements.video.classList.add("hidden");
  updateStatus("Camera failed. Building mock verification artifact...", true);

  elements.fallbackImage.addEventListener(
    "load",
    () => {
      state.fallbackReady = true;
      state.sourceReady = true;
      elements.verifyBtn.disabled = false;
      updateStatus("Camera failed. Mock verification artifact ready.", true);
    },
    { once: true }
  );
}

function createFallbackSvg(reason) {
  const safeReason = reason.replace(/[<>&"]/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#12050a"/>
          <stop offset="55%" stop-color="#3f0912"/>
          <stop offset="100%" stop-color="#180f24"/>
        </linearGradient>
        <linearGradient id="grid" x1="0%" x2="100%">
          <stop offset="0%" stop-color="#ff4d4d" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#ffee58" stop-opacity="0.08"/>
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)"/>
      <g opacity="0.55" stroke="url(#grid)">
        <path d="M0 80H1280M0 160H1280M0 240H1280M0 320H1280M0 400H1280M0 480H1280M0 560H1280M0 640H1280"/>
        <path d="M80 0V720M240 0V720M400 0V720M560 0V720M720 0V720M880 0V720M1040 0V720M1200 0V720"/>
      </g>
      <circle cx="640" cy="266" r="126" fill="none" stroke="#ff7373" stroke-width="14"/>
      <path d="M440 560c74-126 326-126 400 0" fill="none" stroke="#ffb703" stroke-width="16" stroke-linecap="round"/>
      <rect x="222" y="68" width="836" height="74" rx="18" fill="rgba(255,255,255,0.06)" stroke="#ff7373" stroke-width="2"/>
      <text x="640" y="116" text-anchor="middle" fill="#ffe6e6" font-family="Arial, sans-serif" font-size="34" letter-spacing="8">
        CAMERA OFFLINE
      </text>
      <text x="640" y="604" text-anchor="middle" fill="#ff9a9a" font-family="Courier New, monospace" font-size="28">
        ${safeReason}
      </text>
      <text x="640" y="652" text-anchor="middle" fill="#fff1a6" font-family="Courier New, monospace" font-size="22" letter-spacing="4">
        FALLBACK SUBJECT SYNTHESIZED FOR CONTINUED PROCESSING
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function handleVerify() {
  if (!state.sourceReady) {
    updateStatus("Still waiting for a visual source to become ready...", true);
    return;
  }

  if (state.usingFallback && !state.fallbackReady) {
    updateStatus("Fallback preview is still rendering. Try again in a moment.", true);
    return;
  }

  await wakeAudio();
  playAudio(elements.shutterAudio, true);
  flashFrame();
  captureCurrentFrame();
  stopCameraStream();
  transitionToCaptureReview();
}

function flashFrame() {
  elements.flashOverlay.classList.add("active");
  window.setTimeout(() => {
    elements.flashOverlay.classList.remove("active");
  }, 50);
}

function captureCurrentFrame() {
  const source = resolveCaptureSource();
  const sourceWidth = source.videoWidth || source.naturalWidth || source.width || 1280;
  const sourceHeight = source.videoHeight || source.naturalHeight || source.height || 720;

  elements.captureStoreCanvas.width = window.innerWidth;
  elements.captureStoreCanvas.height = window.innerHeight;
  captureStoreCtx.clearRect(0, 0, elements.captureStoreCanvas.width, elements.captureStoreCanvas.height);
  drawContain(
    captureStoreCtx,
    source,
    elements.captureStoreCanvas.width,
    elements.captureStoreCanvas.height,
    0.84
  );

  elements.snapshotCanvas.width = Math.max(1, Math.round(elements.cameraStage.clientWidth));
  elements.snapshotCanvas.height = Math.max(1, Math.round(elements.cameraStage.clientHeight));
  snapshotCtx.fillStyle = "#0d1118";
  snapshotCtx.fillRect(0, 0, elements.snapshotCanvas.width, elements.snapshotCanvas.height);
  drawContain(
    snapshotCtx,
    source,
    elements.snapshotCanvas.width,
    elements.snapshotCanvas.height,
    0.95
  );

  state.capturedDataUrl = elements.captureStoreCanvas.toDataURL("image/png");

  // Preserve original source sizing for later redraws if needed.
  state.sourceWidth = sourceWidth;
  state.sourceHeight = sourceHeight;
}

function resolveCaptureSource() {
  if (state.usingFallback) {
    return elements.fallbackImage;
  }

  return elements.video;
}

function drawContain(ctx, source, destinationWidth, destinationHeight, paddingScale) {
  const sourceWidth = source.videoWidth || source.naturalWidth || source.width;
  const sourceHeight = source.videoHeight || source.naturalHeight || source.height;
  const innerWidth = destinationWidth * paddingScale;
  const innerHeight = destinationHeight * paddingScale;
  const scale = Math.min(innerWidth / sourceWidth, innerHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const drawX = (destinationWidth - drawWidth) / 2;
  const drawY = (destinationHeight - drawHeight) / 2;

  ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);
}

function stopCameraStream() {
  if (!state.stream) {
    return;
  }

  state.stream.getTracks().forEach((track) => track.stop());
  state.stream = null;
}

function transitionToCaptureReview() {
  state.phase = 1;
  elements.video.classList.add("hidden");
  elements.verifyBtn.classList.add("hidden");
  elements.cameraFallback.classList.add("hidden");

  elements.snapshotCanvas.classList.remove("hidden");
  elements.snapshotCanvas.classList.add("revealed");

  updateStatus("Identity snapshot locked. Supplemental cultural route available.");

  revealElement(elements.tripBtn);
}

function revealElement(element) {
  element.classList.remove("hidden");
  requestAnimationFrame(() => {
    element.classList.add("visible");
  });
}

function hideElement(element) {
  element.classList.remove("visible");
  window.setTimeout(() => {
    element.classList.add("hidden");
  }, 900);
}

async function startTripSequence() {
  if (!state.capturedDataUrl || state.phase >= 2) {
    return;
  }

  await wakeAudio();

  state.phase = 2;
  elements.tripBtn.disabled = true;
  hideElement(elements.tripBtn);
  elements.folkAudio.loop = true;
  playAudio(elements.folkAudio, false);

  beginCreepPhase();
  startMeltdownPhase();
  queuePhase(intensifyAcidWave, 2000);
  queuePhase(showMantraOverlay, 4000);
  queuePhase(startColorBleedPhase, 5000);
  queuePhase(deepenAcidWave, 6000);
  queuePhase(startComeDownPhase, 10000);
  queuePhase(totalLiquefactionPhase, 12000);
}

async function startRaveSequence() {
  if (!state.capturedDataUrl || state.phase >= 2) {
    return;
  }

  await wakeAudio();

  state.phase = 2;
  elements.tripBtn.disabled = true;
  elements.raveBtn.disabled = true;
  elements.tripBtn.classList.remove("visible");
  elements.raveBtn.classList.remove("visible");
  elements.tripBtn.classList.add("hidden");
  elements.raveBtn.classList.add("hidden");
  elements.raveAudio.loop = true;
  playAudio(elements.raveAudio, false);

  elements.laserShow.innerHTML = "";

  for (let index = 0; index < 25; index += 1) {
    const laser = document.createElement("div");
    const delay = Math.random() * 2;
    const duration = 0.7 + Math.random() * 1.1;
    const angle = -180 + Math.random() * 360;
    const drift = -40 + Math.random() * 80;

    laser.className = "hardcore-laser";
    laser.style.animationDelay = `${delay.toFixed(2)}s`;
    laser.style.animationDuration = `${duration.toFixed(2)}s`;
    laser.style.setProperty("--laser-angle", `${angle.toFixed(2)}deg`);
    laser.style.setProperty("--laser-drift", `${drift.toFixed(2)}vw`);
    laser.style.setProperty("--laser-hue", `${Math.round(Math.random() * 360)}deg`);
    laser.style.transform = `translateX(-50%) rotate(${angle.toFixed(2)}deg)`;
    elements.laserShow.appendChild(laser);
  }

  elements.body.classList.add("rave-mode");
  elements.canvasStage.classList.add("active");
  elements.canvasStage.setAttribute("aria-hidden", "false");
  elements.laserShow.classList.remove("hidden");
  elements.laserShow.setAttribute("aria-hidden", "false");

  renderRaveStill();

  queuePhase(showRaveTextOverlay, 2000);
  queuePhase(showRaveReset, 10000);
}

function beginCreepPhase() {
  elements.body.classList.add("trip-started");
  elements.lavaLamp.classList.add("active");
  elements.canvasStage.classList.add("active");

  renderTripStill();

  requestAnimationFrame(() => {
    elements.canvasStage.classList.add("creeping");
  });
}

function startAcidWave() {
  if (state.acidWaveActive) {
    return;
  }

  state.acidWaveActive = true;
  elements.canvasStage.classList.add("rippling");
  setDisplacementScale(2);

  const breathe = (time) => {
    const baseFrequency = 0.015 + Math.sin(time * 0.00065) * 0.005;
    elements.acidNoise.setAttribute("baseFrequency", baseFrequency.toFixed(4));
    state.acidWaveRafId = requestAnimationFrame(breathe);
  };

  cancelAnimationFrame(state.acidWaveRafId);
  state.acidWaveRafId = requestAnimationFrame(breathe);
}

function startMeltdownPhase() {
  if (!state.acidWaveActive) {
    startAcidWave();
  }

  const render = (time) => {
    const width = elements.tripCanvas.width;
    const height = elements.tripCanvas.height;
    const baseSpin = time * 0.00022;
    const bounceX = Math.sin(time * 0.0007) * (width / 3);
    const bounceY = Math.cos(time * 0.0009) * (height / 3);
    const radius = Math.min(width, height) * 0.22;
    const pulse = 0.34 + Math.sin(time * 0.0009) * 0.04;
    const sliceRotation = (Math.PI * 2) / 6;

    const sourceWidth = elements.captureStoreCanvas.width;
    const sourceHeight = elements.captureStoreCanvas.height;
    const baseScale = Math.min(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * baseScale * pulse;
    const drawHeight = sourceHeight * baseScale * pulse;

    tripCtx.fillStyle = "rgba(0, 0, 0, 0.08)";
    tripCtx.fillRect(0, 0, width, height);
    tripCtx.globalCompositeOperation = "source-over";

    tripCtx.save();
    tripCtx.translate(width / 2 + bounceX, height / 2 + bounceY);
    tripCtx.rotate(baseSpin);

    for (let index = 0; index < 6; index += 1) {
      const spread = Math.sin(time * 0.001 + index * 0.9) * 280;

      tripCtx.save();
      tripCtx.rotate(sliceRotation * index);
      tripCtx.translate(radius + spread, 0);
      tripCtx.rotate(baseSpin * 0.6 + Math.cos(time * 0.001 + index) * 0.18);
      tripCtx.globalAlpha = 0.3;
      tripCtx.drawImage(
        elements.captureStoreCanvas,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );
      tripCtx.restore();
    }

    tripCtx.restore();

    state.rafId = requestAnimationFrame(render);
  };

  cancelAnimationFrame(state.rafId);
  state.rafId = requestAnimationFrame(render);
}

function startColorBleedPhase() {
  elements.canvasStage.classList.add("bleeding");
  elements.lavaLamp.classList.add("bleeding");
}

function intensifyAcidWave() {
  setDisplacementScale(30);
}

function deepenAcidWave() {
  setDisplacementScale(100);
}

function showMantraOverlay() {
  const mantraText = elements.mantraOverlay.querySelector(".mantra-text, .vibe-text");

  if (mantraText) {
    mantraText.innerHTML = "Welcome to Vibe Code Fridays.<br>Surrender to the flow.";
  }

  elements.mantraOverlay.classList.add("visible");
}

function totalLiquefactionPhase() {
  setDisplacementScale(300);
}

function startComeDownPhase() {
  revealElement(elements.resetBtn);
}

function renderRaveStill() {
  tripCtx.clearRect(0, 0, elements.tripCanvas.width, elements.tripCanvas.height);
  tripCtx.fillStyle = "#000000";
  tripCtx.fillRect(0, 0, elements.tripCanvas.width, elements.tripCanvas.height);
  drawContain(tripCtx, elements.captureStoreCanvas, elements.tripCanvas.width, elements.tripCanvas.height, 0.82);
}

function renderTripStill() {
  tripCtx.clearRect(0, 0, elements.tripCanvas.width, elements.tripCanvas.height);
  tripCtx.fillStyle = "rgba(7, 0, 14, 0.18)";
  tripCtx.fillRect(0, 0, elements.tripCanvas.width, elements.tripCanvas.height);
  drawContain(tripCtx, elements.captureStoreCanvas, elements.tripCanvas.width, elements.tripCanvas.height, 1);
}

function redrawSnapshotPreview() {
  snapshotCtx.fillStyle = "#0d1118";
  snapshotCtx.fillRect(0, 0, elements.snapshotCanvas.width, elements.snapshotCanvas.height);
  drawContain(
    snapshotCtx,
    elements.captureStoreCanvas,
    elements.snapshotCanvas.width,
    elements.snapshotCanvas.height,
    0.95
  );
}

function queuePhase(callback, delay) {
  const timeoutId = window.setTimeout(callback, delay);
  state.timeoutIds.push(timeoutId);
}

function setDisplacementScale(scale) {
  elements.displace.setAttribute("scale", String(scale));
}

function playAudio(audioElement, restart) {
  if (restart) {
    audioElement.currentTime = 0;
  }

  audioElement.play().catch((error) => console.log(error));
}

function updateStatus(message, isError = false) {
  elements.statusLine.textContent = message;
  elements.statusLine.classList.toggle("error", isError);
}

function showRaveTextOverlay() {
  revealElement(elements.raveTextOverlay);
}

function showRaveReset() {
  revealElement(elements.resetBtn);
}

function resetExperience() {
  window.location.reload();
}

init();
