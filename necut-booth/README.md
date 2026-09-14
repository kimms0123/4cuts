# 네컷 부스 (necut-booth)

아이패드/안드로이드 웹브라우저에서 쓰는 무인 네컷 사진 부스.
흐름: 틀 선택 → 6번 촬영 → 잘 나온 4장 선택 → 합성 → QR 표시 → 관람객이 QR로
접속해서 사진 다운로드 → 촬영 기기 자동으로 첫 화면 복귀.

## 폴더 구조

```
necut-booth/
├── server.js            # Express + Socket.io 서버
├── firebase.js          # Firebase Admin 초기화
├── package.json
├── .env.example
└── public/
    ├── index.html       # 촬영 기기(키오스크)용 화면
    ├── view.html         # QR 스캔 시 뜨는 다운로드 페이지
    ├── css/
    ├── js/
    │   ├── app.js        # 키오스크 로직 (카메라, 합성, 업로드)
    │   ├── frames.js     # 틀(프레임) 설정 — 여기에 실제 프레임 넣기
    │   └── view.js
    └── frames/           # 실제 프레임 PNG 파일을 넣는 곳
```

## 1. 로컬에서 실행해보기

```bash
npm install
cp .env.example .env
npm start
```

`http://localhost:3000` 접속. 카메라 권한은 **localhost는 예외적으로 HTTP에서도 허용**되지만,
실제 아이패드/안드로이드 기기에서 테스트하려면 반드시 **HTTPS**가 필요합니다 (배포 후 테스트 권장).
Firebase 설정 전에도 틀 선택/촬영/합성 미리보기까지는 바로 테스트할 수 있어요. (인화=업로드만 안 됨)

## 2. Supabase 프로젝트 설정 (이미지 저장용, 카드 등록 불필요)

1. https://supabase.com → 회원가입 → **New project** 생성 (무료 플랜, 카드 등록 없이 바로 됨)
2. 왼쪽 메뉴 **Storage → New bucket** → 이름을 `necut-photos`로 만들고
   **Public bucket** 옵션을 꼭 켜기 (관람객이 다운로드 페이지에서 이미지를 볼 수 있어야 하므로)
3. 왼쪽 메뉴 **Project Settings → API**로 이동해서 두 가지 값을 복사:
   - **Project URL** → `.env`의 `SUPABASE_URL`
   - **service_role** 키 (secret이라고 표시된 것, anon 키 아님!) → `.env`의 `SUPABASE_SERVICE_ROLE_KEY`
   - ⚠️ service_role 키는 스토리지 전체를 마음대로 쓸 수 있는 권한이라 **절대 깃허브에 올리거나
     프론트엔드 코드에 넣으면 안 돼요**. 서버(Node) 쪽 환경변수로만 사용해요.
4. `.env`의 `SUPABASE_BUCKET`은 2번에서 만든 버킷 이름과 동일하게 `necut-photos`로 두면 됨

무료 플랜은 스토리지 1GB / 대역폭 월 2GB까지 무료예요. 사진 한 장이 보통 300KB~1MB
정도니까, 행사 하루 기준으로는 넉넉해요.

## 3. 배포 (Render.com 무료 플랜 예시)

Node 서버라 Render, Railway, Fly.io 등 아무 곳이나 되지만, 무료로 가장 간단한 Render 기준으로 안내할게요.

1. 이 프로젝트 폴더를 GitHub 저장소로 올리기 (`serviceAccountKey.json`은 `.gitignore`에 있어서
   자동으로 커밋에서 제외됩니다 — 그대로 두세요, 키 파일은 절대 깃허브에 올리면 안 됩니다)
2. https://render.com → New → Web Service → 방금 만든 저장소 연결
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Environment 탭에서 환경변수 추가 (Supabase 키를 쓰기 때문에 파일 업로드 없이 이 4개만 넣으면 끝):
   - `SUPABASE_URL` = (2번 단계에서 확인한 Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` = (2번 단계에서 확인한 service_role 키)
   - `SUPABASE_BUCKET` = `necut-photos`
   - `PUBLIC_BASE_URL` = 배포 후 Render가 주는 주소 (예: `https://necut-booth.onrender.com`)
6. 배포 완료되면 나온 주소를 아이패드/안드로이드 브라우저로 열어서 테스트

무료 플랜은 트래픽이 없으면 슬립 모드로 들어가서 첫 접속이 느릴 수 있어요.
행사 당일에는 시작 30분 전쯤 미리 한 번 접속해서 깨워두는 걸 추천해요.

## 4. 실제 프레임(틀) 이미지 넣기

`public/js/frames.js` 파일을 열어서 `FRAME_TEMPLATES` 배열에 항목을 추가하세요.
파일 안에 주석으로 예시가 있어요. 핵심은:

- 프레임 PNG는 사진이 보여야 할 4개의 창(구멍) 부분이 **투명(alpha 0)** 이어야 해요.
  (사진을 먼저 그리고 그 위에 프레임을 덮어씌우는 방식이라서요)
- `width`/`height`는 프레임 원본 이미지의 실제 픽셀 크기
- `slots`는 각 사진이 들어갈 위치/크기를 프레임 이미지 기준 좌표로 4개 지정
- 완성된 PNG 파일은 `public/frames/` 폴더에 넣고, `image` 경로를 `/frames/파일명.png`로 지정

프레임을 여러 개 넣으면 촬영 전 선택 화면에 자동으로 카드가 추가돼요.

## 5. 알아두면 좋은 점 / 다음에 개선하면 좋을 것들

- **카메라 권한**: iOS Safari, Android Chrome 모두 카메라 접근에 HTTPS가 필수예요. 배포된 주소로만 테스트하세요.
- **세션 저장은 메모리 방식**: 서버가 재시작되면 그동안 QR이 아직 안 눌린 세션 정보는 사라져요
  (이미 Storage에 올라간 이미지 파일 자체는 안 사라짐). 6시간 지난 세션은 자동으로 메모리에서 정리돼요.
  장시간 행사라면 재시작 없이 쭉 켜두는 걸 권장해요. 지금 규모(부스 1~2대)에는 메모리 방식으로
  충분하지만, 필요하면 Firestore로 바꿔드릴 수 있어요.
- **여러 대 동시 운영**: 촬영 기기(아이패드 등)를 여러 대 두고 싶으면, 그냥 같은 주소를
  여러 기기에서 각각 열면 돼요. 세션 ID가 기기별로 따로 생성되기 때문에 서로 안 섞여요.
- **QR 다운로드 실패 대비**: 관람객 브라우저에서 자동 다운로드가 막히는 경우를 대비해서
  다운로드 페이지에 "길게 눌러 저장" 안내 문구를 추가해뒀어요.
- **촬영 재시도**: 6장 찍은 후 "다시 찍기"를 누르면 처음부터 6장을 다시 촬영해요
  (일부만 재촬영하는 기능은 아직 없어요).

## 6. 개발자 도구로 빠르게 확인하는 법

배포 전에 노트북 크롬 개발자도구의 "기기 툴바"(Ctrl+Shift+M)로 아이패드/안드로이드
화면 비율로 놓고 테스트하면 레이아웃을 빠르게 확인할 수 있어요. 다만 카메라 스트림
자체는 실제 기기에서 최종 확인하는 걸 추천해요.
