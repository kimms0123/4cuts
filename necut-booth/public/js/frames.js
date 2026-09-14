// 프레임(틀) 정의 파일
//
// 실제 프레임 이미지가 준비되면:
// 1. public/frames/ 폴더에 PNG 파일을 넣는다 (사진이 보일 4개의 창 부분은 투명(alpha=0)이어야 함)
// 2. 아래 배열에 새 항목을 추가하고 image 경로 + width/height + slots(사진 4장이 들어갈 좌표)를 채운다
//    slots 좌표는 frame 원본 이미지 픽셀 기준 (x, y, w, h)
//
// hasImage:false 인 항목은 이미지가 없을 때 코드로 그려주는 임시(placeholder) 틀임.

// 기본 프레임
const FRAME_TEMPLATES = [
  {
    id: "placeholder-strip",
    name: "기본 프레임",
    hasImage: false,
    width: 1200,
    height: 1800,
    background: "#F6F1E7",
    accent: "#E4572E",
    caption: "INSPIRE ARENA",
    slots: [
      { x: 90, y: 90, w: 1020, h: 380 },
      { x: 90, y: 500, w: 1020, h: 380 },
      { x: 90, y: 910, w: 1020, h: 380 },
      { x: 90, y: 1320, w: 1020, h: 380 },
    ],
  },

  {
    id: "vaundy-strip",
    name: "바운디 세로 4컷",
    hasImage: true,
    image: "/frames/vaundy-strip.png",
    width: 1024,
    height: 1536,
    slots: [
      { x: 284, y: 142, w: 457, h: 292 },
      { x: 285, y: 453, w: 456, h: 294 },
      { x: 285, y: 766, w: 456, h: 291 },
      { x: 288, y: 1080, w: 453, h: 288 },
    ],
  },

  // 넓은 4컷
  {
    id: "vaundy-gird",
    name: "바운디_가로4컷",
    hasImage: true,
    image: "/frames/vaundy-grid.png",
    width: 1024,
    height: 1536,
    slots: [
      { x: 81, y: 193, w: 409, h: 557 },
      { x: 536, y: 193, w: 408, h: 557 },
      { x: 81, y: 780, w: 409, h: 544 },
      { x: 537, y: 780, w: 407, h: 544 },
    ],
  },
  // 넓은 4컷 포토
  {
    id: "vaundy-gird-photo",
    name: "바운디_가로네컷_2",
    hasImage: true,
    image: "/frames/vaundy-grid-photo.png",
    width: 1024,
    height: 1536,
    slots: [
      { x: 85, y: 166, w: 406, h: 439 },
      { x: 534, y: 166, w: 405, h: 440 },
      { x: 87, y: 635, w: 405, h: 441 },
      { x: 535, y: 635, w: 403, h: 440 },
    ],
  },
];
