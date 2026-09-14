(() => {
  const $ = (sel) => document.querySelector(sel);

  const screens = {
    home: $("#screen-home"),
    frame: $("#screen-frame"),
    camera: $("#screen-camera"),
    select: $("#screen-select"),
    preview: $("#screen-preview"),
    qr: $("#screen-qr"),
  };

  function showScreen(name) {
    Object.values(screens).forEach((el) => el.classList.remove("active"));
    screens[name].classList.add("active");
  }

  // --- 상태 ---
  let sessionId = null;
  let selectedFrame = null;
  let shots = []; // 촬영된 6장 (dataURL)
  let pickedIndexes = []; // shots 배열 안에서 고른 4장의 인덱스, 순서대로
  let stream = null;

  const socket = io();

  // ---------- 홈 ----------
  $("#btnStart").addEventListener("click", async () => {
    shots = [];
    pickedIndexes = [];
    selectedFrame = null;
    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      const data = await res.json();
      sessionId = data.id;
      socket.emit("join", sessionId);
    } catch (err) {
      console.error("세션 생성 실패", err);
    }
    renderFrameGrid();
    showScreen("frame");
  });

  // ---------- 프레임 선택 ----------
  function renderFrameGrid() {
    const grid = $("#frameGrid");
    grid.innerHTML = "";
    FRAME_TEMPLATES.forEach((frame) => {
      const card = document.createElement("div");
      card.className = "frame-card";
      card.dataset.id = frame.id;

      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 300;
      drawFramePreview(canvas, frame);

      const label = document.createElement("div");
      label.className = "frame-name";
      label.textContent = frame.name;

      card.appendChild(canvas);
      card.appendChild(label);
      card.addEventListener("click", () => {
        document.querySelectorAll(".frame-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        selectedFrame = frame;
        $("#btnFrameNext").disabled = false;
      });
      grid.appendChild(card);
    });
  }

  async function drawFramePreview(canvas, frame) {
    const ctx = canvas.getContext("2d");
    const scale = canvas.width / frame.width;
    ctx.save();
    ctx.scale(scale, scale);
    if (frame.hasImage) {
      const img = await loadImage(frame.image);
      ctx.drawImage(img, 0, 0, frame.width, frame.height);
    } else {
      ctx.fillStyle = frame.background;
      ctx.fillRect(0, 0, frame.width, frame.height);
      frame.slots.forEach((slot) => {
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 16);
        ctx.fill();
      });
    }
    ctx.restore();
  }

  $("#btnFrameNext").addEventListener("click", async () => {
    showScreen("camera");
    await startCamera();
  });

  // ---------- 촬영 ----------
  const video = $("#video");
  const captureCanvas = $("#captureCanvas");
  const countdownOverlay = $("#countdownOverlay");
  const flashOverlay = $("#flashOverlay");

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1440 } },
        audio: false,
      });
      video.srcObject = stream;
    } catch (err) {
      alert("카메라를 사용할 수 없어요. 브라우저의 카메라 권한을 확인해주세요.");
      console.error(err);
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function countdownThenCapture() {
    for (const n of [3, 2, 1]) {
      countdownOverlay.style.display = "flex";
      countdownOverlay.textContent = n;
      await sleep(700);
    }
    countdownOverlay.style.display = "none";
    captureShot();
    flashOverlay.classList.add("flashing");
    await sleep(260);
    flashOverlay.classList.remove("flashing");
  }

  function captureShot() {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    captureCanvas.width = vw;
    captureCanvas.height = vh;
    const ctx = captureCanvas.getContext("2d");
    // 미리보기가 좌우반전(거울모드)이므로 실제 저장 사진도 동일하게 반전해서 저장
    ctx.save();
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, vw, vh);
    ctx.restore();
    shots.push(captureCanvas.toDataURL("image/jpeg", 0.92));
    $("#shotCount").textContent = shots.length;
  }

  $("#btnCameraStart").addEventListener("click", async () => {
    $("#btnCameraStart").disabled = true;
    shots = [];
    $("#shotCount").textContent = "0";
    for (let i = 0; i < 6; i++) {
      await countdownThenCapture();
      await sleep(400);
    }
    stopCamera();
    $("#btnCameraStart").disabled = false;
    renderSelectGrid();
    showScreen("select");
  });

  // ---------- 4장 선택 ----------
  function renderSelectGrid() {
    pickedIndexes = [];
    updatePickedUI();
    const grid = $("#selectGrid");
    grid.innerHTML = "";
    shots.forEach((dataUrl, idx) => {
      const tile = document.createElement("div");
      tile.className = "shot-tile";
      tile.innerHTML = `<img src="${dataUrl}" /><div class="pick-badge"></div>`;
      tile.addEventListener("click", () => togglePick(idx, tile));
      grid.appendChild(tile);
    });
  }

  function togglePick(idx, tile) {
    const already = pickedIndexes.indexOf(idx);
    if (already >= 0) {
      pickedIndexes.splice(already, 1);
      tile.classList.remove("picked");
    } else {
      if (pickedIndexes.length >= 4) return; // 4장 초과 선택 불가
      pickedIndexes.push(idx);
      tile.classList.add("picked");
    }
    // 배지 번호 다시 매기기
    document.querySelectorAll(".shot-tile").forEach((t, i) => {
      const badge = t.querySelector(".pick-badge");
      const order = pickedIndexes.indexOf(i);
      badge.textContent = order >= 0 ? order + 1 : "";
    });
    updatePickedUI();
  }

  function updatePickedUI() {
    $("#pickedCount").textContent = pickedIndexes.length;
    $("#btnSelectNext").disabled = pickedIndexes.length !== 4;
  }

  $("#btnSelectNext").addEventListener("click", () => {
    renderPreview();
    showScreen("preview");
  });

  // ---------- 미리보기 / 합성 ----------
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawImageCover(ctx, img, x, y, w, h) {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let sx, sy, sw, sh;
    if (imgRatio > boxRatio) {
      sh = img.height;
      sw = sh * boxRatio;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = sw / boxRatio;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function composeFinalCanvas() {
    const frame = selectedFrame;
    const canvas = document.createElement("canvas");
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext("2d");

    const chosenImages = await Promise.all(pickedIndexes.map((i) => loadImage(shots[i])));

    if (frame.hasImage) {
      // 1) 사진들을 먼저 그리고 2) 프레임 이미지를 위에 덧그린다 (프레임의 창 부분이 투명해야 함)
      frame.slots.forEach((slot, i) => {
        if (chosenImages[i]) drawImageCover(ctx, chosenImages[i], slot.x, slot.y, slot.w, slot.h);
      });
      const frameImg = await loadImage(frame.image);
      ctx.drawImage(frameImg, 0, 0, frame.width, frame.height);
    } else {
      // 임시 플레이스홀더 틀: 배경 + 사진 + 테두리 + 캡션
      ctx.fillStyle = frame.background;
      ctx.fillRect(0, 0, frame.width, frame.height);

      frame.slots.forEach((slot, i) => {
        ctx.save();
        roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 18);
        ctx.clip();
        if (chosenImages[i]) drawImageCover(ctx, chosenImages[i], slot.x, slot.y, slot.w, slot.h);
        ctx.restore();

        ctx.lineWidth = 6;
        ctx.strokeStyle = frame.accent;
        roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 18);
        ctx.stroke();
      });

      ctx.fillStyle = frame.accent;
      ctx.font = "600 34px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(frame.caption, frame.width / 2, frame.height - 40);
    }

    return canvas;
  }

  async function renderPreview() {
    const finalCanvas = await composeFinalCanvas();
    const previewEl = $("#previewCanvas");
    previewEl.width = finalCanvas.width;
    previewEl.height = finalCanvas.height;
    previewEl.getContext("2d").drawImage(finalCanvas, 0, 0);
    previewEl._composed = finalCanvas; // 나중에 업로드할 때 재사용
  }

  $("#btnRetake").addEventListener("click", async () => {
    shots = [];
    pickedIndexes = [];
    showScreen("camera");
    await startCamera();
  });

  // ---------- 인화 (업로드 + QR) ----------
  $("#btnPrint").addEventListener("click", async () => {
    const btn = $("#btnPrint");
    btn.disabled = true;
    btn.textContent = "전송 중…";
    try {
      const finalCanvas = $("#previewCanvas")._composed;
      const blob = await new Promise((resolve) => finalCanvas.toBlob(resolve, "image/jpeg", 0.92));

      const formData = new FormData();
      formData.append("photo", blob, "necut.jpg");

      const res = await fetch(`/api/sessions/${sessionId}/photo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("업로드 실패");
      const data = await res.json();

      $("#qrcode").innerHTML = "";
      // eslint-disable-next-line no-undef
      new QRCode($("#qrcode"), {
        text: data.viewUrl,
        width: 220,
        height: 220,
        colorDark: "#16151a",
        colorLight: "#f6f1e7",
      });
      $("#qrStatus").textContent = "다운로드 기다리는 중…";
      showScreen("qr");
    } catch (err) {
      console.error(err);
      alert("사진을 전송하지 못했어요. 다시 시도해주세요.");
    } finally {
      btn.disabled = false;
      btn.textContent = "인화하기";
    }
  });

  // ---------- 다운로드 완료 -> 초기화 ----------
  socket.on("downloaded", () => {
    $("#qrStatus").textContent = "다운로드 완료! 감사합니다 :)";
    setTimeout(() => {
      shots = [];
      pickedIndexes = [];
      selectedFrame = null;
      sessionId = null;
      showScreen("home");
    }, 3000);
  });
})();
