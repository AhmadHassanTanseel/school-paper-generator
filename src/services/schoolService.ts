import { getDatabase } from '../database/db';
import type { SchoolConfig } from '../types';

export async function getSchoolConfig(): Promise<SchoolConfig | null> {
  const db = await getDatabase();
  const res = await db.select<SchoolConfig[]>('SELECT * FROM school_config WHERE id = 1;');
  return res?.[0] ?? null;
}

export async function saveSchoolConfig(config: Partial<SchoolConfig>): Promise<void> {
  const db = await getDatabase();
  const exists = await db.select<{ id: number }[]>('SELECT id FROM school_config WHERE id = 1;');

  if (exists?.length) {
    await db.execute(
      `UPDATE school_config SET name=$1, address=$2, phone=$3, default_session=$4,
       header_template=$5, default_language=$6, default_paper_size=$7 WHERE id=1;`,
      [
        config.name ?? '', config.address ?? '', config.phone ?? '',
        config.default_session ?? '2026-2027', config.header_template ?? 'standard',
        config.default_language ?? 'Mixed (English & Urdu)', config.default_paper_size ?? 'A4',
      ]
    );
  } else {
    await db.execute(
      `INSERT INTO school_config (id, name, address, phone, default_session, header_template, default_language, default_paper_size, is_setup_complete, last_backup_date)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, 0, $8);`,
      [
        config.name ?? '', config.address ?? '', config.phone ?? '',
        config.default_session ?? '2026-2027', config.header_template ?? 'standard',
        config.default_language ?? 'Mixed (English & Urdu)', config.default_paper_size ?? 'A4',
        new Date().toISOString().split('T')[0],
      ]
    );
  }
}

export async function completeSetup(config: {
  name: string; address: string; phone: string; session: string;
  headerTemplate: string; defaultLang: string;
}): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString().split('T')[0];
  await db.execute(
    `INSERT OR REPLACE INTO school_config (id, name, address, phone, default_session, header_template, default_language, default_paper_size, is_setup_complete, last_backup_date)
     VALUES (1, $1, $2, $3, $4, $5, $6, 'A4', 1, $7);`,
    [config.name, config.address, config.phone, config.session, config.headerTemplate, config.defaultLang, now]
  );
}

export async function updateLastBackupDate(): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString().split('T')[0];
  await db.execute('UPDATE school_config SET last_backup_date = $1 WHERE id = 1;', [now]);
}
