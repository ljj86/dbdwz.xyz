// Starts only an empty, private MySQL instance. No defaults, network, or existing DB.
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const mysql = require('mysql2/promise');

async function main() {
  const binary = process.env.SECURITY_TEST_MYSQLD || '/opt/homebrew/bin/mysqld';
  if (!fs.existsSync(binary)) throw new Error('Set SECURITY_TEST_MYSQLD to a local mysqld executable');
  const artifactRoot = process.env.SECURITY_TEST_TMP;
  if (!artifactRoot) throw new Error('Set SECURITY_TEST_TMP to the prepared temporary artifact directory');
  const fixtureRoot = fs.mkdtempSync(path.join(artifactRoot, 'auth-native-'));
  // Darwin Unix sockets have a short pathname limit. mkdtemp creates mode 0700.
  const root = fs.mkdtempSync(path.join('/tmp', 'dbdwz-auth-'));
  const data = path.join(fixtureRoot, 'data');
  const socketPath = path.join(root, 'mysql.sock');
  const common = ['--no-defaults', `--datadir=${data}`, '--skip-networking', '--mysqlx=OFF', `--log-error=${path.join(fixtureRoot, 'mysql.log')}`];
  let server;
  let connection;
  try {
    const initialized = spawnSync(binary, [...common, '--initialize-insecure'], { encoding: 'utf8' });
    if (initialized.status !== 0) throw new Error(`Private MySQL initialization failed: ${initialized.stderr}`);
    server = spawn(binary, [...common, `--socket=${socketPath}`, `--pid-file=${path.join(root, 'mysql.pid')}`], { stdio: 'ignore' });
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (server.exitCode !== null) throw new Error('Private MySQL exited before becoming ready');
      try { connection = await mysql.createConnection({ socketPath, user: 'root' }); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    if (!connection) throw new Error('Private MySQL startup timed out');
    await connection.end();
    connection = null;
    const tested = spawnSync(process.execPath, ['--test', path.join(__dirname, 'security-auth.test.js'), path.join(__dirname, 'avatar-delivery.test.js')], {
      cwd: path.join(__dirname, '..'), encoding: 'utf8',
      env: { ...process.env, SECURITY_TEST_MYSQL_SOCKET: socketPath, SECURITY_TEST_TMP: fixtureRoot }
    });
    const testLog = path.join(fixtureRoot, 'auth-tests.log');
    fs.writeFileSync(testLog, tested.stdout + tested.stderr);
    process.stdout.write(tested.stdout);
    process.stderr.write(tested.stderr);
    console.log(`Auth regression log: ${testLog}`);
    if (tested.status !== 0) process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
    if (server && server.exitCode === null) {
      const exited = new Promise(resolve => server.once('exit', resolve));
      server.kill('SIGTERM');
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 10000))]);
      if (server.exitCode === null) { server.kill('SIGKILL'); await exited; }
    }
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(data, { recursive: true, force: true });
    fs.rmSync(path.join(fixtureRoot, 'profiles'), { recursive: true, force: true });
    fs.rmSync(path.join(fixtureRoot, 'papers'), { recursive: true, force: true });
    console.log(`Private MySQL log: ${path.join(fixtureRoot, 'mysql.log')}`);
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
