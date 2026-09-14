require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const { randomUUID } = require("crypto");
const { Server } = require("socket.io");

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// 메모리에 세션 저장 (서버 재시작하면 초기화됨 - 행사 하루짜리 용도로는 충분)
// session: { imageUrl, downloaded }
const sessions = new Map();

function getBaseUrl(req) {
  return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

// 새 촬영 세션 시작
app.post("/api/sessions", (req, res) => {
  const id = randomUUID();
  sessions.set(id, { imageUrl: null, downloaded: false, createdAt: Date.now() });
  res.json({ id });
});

// 합성된 네컷 이미지 업로드
app.post("/api/sessions/:id/photo", upload.single("photo"), async (req, res) => {
  const { id } = req.params;

  if (!sessions.has(id)) {
    return res.status(404).json({ error: "세션을 찾을 수 없습니다." });
  }
  if (!req.file) {
    return res.status(400).json({ error: "이미지 파일이 없습니다." });
  }

  try {
    const supabase = require("./supabase");
    const bucketName = process.env.SUPABASE_BUCKET || "necut-photos";
    const filePath = `photos/${id}.jpg`;

    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, req.file.buffer, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: true,
    });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    const imageUrl = data.publicUrl;
    sessions.set(id, { imageUrl, downloaded: false, createdAt: Date.now() });

    res.json({
      viewUrl: `${getBaseUrl(req)}/photo/${id}`,
      imageUrl,
    });
  } catch (err) {
    console.error("업로드 실패:", err);
    res.status(500).json({ error: "이미지 업로드에 실패했습니다." });
  }
});

// 다운로드 페이지가 이미지 정보를 조회할 때 사용
app.get("/api/sessions/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session || !session.imageUrl) {
    return res.status(404).json({ error: "사진을 찾을 수 없습니다." });
  }
  res.json(session);
});

// 다운로드 완료 신호 -> 촬영 기기를 초기 화면으로 되돌림
app.post("/api/sessions/:id/downloaded", (req, res) => {
  const { id } = req.params;
  const session = sessions.get(id);
  if (!session) {
    return res.status(404).json({ error: "세션을 찾을 수 없습니다." });
  }
  session.downloaded = true;
  io.to(`session-${id}`).emit("downloaded");
  res.json({ ok: true });
});

// QR이 연결되는 다운로드 페이지
app.get("/photo/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "view.html"));
});

io.on("connection", (socket) => {
  socket.on("join", (sessionId) => {
    socket.join(`session-${sessionId}`);
  });
});

// 오래된 세션 정리 (6시간 지난 것들, 메모리 누수 방지)
setInterval(
  () => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
      if (now - session.createdAt > 6 * 60 * 60 * 1000) {
        sessions.delete(id);
      }
    }
  },
  60 * 60 * 1000,
);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`네컷 부스 서버 실행 중: http://localhost:${PORT}`);
});
