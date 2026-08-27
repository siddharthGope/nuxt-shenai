import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite'

const DB_NAME = 'lumi_health'
const DB_VERSION = 1

export type StoredScan = {
  id?: number
  scanDate: string
  heartRate: number
  systolic: number
  diastolic: number
  bloodPressure: string
  hrv: number
  stress: number
  breathingRate: number
  wellness: number
}

export type RiskProfile = {
  name: string | null
  age: number | null
  gender: string | null
  smoker: boolean | null
  diabetes: boolean | null
  treatedBp: boolean | null
  cholesterol: number | null
  hdl: number | null
  height: number | null
  weight: number | null
  fastingGlucose: number | null
  triglycerides: number | null
  familyHistory: string | null
  diet: string | null
  activity: string | null
  updatedAt: string | null
}

export type RiskScores = {
  cardio: number | null
  diabetes: number | null
  hypertension: number | null
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  scan_date TEXT NOT NULL,
  heart_rate REAL NOT NULL DEFAULT 0,
  systolic REAL NOT NULL DEFAULT 0,
  diastolic REAL NOT NULL DEFAULT 0,
  hrv REAL NOT NULL DEFAULT 0,
  stress REAL NOT NULL DEFAULT 0,
  breathing_rate REAL NOT NULL DEFAULT 0,
  wellness REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_scans_user_date ON scans (user_id, scan_date DESC);
CREATE TABLE IF NOT EXISTS risk_profile (
  user_id TEXT PRIMARY KEY NOT NULL,
  name TEXT,
  age INTEGER,
  gender TEXT,
  smoker INTEGER,
  diabetes INTEGER,
  treated_bp INTEGER,
  cholesterol REAL,
  hdl REAL,
  height REAL,
  weight REAL,
  fasting_glucose REAL,
  triglycerides REAL,
  family_history TEXT,
  diet TEXT,
  activity TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS risk_scores (
  user_id TEXT PRIMARY KEY NOT NULL,
  cardio REAL,
  diabetes REAL,
  hypertension REAL,
  updated_at TEXT NOT NULL
);
`

// Older installs created risk_profile without these columns.
const MIGRATIONS = [
  'ALTER TABLE risk_profile ADD COLUMN name TEXT',
  'ALTER TABLE risk_profile ADD COLUMN fasting_glucose REAL',
  'ALTER TABLE risk_profile ADD COLUMN triglycerides REAL',
  'ALTER TABLE risk_profile ADD COLUMN family_history TEXT',
  'ALTER TABLE risk_profile ADD COLUMN diet TEXT',
  'ALTER TABLE risk_profile ADD COLUMN activity TEXT'
]

type HealthStoreDriver = {
  saveScan(userId: string, scan: StoredScan): Promise<void>
  getLatestScan(userId: string): Promise<StoredScan | null>
  getScanHistory(userId: string, limit: number): Promise<StoredScan[]>
  saveRiskProfile(userId: string, profile: RiskProfile): Promise<void>
  getRiskProfile(userId: string): Promise<RiskProfile | null>
  saveRiskScores(userId: string, scores: RiskScores): Promise<void>
  getRiskScores(userId: string): Promise<RiskScores | null>
  clear(userId: string): Promise<void>
}

function toBool(value: unknown): boolean | null {
  if (value == null) return null
  return Number(value) === 1
}

function fromBool(value: boolean | null | undefined) {
  return value == null ? null : value ? 1 : 0
}

function toNumOrNull(value: unknown): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function rowToScan(row: Record<string, unknown>): StoredScan {
  const systolic = Number(row.systolic ?? 0)
  const diastolic = Number(row.diastolic ?? 0)
  return {
    id: row.id != null ? Number(row.id) : undefined,
    scanDate: String(row.scan_date),
    heartRate: Number(row.heart_rate ?? 0),
    systolic,
    diastolic,
    bloodPressure: `${systolic}/${diastolic}`,
    hrv: Number(row.hrv ?? 0),
    stress: Number(row.stress ?? 0),
    breathingRate: Number(row.breathing_rate ?? 0),
    wellness: Number(row.wellness ?? 0)
  }
}

function createSqliteDriver(): HealthStoreDriver {
  const sqlite = new SQLiteConnection(CapacitorSQLite)
  let dbPromise: Promise<SQLiteDBConnection> | null = null

  async function db() {
    if (!dbPromise) {
      dbPromise = (async () => {
        // Recover connections left open by a previous WebView reload.
        await sqlite.checkConnectionsConsistency().catch(() => ({ result: false }))
        const existing = await sqlite.isConnection(DB_NAME, false).catch(() => ({ result: false }))

        const connection = existing.result
          ? await sqlite.retrieveConnection(DB_NAME, false)
          : await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false)

        const open = await connection.isDBOpen().catch(() => ({ result: false }))
        if (!open.result) await connection.open()

        await connection.execute(SCHEMA)
        for (const migration of MIGRATIONS) {
          await connection.execute(migration).catch(() => {})
        }
        return connection
      })().catch((error) => {
        dbPromise = null
        throw error
      })
    }
    return dbPromise
  }

  return {
    async saveScan(userId, scan) {
      const connection = await db()
      await connection.run(
        `INSERT INTO scans (user_id, scan_date, heart_rate, systolic, diastolic, hrv, stress, breathing_rate, wellness)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          scan.scanDate,
          scan.heartRate,
          scan.systolic,
          scan.diastolic,
          scan.hrv,
          scan.stress,
          scan.breathingRate,
          scan.wellness
        ]
      )
    },

    async getLatestScan(userId) {
      const connection = await db()
      const result = await connection.query(
        'SELECT * FROM scans WHERE user_id = ? ORDER BY scan_date DESC, id DESC LIMIT 1',
        [userId]
      )
      const row = result.values?.[0]
      return row ? rowToScan(row) : null
    },

    async getScanHistory(userId, limit) {
      const connection = await db()
      const result = await connection.query(
        'SELECT * FROM scans WHERE user_id = ? ORDER BY scan_date DESC, id DESC LIMIT ?',
        [userId, limit]
      )
      return (result.values ?? []).map(rowToScan)
    },

    async saveRiskProfile(userId, profile) {
      const connection = await db()
      await connection.run(
        `INSERT INTO risk_profile (user_id, name, age, gender, smoker, diabetes, treated_bp, cholesterol, hdl, height, weight, fasting_glucose, triglycerides, family_history, diet, activity, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           name = excluded.name,
           age = excluded.age,
           gender = excluded.gender,
           smoker = excluded.smoker,
           diabetes = excluded.diabetes,
           treated_bp = excluded.treated_bp,
           cholesterol = excluded.cholesterol,
           hdl = excluded.hdl,
           height = excluded.height,
           weight = excluded.weight,
           fasting_glucose = excluded.fasting_glucose,
           triglycerides = excluded.triglycerides,
           family_history = excluded.family_history,
           diet = excluded.diet,
           activity = excluded.activity,
           updated_at = excluded.updated_at`,
        [
          userId,
          profile.name,
          profile.age,
          profile.gender,
          fromBool(profile.smoker),
          fromBool(profile.diabetes),
          fromBool(profile.treatedBp),
          profile.cholesterol,
          profile.hdl,
          profile.height,
          profile.weight,
          profile.fastingGlucose,
          profile.triglycerides,
          profile.familyHistory,
          profile.diet,
          profile.activity,
          new Date().toISOString()
        ]
      )
    },

    async getRiskProfile(userId) {
      const connection = await db()
      const result = await connection.query('SELECT * FROM risk_profile WHERE user_id = ? LIMIT 1', [userId])
      const row = result.values?.[0]
      if (!row) return null
      return {
        name: row.name != null ? String(row.name) : null,
        age: toNumOrNull(row.age),
        gender: row.gender != null ? String(row.gender) : null,
        smoker: toBool(row.smoker),
        diabetes: toBool(row.diabetes),
        treatedBp: toBool(row.treated_bp),
        cholesterol: toNumOrNull(row.cholesterol),
        hdl: toNumOrNull(row.hdl),
        height: toNumOrNull(row.height),
        weight: toNumOrNull(row.weight),
        fastingGlucose: toNumOrNull(row.fasting_glucose),
        triglycerides: toNumOrNull(row.triglycerides),
        familyHistory: row.family_history != null ? String(row.family_history) : null,
        diet: row.diet != null ? String(row.diet) : null,
        activity: row.activity != null ? String(row.activity) : null,
        updatedAt: row.updated_at != null ? String(row.updated_at) : null
      }
    },

    async saveRiskScores(userId, scores) {
      const connection = await db()
      await connection.run(
        `INSERT INTO risk_scores (user_id, cardio, diabetes, hypertension, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           cardio = excluded.cardio,
           diabetes = excluded.diabetes,
           hypertension = excluded.hypertension,
           updated_at = excluded.updated_at`,
        [userId, scores.cardio, scores.diabetes, scores.hypertension, new Date().toISOString()]
      )
    },

    async getRiskScores(userId) {
      const connection = await db()
      const result = await connection.query('SELECT * FROM risk_scores WHERE user_id = ? LIMIT 1', [userId])
      const row = result.values?.[0]
      if (!row) return null
      return {
        cardio: toNumOrNull(row.cardio),
        diabetes: toNumOrNull(row.diabetes),
        hypertension: toNumOrNull(row.hypertension)
      }
    },

    async clear(userId) {
      const connection = await db()
      await connection.run('DELETE FROM scans WHERE user_id = ?', [userId])
      await connection.run('DELETE FROM risk_profile WHERE user_id = ?', [userId])
      await connection.run('DELETE FROM risk_scores WHERE user_id = ?', [userId])
    }
  }
}

// Browser dev fallback: the SQLite plugin needs the jeep-sqlite web component,
// which is not shipped here, so `nuxt dev` in a desktop browser uses localStorage.
function createWebDriver(): HealthStoreDriver {
  const read = <T>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  }
  const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value))
  const scansKey = (userId: string) => `lumi:${userId}:scans`
  const profileKey = (userId: string) => `lumi:${userId}:riskProfile`
  const scoresKey = (userId: string) => `lumi:${userId}:riskScores`

  return {
    async saveScan(userId, scan) {
      const history = read<StoredScan[]>(scansKey(userId), [])
      history.push(scan)
      write(scansKey(userId), history)
    },
    async getLatestScan(userId) {
      const history = read<StoredScan[]>(scansKey(userId), [])
      return history.length ? history[history.length - 1]! : null
    },
    async getScanHistory(userId, limit) {
      return read<StoredScan[]>(scansKey(userId), []).slice(-limit).reverse()
    },
    async saveRiskProfile(userId, profile) {
      write(profileKey(userId), { ...profile, updatedAt: new Date().toISOString() })
    },
    async getRiskProfile(userId) {
      return read<RiskProfile | null>(profileKey(userId), null)
    },
    async saveRiskScores(userId, scores) {
      write(scoresKey(userId), scores)
    },
    async getRiskScores(userId) {
      return read<RiskScores | null>(scoresKey(userId), null)
    },
    async clear(userId) {
      localStorage.removeItem(scansKey(userId))
      localStorage.removeItem(profileKey(userId))
      localStorage.removeItem(scoresKey(userId))
    }
  }
}

let driver: HealthStoreDriver | null = null

function getDriver(): HealthStoreDriver {
  if (!driver) {
    driver = Capacitor.isNativePlatform() ? createSqliteDriver() : createWebDriver()
  }
  return driver
}

export const useHealthStore = () => {
  const { userId } = useCurrentUser()

  return {
    saveScan: (scan: StoredScan) => getDriver().saveScan(userId.value, scan),
    getLatestScan: () => getDriver().getLatestScan(userId.value),
    getScanHistory: (limit = 20) => getDriver().getScanHistory(userId.value, limit),
    saveRiskProfile: (profile: RiskProfile) => getDriver().saveRiskProfile(userId.value, profile),
    getRiskProfile: () => getDriver().getRiskProfile(userId.value),
    saveRiskScores: (scores: RiskScores) => getDriver().saveRiskScores(userId.value, scores),
    getRiskScores: () => getDriver().getRiskScores(userId.value),
    clear: () => getDriver().clear(userId.value)
  }
}
