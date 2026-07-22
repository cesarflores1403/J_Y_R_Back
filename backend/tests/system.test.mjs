import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';

process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'postgres';
process.env.DB_APP_USER = 'jyr_app';
process.env.DB_APP_PASSWORD = 'app_password_placeholder';
process.env.DB_MAINTENANCE_USER = 'postgres';
process.env.DB_MAINTENANCE_PASSWORD = 'maintenance_password_placeholder';

const backupService = await import('../src/services/systemBackupService.js');

test('backup helpers reject traversal and validate hashes', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jyr-backup-'));
  const backupDir = path.join(backupService.BACKUPS_ROOT, `test-${Date.now()}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const dbBackupFile = path.join(backupDir, 'db.backup');
  const metadataFile = path.join(backupDir, 'metadata.json');
  const payload = Buffer.from('backup-content');

  try {
    fs.writeFileSync(dbBackupFile, payload);
    const crypto = await import('crypto');
    const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
    fs.writeFileSync(metadataFile, JSON.stringify({ sha256_db_backup: sha256 }, null, 2));

    const metadata = await backupService.verifyDbBackupHash(backupDir);
    assert.equal(metadata.sha256_db_backup, sha256);

    assert.throws(
      () => backupService.normalizeBackupPath('../outside'),
      /ruta del backup no es valida/i
    );

    fs.writeFileSync(metadataFile, JSON.stringify({ sha256_db_backup: 'bad-hash' }, null, 2));
    await assert.rejects(
      () => backupService.verifyDbBackupHash(backupDir),
      /hash del backup no coincide/i
    );

    const hash = await backupService.safeHashFile(dbBackupFile);
    assert.equal(hash.length, 64);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
});
