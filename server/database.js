const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

const dataDir = process.env.DATA_DIR || path.join(require('os').tmpdir(), 'psychology-data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'db.json');

let mongoCollection = null;

class CloudAdapter extends FileSync {
  write(data) {
    super.write(data);
    if (mongoCollection) {
      mongoCollection
        .replaceOne({ _id: 'db' }, { _id: 'db', data }, { upsert: true })
        .catch(e => console.error('Cloud sync error:', e.message));
    }
  }
}

// Initialize db synchronously so routes can use it immediately
const db = low(new CloudAdapter(dbPath));

const SEED_EMPLOYEES = [
  // נתונים מתוכנית עבודה תשפו + תקנים פברואר 2026
  // id | displayName | firstName | lastName | ftePercent (מתקנים) | workPlanHours (משעות משרה בתוכנית) | meetings | supRec | supGive | therapy | role | office
  { id: 1,  displayName: 'אבי',      firstName: 'אבי',     lastName: 'עזר',       ftePercent: 1.0,  type: 'expert',  meetingHours: 7.5, supReceivedHours: 1,   supGivenHours: 20,  therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 11.5, notes: '' },
  { id: 2,  displayName: 'אופק',     firstName: 'אופק',    lastName: '',          ftePercent: 1.0,  type: 'expert',  meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 9,   roleName: '', officeHours: 12,   notes: '' },
  { id: 3,  displayName: 'אור ה.',   firstName: 'אור',     lastName: 'הדר',       ftePercent: 0.82, type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 3,   therapyHours: 0,   roleHours: 2,   roleName: '', officeHours: 4.5,  notes: '' },
  { id: 4,  displayName: 'אור א.',   firstName: 'אור',     lastName: 'אדיר',      ftePercent: 0.8,  type: 'trainee', meetingHours: 2,   supReceivedHours: 2,   supGivenHours: 4,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 2,    notes: '' },
  { id: 5,  displayName: 'אוראל כ.',  firstName: 'אוראל', lastName: 'כהן',       ftePercent: 0.51, type: 'trainee', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 8,   roleName: '', officeHours: 3,    notes: '' },
  { id: 6,  displayName: 'אורי',     firstName: 'אורי',    lastName: 'וייס',      ftePercent: 0.82, type: 'expert',  meetingHours: 5.5, supReceivedHours: 1,   supGivenHours: 5.5, therapyHours: 6,   roleHours: 0,   roleName: '', officeHours: 11,   notes: '' },
  { id: 7,  displayName: 'אורית נ.', firstName: 'אורית',   lastName: 'נעמד',      ftePercent: 0.51, type: 'trainee', meetingHours: 5.5, supReceivedHours: 1,   supGivenHours: 4,   therapyHours: 3,   roleHours: 0,   roleName: '', officeHours: 5.5,  notes: '' },
  { id: 8,  displayName: 'אורית ס.', firstName: 'אורית',   lastName: 'סינר לורש', ftePercent: 0.6,  type: 'expert',  meetingHours: 4,   supReceivedHours: 2,   supGivenHours: 1.5, therapyHours: 0,   roleHours: 7.5, roleName: '', officeHours: 4.5,  notes: '' },
  { id: 9,  displayName: 'אסף',      firstName: 'אסף',     lastName: '',          ftePercent: 0.5,  type: 'expert',  meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 2,   therapyHours: 9.5, roleHours: 0,   roleName: '', officeHours: 2.5,  notes: '' },
  { id: 10, displayName: 'אריאל',    firstName: 'אריאל',   lastName: '',          ftePercent: 0.8,  type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 3,   therapyHours: 0,   roleHours: 9.5, roleName: '', officeHours: 10.5, notes: '' },
  { id: 11, displayName: 'בועז',     firstName: 'בועז',    lastName: '',          ftePercent: 0.6,  type: 'expert',  meetingHours: 5.5, supReceivedHours: 1,   supGivenHours: 1,   therapyHours: 5,   roleHours: 0,   roleName: '', officeHours: 5.5,  notes: '' },
  { id: 12, displayName: 'גילי',     firstName: 'גילי',    lastName: '',          ftePercent: 0.8,  type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 4.5, therapyHours: 0,   roleHours: 11,  roleName: '', officeHours: 6,    notes: '' },
  { id: 13, displayName: 'דנה',      firstName: 'דנה',     lastName: '',          ftePercent: 0.35, type: 'expert',  meetingHours: 2,   supReceivedHours: 2,   supGivenHours: 0,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 5,    notes: '' },
  { id: 14, displayName: 'דרור',     firstName: 'דרור',    lastName: '',          ftePercent: 0.62, type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 4.5, therapyHours: 0,   roleHours: 11,  roleName: '', officeHours: 4,    notes: '' },
  { id: 15, displayName: 'טטיאנה',   firstName: 'טטיאנה',  lastName: '',          ftePercent: 1.0,  type: 'expert',  meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 4.5, therapyHours: 0,   roleHours: 12,  roleName: '', officeHours: 7,    notes: '' },
  { id: 16, displayName: 'טל',       firstName: 'טל',      lastName: '',          ftePercent: 0.82, type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 3,   roleName: '', officeHours: 4,    notes: '' },
  { id: 17, displayName: 'יהודית',   firstName: 'יהודית',  lastName: '',          ftePercent: 0.5,  type: 'expert',  meetingHours: 4,   supReceivedHours: 2,   supGivenHours: 3.5, therapyHours: 1.5, roleHours: 11,  roleName: '', officeHours: 3,    notes: '' },
  { id: 18, displayName: 'יובל',     firstName: 'יובל',    lastName: 'נוס',       ftePercent: 0.5,  type: 'trainee', meetingHours: 4,   supReceivedHours: 5,   supGivenHours: 4,   therapyHours: 13,  roleHours: 0,   roleName: '', officeHours: 3,    notes: '' },
  { id: 19, displayName: 'לירון',    firstName: 'לירון',   lastName: '',          ftePercent: 0.8,  type: 'expert',  meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 3,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 2,    notes: '' },
  { id: 20, displayName: 'מאי',      firstName: 'מאי',     lastName: '',          ftePercent: 1.0,  type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 8,   roleName: '', officeHours: 7,    notes: '' },
  { id: 21, displayName: 'מאיה',     firstName: 'מאיה',    lastName: '',          ftePercent: 1.0,  type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 4.5, therapyHours: 0,   roleHours: 11,  roleName: '', officeHours: 8,    notes: '' },
  { id: 22, displayName: 'מיכל',     firstName: 'מיכל',    lastName: '',          ftePercent: 0.51, type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 8,   roleName: '', officeHours: 4,    notes: '' },
  { id: 23, displayName: 'מריה',     firstName: 'מריה',    lastName: '',          ftePercent: 0.9,  type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 2,   roleName: '', officeHours: 6,    notes: '' },
  { id: 24, displayName: 'ספיר',     firstName: 'ספיר',    lastName: '',          ftePercent: 0.82, type: 'trainee', meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 3,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 3,    notes: 'מילוי מקום' },
  { id: 25, displayName: 'נועם',     firstName: 'נועם',    lastName: '',          ftePercent: 0.82, type: 'trainee', meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 3,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 3,    notes: '' },
  { id: 26, displayName: 'ניצן',     firstName: 'ניצן',    lastName: 'גנץ',       ftePercent: 0.8,  type: 'expert',  meetingHours: 4,   supReceivedHours: 1.5, supGivenHours: 3,   therapyHours: 4,   roleHours: 0,   roleName: '', officeHours: 16.5, notes: '' },
  { id: 27, displayName: 'נעמה',     firstName: 'נעמה',    lastName: '',          ftePercent: 0.33, type: 'expert',  meetingHours: 2,   supReceivedHours: 2,   supGivenHours: 6,   therapyHours: 10,  roleHours: 0,   roleName: '', officeHours: 3,    notes: '' },
  { id: 28, displayName: 'סיגל',     firstName: 'סיגל',    lastName: '',          ftePercent: 0.35, type: 'trainee', meetingHours: 4,   supReceivedHours: 1.5, supGivenHours: 6.5, therapyHours: 12,  roleHours: 0,   roleName: '', officeHours: 2,    notes: '' },
  { id: 29, displayName: 'סיון ב.',  firstName: 'סיון',    lastName: 'פנינה',     ftePercent: 0.8,  type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1,   therapyHours: 1.5, roleHours: 9,   roleName: '', officeHours: 5,    notes: '' },
  { id: 30, displayName: 'סיון ג.',  firstName: 'סיון',    lastName: '',          ftePercent: 0.5,  type: 'trainee', meetingHours: 4,   supReceivedHours: 1.5, supGivenHours: 4,   therapyHours: 1.5, roleHours: 11,  roleName: '', officeHours: 3,    notes: '' },
  { id: 31, displayName: 'עבדאללה',  firstName: 'עבדאללה', lastName: '',          ftePercent: 0.8,  type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 3,   therapyHours: 0,   roleHours: 5,   roleName: '', officeHours: 5.5,  notes: '' },
  { id: 32, displayName: 'עדי',      firstName: 'עדי',     lastName: '',          ftePercent: 0.62, type: 'expert',  meetingHours: 5.5, supReceivedHours: 1,   supGivenHours: 4,   therapyHours: 5,   roleHours: 0,   roleName: '', officeHours: 5.5,  notes: '' },
  { id: 33, displayName: 'עומר',     firstName: 'עומר',    lastName: '',          ftePercent: 1.0,  type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 4.5, therapyHours: 0,   roleHours: 11,  roleName: '', officeHours: 8,    notes: '' },
  { id: 34, displayName: 'עמיחי',    firstName: 'עמיחי',   lastName: '',          ftePercent: 0.82, type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 3,   therapyHours: 0,   roleHours: 9.5, roleName: '', officeHours: 5.5,  notes: '' },
  { id: 35, displayName: 'פדות',     firstName: 'פדות',    lastName: '',          ftePercent: 0.82, type: 'trainee', meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 3,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 3,    notes: 'חלד' },
  { id: 36, displayName: 'צוף',      firstName: 'צוף',     lastName: '',          ftePercent: 1.0,  type: 'expert',  meetingHours: 4,   supReceivedHours: 3,   supGivenHours: 3,   therapyHours: 0,   roleHours: 10,  roleName: '', officeHours: 7,    notes: '' },
  { id: 37, displayName: 'רוני',     firstName: 'רוני',    lastName: '',          ftePercent: 0.5,  type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 3,   therapyHours: 0,   roleHours: 9.5, roleName: '', officeHours: 3.5,  notes: '' },
  { id: 38, displayName: 'רועי',     firstName: 'רועי',    lastName: '',          ftePercent: 0.5,  type: 'expert',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 8,   roleName: '', officeHours: 3,    notes: '' },
  { id: 39, displayName: 'שחר',      firstName: 'שחר',     lastName: 'וינר',      ftePercent: 0.8,  type: 'expert',  meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 9,   roleName: '', officeHours: 7,    notes: '' },
  { id: 40, displayName: 'שניר',     firstName: 'שניר',    lastName: '',          ftePercent: 0.8,  type: 'expert',  meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 3,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 5,    notes: '' },
  { id: 41, displayName: 'תהילה',    firstName: 'תהילה',   lastName: '',          ftePercent: 0.6,  type: 'expert',  meetingHours: 4,   supReceivedHours: 1.5, supGivenHours: 5,   therapyHours: 1.5, roleHours: 12,  roleName: '', officeHours: 10,   notes: '' },
  { id: 42, displayName: 'אודי',     firstName: 'אודי',    lastName: '',          ftePercent: 0.5,  type: 'expert',  meetingHours: 4,   supReceivedHours: 5,   supGivenHours: 4,   therapyHours: 13,  roleHours: 0,   roleName: '', officeHours: 3,    notes: '' },
  { id: 43, displayName: 'עמית',     firstName: 'עמית',    lastName: '',          ftePercent: 0.8,  type: 'expert',  meetingHours: 2,   supReceivedHours: 2,   supGivenHours: 4,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 2,    notes: '' },
  { id: 44, displayName: 'אודל',     firstName: 'אודל',    lastName: '',          ftePercent: 0.8,  type: 'expert',  meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 9,   roleName: '', officeHours: 6,    notes: '' },
  { id: 45, displayName: 'נועה',     firstName: 'נועה',    lastName: '',          ftePercent: 0.82, type: 'trainee', meetingHours: 0,   supReceivedHours: 0,   supGivenHours: 0,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 0,    notes: 'מילוי מקום' },
];

const SEED_FRAMEWORKS = [
  { id: 101, name: 'אפק',             type: 'school',      sector: 'ממלכתי',       subType: 'יסודי',  allocatedHours: 412,  studentCount: null, notes: '' },
  { id: 102, name: 'אוהל שלום',       type: 'school',      sector: 'ממ"ד',         subType: 'יסודי',  allocatedHours: 360,  studentCount: null, notes: '' },
  { id: 103, name: 'אסף',             type: 'school',      sector: 'ממלכתי',       subType: 'יסודי',  allocatedHours: 433,  studentCount: null, notes: '' },
  { id: 104, name: 'אוהל שרה',        type: 'school',      sector: 'ממ"ד',         subType: 'יסודי',  allocatedHours: 405,  studentCount: null, notes: '' },
  { id: 105, name: 'אשכול',           type: 'school',      sector: 'ממלכתי',       subType: 'יסודי',  allocatedHours: 338,  studentCount: null, notes: '' },
  { id: 106, name: 'עוז',             type: 'school',      sector: 'ממלכתי',       subType: 'יסודי',  allocatedHours: 325,  studentCount: null, notes: '' },
  { id: 107, name: 'חיים גורי',       type: 'school',      sector: 'ממלכתי',       subType: 'יסודי',  allocatedHours: 612,  studentCount: null, notes: '' },
  { id: 108, name: 'צורים',           type: 'school',      sector: 'ממלכתי',       subType: 'יסודי',  allocatedHours: 346,  studentCount: null, notes: '' },
  { id: 109, name: 'טל',              type: 'school',      sector: 'ממלכתי',       subType: 'יסודי',  allocatedHours: 342,  studentCount: null, notes: '' },
  { id: 110, name: 'רמב"ם',           type: 'school',      sector: 'ממ"ד',         subType: 'יסודי',  allocatedHours: 391,  studentCount: null, notes: '' },
  { id: 111, name: 'יצחק נבון',       type: 'school',      sector: 'ממלכתי',       subType: 'יסודי',  allocatedHours: 472,  studentCount: null, notes: '' },
  { id: 112, name: 'רעות',            type: 'school',      sector: 'ממ"ד',         subType: 'יסודי',  allocatedHours: 699,  studentCount: null, notes: '' },
  { id: 113, name: 'נווה דליה',       type: 'school',      sector: 'ממלכתי',       subType: 'יסודי',  allocatedHours: 373,  studentCount: null, notes: '' },
  { id: 114, name: 'נופים',           type: 'school',      sector: 'ממלכתי',       subType: 'יסודי',  allocatedHours: 440,  studentCount: null, notes: '' },
  { id: 115, name: 'נופרים (תורני)',  type: 'school',      sector: 'ממ"ד',         subType: 'יסודי',  allocatedHours: 298,  studentCount: null, notes: '' },
  { id: 116, name: 'אלומות רחל',      type: 'school',      sector: 'ממ"ד',         subType: 'יסודי',  allocatedHours: null, studentCount: null, notes: '' },
  { id: 117, name: 'פרס',             type: 'school',      sector: 'ממלכתי',       subType: 'יסודי',  allocatedHours: 695,  studentCount: null, notes: '' },
  { id: 118, name: 'בית יעקב',        type: 'school',      sector: 'חמ"ד',         subType: 'יסודי',  allocatedHours: null, studentCount: null, notes: 'לפי קריאה' },
  { id: 119, name: 'רונה רמון',       type: 'school',      sector: 'ממלכתי',       subType: 'יסודי',  allocatedHours: 654,  studentCount: null, notes: '' },
  { id: 120, name: 'בעקבי הצאן',      type: 'school',      sector: 'חמ"ד',         subType: 'יסודי',  allocatedHours: null, studentCount: null, notes: 'לפי קריאה' },
  { id: 121, name: 'שיא',             type: 'school',      sector: 'חמ"ד',         subType: 'יסודי',  allocatedHours: 746,  studentCount: null, notes: '' },
  { id: 122, name: 'יסודי התורה',     type: 'school',      sector: 'חרדי',         subType: 'יסודי',  allocatedHours: 270,  studentCount: null, notes: '' },
  { id: 123, name: 'תגלית',           type: 'school',      sector: 'ממלכתי',       subType: 'יסודי',  allocatedHours: 598,  studentCount: null, notes: '' },
  { id: 124, name: 'בארי',            type: 'school',      sector: 'ממלכתי',       subType: 'חטיבה', allocatedHours: 630,  studentCount: null, notes: '' },
  { id: 125, name: 'אולפנת זבולון',   type: 'school',      sector: 'ממ"ד',         subType: 'חטיבה', allocatedHours: 630,  studentCount: null, notes: '' },
  { id: 126, name: 'בראשית',          type: 'school',      sector: 'ממ"ד',         subType: 'חטיבה', allocatedHours: 461,  studentCount: null, notes: '' },
  { id: 127, name: 'דרכי אלישע',      type: 'school',      sector: 'חמ"ד',         subType: 'חטיבה', allocatedHours: 80,   studentCount: null, notes: '' },
  { id: 128, name: 'גוונים',          type: 'school',      sector: 'ממלכתי',       subType: 'חטיבה', allocatedHours: 570,  studentCount: null, notes: '' },
  { id: 129, name: 'עתיד (כנפי רוח)', type: 'school',      sector: 'ממלכתי',       subType: 'חטיבה', allocatedHours: 568,  studentCount: null, notes: '' },
  { id: 130, name: 'היובל',           type: 'school',      sector: 'ממלכתי',       subType: 'חטיבה', allocatedHours: 646,  studentCount: null, notes: '' },
  { id: 131, name: 'חטיבה חדשה',      type: 'school',      sector: 'ממ"ד',         subType: 'חטיבה', allocatedHours: 156,  studentCount: null, notes: '' },
  { id: 132, name: 'בגין',            type: 'school',      sector: 'ממלכתי',       subType: 'תיכון', allocatedHours: null, studentCount: null, notes: '' },
  { id: 133, name: 'שחקים',           type: 'school',      sector: 'ממ"ד',         subType: 'תיכון', allocatedHours: null, studentCount: null, notes: '' },
  { id: 134, name: 'נאות אילנה',      type: 'special_ed',  sector: 'חינוך מיוחד', subType: '',       allocatedHours: null, studentCount: null, notes: '' },
  { id: 135, name: 'פלא / צומח ASD',  type: 'special_ed',  sector: 'חינוך מיוחד', subType: '',       allocatedHours: null, studentCount: null, notes: '' },
  { id: 136, name: 'גבעולים',         type: 'special_ed',  sector: 'חינוך מיוחד', subType: '',       allocatedHours: null, studentCount: null, notes: '' },
];

// שיבוצים - based on שיבוצים לבתי הספר תשפו.docx + תוכנית עבודה
// hours = שעות בי"ס, specEdHours = שעות ח"מ, kinderHours = שעות גנים
const SEED_ASSIGNMENTS = [
  { id: 1,  employeeId: 31, frameworkId: 101, hours: 4,  specEdHours: 3,  kinderHours: 5  }, // עבדאללה → אפק
  { id: 2,  employeeId: 34, frameworkId: 102, hours: 4,  specEdHours: 4,  kinderHours: 10 }, // עמיחי → אוהל שלום
  { id: 3,  employeeId: 36, frameworkId: 103, hours: 8,  specEdHours: 9,  kinderHours: 6  }, // צוף → נופרים+אסף
  { id: 4,  employeeId: 5,  frameworkId: 104, hours: 4,  specEdHours: 2,  kinderHours: 4  }, // אוראל כ. → אוהל שרה
  { id: 5,  employeeId: 29, frameworkId: 105, hours: 4,  specEdHours: 2,  kinderHours: 12 }, // סיון ב. → אשכול
  { id: 6,  employeeId: 39, frameworkId: 106, hours: 4,  specEdHours: 7,  kinderHours: 5  }, // שחר → עוז
  { id: 7,  employeeId: 21, frameworkId: 107, hours: 7,  specEdHours: 6,  kinderHours: 8  }, // מאיה → חיים גורי
  { id: 8,  employeeId: 38, frameworkId: 108, hours: 4,  specEdHours: 5,  kinderHours: 9  }, // רועי → צורים
  { id: 9,  employeeId: 8,  frameworkId: 109, hours: 4,  specEdHours: 4,  kinderHours: 4  }, // אורית ס. → טל
  { id: 10, employeeId: 33, frameworkId: 110, hours: 4,  specEdHours: 6,  kinderHours: 11 }, // עומר → רמב"ם
  { id: 11, employeeId: 12, frameworkId: 111, hours: 5,  specEdHours: 2,  kinderHours: 8  }, // גילי → יצחק נבון
  { id: 12, employeeId: 20, frameworkId: 112, hours: 14, specEdHours: 9,  kinderHours: 2  }, // מאי → רעות + אולפנת זבולון
  { id: 13, employeeId: 10, frameworkId: 113, hours: 4,  specEdHours: 4,  kinderHours: 8  }, // אריאל → נווה דליה
  { id: 14, employeeId: 16, frameworkId: 114, hours: 8,  specEdHours: 10, kinderHours: 0  }, // טל → נופים + יסודי התורה
  { id: 15, employeeId: 41, frameworkId: 116, hours: 2,  specEdHours: 2,  kinderHours: 0  }, // תהילה → אלומות רחל + בגין ח"מ
  { id: 16, employeeId: 3,  frameworkId: 117, hours: 7,  specEdHours: 10, kinderHours: 0  }, // אור ה. → פרס + כיתות קטנות היובל
  { id: 17, employeeId: 7,  frameworkId: 118, hours: 2,  specEdHours: 2,  kinderHours: 0  }, // אורית נ. → בית יעקב
  { id: 18, employeeId: 14, frameworkId: 119, hours: 7,  specEdHours: 3,  kinderHours: 0  }, // דרור → רונה רמון
  { id: 19, employeeId: 6,  frameworkId: 120, hours: 4,  specEdHours: 0,  kinderHours: 0  }, // אורי → בעקבי הצאן
  { id: 20, employeeId: 22, frameworkId: 121, hours: 8,  specEdHours: 1,  kinderHours: 9  }, // מיכל → שיא
  { id: 21, employeeId: 23, frameworkId: 129, hours: 7,  specEdHours: 13, kinderHours: 0  }, // מריה → עתיד + תגלית
  { id: 22, employeeId: 15, frameworkId: 123, hours: 10, specEdHours: 11, kinderHours: 0  }, // טטיאנה → תגלית + חטיבה חדשה
  { id: 23, employeeId: 9,  frameworkId: 124, hours: 7,  specEdHours: 1,  kinderHours: 8  }, // אסף → בארי
  { id: 24, employeeId: 37, frameworkId: 126, hours: 5,  specEdHours: 2,  kinderHours: 7  }, // רוני → בראשית
  { id: 25, employeeId: 35, frameworkId: 127, hours: 4,  specEdHours: 2,  kinderHours: 0  }, // פדות → דרכי אלישע
  { id: 26, employeeId: 11, frameworkId: 128, hours: 6,  specEdHours: 0,  kinderHours: 6  }, // בועז → גוונים (כיתות קטנות)
  { id: 27, employeeId: 40, frameworkId: 128, hours: 6,  specEdHours: 2,  kinderHours: 0  }, // שניר → גוונים
  { id: 28, employeeId: 19, frameworkId: 130, hours: 7,  specEdHours: 7,  kinderHours: 0  }, // לירון → היובל
  { id: 29, employeeId: 30, frameworkId: 132, hours: 6,  specEdHours: 6,  kinderHours: 0  }, // סיון ג. → בגין
  { id: 30, employeeId: 18, frameworkId: 133, hours: 4,  specEdHours: 4,  kinderHours: 0  }, // יובל → שחקים
  { id: 31, employeeId: 25, frameworkId: 133, hours: 4,  specEdHours: 2,  kinderHours: 0  }, // נועם → שחקים
  { id: 32, employeeId: 13, frameworkId: 134, hours: 4,  specEdHours: 0,  kinderHours: 3  }, // דנה → נאות אילנה
  { id: 33, employeeId: 45, frameworkId: 135, hours: 6,  specEdHours: 0,  kinderHours: 6  }, // נועה → פלא/צומח ASD
  { id: 34, employeeId: 17, frameworkId: 136, hours: 4,  specEdHours: 0,  kinderHours: 2  }, // יהודית → גבעולים
  { id: 35, employeeId: 4,  frameworkId: 0,   hours: 6,  specEdHours: 0,  kinderHours: 0  }, // אור א. → לא מוגדר
  { id: 36, employeeId: 2,  frameworkId: 0,   hours: 4,  specEdHours: 7,  kinderHours: 8  }, // אופק → לא מוגדר (לבדיקה)
  { id: 37, employeeId: 26, frameworkId: 0,   hours: 3,  specEdHours: 0,  kinderHours: 0  }, // ניצן → לא מוגדר
  { id: 38, employeeId: 42, frameworkId: 0,   hours: 4,  specEdHours: 4,  kinderHours: 0  }, // אודי → לא מוגדר
  { id: 39, employeeId: 43, frameworkId: 0,   hours: 6,  specEdHours: 0,  kinderHours: 6  }, // עמית → לא מוגדר
  { id: 40, employeeId: 44, frameworkId: 0,   hours: 4,  specEdHours: 13, kinderHours: 0  }, // אודל → לא מוגדר
];

// צוותים - מתוך צוותים תשפו.docx (קריאה מלאה)
const SEED_TEAMS = [
  // צוותים חינוכיים - 3 עמודות: כל עמודה = צוות אחד
  {
    id: 1, type: 'educational', headDisplayName: 'אורית ס.',
    memberDisplayNames: ['ניצן', 'מריה', 'עבדאללה', 'בועז', 'טל', 'דרור', 'רועי', 'עומר', 'תהילה', 'נועה', 'טטיאנה', 'עמית', 'אודי'],
    externalMembers: []
  },
  {
    id: 2, type: 'educational', headDisplayName: 'אורי',
    memberDisplayNames: ['מיכל', 'אורית ס.', 'אוראל כ.', 'גילי', 'מאיה', 'רוני', 'שניר', 'יהודית', 'אור א.', 'שחר', 'דנה', 'סיגל', 'אודל'],
    externalMembers: []
  },
  {
    id: 3, type: 'educational', headDisplayName: 'עדי',
    memberDisplayNames: ['מאי', 'עמיחי', 'נועם', 'אור ה.', 'סיון ג.', 'לירון', 'סיון ב.', 'צוף', 'אריאל', 'אופק', 'יובל', 'אסף'],
    externalMembers: []
  },
  // צוותים קליניים - 3 עמודות
  {
    id: 4, type: 'clinical', headDisplayName: 'בועז',
    memberDisplayNames: ['ניצן', 'מאי', 'אורי', 'מריה', 'עדי', 'עבדאללה', 'אוראל כ.', 'עומר', 'לירון', 'יהודית', 'שחר', 'יובל', 'עמית'],
    externalMembers: ['איילת', 'איסנה', 'סתיו ק.', 'חן', 'יעל', 'עדן', 'בר']
  },
  {
    id: 5, type: 'clinical', headDisplayName: 'תמרי',
    memberDisplayNames: ['דנה', 'אורית נ.', 'מיכל', 'תהילה', 'סיון ב.', 'דרור', 'מאיה', 'צוף', 'אריאל', 'אור א.', 'אופק', 'טטיאנה', 'אסף', 'אודי', 'אודל'],
    externalMembers: ['טליה גואטה', 'יפעת שביט', 'ניצן יפרח', 'רוסלנה']
  },
  {
    id: 6, type: 'clinical', headDisplayName: 'אבי',
    memberDisplayNames: ['אור ה.', 'טל', 'סיון ג.', 'נועם', 'נועה', 'נעמה', 'גילי', 'אורית ס.', 'עמיחי', 'רועי', 'רוני', 'שניר', 'סיגל'],
    externalMembers: ['אירית ק.', 'מיה גל', 'מיטל ריש דבוש', 'תמר', "ז'אנה"]
  },
];


// Kindergarten assignments - from רשימת גנים (sample - first 30)
const SEED_KINDER_ASSIGNMENTS = [
  { id: 201, employeeId: 44, gardenName: 'אתרוג',         ageGroup: 'חובה',  address: 'העצמאות 6',             phone: '',           teacher: 'איילה נגר',               teacherPhone: '',              email: '' },
  { id: 202, employeeId: 44, gardenName: 'עופר',          ageGroup: 'חנ"מ',  address: 'נתן אלתרמן 8',          phone: '03-5742013',  teacher: 'ליטל בן צור (מ"מ)',        teacherPhone: '052-7188551',   email: '' },
  { id: 203, employeeId: 44, gardenName: 'אבטיח',         ageGroup: 'חובה',  address: 'שייקה אופיר 6',         phone: '03-5223985',  teacher: 'גילה קוברסקי',             teacherPhone: '053-7116326',   email: 'kovarski56@gmail.com' },
  { id: 204, employeeId: 44, gardenName: 'סברס',          ageGroup: 'חובה',  address: 'שייקה אופיר 6',         phone: '03-5227456',  teacher: 'מורן ביטה',                teacherPhone: '054-7837434',   email: 'moboa@bezeqint.net' },
  { id: 205, employeeId: 44, gardenName: 'צבר',           ageGroup: 'חנ"מ',  address: 'מגדל דוד 28',           phone: '03-9031562',  teacher: 'רחלי עמיאל',               teacherPhone: '055-5533665',   email: '' },
  { id: 206, employeeId: 2,  gardenName: 'אביב',          ageGroup: 'חובה',  address: 'נילס בוהר 25',          phone: '03-9173696',  teacher: 'אביגיל מנדה',              teacherPhone: '053-4168508',   email: '' },
  { id: 207, employeeId: 2,  gardenName: 'אגוז',          ageGroup: 'חובה',  address: 'נחום גוטמן 2',          phone: '03-9503179',  teacher: 'נאווה שקליר',              teacherPhone: '054-7217852',   email: '' },
  { id: 208, employeeId: 2,  gardenName: 'אסיף',          ageGroup: 'חובה',  address: 'נתן אלתרמן 10',         phone: '03-5358626',  teacher: 'אריאלה ירוחם',             teacherPhone: '052-8582305',   email: '' },
  { id: 209, employeeId: 2,  gardenName: 'יקינטון',       ageGroup: 'חובה',  address: 'רמת הגולן 87',          phone: '03-9031717',  teacher: 'נורית גל',                 teacherPhone: '054-5576069',   email: '' },
  { id: 210, employeeId: 2,  gardenName: 'כרמים',         ageGroup: 'חובה',  address: 'נתן אלתרמן 12',         phone: '03-9552196',  teacher: 'סיון דהן',                 teacherPhone: '050-6795863',   email: '' },
  { id: 211, employeeId: 2,  gardenName: 'קמה',           ageGroup: 'חובה',  address: 'נתן אלתרמן 10',         phone: '03-5357254',  teacher: 'סיון מזרחי',               teacherPhone: '052-6551612',   email: '' },
  { id: 212, employeeId: 2,  gardenName: 'יערה',          ageGroup: 'חנ"מ',  address: 'חרמון 34',              phone: '03-9388258',  teacher: 'מיכל הרטמן',               teacherPhone: '050-5543292',   email: '' },
  { id: 213, employeeId: 6,  gardenName: 'ארגמן',         ageGroup: 'חובה',  address: 'נחשול 11',              phone: '03-7759582',  teacher: 'טל גרינפלד',               teacherPhone: '050-3590043',   email: '' },
  { id: 214, employeeId: 6,  gardenName: 'כפיר',          ageGroup: 'חנ"מ',  address: 'ה\' באייר 120',         phone: '03-9012702',  teacher: 'הדר בוט',                  teacherPhone: '052-2510090',   email: '' },
  { id: 215, employeeId: 8,  gardenName: 'פלג',           ageGroup: 'חובה',  address: 'גרטרוד עליון 20',       phone: '03-7738740',  teacher: 'טלי מויאל',                teacherPhone: '052-4202888',   email: '' },
  { id: 216, employeeId: 10, gardenName: 'גלית',          ageGroup: 'חנ"מ',  address: 'אילנות 13',             phone: '03-9036936',  teacher: 'רוני רוז',                 teacherPhone: '050-8560234',   email: '' },
  { id: 217, employeeId: 10, gardenName: 'השלום',         ageGroup: 'חובה',  address: 'מהריק"א 6',             phone: '',           teacher: 'מירב לוי',                 teacherPhone: '052-5888720',   email: '' },
  { id: 218, employeeId: 10, gardenName: 'רעות',          ageGroup: 'חובה',  address: 'רש"י 120',              phone: '',           teacher: 'תמר קוהלת',                teacherPhone: '053-4108039',   email: '' },
  { id: 219, employeeId: 10, gardenName: 'תאנה',          ageGroup: 'חובה',  address: 'יהושע בן נון 70',       phone: '03-9023190',  teacher: 'עדי פרבר',                 teacherPhone: '052-8285086',   email: '' },
  { id: 220, employeeId: 12, gardenName: 'אננס',          ageGroup: 'חובה',  address: 'לאה גולדברג 48',        phone: '03-9507257',  teacher: 'רוית צורני',               teacherPhone: '050-6573638',   email: '' },
  { id: 221, employeeId: 12, gardenName: 'לוטוס',         ageGroup: 'חובה',  address: 'עופרה חזה 4',           phone: '03-7545838',  teacher: 'הדס באקל',                 teacherPhone: '054-3001623',   email: '' },
  { id: 222, employeeId: 12, gardenName: 'ניצן',          ageGroup: 'חנ"מ',  address: 'ספיר 10',               phone: '03-9109146',  teacher: 'תמר אלמליח',               teacherPhone: '054-9940577',   email: '' },
  { id: 223, employeeId: 12, gardenName: 'שסק',           ageGroup: 'חובה',  address: 'לאה גולדברג 48',        phone: '03-9506212',  teacher: 'מיכל מזרחי',               teacherPhone: '050-4437118',   email: '' },
  { id: 224, employeeId: 15, gardenName: 'הילה',          ageGroup: 'חובה',  address: 'מרים הנביאה 26',        phone: '03-5757903',  teacher: 'רחלי משיח',                teacherPhone: '052-7133673',   email: '' },
  { id: 225, employeeId: 15, gardenName: 'כוכב',          ageGroup: 'ט.חובה',address: 'יואל הנביא 7',          phone: '03-5461260',  teacher: 'מיטל בובלי',               teacherPhone: '050-7299443',   email: '' },
  { id: 226, employeeId: 15, gardenName: 'לבונה',         ageGroup: 'חובה',  address: 'חרצית 2',               phone: '03-9388979',  teacher: 'צוף פלג',                  teacherPhone: '052-4899100',   email: '' },
  { id: 227, employeeId: 15, gardenName: 'שבתאי',         ageGroup: 'חובה',  address: 'מרים הנביאה 33',        phone: '03-6046389',  teacher: 'שירי פינקס',               teacherPhone: '050-8493559',   email: '' },
  { id: 228, employeeId: 15, gardenName: 'שחר',           ageGroup: 'חובה',  address: 'יואל הנביא 7',          phone: '03-5150846',  teacher: 'מוריה חגירה',              teacherPhone: '055-6868938',   email: '' },
  { id: 229, employeeId: 15, gardenName: 'שירה',          ageGroup: 'חובה',  address: 'נחשול 13',              phone: '03-6889499',  teacher: 'חופית יהוד',               teacherPhone: '050-5400798',   email: '' },
  { id: 230, employeeId: 15, gardenName: 'שמים',          ageGroup: 'חובה',  address: 'יואל הנביא 7',          phone: '03-5168314',  teacher: 'חמוטל טראוב',              teacherPhone: '050-4082261',   email: '' },
  { id: 231, employeeId: 15, gardenName: 'שנהב',          ageGroup: 'חובה',  address: 'נחשול 13',              phone: '03-5732359',  teacher: 'עמית בוטה',                teacherPhone: '050-7438412',   email: '' },
  { id: 232, employeeId: 15, gardenName: 'תבל',           ageGroup: 'חובה',  address: 'אליהו הנביא 54',        phone: '03-5295751',  teacher: 'הילה כהן דורני',           teacherPhone: '050-4382226',   email: '' },
  { id: 233, employeeId: 21, gardenName: 'יהל',           ageGroup: 'חובה',  address: 'מרים הנביאה 26',        phone: '03-5335839',  teacher: 'לינור דודיאן',             teacherPhone: '050-2418351',   email: '' },
  { id: 234, employeeId: 21, gardenName: 'מרום',          ageGroup: 'חובה',  address: 'מרים הנביאה 26',        phone: '03-6285481',  teacher: 'אבישג גימני',              teacherPhone: '055-9417896',   email: '' },
  { id: 235, employeeId: 21, gardenName: 'רימון',         ageGroup: 'חובה',  address: 'הרב גורן 2',            phone: '03-9562939',  teacher: 'ציפי טנצר',                teacherPhone: '050-6913091',   email: '' },
  { id: 236, employeeId: 22, gardenName: 'מיתר',          ageGroup: 'חובה',  address: 'העצמאות 29',            phone: '03-9033735',  teacher: 'ליאת בשארי',               teacherPhone: '050-2210972',   email: '' },
  { id: 237, employeeId: 23, gardenName: 'עגור',          ageGroup: 'חנ"מ',  address: 'נתן אלתרמן 8',          phone: '03-6029781',  teacher: 'שילת וליט',                teacherPhone: '050-7654244',   email: '' },
  { id: 238, employeeId: 39, gardenName: 'יסמין',         ageGroup: 'חובה',  address: 'ורדית 2',               phone: '03-9024178',  teacher: 'יעל פרץ',                  teacherPhone: '055-6628510',   email: '' },
  { id: 239, employeeId: 39, gardenName: 'אננס (2)',       ageGroup: 'חובה',  address: 'לאה גולדברג 48',        phone: '03-9507257',  teacher: 'רוית צורני',               teacherPhone: '050-6573638',   email: '' },
  { id: 240, employeeId: 16, gardenName: 'אור',           ageGroup: 'חובה',  address: 'מרים הנביאה 26',        phone: '03-5603464',  teacher: 'רינת טויטו',               teacherPhone: '052-7674962',   email: '' },
  { id: 241, employeeId: 17, gardenName: 'רון',           ageGroup: 'חנ"מ',  address: 'עלי הכהן 8',            phone: '03-5094282',  teacher: 'מיכל פינקלמן',             teacherPhone: '052-6770704',   email: '' },
  { id: 242, employeeId: 34, gardenName: 'פלג (2)',        ageGroup: 'חובה',  address: 'גרטרוד עליון 20',       phone: '03-7738740',  teacher: 'טלי מויאל',                teacherPhone: '052-4202888',   email: '' },
  { id: 243, employeeId: 38, gardenName: 'ארגמן (2)',      ageGroup: 'חובה',  address: 'נחשול 11',              phone: '03-7759582',  teacher: 'טל גרינפלד',               teacherPhone: '050-3590043',   email: '' },
];

async function initDB() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (MONGODB_URI) {
    try {
      const client = new MongoClient(MONGODB_URI);
      await client.connect();
      mongoCollection = client.db('psychology-system').collection('store');
      if (!fs.existsSync(dbPath)) {
        const doc = await mongoCollection.findOne({ _id: 'db' });
        if (doc?.data) {
          fs.writeFileSync(dbPath, JSON.stringify(doc.data));
          console.log('✅ Database restored from cloud');
        }
      }
      console.log('✅ MongoDB connected');
    } catch (e) {
      console.error('⚠️ MongoDB unavailable:', e.message);
      mongoCollection = null;
    }
  }

  db.defaults({
    employees: [], frameworks: [], assignments: [],
    kinderAssignments: [], teams: [], _seedVersion: 0,
    _nextId: { employees: 100, frameworks: 300, assignments: 500, kinderAssignments: 600 }
  }).write();

  const CURRENT_SEED_VERSION = 2;
  if (db.get('_seedVersion').value() < CURRENT_SEED_VERSION) {
    console.log('Reseeding database (version ' + CURRENT_SEED_VERSION + ')...');
    db.set('employees', SEED_EMPLOYEES).write();
    db.set('frameworks', SEED_FRAMEWORKS).write();
    db.set('assignments', SEED_ASSIGNMENTS).write();
    db.set('kinderAssignments', SEED_KINDER_ASSIGNMENTS).write();
    db.set('teams', SEED_TEAMS).write();
    db.set('_seedVersion', CURRENT_SEED_VERSION).write();
    console.log('Done: ' + SEED_EMPLOYEES.length + ' employees, ' + SEED_FRAMEWORKS.length + ' frameworks');
  }
}

module.exports = { db, initDB };
