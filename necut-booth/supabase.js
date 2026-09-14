const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");

// realtime.transport: Node 22 미만에서는 내장 WebSocket이 없어서 supabase-js가 초기화 중 에러를 던지기 때문에
// ws 패키지를 직접 넘겨줘서 그 문제를 피하려고했다.
// Supabase 실시간 기능 자체는 안 쓰고 Storage만 쓰기 때문에 동작엔 영향 없음.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});

module.exports = supabase;
