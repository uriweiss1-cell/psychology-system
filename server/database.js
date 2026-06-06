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

let db; // initialized inside initDB(), after MongoDB restore writes the file

const SEED_EMPLOYEES = [
  // נתונים מתוכנית עבודה תשפו + תקנים פברואר 2026
  // id | displayName | firstName | lastName | ftePercent (מתקנים) | workPlanHours (משעות משרה בתוכנית) | meetings | supRec | supGive | therapy | role | office
  { id: 1,  displayName: 'אבי',      firstName: 'אבי',     lastName: 'עזר',       ftePercent: 1.0,  type: 'expert',  status: 'active', meetingHours: 7.5, supReceivedHours: 1,   supGivenHours: 20,  therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 11.5, notes: '' },
  { id: 2,  displayName: 'אופק',     firstName: 'אופק',    lastName: '',          ftePercent: 1.0,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 9,   roleName: '', officeHours: 12,   notes: '' },
  { id: 3,  displayName: 'אור ה.',   firstName: 'אור',     lastName: 'הדר',       ftePercent: 0.82, type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 3,   therapyHours: 0,   roleHours: 2,   roleName: '', officeHours: 4.5,  notes: '' },
  { id: 4,  displayName: 'אור א.',   firstName: 'אור',     lastName: 'אדיר',      ftePercent: 0.8,  type: 'trainee', status: 'active', isSubstitute: true, meetingHours: 2,   supReceivedHours: 2,   supGivenHours: 4,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 2,    notes: '' },
  { id: 5,  displayName: 'אוראל כ.',  firstName: 'אוראל', lastName: 'כהן',       ftePercent: 0.51, type: 'trainee', status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 8,   roleName: '', officeHours: 3,    notes: '' },
  { id: 6,  displayName: 'אורי',     firstName: 'אורי',    lastName: 'וייס',      ftePercent: 0.82, type: 'expert',  status: 'active', meetingHours: 5.5, supReceivedHours: 1,   supGivenHours: 5.5, therapyHours: 6,   roleHours: 0,   roleName: '', officeHours: 11,   notes: '' },
  { id: 7,  displayName: 'אורית נ.', firstName: 'אורית',   lastName: 'נעמד',      ftePercent: 0.51, type: 'trainee', status: 'active', meetingHours: 5.5, supReceivedHours: 1,   supGivenHours: 4,   therapyHours: 3,   roleHours: 0,   roleName: '', officeHours: 5.5,  notes: '' },
  { id: 8,  displayName: 'אורית ס.', firstName: 'אורית',   lastName: 'סינר לורש', ftePercent: 0.6,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2,   supGivenHours: 1.5, therapyHours: 0,   roleHours: 7.5, roleName: '', officeHours: 4.5,  notes: '' },
  { id: 9,  displayName: 'אסף',      firstName: 'אסף',     lastName: '',          ftePercent: 0.5,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 2,   therapyHours: 9.5, roleHours: 0,   roleName: '', officeHours: 2.5,  notes: '' },
  { id: 10, displayName: 'אריאל',    firstName: 'אריאל',   lastName: '',          ftePercent: 0.8,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 3,   therapyHours: 0,   roleHours: 9.5, roleName: '', officeHours: 10.5, notes: '' },
  { id: 11, displayName: 'בועז',     firstName: 'בועז',    lastName: '',          ftePercent: 0.6,  type: 'expert',  status: 'active', meetingHours: 5.5, supReceivedHours: 1,   supGivenHours: 1,   therapyHours: 5,   roleHours: 0,   roleName: '', officeHours: 5.5,  notes: '' },
  { id: 12, displayName: 'גילי',     firstName: 'גילי',    lastName: '',          ftePercent: 0.8,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 4.5, therapyHours: 0,   roleHours: 11,  roleName: '', officeHours: 6,    notes: '' },
  { id: 13, displayName: 'דנה',      firstName: 'דנה',     lastName: '',          ftePercent: 0.35, type: 'expert',  status: 'active', meetingHours: 2,   supReceivedHours: 2,   supGivenHours: 0,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 5,    notes: '' },
  { id: 14, displayName: 'דרור',     firstName: 'דרור',    lastName: '',          ftePercent: 0.62, type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 4.5, therapyHours: 0,   roleHours: 11,  roleName: '', officeHours: 4,    notes: '' },
  { id: 15, displayName: 'טטיאנה',   firstName: 'טטיאנה',  lastName: '',          ftePercent: 1.0,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 4.5, therapyHours: 0,   roleHours: 12,  roleName: '', officeHours: 7,    notes: '' },
  { id: 16, displayName: 'טל',       firstName: 'טל',      lastName: '',          ftePercent: 0.82, type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 3,   roleName: '', officeHours: 4,    notes: '' },
  { id: 17, displayName: 'יהודית',   firstName: 'יהודית',  lastName: '',          ftePercent: 0.5,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2,   supGivenHours: 3.5, therapyHours: 1.5, roleHours: 11,  roleName: '', officeHours: 3,    notes: '' },
  { id: 18, displayName: 'יובל',     firstName: 'יובל',    lastName: 'נוס',       ftePercent: 0.5,  type: 'trainee', status: 'active', meetingHours: 4,   supReceivedHours: 5,   supGivenHours: 4,   therapyHours: 13,  roleHours: 0,   roleName: '', officeHours: 3,    notes: '' },
  { id: 19, displayName: 'לירון',    firstName: 'לירון',   lastName: '',          ftePercent: 0.8,  type: 'expert',  status: 'active', meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 3,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 2,    notes: '' },
  { id: 20, displayName: 'מאי',      firstName: 'מאי',     lastName: '',          ftePercent: 1.0,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 8,   roleName: '', officeHours: 7,    notes: '' },
  { id: 21, displayName: 'מאיה',     firstName: 'מאיה',    lastName: '',          ftePercent: 1.0,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 4.5, therapyHours: 0,   roleHours: 11,  roleName: '', officeHours: 8,    notes: '' },
  { id: 22, displayName: 'מיכל',     firstName: 'מיכל',    lastName: '',          ftePercent: 0.51, type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 8,   roleName: '', officeHours: 4,    notes: '' },
  { id: 23, displayName: 'מריה',     firstName: 'מריה',    lastName: '',          ftePercent: 0.9,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 2,   roleName: '', officeHours: 6,    notes: '' },
  { id: 24, displayName: 'ספיר',     firstName: 'ספיר',    lastName: 'עטיה',      ftePercent: 0.82, type: 'trainee', status: 'active', isSubstitute: false, meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 3,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 3,    notes: '' },
  { id: 25, displayName: 'נועם',     firstName: 'נועם',    lastName: 'שלין',      ftePercent: 0.82, type: 'trainee', status: 'active', meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 3,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 3,    notes: 'אמור לעזוב באפריל' },
  { id: 26, displayName: 'ניצן',     firstName: 'ניצן',    lastName: 'גנץ',       ftePercent: 0.8,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 1.5, supGivenHours: 3,   therapyHours: 4,   roleHours: 0,   roleName: '', officeHours: 16.5, notes: '' },
  { id: 27, displayName: 'נעמה',     firstName: 'נעמה',    lastName: '',          ftePercent: 0.33, type: 'expert',  status: 'active', meetingHours: 2,   supReceivedHours: 2,   supGivenHours: 6,   therapyHours: 10,  roleHours: 0,   roleName: '', officeHours: 3,    notes: '' },
  { id: 28, displayName: 'סיגל',     firstName: 'סיגל',    lastName: '',          ftePercent: 0.35, type: 'trainee', status: 'active', meetingHours: 4,   supReceivedHours: 1.5, supGivenHours: 6.5, therapyHours: 12,  roleHours: 0,   roleName: '', officeHours: 2,    notes: '' },
  { id: 29, displayName: 'סיון ב.',  firstName: 'סיון',    lastName: 'פנינה',     ftePercent: 0.8,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1,   therapyHours: 1.5, roleHours: 9,   roleName: '', officeHours: 5,    notes: '' },
  { id: 30, displayName: 'סיון ג.',  firstName: 'סיון',    lastName: '',          ftePercent: 0.5,  type: 'trainee', status: 'active', meetingHours: 4,   supReceivedHours: 1.5, supGivenHours: 4,   therapyHours: 1.5, roleHours: 11,  roleName: '', officeHours: 3,    notes: '' },
  { id: 31, displayName: 'עבדאללה',  firstName: 'עבדאללה', lastName: '',          ftePercent: 0.8,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 3,   therapyHours: 0,   roleHours: 5,   roleName: '', officeHours: 5.5,  notes: '' },
  { id: 32, displayName: 'עדי',      firstName: 'עדי',     lastName: '',          ftePercent: 0.62, type: 'expert',  status: 'active', meetingHours: 5.5, supReceivedHours: 1,   supGivenHours: 4,   therapyHours: 5,   roleHours: 0,   roleName: '', officeHours: 5.5,  notes: '' },
  { id: 33, displayName: 'עומר',     firstName: 'עומר',    lastName: '',          ftePercent: 1.0,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 4.5, therapyHours: 0,   roleHours: 11,  roleName: '', officeHours: 8,    notes: '' },
  { id: 34, displayName: 'עמיחי',    firstName: 'עמיחי',   lastName: '',          ftePercent: 0.82, type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 3,   therapyHours: 0,   roleHours: 9.5, roleName: '', officeHours: 5.5,  notes: '' },
  { id: 35, displayName: 'פדות',     firstName: 'פדות',    lastName: 'לבבי',      ftePercent: 0.82, type: 'trainee', status: 'maternity', meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 3,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 3,    notes: '' },
  { id: 36, displayName: 'צוף',      firstName: 'צוף',     lastName: '',          ftePercent: 1.0,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 3,   supGivenHours: 3,   therapyHours: 0,   roleHours: 10,  roleName: '', officeHours: 7,    notes: '' },
  { id: 37, displayName: 'רוני',     firstName: 'רוני',    lastName: '',          ftePercent: 0.5,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 3,   therapyHours: 0,   roleHours: 9.5, roleName: '', officeHours: 3.5,  notes: '' },
  { id: 38, displayName: 'רועי',     firstName: 'רועי',    lastName: '',          ftePercent: 0.5,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 8,   roleName: '', officeHours: 3,    notes: '' },
  { id: 39, displayName: 'שחר',      firstName: 'שחר',     lastName: 'וינר',      ftePercent: 0.8,  type: 'expert',  status: 'maternity', meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 9,   roleName: '', officeHours: 7,    notes: '' },
  { id: 40, displayName: 'שניר',     firstName: 'שניר',    lastName: '',          ftePercent: 0.8,  type: 'expert',  status: 'active', meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 3,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 5,    notes: '' },
  { id: 41, displayName: 'תהילה',    firstName: 'תהילה',   lastName: '',          ftePercent: 0.6,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 1.5, supGivenHours: 5,   therapyHours: 1.5, roleHours: 12,  roleName: '', officeHours: 10,   notes: '' },
  { id: 42, displayName: 'אודי',     firstName: 'אודי',    lastName: '',          ftePercent: 0.5,  type: 'expert',  status: 'active', meetingHours: 4,   supReceivedHours: 5,   supGivenHours: 4,   therapyHours: 13,  roleHours: 0,   roleName: '', officeHours: 3,    notes: '' },
  { id: 43, displayName: 'עמית',     firstName: 'עמית',    lastName: '',          ftePercent: 0.8,  type: 'expert',  status: 'active', meetingHours: 2,   supReceivedHours: 2,   supGivenHours: 4,   therapyHours: 0,   roleHours: 0,   roleName: '', officeHours: 2,    notes: '' },
  { id: 44, displayName: 'אודל',     firstName: 'אודל',    lastName: 'שגיא',      ftePercent: 0.8,  type: 'expert',  status: 'active', isSubstitute: true, meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 1.5, therapyHours: 0,   roleHours: 9,   roleName: '', officeHours: 6,    notes: '' },
  { id: 45, displayName: 'נועה',     firstName: 'נועה',    lastName: 'רותם רוטהולץ', ftePercent: 0.82, type: 'expert',  status: 'maternity', isSubstitute: false, meetingHours: 0, supReceivedHours: 0, supGivenHours: 0, therapyHours: 0, roleHours: 0, roleName: '', officeHours: 0, notes: '' },
  { id: 46, displayName: 'נטע',      firstName: 'נטע',     lastName: 'רייכמן',    ftePercent: 0.62, type: 'expert',  status: 'maternity', isSubstitute: false, meetingHours: 0, supReceivedHours: 0, supGivenHours: 0, therapyHours: 0, roleHours: 0, roleName: '', officeHours: 0, notes: '' },
  { id: 47, displayName: 'אן',       firstName: 'אן',      lastName: 'הדר',       ftePercent: 0.35, type: 'expert',  status: 'active',   isSubstitute: false, meetingHours: 0, supReceivedHours: 0, supGivenHours: 0, therapyHours: 0, roleHours: 0, roleName: '', officeHours: 0, notes: '' },
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
  { id: 41, employeeId: 36, frameworkId: 115, hours: 0,  specEdHours: 0,  kinderHours: 0  }, // צוף → נופרים
  { id: 42, employeeId: 16, frameworkId: 122, hours: 0,  specEdHours: 0,  kinderHours: 0  }, // טל → יסודי התורה
  { id: 43, employeeId: 15, frameworkId: 131, hours: 0,  specEdHours: 0,  kinderHours: 0  }, // טטיאנה → חטיבה חדשה
  { id: 44, employeeId: 20, frameworkId: 125, hours: 0,  specEdHours: 0,  kinderHours: 0  }, // מאי → אולפנת זבולון
];

// צוותים - מתוך צוותים תשפו.docx (קריאה מלאה)
const SEED_TEAMS = [
  // צוותים חינוכיים - 3 עמודות: כל עמודה = צוות אחד
  {
    id: 1, type: 'educational', headDisplayName: 'אורית נ.',
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


// הדרכות - מתוך שיבוץ הדרכות תשפו 2026
const SEED_SUPERVISIONS = [
  // הדרכה חינוכית פרטנית - 1 שעה לכל מודרך
  { id: 1,  type: 'educational', supervisorName: 'אורי',       superviseeNames: ['מאיה','צוף','רועי','אן','שניר'],                  hoursPerSession: 1, isExternal: false, notes: '' },
  { id: 2,  type: 'educational', supervisorName: 'אבי',        superviseeNames: ['נועם','אסף','יובל נוס','אודי'],                   hoursPerSession: 1, isExternal: false, notes: '' },
  { id: 3,  type: 'educational', supervisorName: 'עדי',        superviseeNames: ['אור ה.','מיכל','טל','יהודית'],                   hoursPerSession: 1, isExternal: false, notes: '' },
  { id: 4,  type: 'educational', supervisorName: 'אורית נ.',   superviseeNames: ['שחר','אורית ס.','אריאל','אור א.'],               hoursPerSession: 1, isExternal: false, notes: '' },
  { id: 5,  type: 'educational', supervisorName: 'ניצן',       superviseeNames: ['אופק','עמית'],                                    hoursPerSession: 1, isExternal: false, notes: '' },
  { id: 6,  type: 'educational', supervisorName: 'סיגל',       superviseeNames: ['אורית נ.','עבדאללה','פדות','לירון'],             hoursPerSession: 1, isExternal: false, notes: '' },
  { id: 7,  type: 'educational', supervisorName: 'אן',         superviseeNames: ['עמיחי','דרור'],                                   hoursPerSession: 1, isExternal: false, notes: '' },
  { id: 8,  type: 'educational', supervisorName: 'דניאל',      superviseeNames: ['נועה'],                                           hoursPerSession: 1, isExternal: true,  notes: 'מדריך חיצוני' },
  { id: 9,  type: 'educational', supervisorName: 'מיכל מפ"ת', superviseeNames: ['גילי','אוראל כ.'],                                hoursPerSession: 1, isExternal: true,  notes: 'מדריך חיצוני' },
  { id: 10, type: 'educational', supervisorName: 'שרון פ"ת',  superviseeNames: ['עומר','רוני'],                                    hoursPerSession: 1, isExternal: true,  notes: 'מדריך חיצוני' },

  // הדרכה קלינית פרטנית - 1 שעה לכל מודרך
  { id: 11, type: 'clinical', supervisorName: 'בועז',   superviseeNames: ['נועה'],                    hoursPerSession: 1, isExternal: false, notes: 'פעם בשבועיים' },
  { id: 12, type: 'clinical', supervisorName: 'נעמה',   superviseeNames: ['שניר','לירון','פדות'],     hoursPerSession: 1, isExternal: false, notes: '' },
  { id: 13, type: 'clinical', supervisorName: 'יובל',   superviseeNames: ['נועם','אור א.'],           hoursPerSession: 1, isExternal: false, notes: '' },
  { id: 14, type: 'clinical', supervisorName: 'אודי',   superviseeNames: ['עמית'],                    hoursPerSession: 1, isExternal: false, notes: '' },
  { id: 15, type: 'clinical', supervisorName: 'אבי',    superviseeNames: ['אורית ס.'],                hoursPerSession: 1, isExternal: false, notes: '' },
  { id: 16, type: 'clinical', supervisorName: 'תהילה',  superviseeNames: ['רוסלנה'],                  hoursPerSession: 1, isExternal: false, notes: '' },
  { id: 17, type: 'clinical', supervisorName: 'ניצן',   superviseeNames: ['בר'],                      hoursPerSession: 1, isExternal: false, notes: '' },

  // הדרכת מטפלות באומנות - 1.5 שעות לכל מודרכת
  { id: 18, type: 'art_therapy', supervisorName: 'תהילה',   superviseeNames: ['איילת'],          hoursPerSession: 1.5, isExternal: false, notes: '' },
  { id: 19, type: 'art_therapy', supervisorName: 'סיון ג.', superviseeNames: ["ז'אנה"],          hoursPerSession: 1.5, isExternal: false, notes: '' },
  { id: 20, type: 'art_therapy', supervisorName: 'אסף',     superviseeNames: ['איסנה','חן'],     hoursPerSession: 1.5, isExternal: false, notes: '' },
  { id: 21, type: 'art_therapy', supervisorName: 'יהודית',  superviseeNames: ['ניצן י.','תמר'], hoursPerSession: 1.5, isExternal: false, notes: '' },
  { id: 22, type: 'art_therapy', supervisorName: 'מיה',     superviseeNames: ['יפעת'],           hoursPerSession: 1.5, isExternal: true,  notes: 'מדריכה חיצונית' },
  { id: 23, type: 'art_therapy', supervisorName: 'אירית',   superviseeNames: ['מיטל'],           hoursPerSession: 1.5, isExternal: true,  notes: 'מדריכה חיצונית' },
  { id: 24, type: 'art_therapy', supervisorName: 'טליה',    superviseeNames: ['סתיו ק.'],        hoursPerSession: 1.5, isExternal: true,  notes: 'מדריכה חיצונית' },

  // קבוצות פסיכותרפיה - 1.5 שעות למשתתף
  { id: 25, type: 'psychotherapy', supervisorName: 'אבי',      superviseeNames: ['טטיאנה','אופק','שחר'],                   hoursPerSession: 1.5, isExternal: false, notes: 'קבוצה 1' },
  { id: 26, type: 'psychotherapy', supervisorName: 'אבי',      superviseeNames: ['נועם','שניר','פדות','לירון','אור א.'],   hoursPerSession: 1.5, isExternal: false, notes: 'קבוצה קלינית' },
  { id: 27, type: 'psychotherapy', supervisorName: 'אבי',      superviseeNames: ['דרור','מאיה','עומר'],                    hoursPerSession: 1.5, isExternal: false, notes: 'קבוצה 3' },
  { id: 28, type: 'psychotherapy', supervisorName: 'נעמה',     superviseeNames: ['אור ה.','מיכל','עבדאללה'],              hoursPerSession: 1.5, isExternal: false, notes: '' },
  { id: 29, type: 'psychotherapy', supervisorName: 'תהילה',    superviseeNames: ['אוראל כ.','עמיחי','רועי'],              hoursPerSession: 1.5, isExternal: false, notes: '' },
  { id: 30, type: 'psychotherapy', supervisorName: 'סיון ג.', superviseeNames: ['אריאל','מאיה','עומר','צוף'],            hoursPerSession: 1.5, isExternal: false, notes: '' },
  { id: 31, type: 'psychotherapy', supervisorName: 'יהודית',   superviseeNames: ['גילי','טל','רוני'],                     hoursPerSession: 1.5, isExternal: false, notes: '' },
  { id: 32, type: 'psychotherapy', supervisorName: 'סיגל',     superviseeNames: ['מאי','מריה','סיון ב.'],                 hoursPerSession: 1.5, isExternal: false, notes: '' },

  // קבוצת אוריינטציה - 1.5 שעות
  { id: 33, type: 'orientation', supervisorName: 'אבי', superviseeNames: ['טטיאנה','אופק','שחר','אור א.','אסף','יובל','עמית','אודי'], hoursPerSession: 1.5, isExternal: false, notes: '' },

  // הדרכה על הדרכה - 1.5 שעות
  { id: 34, type: 'sup_of_sup', supervisorName: 'אבי',  superviseeNames: ['סיון ג.','תהילה','סיגל'], hoursPerSession: 1.5, isExternal: false, notes: '' },
  { id: 35, type: 'sup_of_sup', supervisorName: 'בועז', superviseeNames: ['יהודית','ניצן','אסף'],   hoursPerSession: 1.5, isExternal: false, notes: '' },

  // דיאגנוסטיקה - 1.5 שעות
  { id: 36, type: 'diagnostics', supervisorName: 'בועז', superviseeNames: ['אור א.','שניר','נועם','לירון','ספיר','פדות'], hoursPerSession: 1.5, isExternal: false, notes: 'קבוצה 1' },
  { id: 37, type: 'diagnostics', supervisorName: 'בועז', superviseeNames: ['שיר','רז','עמית'],                              hoursPerSession: 1.5, isExternal: false, notes: 'קבוצה 2' },

  // קבוצות מטפלות - 1.5 שעות
  { id: 38, type: 'therapist_group', supervisorName: 'תהילה',   superviseeNames: ['תמר',"ז'אנה",'סתיו','חן'], hoursPerSession: 1.5, isExternal: false, notes: '' },
  { id: 39, type: 'therapist_group', supervisorName: 'סיון ג.', superviseeNames: ['יפעת','ניצן','מיטל'],       hoursPerSession: 1.5, isExternal: false, notes: '' },

  // הכנה לבחינה - 1.5 שעות
  { id: 40, type: 'exam_prep', supervisorName: '', superviseeNames: ['מיכל','טל','עבדאללה','אור ה.'], hoursPerSession: 1.5, isExternal: false, notes: '' },
];

// Kindergarten assignments - from רשימת גנים (sample - first 30)
const SEED_KINDER_ASSIGNMENTS = [
  // אודל (id=44)
  { id: 201, employeeId: 44, gardenName: 'אתרוג', ageGroup: 'חובה', address: 'העצמאות 6', phone: '', teacher: 'איילה נגר', teacherPhone: '', email: '' },
  { id: 202, employeeId: 44, gardenName: 'עופר (התפתחותי)', ageGroup: 'חנ"מ', address: 'נתן אלתרמן 8', phone: '03-5742013', teacher: 'ליטל בן צור (מ"מ)', teacherPhone: '052-7188551', email: 'tehila.batito@matya365.org.il' },
  { id: 203, employeeId: 44, gardenName: 'אבטיח', ageGroup: 'חובה', address: 'שייקה אופיר 6', phone: '03-5223985', teacher: 'גילה קוברסקי', teacherPhone: '053-7116326', email: 'kovarski56@gmail.com' },
  { id: 204, employeeId: 44, gardenName: 'סברס', ageGroup: 'חובה', address: 'שייקה אופיר 6', phone: '03-5227456', teacher: 'מורן ביטה', teacherPhone: '054-7837434', email: 'moboa@bezeqint.net' },
  { id: 205, employeeId: 44, gardenName: 'צבר (התפתחותי)', ageGroup: 'חנ"מ', address: 'מגדל דוד 28', phone: '03-9031562', teacher: 'רחלי עמיאל', teacherPhone: '055-5533665', email: 'amiel.racheli@matya365.org.il' },
  // אופק (id=2)
  { id: 206, employeeId: 2, gardenName: 'אביב', ageGroup: 'חובה', address: 'נילס בוהר 25', phone: '03-9173696', teacher: 'אביגיל מנדה', teacherPhone: '053-4168508', email: 'avigailmenda@gmail.com' },
  { id: 207, employeeId: 2, gardenName: 'אגוז', ageGroup: 'חובה', address: 'נחום גוטמן 2', phone: '03-9503179', teacher: 'נאווה שקליר', teacherPhone: '054-7217852', email: 'Ozerynava@gmail.com' },
  { id: 208, employeeId: 2, gardenName: 'אסיף', ageGroup: 'חובה', address: 'נתן אלתרמן 10', phone: '03-5358626', teacher: 'אריאלה ירוחם', teacherPhone: '052-8582305', email: 'arielayeruham@walla.com' },
  { id: 209, employeeId: 2, gardenName: 'יקינטון', ageGroup: 'חובה', address: 'רמת הגולן 87', phone: '03-9031717', teacher: 'נורית גל', teacherPhone: '054-5576069', email: 'nuritgal33@gmail.com' },
  { id: 210, employeeId: 2, gardenName: 'כרמים', ageGroup: 'חובה', address: 'נתן אלתרמן 12', phone: '03-9552196', teacher: 'סיון דהן', teacherPhone: '050-6795863', email: 'sivdahan1@gmail.com' },
  { id: 211, employeeId: 2, gardenName: 'קמה', ageGroup: 'חובה', address: 'נתן אלתרמן 10', phone: '03-5357254', teacher: 'סיון מזרחי', teacherPhone: '052-6551612', email: 'sivanm2201@gmail.com' },
  { id: 212, employeeId: 2, gardenName: 'יערה (התפתחותי)', ageGroup: 'חנ"מ', address: 'חרמון 34 פינת כרמל', phone: '03-9388258', teacher: 'מיכל הרטמן', teacherPhone: '050-5543292', email: '1002157253@matya365.org.il' },
  { id: 213, employeeId: 2, gardenName: 'צבעוני (קריאה)', ageGroup: 'חובה', address: 'רמת הגולן 8', phone: '03-6749878', teacher: 'הודיה אברהם', teacherPhone: '050-6818048', email: 'odyal@bezeqint.net' },
  // אור א. (id=4)
  { id: 214, employeeId: 4, gardenName: 'בר', ageGroup: 'חובה', address: 'נתן אלתרמן 10', phone: '03-5461394', teacher: 'רחל תהילה כהן', teacherPhone: '053-4845972', email: '0527194119r@gmail.com' },
  { id: 215, employeeId: 4, gardenName: 'חושן', ageGroup: 'חובה', address: 'גרטוד עליון 38', phone: '03-7750622', teacher: 'עפרה אהרוני', teacherPhone: '052-4822914', email: 'ofraah@gmail.com' },
  { id: 216, employeeId: 4, gardenName: 'עמית', ageGroup: 'חובה', address: 'יהושע בן נון 70', phone: '03-5475980', teacher: 'סיגלית פרטוש', teacherPhone: '053-3162823', email: '9097204@gmail.com' },
  { id: 217, employeeId: 4, gardenName: 'שיבולת', ageGroup: 'חובה', address: 'עופרה חזה 10', phone: '03-9705773', teacher: 'איילת נוני', teacherPhone: '050-3460443', email: 'ayeletnuni@gmail.com' },
  { id: 218, employeeId: 4, gardenName: 'שיטה (התפתחותי)', ageGroup: 'חנ"מ', address: 'ורדית 2 פינת גזית', phone: '03-5476142', teacher: 'בשמת מבשר', teacherPhone: '054-3063392', email: 'mevasser.bosmat@matya365.org.il' },
  // אוראל כ. (id=5)
  { id: 219, employeeId: 5, gardenName: 'מיתר', ageGroup: 'חובה', address: 'העצמאות 29', phone: '03-9033735', teacher: 'ליאת בשארי', teacherPhone: '050-2210972', email: 'liatbas10@walla.com' },
  { id: 220, employeeId: 5, gardenName: 'נווה (התפתחותי)', ageGroup: 'חנ"מ', address: '', phone: '', teacher: 'מירב מגד', teacherPhone: '', email: '' },
  { id: 221, employeeId: 5, gardenName: 'עפרוני (התפתחותי)', ageGroup: 'חנ"מ', address: 'העצמאות 29', phone: '03-9380984', teacher: 'אורלי בריקמן', teacherPhone: '052-7618558', email: '1002206480@matya365.org.il' },
  // אורי (id=6)
  { id: 222, employeeId: 6, gardenName: 'ארגמן', ageGroup: 'חובה', address: 'נחשול 11', phone: '03-7759582', teacher: 'טל גרינפלד', teacherPhone: '050-3590043', email: 'Taln22@walla.com' },
  { id: 223, employeeId: 6, gardenName: 'כפיר (התפתחותי)', ageGroup: 'חנ"מ', address: "ה' באייר 120", phone: '03-9012702', teacher: 'הדר בוט', teacherPhone: '052-2510090', email: 'hadaraor@gmail.com' },
  { id: 224, employeeId: 6, gardenName: 'לילך (התפתחותי)', ageGroup: 'חנ"מ', address: "ה' באייר 120", phone: '', teacher: 'לבנת מעודה', teacherPhone: '054-5813288', email: '' },
  { id: 225, employeeId: 6, gardenName: 'ניר (התפתחותי)', ageGroup: 'חנ"מ', address: 'גרטרוד עליון 20', phone: '03-9502895', teacher: 'ציפי פישמן', teacherPhone: '054-6958145', email: 'tipi.fishman@matya365.org.il' },
  // אורית ס. (id=8)
  { id: 226, employeeId: 8, gardenName: 'פלג', ageGroup: 'חובה', address: 'גרטרוד עליון 20', phone: '03-7738740', teacher: 'טלי מויאל', teacherPhone: '052-4202888', email: 'talimoyizk@gmail.com' },
  { id: 227, employeeId: 8, gardenName: 'אוצרות חב"ד (קריאה)', ageGroup: 'ט.חובה', address: 'הרב גורן 2', phone: '03-7502590', teacher: 'מירב דריין (מ"מ)', teacherPhone: '053-3578181', email: 'b9072388@gmail.com' },
  // אריאל (id=10)
  { id: 228, employeeId: 10, gardenName: 'גלית פז (התפתחותי)', ageGroup: 'חנ"מ', address: 'אילנות 13', phone: '03-9036936', teacher: 'רוני רוז', teacherPhone: '050-8560234', email: 'roni.rose@matya365.org.il' },
  { id: 229, employeeId: 10, gardenName: 'השלום ודביר (משולב בנים)', ageGroup: 'חובה משולב', address: 'מהריק"א 6', phone: '', teacher: 'מירב לוי', teacherPhone: '052-5888720', email: '' },
  { id: 230, employeeId: 10, gardenName: 'מרווה (התפתחותי)', ageGroup: 'חנ"מ', address: 'אילנות 13', phone: '03-9024461', teacher: 'בת חן יהודה', teacherPhone: '052-7106055', email: '1004234153@matya365.org.il' },
  { id: 231, employeeId: 10, gardenName: 'רעות ואחוה (משולב בנות)', ageGroup: 'חובה משולב', address: 'רש"י 120', phone: '', teacher: 'תמר קוהלת', teacherPhone: '053-4108039', email: '' },
  { id: 232, employeeId: 10, gardenName: 'תאנה', ageGroup: 'חובה', address: 'יהושע בן נון 70', phone: '03-9023190', teacher: 'עדי פרבר', teacherPhone: '052-8285086', email: 'adifarber2@gmail.com' },
  { id: 233, employeeId: 10, gardenName: 'מוריה (קריאה)', ageGroup: 'חובה', address: 'מהריק"א 5', phone: '', teacher: 'אביטל חגירה (מחליפה)', teacherPhone: '058-3204329', email: '' },
  { id: 234, employeeId: 10, gardenName: 'רימון', ageGroup: 'חובה', address: 'משה פנחס 6', phone: '', teacher: 'אילן עוקשי', teacherPhone: '', email: '' },
  { id: 235, employeeId: 10, gardenName: 'שלהבת', ageGroup: 'חובה', address: 'מהריק"א 5', phone: '', teacher: 'ורד רצאבי', teacherPhone: '', email: '' },
  { id: 236, employeeId: 10, gardenName: 'יסמין', ageGroup: 'חובה', address: 'ורדית 2 פינת גזית', phone: '03-9024178', teacher: 'יעל פרץ', teacherPhone: '055-6628510', email: 'Yael05041@gmail.com' },
  // גילי (id=12)
  { id: 237, employeeId: 12, gardenName: 'אננס', ageGroup: 'חובה', address: 'לאה גולדברג 48', phone: '03-9507257', teacher: 'רוית צורני', teacherPhone: '050-6573638', email: 'ravit@etlogistics.co.il' },
  { id: 238, employeeId: 12, gardenName: 'לוטוס', ageGroup: 'חובה', address: 'עופרה חזה 4', phone: '03-7545838', teacher: 'הדס באקל', teacherPhone: '054-3001623', email: 'hadas.hamzani@gmail.com' },
  { id: 239, employeeId: 12, gardenName: 'ניצן (התפתחותי)', ageGroup: 'חנ"מ', address: 'ספיר 10', phone: '03-9109146', teacher: 'תמר אלמליח', teacherPhone: '054-9940577', email: 'tamarp3589@gmail.com' },
  { id: 240, employeeId: 12, gardenName: 'שסק', ageGroup: 'חובה', address: 'לאה גולדברג 48', phone: '03-9506212', teacher: 'מיכל מזרחי', teacherPhone: '050-4437118', email: 'MichaLYBEN@GMAIL.COM' },
  // דנה (id=13)
  { id: 241, employeeId: 13, gardenName: 'דגן (התפתחותי)', ageGroup: 'חנ"מ', address: 'גרטרוד עליון 36', phone: '03-9283982', teacher: 'רות שושנה', teacherPhone: '', email: '' },
  { id: 242, employeeId: 13, gardenName: 'חורש (התפתחותי)', ageGroup: 'חנ"מ', address: 'גרטרוד עליון 36', phone: '03-5323325', teacher: 'דפנה אומר', teacherPhone: '054-3100548', email: 'omer.dafi@matya365.org.il' },
  // טטיאנה (id=15)
  { id: 243, employeeId: 15, gardenName: 'אופק (התפתחותי)', ageGroup: 'חובה', address: 'ספיר 12,14', phone: '', teacher: 'טליה טייב', teacherPhone: '053-3113415', email: '' },
  { id: 244, employeeId: 15, gardenName: 'אור', ageGroup: 'חובה', address: 'מרים הנביאה 26', phone: '03-5603464', teacher: 'רינת טויטו', teacherPhone: '052-7674962', email: 'rinattwito1993@gmail.com' },
  { id: 245, employeeId: 15, gardenName: 'הילה', ageGroup: 'חובה', address: 'מרים הנביאה 26', phone: '03-5757903', teacher: 'רחלי משיח', teacherPhone: '052-7133673', email: 'r0527133673@gmail.com' },
  { id: 246, employeeId: 15, gardenName: 'כוכב', ageGroup: 'ט.חובה', address: 'יואל הנביא 7', phone: '03-5461260', teacher: 'מיטל בובלי', teacherPhone: '050-7299443', email: 'Meytbu166@walla.com' },
  { id: 247, employeeId: 15, gardenName: 'לבונה', ageGroup: 'חובה', address: 'חרצית 2', phone: '03-9388979', teacher: 'צוף פלג', teacherPhone: '052-4899100', email: 'tzufpeleg@gmail.com' },
  { id: 248, employeeId: 15, gardenName: 'שבתאי', ageGroup: 'חובה', address: 'מרים הנביאה 33', phone: '03-6046389', teacher: 'שירי פינקס', teacherPhone: '050-8493559', email: 'pinkashiri@gmail.com' },
  { id: 249, employeeId: 15, gardenName: 'שחר', ageGroup: 'חובה', address: 'יואל הנביא 7 (קומה תחתונה)', phone: '03-5150846', teacher: 'מוריה חגירה', teacherPhone: '055-6868938', email: 'moriyah93@gmail.com' },
  { id: 250, employeeId: 15, gardenName: 'שירה', ageGroup: 'חובה', address: 'נחשול 13', phone: '03-6889499', teacher: 'חופית יהוד', teacherPhone: '050-5400798', email: 'Yahofit@walla.com' },
  { id: 251, employeeId: 15, gardenName: 'שמים', ageGroup: 'חובה', address: 'יואל הנביא 7 (קומה עליונה)', phone: '03-5168314', teacher: 'חמוטל טראוב', teacherPhone: '050-4082261', email: 'hamu710@gmail.com' },
  { id: 252, employeeId: 15, gardenName: 'שנהב', ageGroup: 'חובה', address: 'נחשול 13', phone: '03-5732359', teacher: 'עמית בוטה', teacherPhone: '050-7438412', email: 'Amitbuta93@gmail.com' },
  { id: 253, employeeId: 15, gardenName: 'תבל', ageGroup: 'חובה', address: 'אליהו הנביא 54', phone: '03-5295751', teacher: 'הילה כהן דורני', teacherPhone: '050-4382226', email: 'Durani2949@gmail.com' },
  // יהודית (id=17)
  { id: 254, employeeId: 17, gardenName: 'רון (התפתחותי)', ageGroup: 'חנ"מ', address: 'עלי הכהן 8', phone: '03-5094282', teacher: 'מיכל פינקלמן', teacherPhone: '052-6770704', email: 'michal.finkelmanl@matya365.org.il' },
  { id: 255, employeeId: 17, gardenName: 'חלילית (קריאה)', ageGroup: 'ט.חובה', address: 'עלי הכהן 8', phone: '03-5095931', teacher: 'שירה עוזרי', teacherPhone: '055-5689271', email: 'shirashu316@gmail.com' },
  // מאיה (id=21)
  { id: 256, employeeId: 21, gardenName: 'איתן (התפתחותי)', ageGroup: 'טרום', address: "ג'ון קנדי 34", phone: '', teacher: 'חדוה זיאת', teacherPhone: '054-8542202', email: '' },
  { id: 257, employeeId: 21, gardenName: 'אמנון ותמר', ageGroup: 'חובה', address: 'הרב גורן 3', phone: '03-6560994', teacher: 'מיטל זכריה', teacherPhone: '054-2241418', email: '242meital@gmail.com' },
  { id: 258, employeeId: 21, gardenName: 'יהל', ageGroup: 'חובה', address: 'מרים הנביאה 26', phone: '03-5335839', teacher: 'לינור דודיאן', teacherPhone: '050-2418351', email: 'Linor0502@gmail.com' },
  { id: 259, employeeId: 21, gardenName: 'מרום', ageGroup: 'חובה', address: 'מרים הנביאה 26', phone: '03-6285481', teacher: 'אבישג גימני', teacherPhone: '055-9417896', email: 'avishag7896@gmail.com' },
  { id: 260, employeeId: 21, gardenName: 'רימון', ageGroup: 'חובה', address: 'הרב גורן 2', phone: '03-9562939', teacher: 'ציפי טנצר', teacherPhone: '050-6913091', email: 'rimongan@hotmail.com' },
  { id: 261, employeeId: 21, gardenName: 'אריאל (קריאה)', ageGroup: 'ט.חובה', address: 'דבורה הנביאה 26', phone: '', teacher: 'עמית ארביב', teacherPhone: '054-5651452', email: 'amitarviv21@gmail.com' },
  // נועה (id=45)
  { id: 262, employeeId: 45, gardenName: 'חמניה (אנתרופוסופי)', ageGroup: 'ט.חובה', address: 'איילון 40/1', phone: '03-9012532', teacher: 'תום פנחסוב', teacherPhone: '052-6364601', email: 'tomky24@gmail.com' },
  { id: 263, employeeId: 45, gardenName: 'לימון (קריאה)', ageGroup: 'חובה', address: 'יפה ירקוני 6', phone: '03-6582196', teacher: 'רעות שרעבי', teacherPhone: '050-4878147', email: 'reuta75@gmail.com' },
  // נועם (id=25)
  { id: 264, employeeId: 25, gardenName: 'עגור (התפתחותי)', ageGroup: 'חנ"מ', address: 'נתן אלתרמן 8', phone: '03-6029781', teacher: 'שילת וליט', teacherPhone: '050-7654244', email: 'shilat.valit@matya365.org.il' },
  // ניצן (id=26)
  { id: 265, employeeId: 26, gardenName: 'שונית', ageGroup: 'חובה', address: '', phone: '', teacher: '', teacherPhone: '', email: '' },
  { id: 266, employeeId: 26, gardenName: 'מורן', ageGroup: 'חובה', address: 'נילס בוהר 25', phone: '03-9489361', teacher: 'נוית פנחסוב', teacherPhone: '054-5818799', email: 'navitmor@gmail.com' },
  // סיון ב. (id=29)
  { id: 267, employeeId: 29, gardenName: 'טוהר', ageGroup: 'חובה', address: 'התנאים 24', phone: '', teacher: 'אביטל חגירה', teacherPhone: '', email: '' },
  { id: 268, employeeId: 29, gardenName: 'פנינה', ageGroup: 'חובה', address: 'רוזלין יאלו 3', phone: '03-7484559', teacher: 'מיטל לחיאני', teacherPhone: '050-3663336', email: 'meitallach@gmail.com' },
  { id: 269, employeeId: 29, gardenName: 'ברקת', ageGroup: 'חובה', address: 'רוזלין יאלו 3', phone: '03-5621083', teacher: 'רבקה יחיא', teacherPhone: '052-7118144', email: 'Ry052-7118144@gmail.com' },
  { id: 270, employeeId: 29, gardenName: 'גליל (התפתחותי)', ageGroup: 'חנ"מ', address: 'הרב גורן 36', phone: '03-6958319', teacher: 'ליטל בן צור (מ"מ)', teacherPhone: '052-7108450', email: 'shir.fima@matya365.org.il' },
  { id: 271, employeeId: 29, gardenName: 'גלעד (התפתחותי)', ageGroup: 'חנ"מ', address: 'הרב גורן 36', phone: '03-7522396', teacher: 'מיכל מנחם', teacherPhone: '054-8400513', email: 'michal.menachem@matya365.org.il' },
  { id: 272, employeeId: 29, gardenName: 'חרצית', ageGroup: 'חובה', address: 'קרל לנדשטיינר 2', phone: '03-6879388', teacher: 'עינב גיאת', teacherPhone: '052-8662374', email: 'einavgp35@gmail.com' },
  { id: 273, employeeId: 29, gardenName: 'שוהם', ageGroup: 'חובה', address: 'פול סאמואלסון 2', phone: '03-5038425', teacher: 'תמר גרון', teacherPhone: '054-6570382', email: 'tamar05866@walla.com' },
  { id: 274, employeeId: 29, gardenName: 'מנדרינה (קריאה)', ageGroup: 'חובה', address: 'יוסי בנאי 2', phone: '03-9442790', teacher: 'שרית שלוסברג', teacherPhone: '054-2171019', email: 'reav2468@gmail.com' },
  // עבדאללה (id=31) - גני תקשורת
  { id: 275, employeeId: 31, gardenName: 'אוכמנית (תקשורתי)', ageGroup: 'חנ"מ', address: 'יואל הנביא 7', phone: '03-6884745', teacher: 'קורל צברי', teacherPhone: '052-4773580', email: 'koral.zabari1@matya365.org.il' },
  { id: 276, employeeId: 31, gardenName: 'אופל (תקשורתי)', ageGroup: 'חנ"מ', address: 'גרטרוד עליון 20', phone: '03-6889123', teacher: 'ראוויה סרסור', teacherPhone: '050-8321819', email: 'rawyasarsour304@gmail.com' },
  { id: 277, employeeId: 31, gardenName: 'אנפה (תקשורתי)', ageGroup: 'חנ"מ', address: 'נתן אלתרמן 8', phone: '03-6103345', teacher: 'יעל בלום', teacherPhone: '052-8358093', email: 'yael.blum@matya365.org.il' },
  { id: 278, employeeId: 31, gardenName: 'דולפין (תקשורתי)', ageGroup: 'חנ"מ', address: 'פול סמואלסון 2', phone: '03-5045323', teacher: 'ענת מאירי', teacherPhone: '052-8524624', email: 'meiri.anat@matya365.org.il' },
  { id: 279, employeeId: 31, gardenName: 'דקל (תקשורתי)', ageGroup: 'חנ"מ', address: 'יונה 1 פינת הדרור', phone: '03-5476042', teacher: 'שיר אקסול', teacherPhone: '052-4255987', email: 'shiralima10@gmail.com' },
  { id: 280, employeeId: 31, gardenName: 'הרמוניה (תקשורתי)', ageGroup: 'חנ"מ', address: 'איילון 40', phone: '03-5476259', teacher: 'עדי סעת', teacherPhone: '052-4344447', email: 'buliadi@gmail.com' },
  { id: 281, employeeId: 31, gardenName: 'כרמל (תקשורתי)', ageGroup: 'חנ"מ', address: 'הרב גורן 69', phone: '03-7312112', teacher: 'מור הלל', teacherPhone: '052-6465096', email: 'morhillel11@gmail.com' },
  { id: 282, employeeId: 31, gardenName: "ליצ'י (תקשורתי)", ageGroup: 'חנ"מ', address: 'הדרור 30', phone: '03-9388326', teacher: 'מורן לוי', teacherPhone: '050-6399713', email: 'levi.moran@matya365.org.il' },
  { id: 283, employeeId: 31, gardenName: 'סיפן (תקשורתי)', ageGroup: 'חנ"מ', address: 'עופרה חזה 10', phone: '03-9463378', teacher: 'ויויאנה איליונסקי', teacherPhone: '054-2535725', email: 'viviana.ilionski@matya365.org.il' },
  { id: 284, employeeId: 31, gardenName: 'סנאי (תקשורתי)', ageGroup: 'חנ"מ', address: 'יפה ירקוני 6', phone: '03-6584890', teacher: 'יהל דהרי', teacherPhone: '050-6350455', email: 'yahel_dahari@walla.com' },
  { id: 285, employeeId: 31, gardenName: 'פנדה (תקשורתי)', ageGroup: 'חנ"מ', address: 'הרב גורן 2', phone: '03-5459046', teacher: 'מירב כהן', teacherPhone: '053-5364471', email: 'meirav.cohen@matya365.org.il' },
  { id: 286, employeeId: 31, gardenName: 'פקאן (תקשורתי)', ageGroup: 'חנ"מ', address: 'ברקן 58', phone: '03-9012557', teacher: 'אליסיה קומן', teacherPhone: '050-6344084', email: 'kromanalisa2@gmail.com' },
  { id: 287, employeeId: 31, gardenName: 'פרדס (תקשורתי)', ageGroup: 'חנ"מ', address: 'יואל הנביא 7 (קומה עליונה)', phone: '03-5247463', teacher: 'טל רימונד', teacherPhone: '054-3095142', email: 'tal.raymond@matya365.org.il' },
  { id: 288, employeeId: 31, gardenName: 'פרחים (תקשורתי)', ageGroup: 'חנ"מ', address: 'מבצע דני 23', phone: '03-5247463', teacher: 'שמרית שיחאי', teacherPhone: '054-8460458', email: 'shimsh.1137@gmail.com' },
  { id: 289, employeeId: 31, gardenName: 'פרפר (תקשורתי)', ageGroup: 'חנ"מ', address: 'הרב גורן 2', phone: '03-9459385', teacher: 'מור אביה תם', teacherPhone: '054-2687733', email: '1001283204@matya365.org.il' },
  { id: 290, employeeId: 31, gardenName: 'צאלון (תקשורתי)', ageGroup: 'חנ"מ', address: 'מגדל דוד 28', phone: '03-5475206', teacher: 'שרי אסרף', teacherPhone: '055-9801657', email: 'saribiton98@gmail.com' },
  { id: 291, employeeId: 31, gardenName: 'צדק (תקשורתי)', ageGroup: 'חנ"מ', address: 'נתן אלתרמן 8', phone: '03-5751259', teacher: 'תהילה אהוד', teacherPhone: '03-5751259', email: 'ehud.tehila@matya365.org.il' },
  { id: 292, employeeId: 31, gardenName: 'צוף (תקשורתי)', ageGroup: 'חנ"מ', address: "ה' באייר 120", phone: '03-9011688', teacher: 'ענבל שטיינברג', teacherPhone: '050-9441914', email: '1002238970@matya365.org.il' },
  { id: 293, employeeId: 31, gardenName: 'שחף (תקשורתי)', ageGroup: 'חנ"מ', address: 'נתן אלתרמן 8', phone: '03-6202886', teacher: 'אורטל חתוכה', teacherPhone: '052-7149284', email: '1005203075@matya365.org.il' },
  { id: 294, employeeId: 31, gardenName: 'תרשיש (תקשורתי)', ageGroup: 'חנ"מ', address: "גרטי וקרל קורי 17 א'", phone: '03-5714091', teacher: 'אפרת גיא', teacherPhone: '050-7999048', email: 'hag.yell@gmail.com' },
  // עדי (id=32)
  { id: 295, employeeId: 32, gardenName: 'חיטה', ageGroup: 'חובה', address: 'עופרה חזה 5', phone: '03-6028933', teacher: 'פריאל צברי', teacherPhone: '055-6881690', email: 'prieltzabari10@gmail.com' },
  // עומר (id=33)
  { id: 296, employeeId: 33, gardenName: 'אקליפטוס', ageGroup: 'חובה', address: 'המעפיל 3', phone: '03-9380989', teacher: 'אביבה שלמה', teacherPhone: '054-4226668', email: 'aviva4699@gmail.com' },
  { id: 297, employeeId: 33, gardenName: 'לוטם (התפתחותי)', ageGroup: 'חנ"מ', address: 'ברקן 2', phone: '03-6742576', teacher: 'הדר גיבורי', teacherPhone: '050-6861237', email: '1003869291@matya365.org.il' },
  { id: 298, employeeId: 33, gardenName: 'נחל (התפתחותי)', ageGroup: 'חנ"מ', address: 'ברקן 2', phone: '03-9013098', teacher: "רבקה ז'נה", teacherPhone: '054-5133973', email: 'adi.aharon@matya365.org.il' },
  { id: 299, employeeId: 33, gardenName: 'סימפוניה', ageGroup: 'חובה', address: 'דקר 6', phone: '03-6323916', teacher: 'בת אל ירקוני', teacherPhone: '052-7129865', email: '3146052@gmail.com' },
  { id: 300, employeeId: 33, gardenName: 'שיר', ageGroup: 'ט.חובה', address: 'עלי הכהן 13', phone: '03-9015748', teacher: 'רבקה דכקנוב', teacherPhone: '054-8423746', email: 'R61838@gmail.com' },
  { id: 301, employeeId: 33, gardenName: 'שקד', ageGroup: 'חובה', address: 'הרש"ש 32', phone: '03-9380985', teacher: 'רבקה זרחי', teacherPhone: '058-6706914', email: 'rivki2710@gmail.com' },
  { id: 302, employeeId: 33, gardenName: 'פסנתר', ageGroup: 'חובה', address: 'מלאכי 10', phone: '03-9384952', teacher: 'רווית לוי', teacherPhone: '052-6781401', email: 'y_levi10@walla.com' },
  { id: 303, employeeId: 33, gardenName: 'נבל (קריאה)', ageGroup: 'חובה', address: 'ספיר 10', phone: '03-9383131', teacher: 'איריס דהרי', teacherPhone: '055-6659594', email: 'irisirisd@gmail.com' },
  { id: 304, employeeId: 33, gardenName: 'נרקיס (קריאה)', ageGroup: 'חובה', address: 'רמת הגולן 87', phone: '03-5474813', teacher: 'סיגלית כהן', teacherPhone: '052-3393582', email: 'cohensigalit1974@gmail.com' },
  { id: 305, employeeId: 33, gardenName: 'ענבל (קריאה)', ageGroup: 'חובה', address: 'עלי הכהן 11', phone: '03-9383258', teacher: 'שרונה קרוואני', teacherPhone: '054-6459552', email: 'shrona.k.1970@gmail.com' },
  // עמיחי (id=34)
  { id: 306, employeeId: 34, gardenName: 'אחדות חב"ד', ageGroup: 'חובה', address: 'גרטרוד עליון 20', phone: '03-6888964', teacher: 'מיכל בן חיים', teacherPhone: '053-8080500', email: 'balonmichal2@gmail.com' },
  { id: 307, employeeId: 34, gardenName: 'לשם', ageGroup: 'חובה', address: 'גרטרוד עליון 38', phone: '03-7479520', teacher: 'מירב זכריה', teacherPhone: '058-4669884', email: 'meravzharya@gmail.com' },
  { id: 308, employeeId: 34, gardenName: 'נחשון', ageGroup: 'חובה', address: 'גרטרוד עליון 20', phone: '03-9420264', teacher: 'אורנה אברהם', teacherPhone: '052-4701155', email: 'Orna3avraham@gmail.com' },
  { id: 309, employeeId: 34, gardenName: 'פלמינגו (התפתחותי)', ageGroup: 'חנ"מ', address: 'הרב גורן 2', phone: '03-9382185', teacher: 'לאה גרוס', teacherPhone: '052-2201218', email: 'lea.gross@matya365.org.il' },
  { id: 310, employeeId: 34, gardenName: 'שושן (התפתחותי)', ageGroup: 'חנ"מ', address: '', phone: '', teacher: 'ליטל בן צור', teacherPhone: '', email: '' },
  { id: 311, employeeId: 34, gardenName: 'תפוח', ageGroup: 'חובה', address: 'חיים הרצוג 27', phone: '03-9198454', teacher: 'מעיין צמח', teacherPhone: '054-2331491', email: 'maayan33000@walla.com' },
  { id: 312, employeeId: 34, gardenName: 'ניצוצות חב"ד (קריאה)', ageGroup: 'ט.חובה', address: 'גרטרוד עליון 20', phone: '03-7749151', teacher: 'רבקי הניג', teacherPhone: '052-5958761', email: 'rg9770@gmail.com' },
  // עמית (id=43)
  { id: 313, employeeId: 43, gardenName: 'אורה (אנתרופוסופי)', ageGroup: 'חובה', address: 'הרב גורן 3', phone: '03-9225137', teacher: 'הדס סטרוטניק', teacherPhone: '054-4920302', email: 'hadas250@gmail.com' },
  { id: 314, employeeId: 43, gardenName: 'אפרסמון', ageGroup: 'חובה', address: 'יפה ירקוני 6', phone: '03-5548156', teacher: 'דניאל אלקיים', teacherPhone: '054-5757540', email: 'danielelkahim@gmail.com' },
  { id: 315, employeeId: 43, gardenName: 'ארבל', ageGroup: 'חובה', address: 'נתן אלתרמן 8', phone: '', teacher: 'אביטל זביב', teacherPhone: '054-8464677', email: '' },
  { id: 316, employeeId: 43, gardenName: 'אשכולית', ageGroup: 'חובה', address: 'יפה ירקוני 6', phone: '03-6488697', teacher: 'שרונה נוני', teacherPhone: '052-5501311', email: 'ganeshkolitsheli@gmail.com' },
  { id: 317, employeeId: 43, gardenName: 'שמש (אנתרופוסופי)', ageGroup: 'חובה', address: 'כינור 28', phone: '03-9026572', teacher: 'שרית גלזר', teacherPhone: '052-3304236', email: 'saritatar@walla.com' },
  { id: 318, employeeId: 43, gardenName: 'אלומות', ageGroup: 'חובה', address: 'עופרה חזה 8', phone: '03-9743596', teacher: 'מאי חן', teacherPhone: '052-6334555', email: 'Maichen14@walla.co.il' },
  // צוף (id=36)
  { id: 319, employeeId: 36, gardenName: 'צפצפה (התפתחותי)', ageGroup: 'חנ"מ', address: 'נילס בוהר 25', phone: '03-5715072', teacher: 'ענבל סילוק', teacherPhone: '054-5298712', email: 'siluk.inbal@matya365.org.il' },
  { id: 320, employeeId: 36, gardenName: 'סביון (התפתחותי)', ageGroup: 'חנ"מ', address: 'חרמון 34', phone: '03-5476310', teacher: 'מורן קריספין', teacherPhone: '052-4864451', email: 'krispin.moram@matya365.org.il' },
  { id: 321, employeeId: 36, gardenName: 'ספיר', ageGroup: 'חובה', address: "גרטי וקרל קורי 17 א'", phone: '03-5714018', teacher: 'רות שרעבי', teacherPhone: '052-6182255', email: 'root125125@gmail.com' },
  { id: 322, employeeId: 36, gardenName: 'ענבר', ageGroup: 'חובה', address: "גרטי וקרל קורי 17 א'", phone: '03-5712611', teacher: 'לינוי פורשר', teacherPhone: '054-4891208', email: 'linoyf2121@gmail.com' },
  // שחר (id=39)
  { id: 323, employeeId: 39, gardenName: 'פומלה', ageGroup: 'חובה', address: 'שייקה אופיר 6', phone: '03-5231466', teacher: 'ריקי בבלי', teacherPhone: '050-2320123', email: 'rickybavli@gmail.com' },
  // שניר (id=40)
  { id: 324, employeeId: 40, gardenName: 'שקמה (התפתחותי)', ageGroup: 'חנ"מ', address: 'גרטוד עליון 20', phone: '03-9505483', teacher: 'נעמה אשתמקר', teacherPhone: '050-6789885', email: 'ashtamker.naama@matya365.org.il' },
];


// כתות קטנות (חינוך מיוחד בבתי ספר) - מתוך מסגרות החינוך המיוחד בראש העין תשפו
const SEED_SPEC_ED_CLASSES = [
  { id: 1,  frameworkId: 101, grades: 'א, ד',                                          classType: 'ל.ל',         psychologistName: 'עבדאללה' },  // אפק
  { id: 2,  frameworkId: 102, grades: 'ב, ג, ד, ה',                                   classType: 'ל.ל',         psychologistName: 'עמיחי'   },  // אוהל שלום
  { id: 3,  frameworkId: 103, grades: 'ב1, ב2, ג1, ג2, ה',                            classType: 'תקשורתית',    psychologistName: 'צוף'     },  // אסף
  { id: 4,  frameworkId: 104, grades: 'א',                                             classType: 'ל.ל',         psychologistName: 'אוראל כ.' }, // אוהל שרה
  { id: 5,  frameworkId: 105, grades: 'ה, ו',                                          classType: 'ל.ל',         psychologistName: 'סיון ב.' },  // אשכול
  { id: 6,  frameworkId: 106, grades: 'א*, ב*, ג*, ד, ג+ד',                           classType: 'ל.ל',         psychologistName: 'שחר'     },  // עוז
  { id: 7,  frameworkId: 107, grades: 'א*, ב, ג, ה',                                  classType: 'ל.ל',         psychologistName: 'מאיה'    },  // חיים גורי
  { id: 8,  frameworkId: 108, grades: 'א1, א2, ב, ו',                                 classType: 'ל.ל',         psychologistName: 'רועי'    },  // צורים
  { id: 9,  frameworkId: 109, grades: 'א*, ב, ה',                                     classType: 'ל.ל',         psychologistName: 'אורית ס.' }, // טל
  { id: 10, frameworkId: 110, grades: 'א*, ב, ב*, ד*, ה',                             classType: 'ל.ל',         psychologistName: 'עומר'    },  // רמב"ם
  { id: 11, frameworkId: 111, grades: 'ג, ד',                                         classType: 'ל.ל',         psychologistName: 'גילי'    },  // יצחק נבון
  { id: 12, frameworkId: 112, grades: 'ג, ו',                                         classType: 'ל.ל',         psychologistName: 'מאי'     },  // רעות
  { id: 13, frameworkId: 113, grades: 'א, ד, ה',                                      classType: 'ל.ל',         psychologistName: 'אריאל'   },  // נווה דליה
  { id: 14, frameworkId: 114, grades: 'א1, א2, ב, ג, ד, ה, ו1, ו2',                  classType: 'תקשורתית',    psychologistName: 'טל'      },  // נופים
  { id: 15, frameworkId: 115, grades: 'א, ו',                                         classType: 'ל.ל',         psychologistName: 'צוף'     },  // נופרים
  { id: 16, frameworkId: 117, grades: 'א*, ב',                                        classType: 'ל.ל',         psychologistName: 'אור ה.'  },  // פרס
  { id: 17, frameworkId: 119, grades: 'א, ג',                                         classType: 'ל.ל',         psychologistName: 'דרור'    },  // רונא רמון
  { id: 18, frameworkId: 121, grades: 'ו',                                            classType: 'ל.ל',         psychologistName: 'מיכל'    },  // שיא
  { id: 19, frameworkId: 123, grades: 'ב, ג, ד, ה, ו',                               classType: 'תקשורתית',    psychologistName: 'מריה'    },  // תגלית
  { id: 20, frameworkId: 124, grades: 'ח',                                            classType: 'ל.ל',         psychologistName: 'דנה'     },  // בארי
  { id: 21, frameworkId: 125, grades: 'ז, ח, ט, י, יא, יב',                          classType: 'ל.ל',         psychologistName: 'מאי'     },  // אולפנת זבולון
  { id: 22, frameworkId: 126, grades: 'ז',                                            classType: 'ל.ל',         psychologistName: 'רוני'    },  // בראשית
  { id: 23, frameworkId: 128, grades: 'ז1*, ז2*, ח1, ח2*, ט',                        classType: 'ל.ל',         psychologistName: 'בועז'    },  // גוונים
  { id: 24, frameworkId: 129, grades: 'ז1, ז2, ח1, ח2, ט1, ט2, י1, י2, י3, יא, יב1, יב2', classType: 'ל.ל', psychologistName: 'מריה'    },  // עתיד
  { id: 25, frameworkId: 130, grades: 'ז1, ז2, ח, ט1, ט2',                           classType: 'ל.ל',         psychologistName: 'אור ה.'  },  // היובל
  { id: 26, frameworkId: 132, grades: 'י, י*',                                        classType: 'ל.ל',         psychologistName: 'תהילה'   },  // בגין
  { id: 27, frameworkId: 133, grades: 'י, יב',                                        classType: 'ל.ל + תקשורתית', psychologistName: 'נועם / יובל' }, // שחקים
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

  // Create db AFTER MongoDB restore has written the file to disk.
  // This ensures low() reads the correct data directly — no setState() needed.
  db = low(new CloudAdapter(dbPath));

  db.defaults({
    employees: [], frameworks: [], assignments: [],
    kinderAssignments: [], teams: [], supervisions: [], specEdClasses: [],
    draft_employees: [], draft_assignments: [], draft_kinderAssignments: [], draft_specEdClasses: [],
    draft_teams: [], draft_supervisions: [],
    draftActive: false, draftSaved: false,
    settings: { approvedPositions: 31.2 },
    _migrationVersion: 0,
    _nextId: { employees: 100, frameworks: 300, assignments: 500, kinderAssignments: 600, supervisions: 100, specEdClasses: 100 }
  }).write();

  // Seed only empty collections — never overwrite existing user data
  const seedIfEmpty = (key, data) => {
    if (db.get(key).value().length === 0) {
      db.set(key, data).write();
      console.log(`Seeded ${key}: ${data.length} records`);
    }
  };

  seedIfEmpty('employees',       SEED_EMPLOYEES);
  seedIfEmpty('frameworks',      SEED_FRAMEWORKS);
  seedIfEmpty('assignments',     SEED_ASSIGNMENTS);
  seedIfEmpty('kinderAssignments', SEED_KINDER_ASSIGNMENTS);
  seedIfEmpty('teams',           SEED_TEAMS);
  seedIfEmpty('supervisions',    SEED_SUPERVISIONS);
  seedIfEmpty('specEdClasses',   SEED_SPEC_ED_CLASSES);

  // One-time migration: fix employee statuses, substitutes, and missing assignments (runs AFTER seed)
  const MIGRATION_VERSION = 4;
  if ((db.get('_migrationVersion').value() || 0) < MIGRATION_VERSION) {
    const fixes = [
      { displayName: 'אור א.',  update: { isSubstitute: true } },
      { displayName: 'אודל',    update: { isSubstitute: true, lastName: 'שגיא' } },
      { displayName: 'ספיר',    update: { isSubstitute: false, status: 'active' } },
      { displayName: 'נועה',    update: { isSubstitute: false, status: 'maternity' } },
      { displayName: 'שחר',     update: { status: 'maternity' } },
      { displayName: 'פדות',    update: { status: 'maternity', notes: '', lastName: 'לבבי' } },
      { displayName: 'נועם',    update: { notes: 'אמור לעזוב באפריל', lastName: 'שלין' } },
    ];
    fixes.forEach(({ displayName, update }) => {
      const emp = db.get('employees').find({ displayName }).value();
      if (emp) db.get('employees').find({ displayName }).assign(update).write();
    });
    const addIfMissing = (emp) => {
      if (!db.get('employees').find({ displayName: emp.displayName }).value()) {
        db.get('employees').push(emp).write();
      }
    };
    addIfMissing({ id: 46, displayName: 'נטע', firstName: 'נטע', lastName: 'רייכמן', ftePercent: 0.62, type: 'expert', status: 'maternity', isSubstitute: false, meetingHours: 0, supReceivedHours: 0, supGivenHours: 0, therapyHours: 0, roleHours: 0, roleName: '', officeHours: 0, notes: '' });
    addIfMissing({ id: 47, displayName: 'אן', firstName: 'אן', lastName: 'הדר', ftePercent: 0.35, type: 'expert', status: 'active', isSubstitute: false, meetingHours: 0, supReceivedHours: 0, supGivenHours: 0, therapyHours: 0, roleHours: 0, roleName: '', officeHours: 0, notes: '' });
    db.get('settings').assign({ approvedPositions: 31.2 }).write();

    // Add missing framework assignments
    const addAssignmentIfMissing = (a) => {
      if (!db.get('assignments').find({ frameworkId: a.frameworkId, employeeId: a.employeeId }).value()) {
        const ids = db.get('assignments').value().map(x => x.id);
        const nextId = ids.length ? Math.max(...ids) + 1 : 1;
        db.get('assignments').push({ ...a, id: nextId }).write();
      }
    };
    addAssignmentIfMissing({ employeeId: 36, frameworkId: 115, hours: 0, specEdHours: 0, kinderHours: 0 }); // צוף → נופרים
    addAssignmentIfMissing({ employeeId: 16, frameworkId: 122, hours: 0, specEdHours: 0, kinderHours: 0 }); // טל → יסודי התורה
    addAssignmentIfMissing({ employeeId: 15, frameworkId: 131, hours: 0, specEdHours: 0, kinderHours: 0 }); // טטיאנה → חטיבה חדשה
    addAssignmentIfMissing({ employeeId: 20, frameworkId: 125, hours: 0, specEdHours: 0, kinderHours: 0 }); // מאי → אולפנת זבולון

    // ניקוי פסיכולוג מכל שיבוצים של עובדים לא פעילים / בחל"ד (שעות נשמרות)
    const inactiveIds = db.get('employees').value()
      .filter(e => e.status === 'maternity' || e.status === 'inactive')
      .map(e => e.id);
    inactiveIds.forEach(empId => {
      ['assignments', 'kinderAssignments'].forEach(col => {
        db.get(col).filter({ employeeId: empId }).value()
          .forEach(a => db.get(col).find({ id: a.id }).assign({ employeeId: 0 }).write());
      });
    });

    // שחזור גנים של נועה ושחר שנמחקו בטעות — employeeId=0 = לא מאויש
    const deletedGardens = [
      { employeeId: 0, gardenName: 'חמניה (אנתרופוסופי)', ageGroup: 'ט.חובה', address: 'איילון 40/1', phone: '03-9012532', teacher: 'תום פנחסוב', teacherPhone: '052-6364601', email: 'tomky24@gmail.com' },
      { employeeId: 0, gardenName: 'לימון (קריאה)',        ageGroup: 'חובה',   address: 'יפה ירקוני 6', phone: '03-6582196', teacher: 'רעות שרעבי',  teacherPhone: '050-4878147', email: 'reuta75@gmail.com' },
      { employeeId: 0, gardenName: 'פומלה',                ageGroup: 'חובה',   address: 'שייקה אופיר 6', phone: '03-5231466', teacher: 'ריקי בבלי',   teacherPhone: '050-2320123', email: 'rickybavli@gmail.com' },
    ];
    deletedGardens.forEach(g => {
      if (!db.get('kinderAssignments').find({ gardenName: g.gardenName }).value()) {
        const ids = db.get('kinderAssignments').value().map(x => x.id);
        const nextId = ids.length ? Math.max(...ids) + 1 : 600;
        db.get('kinderAssignments').push({ id: nextId, ...g }).write();
      }
    });

    db.set('_migrationVersion', MIGRATION_VERSION).write();
    console.log('Migration v4 applied');
  }

  // Migration v5: fix systematic column-shift errors in employee hours data (from Excel re-read)
  const MIGRATION_V5 = 5;
  if ((db.get('_migrationVersion').value() || 0) < MIGRATION_V5) {
    const hourFixes = [
      { displayName: 'אבי',       meetingHours: 7.5, supReceivedHours: 1,   supGivenHours: 0,   therapyHours: 0,   roleHours: 20,  officeHours: 0 },
      { displayName: 'אופק',      meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 0,   therapyHours: 1.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'אור ה.',    meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 3,   roleHours: 2,   officeHours: 0 },
      { displayName: 'אור א.',    meetingHours: 2,   supReceivedHours: 2,   supGivenHours: 0,   therapyHours: 0,   roleHours: 0,   officeHours: 0 },
      { displayName: 'אוראל כ.',  meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 1.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'אורי',      meetingHours: 5.5, supReceivedHours: 1,   supGivenHours: 5.5, therapyHours: 0,   roleHours: 6,   officeHours: 0 },
      { displayName: 'אורית נ.',  meetingHours: 5.5, supReceivedHours: 1,   supGivenHours: 4,   therapyHours: 0,   roleHours: 3,   officeHours: 0 },
      { displayName: 'אורית ס.',  meetingHours: 4,   supReceivedHours: 2,   supGivenHours: 0,   therapyHours: 1.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'אסף',       meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 2,   therapyHours: 0,   roleHours: 0,   officeHours: 0 },
      { displayName: 'אריאל',     meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 3,   roleHours: 0,   officeHours: 0 },
      { displayName: 'בועז',      meetingHours: 5.5, supReceivedHours: 1,   supGivenHours: 1,   therapyHours: 0,   roleHours: 5,   officeHours: 0 },
      { displayName: 'גילי',      meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 4.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'דנה',       meetingHours: 2,   supReceivedHours: 0,   supGivenHours: 0,   therapyHours: 0,   roleHours: 0,   officeHours: 0 },
      { displayName: 'דרור',      meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 4.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'טטיאנה',    meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 0,   therapyHours: 4.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'טל',        meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 1.5, roleHours: 3,   officeHours: 0 },
      { displayName: 'יהודית',    meetingHours: 4,   supReceivedHours: 2,   supGivenHours: 3.5, therapyHours: 1.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'יובל',      meetingHours: 4,   supReceivedHours: 5,   supGivenHours: 4,   therapyHours: 0,   roleHours: 0,   officeHours: 0 },
      { displayName: 'לירון',     meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 0,   therapyHours: 0,   roleHours: 0,   officeHours: 0 },
      { displayName: 'מאי',       meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 1.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'מאיה',      meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 4.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'מיכל',      meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 1.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'מריה',      meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 1.5, roleHours: 2,   officeHours: 0 },
      { displayName: 'ספיר',      meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 0,   therapyHours: 0,   roleHours: 0,   officeHours: 0 },
      { displayName: 'נועם',      meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 0,   therapyHours: 0,   roleHours: 0,   officeHours: 0 },
      { displayName: 'ניצן',      meetingHours: 4,   supReceivedHours: 1.5, supGivenHours: 3,   therapyHours: 0,   roleHours: 4,   officeHours: 0 },
      { displayName: 'נעמה',      meetingHours: 2,   supReceivedHours: 2,   supGivenHours: 6,   therapyHours: 0,   roleHours: 0,   officeHours: 0 },
      { displayName: 'סיגל',      meetingHours: 4,   supReceivedHours: 1.5, supGivenHours: 6.5, therapyHours: 0,   roleHours: 0,   officeHours: 0 },
      { displayName: 'סיון ב.',   meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 1,   therapyHours: 1.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'סיון ג.',   meetingHours: 4,   supReceivedHours: 1.5, supGivenHours: 4,   therapyHours: 1.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'עבדאללה',   meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 3,   roleHours: 5,   officeHours: 0 },
      { displayName: 'עדי',       meetingHours: 5.5, supReceivedHours: 1,   supGivenHours: 4,   therapyHours: 0,   roleHours: 5,   officeHours: 0 },
      { displayName: 'עומר',      meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 4.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'עמיחי',     meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 3,   roleHours: 0,   officeHours: 0 },
      { displayName: 'פדות',      meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 0,   therapyHours: 0,   roleHours: 0,   officeHours: 0 },
      { displayName: 'צוף',       meetingHours: 4,   supReceivedHours: 3,   supGivenHours: 0,   therapyHours: 3,   roleHours: 0,   officeHours: 0 },
      { displayName: 'רוני',      meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 3,   roleHours: 0,   officeHours: 0 },
      { displayName: 'רועי',      meetingHours: 4,   supReceivedHours: 2.5, supGivenHours: 0,   therapyHours: 1.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'שחר',       meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 0,   therapyHours: 1.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'שניר',      meetingHours: 2,   supReceivedHours: 1,   supGivenHours: 0,   therapyHours: 0,   roleHours: 0,   officeHours: 0 },
      { displayName: 'תהילה',     meetingHours: 4,   supReceivedHours: 1.5, supGivenHours: 5,   therapyHours: 1.5, roleHours: 0,   officeHours: 0 },
      { displayName: 'אודי',      meetingHours: 4,   supReceivedHours: 5,   supGivenHours: 4,   therapyHours: 0,   roleHours: 0,   officeHours: 0 },
      { displayName: 'עמית',      meetingHours: 2,   supReceivedHours: 2,   supGivenHours: 0,   therapyHours: 0,   roleHours: 0,   officeHours: 0 },
      { displayName: 'אודל',      meetingHours: 4,   supReceivedHours: 3.5, supGivenHours: 0,   therapyHours: 1.5, roleHours: 0,   officeHours: 0 },
    ];
    hourFixes.forEach(({ displayName, ...update }) => {
      if (db.get('employees').find({ displayName }).value()) {
        db.get('employees').find({ displayName }).assign(update).write();
      }
    });
    db.set('_migrationVersion', MIGRATION_V5).write();
    console.log('Migration v5 applied: corrected employee hours from Excel');
  }

  // Migration v6: fix assignment hours (same column-shift error as employee hours)
  const MIGRATION_V6 = 6;
  if ((db.get('_migrationVersion').value() || 0) < MIGRATION_V6) {
    // Fix the first (primary) assignment row per employee
    const fixAsgn = (empId, hours, specEdHours, kinderHours) => {
      const asgn = db.get('assignments').find({ employeeId: empId }).value();
      if (asgn) {
        db.get('assignments').find({ id: asgn.id }).assign({ hours, specEdHours, kinderHours }).write();
      }
    };
    fixAsgn(4,  0,  0,  6);   // אור א.
    fixAsgn(6,  0,  0,  4);   // אורי
    fixAsgn(7,  2,  0,  0);   // אורית נ.
    fixAsgn(9,  7,  1,  0);   // אסף
    fixAsgn(11, 0,  6,  0);   // בועז
    fixAsgn(13, 0,  4,  3);   // דנה
    fixAsgn(15, 10, 0,  11);  // טטיאנה
    fixAsgn(17, 0,  4,  2);   // יהודית
    fixAsgn(18, 4,  0,  0);   // יובל
    fixAsgn(19, 7,  0,  0);   // לירון
    fixAsgn(22, 8,  1,  0);   // מיכל
    fixAsgn(25, 4,  0,  2);   // נועם
    fixAsgn(26, 0,  0,  3);   // ניצן
    fixAsgn(30, 6,  0,  0);   // סיון ג.
    fixAsgn(35, 4,  0,  2);   // פדות
    fixAsgn(38, 4,  5,  0);   // רועי
    fixAsgn(40, 6,  0,  2);   // שניר
    fixAsgn(41, 2,  0,  0);   // תהילה
    fixAsgn(42, 4,  0,  0);   // אודי
    fixAsgn(43, 0,  0,  6);   // עמית
    fixAsgn(44, 4,  0,  13);  // אודל

    // Add missing assignments for ספיר and עדי
    const addAsgnIfMissing = (empId, hours, specEdHours, kinderHours) => {
      if (!db.get('assignments').find({ employeeId: empId }).value()) {
        const ids = db.get('assignments').value().map(a => a.id);
        const nextId = ids.length ? Math.max(...ids) + 1 : 1;
        db.get('assignments').push({ id: nextId, employeeId: empId, frameworkId: 0, hours, specEdHours, kinderHours }).write();
      }
    };
    addAsgnIfMissing(24, 0, 6, 0);  // ספיר
    addAsgnIfMissing(32, 0, 0, 4);  // עדי

    db.set('_migrationVersion', MIGRATION_V6).write();
    console.log('Migration v6 applied: corrected assignment hours from Excel');
  }

  // Migration v7: fix אופק kinder hours (was manually changed to 5 on server, should be 8)
  const MIGRATION_V7 = 7;
  if ((db.get('_migrationVersion').value() || 0) < MIGRATION_V7) {
    const asgn = db.get('assignments').find({ employeeId: 2 }).value();
    if (asgn) {
      db.get('assignments').find({ id: asgn.id }).assign({ hours: 4, specEdHours: 7, kinderHours: 8 }).write();
    }
    db.set('_migrationVersion', MIGRATION_V7).write();
    console.log('Migration v7 applied: fixed אופק kinder hours to 8');
  }

  // Migration v8: run syncSpecEdAssignments on all existing frameworks with spec-ed classes
  const MIGRATION_V8 = 8;
  if ((db.get('_migrationVersion').value() || 0) < MIGRATION_V8) {
    const { syncSpecEdAssignments } = require('./utils/specEdSync');
    const frameworkIds = [...new Set(db.get('specEdClasses').value().map(c => c.frameworkId).filter(Boolean))];
    const nonDraftActiveCol = (name) => name; // migration always uses non-draft collections
    frameworkIds.forEach(fwId => syncSpecEdAssignments(db, nonDraftActiveCol, fwId));
    db.set('_migrationVersion', MIGRATION_V8).write();
    console.log(`Migration v8 applied: synced spec-ed assignments for ${frameworkIds.length} frameworks`);
  }

  // Migration v9: clear all remaining psychologistName fields in specEdClasses
  const MIGRATION_V9 = 9;
  if ((db.get('_migrationVersion').value() || 0) < MIGRATION_V9) {
    db.get('specEdClasses').value()
      .filter(c => c.psychologistName)
      .forEach(c => db.get('specEdClasses').find({ id: c.id }).assign({ psychologistName: '' }).write());
    db.set('_migrationVersion', MIGRATION_V9).write();
    console.log('Migration v9 applied: cleared all psychologistName fields from specEdClasses');
  }

  // Migration v10: add draftSaved flag
  const MIGRATION_V10 = 10;
  if ((db.get('_migrationVersion').value() || 0) < MIGRATION_V10) {
    if (db.get('draftSaved').value() === undefined) {
      db.set('draftSaved', false).write();
    }
    db.set('_migrationVersion', MIGRATION_V10).write();
    console.log('Migration v10 applied: added draftSaved flag');
  }

  // Migration v11: recalc displayNames for all employees based on firstName uniqueness
  const MIGRATION_V11 = 11;
  if ((db.get('_migrationVersion').value() || 0) < MIGRATION_V11) {
    const emps = db.get('employees').value();
    const firstNames = [...new Set(emps.map(e => e.firstName).filter(Boolean))];
    firstNames.forEach(firstName => {
      const group = emps.filter(e => e.firstName === firstName);
      if (group.length <= 1) {
        group.forEach(e => db.get('employees').find({ id: e.id }).assign({ displayName: e.firstName }).write());
      } else {
        group.forEach(e => {
          const suffix = e.lastName ? ' ' + e.lastName[0] + '.' : ' .';
          db.get('employees').find({ id: e.id }).assign({ displayName: e.firstName + suffix }).write();
        });
      }
    });
    db.set('_migrationVersion', MIGRATION_V11).write();
    console.log('Migration v11 applied: recalculated displayNames from firstName/lastName');
  }

  // Migration v12: add freeHoursTargets to settings
  const MIGRATION_V12 = 12;
  if ((db.get('_migrationVersion').value() || 0) < MIGRATION_V12) {
    if (!db.get('settings.freeHoursTargets').value()) {
      db.get('settings').assign({
        freeHoursTargets: [
          { fte: 1.0,  hours: 9 },
          { fte: 0.8,  hours: 7 },
          { fte: 0.5,  hours: 5 },
          { fte: 0.33, hours: 3 },
        ]
      }).write();
    }
    db.set('_migrationVersion', MIGRATION_V12).write();
    console.log('Migration v12 applied: added freeHoursTargets to settings');
  }

  // Migration v13: fix team head אורית ס. → אורית נ.
  const MIGRATION_V13 = 13;
  if ((db.get('_migrationVersion').value() || 0) < MIGRATION_V13) {
    const team1 = db.get('teams').find({ id: 1 }).value();
    if (team1 && team1.headDisplayName === 'אורית ס.') {
      db.get('teams').find({ id: 1 }).assign({ headDisplayName: 'אורית נ.' }).write();
    }
    db.set('_migrationVersion', MIGRATION_V13).write();
    console.log('Migration v13 applied: fixed team 1 head to אורית נ.');
  }

  // Migration v14: restore teams and supervisions deleted by draft bug; add to draft system
  const MIGRATION_V14 = 14;
  if ((db.get('_migrationVersion').value() || 0) < MIGRATION_V14) {
    // Restore any missing teams from seed
    SEED_TEAMS.forEach(team => {
      if (!db.get('teams').find({ id: team.id }).value()) {
        db.get('teams').push(team).write();
        console.log(`Restored team id=${team.id}`);
      }
    });
    // Restore any missing supervisions from seed
    SEED_SUPERVISIONS.forEach(sup => {
      if (!db.get('supervisions').find({ id: sup.id }).value()) {
        db.get('supervisions').push(sup).write();
        console.log(`Restored supervision id=${sup.id}`);
      }
    });
    db.set('_migrationVersion', MIGRATION_V14).write();
    console.log('Migration v14 applied: restored missing teams and supervisions');
  }
}

// Returns the active collection name (draft or current) for assignment-like data
function activeCol(name) {
  return db.get('draftActive').value() ? `draft_${name}` : name;
}

module.exports = { get db() { return db; }, initDB, activeCol };
