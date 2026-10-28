// ข้อมูลผังมหาวิทยาลัยกรุงเทพ วิทยาเขตรังสิต
//
// ชื่ออาคาร หมายเลข และโซน ตามแผนผังทางการของมหาวิทยาลัย (หมายเลข 1–37)
// โซน A–C วางตำแหน่งจากแผนผังภาพมุมเฉียง ส่วนโซน D และหอพักนักศึกษาปรับตามภาพถ่ายดาวเทียม
// ทุกตำแหน่งจึงเป็นค่าประมาณ ส่วนขนาดและความสูงประเมินจากภาพ
//
// หน่วยเป็นเมตร: แกน x ตามความยาววิทยาเขต (ค่าน้อย = ทิศตะวันออก ทางเข้าติดถนนพหลโยธิน,
// ค่ามาก = ทิศตะวันตก ท้ายมหาวิทยาลัย) แกน z ค่าบวก = ทิศเหนือ

export const CAMPUS = {
  nameTh: 'มหาวิทยาลัยกรุงเทพ',
  nameEn: 'Bangkok University',
  campusTh: 'วิทยาเขตรังสิต',
  campusEn: 'Rangsit Campus',
  address: '9/1 ถนนพหลโยธิน อำเภอคลองหลวง จังหวัดปทุมธานี',
  // ขอบเขตพื้นที่วิทยาเขต (รูปหลายเหลี่ยม [x, z])
  outline: [
    [-700, -172], [-330, -172], [-262, -290], [270, -290], [386, -300], [522, -330], [619, -330],
    [1085, -260], [1180, -220], [1180, 160], [1007, 200], [736, 205], [425, 160],
    [294, 110], [40, 95], [40, 150], [-300, 165], [-300, 100], [-700, 100],
  ],
};

export const ZONES = {
  A: { th: 'โซน A', x: -470, z: -10 },
  B: { th: 'โซน B', x: -110, z: -60 },
  C: { th: 'โซน C', x: 260, z: -10 },
  D: { th: 'โซน D', x: 640, z: 20 },
};

export const CATEGORIES = {
  academic: { th: 'อาคารเรียน', color: '#5b7fb8' },
  library: { th: 'ห้องสมุด', color: '#d9a13b' },
  culture: { th: 'ศิลปวัฒนธรรม', color: '#c4573f' },
  sport: { th: 'กีฬา', color: '#3fa36b' },
  service: { th: 'บริการนักศึกษา', color: '#9a6bc4' },
};

// ถนน: เส้นตรงจาก (x1, z1) ถึง (x2, z2) กว้าง w เมตร
export const ROADS = [
  { name: 'ถนนพหลโยธิน', x1: -728, z1: -520, x2: -728, z2: 520, w: 40, highway: true },
  // ถนนรอบนอกนอกเขตวิทยาเขต (outside = อยู่ระดับพื้นนอกแท่นวิทยาเขต)
  { name: 'ถนนด้านทิศเหนือ', x1: -708, z1: 108, x2: -300, z2: 108, w: 10, outside: true },
  { x1: -300, z1: 108, x2: -300, z2: 174, w: 10, outside: true },
  { x1: -300, z1: 174, x2: 290, z2: 174, w: 10, outside: true },
  { name: 'ถนนด้านทิศใต้', x1: -708, z1: -182, x2: -335, z2: -182, w: 10, outside: true },
  // ถนนทางเข้าระหว่าง A1 กับ A8 วิ่งไปทางทิศตะวันตกตามแนวเหนือของสระน้ำ
  { x1: -700, z1: 15, x2: -200, z2: 15, w: 12 },
  // ทางเลี้ยวข้าง A8 เข้าลานจอดรถหลัง A7 แล้ววิ่งต่อไปเชื่อมโซน B, C และ D
  { x1: -567, z1: 21, x2: -567, z2: 80, w: 8 },
  { x1: -567, z1: 80, x2: -300, z2: 80, w: 7 },
  { x1: -300, z1: 80, x2: -280, z2: 140, w: 7 },
  { x1: -280, z1: 140, x2: 40, z2: 140, w: 7 },
  { x1: 40, z1: 140, x2: 65, z2: 85, w: 7 },
  // ถนนภายในระหว่างสระน้ำกับแถวอาคารทิศใต้
  { x1: -548, z1: -100, x2: -200, z2: -100, w: 8 },
  { x1: -200, z1: 15, x2: -200, z2: -235, w: 10 },
  { x1: -200, z1: -235, x2: 330, z2: -253, w: 10 },
  { x1: 65, z1: -240, x2: 65, z2: 80, w: 10 },
  { x1: 40, z1: 80, x2: 860, z2: 80, w: 10 },
  { x1: 330, z1: -253, x2: 330, z2: -195, w: 10 },
  { x1: 330, z1: -195, x2: 740, z2: -195, w: 10 },
  { x1: 740, z1: -195, x2: 740, z2: 80, w: 10 },
  // ทางเดินบนสนามหญ้าหน้ากลุ่มตึกเพชร
  { x1: -655, z1: -91, x2: -617, z2: -91, w: 6, path: true },
  { x1: -683.4, z1: -167, x2: -650.4, z2: -93, w: 3, path: true },
  { x1: -683.4, z1: -15, x2: -650.4, z2: -89, w: 3, path: true },
  { x1: -690, z1: 2, x2: -666, z2: -38, w: 5, path: true },
];

// ลานจอดรถ ลานคนเดิน และพื้นที่ปูแข็ง
export const PLAZAS = [
  { kind: 'parking', x: -490, z: 91, w: 380, d: 14 },
  { kind: 'parking', x: -480, z: -162, w: 270, d: 12 },
  { kind: 'parking', x: -240, z: 90, w: 90, d: 40 },
  { kind: 'parking', x: 430, z: -245, w: 70, d: 50 },
  { kind: 'strip', x: -130, z: 110, w: 340, d: 70 },
  { kind: 'plaza', x: 290, z: -88, w: 60, d: 60 },
  // lawn = สนามหญ้าโล่งหน้ากลุ่มตึกเพชร (ไม่วาดอะไรเพิ่ม แค่กันไม่ให้มีต้นไม้ขึ้น)
  { kind: 'lawn', x: -657, z: -81, w: 86, d: 182 },
];

// แหล่งน้ำ (วงรี) และคลอง (สี่เหลี่ยม)
export const WATER = [
  { kind: 'pond', name: 'สระน้ำโซน A', x: -462, z: -45, rx: 80, rz: 24 },
  { kind: 'pond', name: 'สระน้ำโซน B', x: 2, z: -150, rx: 38, rz: 32 },
  { kind: 'pond', name: 'สระน้ำโซน C', x: 22, z: 30, rx: 18, rz: 20 },
  { kind: 'pond', name: 'บึงน้ำท้ายมหาวิทยาลัย', x: 960, z: -50, rx: 195, rz: 135 },
  { kind: 'canal', name: 'คลอง', x: -125, z: 70, w: 330, d: 10 },
  // สระน้ำสามเหลี่ยมหน้ากลุ่มตึกเพชร ฐานขนานถนน ยอดชี้เข้าหาลานระหว่าง A1 กับ A2
  { kind: 'pool', name: 'สระน้ำหน้าตึกเพชร', pts: [[-688, -165], [-688, -17], [-655, -91]], color: '#77803f' },
];

// สนามกีฬากลางแจ้ง: track = สนามฟุตบอลและลู่วิ่ง, court = สนามแข็ง, field = สนามหญ้า
export const FIELDS = [
  { kind: 'track', x: 560, z: -110, w: 66, d: 110 },
  { kind: 'court', x: 500, z: -150, w: 40, d: 54, lines: 3 },
  { kind: 'court', x: -240, z: -120, w: 34, d: 26, lines: 1 },
  { kind: 'field', x: 650, z: -110, w: 50, d: 80 },
];

// ป้ายตัวอักษรหน้ามหาวิทยาลัย หันออกถนนพหลโยธิน
export const SIGNS = [
  { text: 'BANGKOK UNIVERSITY', x: -697, z: -95, w: 56, h: 3.6, hedge: 176, hedgeZ: -82 },
];

// ของประกอบฉากหน้ามหาวิทยาลัย
// gate = ป้อมยามฝั่งใต้ของถนนทางเข้าและไม้กั้น, hedge = แนวพุ่มไม้, colonnade = แนวเสาเอียง, pylon = ป้ายเสาสีดำ, busstop = ศาลาพักผู้โดยสาร (len ตามแนว z),
// canopy = ทางเดินมีหลังคา, sculpture = รูปปั้นสีขาวหน้าทางเข้า A3
export const PROPS = [
  { kind: 'gate', x: -694, z: 15, w: 12 },
  { kind: 'hedge', x1: -690, z1: 23, x2: -580, z2: 23, w: 1.6, h: 1.1 },
  // เสาเรียวสีขาวเอียงสลับหน้าอาคาร A8
  { kind: 'colonnade', x1: -686, x2: -584, z: 32, h: 22, step: 8 },
  { kind: 'pylon', x: -697, z: -168 },
  { kind: 'busstop', x: -704, z: -140, len: 14 },
  { kind: 'busstop', x: -704, z: 60, len: 22 },
  { kind: 'canopy', x1: -690, z1: 6.5, x2: -605, z2: 6.5, w: 3.5, h: 3.4 },
  { kind: 'sculpture', x: -624, z: -91 },
];

// เสาธงหน้าอาคาร A1 (flag = มีธงชาติ)
export const FLAGPOLES = [
  { x: -691, z: -9, h: 26, flag: true },
  { x: -680, z: -2, h: 18 },
  { x: -674, z: 0, h: 18 },
  { x: -668, z: 2, h: 18 },
  { x: -662, z: 4, h: 18 },
];

// num = หมายเลขบนแผนผังทางการ
// shape: box | composite | tower | round | barrel | gable | pavilion | thai | shrine | dorm | none
export const BUILDINGS = [
  // ───── โซน A ─────
  // กลุ่มตึกเพชร (วางตามภาพถ่ายดาวเทียม): A1 ก้อนเหลี่ยมฝั่งเหนือ, A2 ก้อนเหลี่ยมฝั่งใต้,
  // A3 อาคารกระจกสี่เหลี่ยมขนาดใหญ่ด้านหลัง (ทิศตะวันตก) จุด hull เป็นพิกัดเทียบกับกึ่งกลางอาคาร
  { num: 1, id: 'A1', zone: 'A', category: 'academic', shape: 'composite',
    nameTh: 'อาคาร A1', nameEn: 'Building A1',
    x: -645, z: -51, w: 60, d: 54, h: 29, color: '#eef1f3',
    parts: [{ hull: [[12.4, 0, 0.6], [4.9, 0, 11.9], [-9.5, 0, 13.1], [-17, 0, 6.2], [-3.2, 0, -13.1], [28.8, 22, 1.2], [13.8, 23.5, 23.8], [-15, 22, 26.2], [-30, 23.5, 12.5], [-2.5, 22, -26.2], [-7.5, 29, 6.2]] }],
    desc: 'ก้อนอาคารเหลี่ยมฝั่งทิศเหนือของกลุ่มตึกเพชร ตัวอาคารบานออกด้านบน หลังคาทรงพีระมิดหลายเหลี่ยม ผิวเป็นแผงสีขาวเงินสลับแถบกระจก' },
  { num: 2, id: 'A2', zone: 'A', category: 'academic', shape: 'composite',
    nameTh: 'อาคาร A2', nameEn: 'Building A2',
    x: -647, z: -130, w: 48, d: 54, h: 20, color: '#eef1f3',
    parts: [{ hull: [[2.6, 0, 21.6], [-9.4, 0, 17.6], [-18.4, 0, -21.4], [5.6, 0, -14.4], [18.6, 0, 3.6], [3.2, 13, 27], [-11.8, 14.5, 22], [-23, 13, -26.8], [7, 14.5, -18], [23.2, 13, 4.5], [-1.8, 20, -3]] }],
    desc: 'ก้อนอาคารเหลี่ยมฝั่งทิศใต้ของกลุ่มตึกเพชร หลังคาทรงพีระมิดหลายเหลี่ยม ผิวเป็นแผงสีขาวเงินสลับแถบกระจก' },
  { num: 3, id: 'A3', zone: 'A', label: 'A3 Diamond Hall', category: 'academic', shape: 'composite',
    nameTh: 'อาคาร A3', nameEn: 'Building A3 (Diamond Hall)',
    x: -584, z: -90, w: 61, d: 112, h: 36, color: '#eef1f3',
    // back: ด้านทิศตะวันตก (หันเข้าสระน้ำ) เป็นผนังขาวมีช่องแสงแนวนอนและบันไดกระจกตรงกลาง
    parts: [{ curtain: [0, 0, 61, 112, 36], lobby: 6, solar: true, back: 'slits' }],
    desc: 'อาคารหลักของกลุ่มตึกเพชร ตั้งอยู่ด้านหลังอาคาร A1 และ A2 ผนังม่านกระจกมีโครงเหล็กสีขาวพาดทแยงเป็นรูปสามเหลี่ยม ชั้นล่างเป็นล็อบบี้กระจก หลังคาติดแผงโซลาร์เซลล์ ด้านหน้ามีสนามหญ้า สระน้ำ และป้าย BANGKOK UNIVERSITY หันออกถนนพหลโยธิน รู้จักกันในชื่อไดมอนด์ ฮอลล์' },
  // แถวทิศใต้ (ภาพโดรน): อาคารยาวกรอบหน้าต่างสีแดง หลังคาโซลาร์ ต่อกันจากหลังตึกเพชรไปทางทิศตะวันตก
  // โดยมีหอคอย A5 คั่นกลาง
  { num: 4, id: 'A4', zone: 'A', category: 'academic', shape: 'composite',
    nameTh: 'อาคาร A4', nameEn: 'Building A4',
    x: -488, z: -135, w: 120, d: 26, h: 16, color: '#f1efea', accent: '#b4532f',
    parts: [{ box: [0, 0, 120, 26, 16], solar: true }],
    desc: 'อาคารเรียนยาวแนวทิศใต้ของโซน A ต่อจากด้านหลังกลุ่มตึกเพชรไปจนถึงหอคอย A5 ผนังสีขาวกรอบหน้าต่างสีแดง หลังคาติดแผงโซลาร์' },
  { num: 5, id: 'A5', zone: 'A', label: 'A5 Tourism Tower', category: 'academic', shape: 'tower',
    nameTh: 'อาคาร A5 (ทัวริซึม ทาวเวอร์)', nameEn: 'Building A5 (Tourism Tower)',
    x: -410, z: -135, w: 30, d: 28, h: 58, color: '#a9c9c6', glass: true, accent: '#d4622f',
    desc: 'อาคารสูงที่สุดในโซน A ผนังกระจกสีฟ้าอมเขียวซ้อนชั้นเหลื่อมกัน มีแกนคอนกรีตด้านข้างและเสาสีส้มที่ฐาน' },
  { num: 6, id: 'A6', zone: 'A', category: 'academic', shape: 'composite',
    nameTh: 'อาคาร A6', nameEn: 'Building A6',
    x: -358, z: -135, w: 60, d: 24, h: 16, color: '#f1efea', accent: '#b4532f',
    parts: [{ box: [0, 0, 60, 24, 16], solar: true }],
    desc: 'อาคารเรียนต่อจากหอคอย A5 ไปทางทิศตะวันตก ผนังสีขาวกรอบหน้าต่างสีแดง' },
  // แถวทิศเหนือ: อาคารยาวหลังคาโซลาร์ 3 ช่วง ติดลานจอดรถริมถนนด้านเหนือ
  { num: 7, id: 'A7', zone: 'A', category: 'academic', shape: 'composite',
    nameTh: 'อาคาร A7', nameEn: 'Building A7',
    x: -445, z: 58, w: 218, d: 26, h: 15, color: '#eceae4',
    parts: [
      { box: [-74, 0, 70, 26, 15], solar: true },
      { box: [0, 0, 70, 26, 15], solar: true },
      { box: [74, 0, 70, 26, 15], solar: true },
    ],
    desc: 'อาคารยาวแนวทิศเหนือของโซน A แบ่งเป็น 3 ช่วงต่อกัน หลังคาติดแผงโซลาร์ ด้านหลังเป็นลานจอดรถ เข้าทางเลี้ยวข้างอาคาร A8' },
  { num: 8, id: 'A8', zone: 'A', label: 'A8 Imagine Village', category: 'service', shape: 'composite',
    nameTh: 'อาคาร A8 (อิแมจิน วิลเลจ)', nameEn: 'Building A8 (Imagine Village)',
    x: -635, z: 52, w: 110, d: 34, h: 20, color: '#f1f2f3', glassColor: '#5f7d8c',
    also: ['ศูนย์รับสมัครและบริการข้อมูล (Admissions & Information Center)'],
    parts: [
      { glass: [4, 0, 96, 30, 18], solar: true },
      { solid: [-50, 0, 10, 34, 20], color: '#2f3550' },
      { solid: [52, 0, 8, 34, 20], color: '#2f3550' },
      { solid: [2, 0, 98, 31, 2.4, 9], color: '#f4f5f6' },
    ],
    desc: 'อาคารยาวทางทิศเหนือของถนนทางเข้า ผนังด้านสกัดสีน้ำเงินเข้ม ตรงกลางเป็นกระจกคาดแถบสีขาว เป็นที่ตั้งของศูนย์รับสมัครและบริการข้อมูล' },
  { num: 9, id: 'SHRINE', zone: 'A', category: 'culture', shape: 'shrine',
    nameTh: 'หอพระพุทธสุรัตนมุนี', nameEn: 'Buddha Shrine',
    x: -440, z: -82, w: 12, d: 12, h: 12, color: '#e0b24a',
    desc: 'หอพระประจำมหาวิทยาลัย ตั้งอยู่ริมสระน้ำโซน A ฝั่งทิศใต้' },
  { num: 10, id: 'THAI', zone: 'A', category: 'culture', shape: 'thai',
    nameTh: 'เรือนไทย', nameEn: 'Thai House',
    x: -392, z: -45, w: 26, d: 18, h: 13, color: '#8a3b2e',
    desc: 'เรือนไทยริมสระน้ำโซน A ปลายด้านทิศตะวันตก ใช้จัดกิจกรรมด้านศิลปวัฒนธรรมและประเพณีไทย' },
  { num: 11, id: 'SVC', zone: 'A', label: 'ศูนย์บริการอาคาร', category: 'service', shape: 'box',
    nameTh: 'ศูนย์บริการอาคารสถานที่', nameEn: 'Building Services Center',
    x: -470, z: -82, w: 26, d: 14, h: 8, color: '#f0d9a8',
    desc: 'หน่วยงานดูแลอาคาร สถานที่ และระบบสาธารณูปโภคของวิทยาเขต' },
  { num: 12, id: 'SAC', zone: 'A', category: 'service', shape: 'box',
    nameTh: 'ศูนย์กิจกรรมนักศึกษา', nameEn: 'Student Activities Center (SAC)',
    x: -290, z: -138, w: 34, d: 26, h: 18, color: '#9c5a3c',
    desc: 'ศูนย์รวมชมรมและกิจกรรมนักศึกษา อาคารสีน้ำตาลอิฐ' },
  { num: 13, id: 'MPB', zone: 'A', category: 'service', shape: 'box',
    nameTh: 'อาคารอเนกประสงค์', nameEn: 'Multipurpose Building',
    x: -250, z: -155, w: 28, d: 22, h: 12, color: '#eceef1',
    desc: 'อาคารสำหรับจัดกิจกรรมและงานต่าง ๆ ของมหาวิทยาลัย' },
  { num: 14, id: 'CAF12', zone: 'A', category: 'service', shape: 'gable', halls: 2, roof: '#4a4f57',
    nameTh: 'โรงอาหาร 1–2', nameEn: 'Cafeteria 1–2',
    x: -305, z: -40, w: 60, d: 64, h: 13, color: '#f4f2ee',
    also: ['ร้านสหกรณ์มหาวิทยาลัยกรุงเทพ จำกัด (BU Co-Operative Store)'],
    desc: 'โรงอาหารหลักของโซน A หลังคาจั่วสีเทาเข้มสองหลังเคียงกัน ถัดจากปลายสระน้ำไปทางทิศตะวันตก มีร้านสหกรณ์มหาวิทยาลัย' },
  { num: 15, id: 'REST2', zone: 'A', category: 'service', shape: 'pavilion',
    nameTh: 'ลานร่วมมิตร', nameEn: 'Rest Area 2',
    x: -360, z: -40, w: 22, d: 16, h: 6, color: '#f4f2ee',
    desc: 'ลานนั่งพักระหว่างเรือนไทยกับโรงอาหาร' },
  { num: 16, id: 'REST1', zone: 'A', category: 'service', shape: 'pavilion',
    nameTh: 'ศาลาพักใจ', nameEn: 'Rest Area 1',
    x: -318, z: 35, w: 16, d: 12, h: 6, color: '#f4f2ee',
    desc: 'ศาลานั่งพักริมถนนสายหลัก' },
  { num: 17, id: 'ATH', zone: 'A', category: 'sport', shape: 'box',
    nameTh: 'บ้านพักนักกีฬา', nameEn: 'Athlete House',
    x: -285, z: 45, w: 22, d: 16, h: 9, color: '#f1f1ef',
    desc: 'ที่พักสำหรับนักกีฬาของมหาวิทยาลัย' },

  // ───── โซน B ─────
  { num: 18, id: 'GYM', zone: 'B', label: 'อาคารกีฬาในร่ม', category: 'sport', shape: 'gable',
    nameTh: 'อาคารกีฬาในร่มและห้องน้ำ', nameEn: 'Gymnasium and Toilet',
    x: -240, z: -50, w: 30, d: 22, h: 10, color: '#eef0f2',
    desc: 'อาคารกีฬาในร่มขนาดเล็ก ข้างสนามกีฬาโซน B' },
  { num: 19, id: 'B1', zone: 'B', category: 'academic', shape: 'box',
    nameTh: 'อาคาร B1', nameEn: 'Building B1',
    x: -160, z: -118, w: 40, d: 34, h: 22, color: '#d8dbe0',
    desc: 'อาคารเรียนในโซน B (ตึกศิลปกรรม)' },
  { num: 20, id: 'B2', zone: 'B', category: 'academic', shape: 'gable',
    nameTh: 'อาคาร B2', nameEn: 'Building B2',
    x: -165, z: -200, w: 34, d: 26, h: 11, color: '#f3f3f1',
    desc: 'กลุ่มอาคารหลังคาจั่วสีขาวในโซน B' },
  { num: 21, id: 'B3', zone: 'B', roof: '#545a64', category: 'academic', shape: 'barrel',
    nameTh: 'อาคาร B3', nameEn: 'Building B3',
    x: -80, z: -195, w: 46, d: 28, h: 13, color: '#e6e8eb',
    desc: 'อาคารหลังคาโค้งเรียงกันหลายช่วงในโซน B' },
  { num: 22, id: 'B4', zone: 'B', category: 'academic', shape: 'box',
    nameTh: 'อาคาร B4', nameEn: 'Building B4',
    x: -60, z: 10, w: 46, d: 32, h: 20, color: '#f4f4f2', accent: '#b8343a',
    desc: 'อาคารเรียนสีขาวตัดแดงริมคลอง' },
  { num: 23, id: 'B5', zone: 'B', roof: '#5e2f20', category: 'academic', shape: 'gable',
    nameTh: 'อาคาร B5', nameEn: 'Building B5',
    x: -140, z: 108, w: 40, d: 24, h: 11, color: '#8a4a32',
    desc: 'อาคารสีน้ำตาลหลังคาจั่ว อยู่บนแนวลานจอดรถฝั่งตรงข้ามคลอง' },
  { num: 24, id: 'B7', zone: 'B', category: 'academic', shape: 'box',
    nameTh: 'อาคาร B7', nameEn: 'Building B7',
    x: -40, z: -140, w: 28, d: 22, h: 14, color: '#eceef0',
    desc: 'อาคารขนาดเล็กติดสระน้ำโซน B' },

  // ───── โซน C ─────
  { num: 25, id: 'C9', zone: 'C', category: 'academic', shape: 'box',
    nameTh: 'อาคาร C9', nameEn: 'Building C9',
    x: 112, z: 50, w: 34, d: 24, h: 12, color: '#f2f2f0',
    desc: 'อาคารเรียนขนาดเล็กในโซน C' },
  { num: 26, id: 'CERA', zone: 'C', label: 'อาคารพิพิธภัณฑ์ฯ', category: 'culture', shape: 'box',
    nameTh: 'อาคารพิพิธภัณฑสถานเครื่องถ้วยเอเชียตะวันออกเฉียงใต้', nameEn: 'Southeast Asian Ceramics Museum Annex',
    x: 180, z: 30, w: 36, d: 26, h: 16, color: '#eef2f6',
    desc: 'อาคารส่วนต่อขยายของพิพิธภัณฑ์เครื่องถ้วย' },
  { num: 27, id: 'CER', zone: 'C', label: 'พิพิธภัณฑ์เครื่องถ้วย', category: 'culture', shape: 'box',
    nameTh: 'พิพิธภัณฑสถานเครื่องถ้วยเอเชียตะวันออกเฉียงใต้', nameEn: 'Southeast Asian Ceramics Museum',
    x: 165, z: -45, w: 46, d: 40, h: 28, color: '#f5f6f7',
    desc: 'พิพิธภัณฑ์จัดแสดงเครื่องถ้วยและเครื่องปั้นดินเผาโบราณจากภูมิภาคเอเชียตะวันออกเฉียงใต้' },
  { num: 28, id: 'C6', zone: 'C', label: 'หอสมุด (C6)', category: 'library', shape: 'box',
    nameTh: 'หอสมุดสุรัตน์ โอสถานุเคราะห์ (อาคาร C6)', nameEn: 'Surat Osathanugrah Library (Building C6)',
    x: 128, z: -140, w: 56, d: 46, h: 28, color: '#f1f2f3',
    desc: 'ห้องสมุดหลักของวิทยาเขต พื้นที่อ่านหนังสือ ค้นคว้า และทำงานกลุ่ม' },
  { num: 29, id: 'C10', zone: 'C', category: 'academic', shape: 'box',
    nameTh: 'อาคาร C10', nameEn: 'Building C10',
    x: 245, z: 42, w: 40, d: 26, h: 12, color: '#f4f4f4',
    also: ['โรงอาหาร 3 (Cafeteria 3)'],
    desc: 'อาคารในโซน C ที่ตั้งโรงอาหาร 3' },
  { num: 30, id: 'C1', zone: 'C', category: 'academic', shape: 'box',
    nameTh: 'อาคาร C1', nameEn: 'Building C1',
    x: 262, z: -128, w: 40, d: 26, h: 20, color: '#e7eaee',
    desc: 'อาคารเรียนในโซน C ล้อมลานวงกลม' },
  { num: 31, id: 'C2', zone: 'C', category: 'academic', shape: 'round',
    nameTh: 'อาคาร C2', nameEn: 'Building C2',
    x: 315, z: -80, w: 34, d: 34, h: 28, color: '#5d636e',
    desc: 'อาคารทรงกระบอกสีเทาเข้ม จุดเด่นของโซน C' },
  { num: 32, id: 'C3', zone: 'C', category: 'academic', shape: 'box',
    nameTh: 'อาคาร C3', nameEn: 'Building C3',
    x: 372, z: -95, w: 32, d: 30, h: 22, color: '#eef0f3',
    desc: 'อาคารเรียนในโซน C' },
  { num: 33, id: 'C4', zone: 'C', label: 'C4 (CDA)', category: 'academic', shape: 'box',
    nameTh: 'อาคาร C4', nameEn: 'Building C4 (Center for Cinematic and Digital Arts)',
    x: 448, z: -60, w: 44, d: 36, h: 22, color: '#3b5fb0',
    desc: 'อาคารศูนย์ภาพยนตร์และดิจิทัลอาร์ต (Center for Cinematic and Digital Arts Building) อาคารสีน้ำเงิน' },
  { num: 34, id: 'C5', zone: 'C', category: 'academic', shape: 'barrel',
    nameTh: 'อาคาร C5', nameEn: 'Building C5',
    x: 462, z: 30, w: 30, d: 24, h: 11, color: '#f2f2f2',
    desc: 'อาคารหลังคาโค้งท้ายโซน C' },

  // ───── โซน D ─────
  { num: 35, id: 'SPORT', zone: 'D', label: 'ศูนย์กีฬาสุรี บูรณธนิต', category: 'sport', shape: 'box',
    nameTh: 'ศูนย์กีฬาสุรี บูรณธนิต', nameEn: 'Suree Buranathanit Sports Center',
    x: 575, z: -230, w: 40, d: 22, h: 11, color: '#f4f5f6',
    desc: 'ศูนย์กีฬาหลักของมหาวิทยาลัย อยู่ติดสนามฟุตบอลและลู่วิ่ง' },
  { num: 36, id: 'MSB', zone: 'D', label: 'อาคารกีฬาอเนกประสงค์', category: 'sport', shape: 'box',
    nameTh: 'อาคารกีฬาอเนกประสงค์', nameEn: 'Multipurpose Sports Building',
    x: 520, z: -235, w: 30, d: 22, h: 10, color: '#e8eaec',
    desc: 'อาคารกีฬาอเนกประสงค์ในโซน D' },
  { num: 37, id: 'TENNIS', zone: 'D', category: 'sport', shape: 'none',
    nameTh: 'สนามเทนนิส', nameEn: 'Tennis Courts',
    x: 500, z: -150, w: 40, d: 54, h: 0, color: '#3f8f5f',
    desc: 'สนามเทนนิสกลางแจ้ง 3 คอร์ต ข้างสนามฟุตบอลและลู่วิ่ง' },
  { num: 38, id: 'DORM', zone: 'D', label: 'หอพักนักศึกษา', category: 'service', shape: 'dorm',
    nameTh: 'หอพักนักศึกษา', nameEn: 'Student Dormitories',
    x: 770, z: 138, w: 180, d: 62, h: 20, color: '#efe9df',
    // อาคารย่อย [dx, dz, w, d] เทียบกับจุดกึ่งกลาง
    blocks: [[-50, -20, 80, 16], [50, -20, 80, 16], [-50, 20, 80, 16], [50, 20, 80, 16]],
    note: 'ไม่อยู่ในแผนผังทางการ เพิ่มจากภาพถ่ายดาวเทียม',
    desc: 'กลุ่มอาคารหอพักนักศึกษาท้ายมหาวิทยาลัย ทางทิศเหนือของบึงน้ำ จำนวนและรูปทรงอาคารเป็นค่าประมาณจากภาพถ่ายดาวเทียม' },
];

// มุมกล้องเริ่มต้น: มองจากทิศใต้ ทิศเหนืออยู่ด้านบนของจอและทางเข้าอยู่ด้านขวา เหมือน Google Maps
// mobile = มุมมองสำหรับจอแนวตั้ง มองไล่ตามความยาววิทยาเขตจากฝั่งทางเข้า
export const START_VIEW = {
  position: [810, 1360, -1500],
  target: [565, 0, 20],
  mobile: {
    position: [-1080, 560, 330],
    target: [160, 0, -170],
  },
};
