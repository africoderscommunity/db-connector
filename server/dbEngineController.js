import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import getPort from 'get-port';
import { app, dialog } from 'electron';
import fetch from 'node-fetch';
import { pipeline } from 'stream';
import { promisify } from 'util';
import tar from 'tar';

const streamPipeline = promisify(pipeline);

class DBEngine {
  instancesFile;
  runningProcesses;
  binariesDir;
  binaries;

  constructor() {
    this.instancesFile = path.join(app.getPath('userData'), 'dbs-instances.json');
    if (!fs.existsSync(this.instancesFile)) fs.writeFileSync(this.instancesFile, '[]');

    this.runningProcesses = {};
    this.binariesDir = path.join(app.getPath('userData'), 'db-binaries');
    console.log({ binariesDir: this.binariesDir });
    if (!fs.existsSync(this.binariesDir)) fs.mkdirSync(this.binariesDir, { recursive: true });

    this.binaries = this.listBinaries();
  }

  loadInstances() {
    if (!fs.existsSync(this.instancesFile)) return [];
    return JSON.parse(fs.readFileSync(this.instancesFile, 'utf8'));
  }

  saveInstances(instances) {
    fs.writeFileSync(this.instancesFile, JSON.stringify(instances, null, 2), 'utf8');
  }

  listInstances() {
    return this.loadInstances();
  }

  listBinaries() {
    const binaries = {};
    ['mongo', 'postgres', 'mysql'].forEach(engine => {
      // Check for system-installed binaries first
      let systemBinPath = '';
      
      if (engine === 'postgres') {
        // Check common PostgreSQL installation paths
        const pgPaths = [
          '/usr/local/bin/postgres',
          '/opt/homebrew/bin/postgres',
          '/Applications/Postgres.app/Contents/Versions/latest/bin/postgres',
          '/Library/PostgreSQL/16/bin/postgres',
          '/usr/local/opt/postgresql@16/bin/postgres',
          '/opt/homebrew/opt/postgresql@16/bin/postgres'
        ];
        
        for (const p of pgPaths) {
          if (fs.existsSync(p)) {
            systemBinPath = p;
            console.log(`[DBEngine] Found system PostgreSQL at: ${p}`);
            break;
          }
        }
        
        if (systemBinPath) {
          binaries[engine] = { installed: true, path: systemBinPath, isSystem: true };
          return;
        }
      } else if (engine === 'mysql') {
        // Check common MySQL installation paths
        const mysqlPaths = [
          '/usr/local/bin/mysqld',
          '/usr/local/mysql/bin/mysqld',
          '/opt/homebrew/bin/mysqld',
          '/usr/local/bin/mysql',
          '/opt/homebrew/bin/mysql'
        ];

        for (const p of mysqlPaths) {
          if (fs.existsSync(p)) {
            systemBinPath = p;
            console.log(`[DBEngine] Found system MySQL server at: ${p}`);
            break;
          }
        }
      }

      if (systemBinPath) {
        binaries[engine] = { installed: true, path: systemBinPath, isSystem: true };
        return; 
      }
      
      // Check downloaded binaries
      const dirs = fs.existsSync(this.binariesDir)
        ? fs.readdirSync(this.binariesDir).filter(d => d.startsWith(`${engine}-`))
        : [];
        
      if (dirs.length > 0) {
        const latest = dirs.sort().reverse()[0];
        let binPath = '';
        if (engine === 'mongo') binPath = path.join(this.binariesDir, latest, 'bin', 'mongod');
        if (engine === 'postgres') binPath = path.join(this.binariesDir, latest, 'bin', 'postgres');
        if (engine === 'mysql') binPath = path.join(this.binariesDir, latest, 'bin', 'mysqld');
        
        // Verify binary actually exists
        if (fs.existsSync(binPath)) {
          binaries[engine] = { installed: true, path: binPath, isSystem: false };
        } else {
          binaries[engine] = { installed: false };
        }
      } else {
        binaries[engine] = { installed: false };
      }
    });
    return binaries;
  }

  async downloadBinary(engine, version, onProgress) {
    let url;
    let extractedFolderName;
    
    version = version || 'latest';
    const targetDir = path.join(this.binariesDir, `${engine}-${version}`);
    
    // Check if already installed
    if (fs.existsSync(targetDir)) {
      console.log(`[DBEngine] Binary already exists at: ${targetDir}`);
      return targetDir;
    }

    switch (engine) {
      case 'mongo':
        version = version === 'latest' ? '6.0.6' : version;
        extractedFolderName = `mongodb-macos-x86_64-${version}`;
        url = `https://fastdl.mongodb.org/osx/${extractedFolderName}.tgz`;
        break;
      case 'postgres':
        version = version === 'latest' ? '17.2.0' : version;
        const pgArch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
        extractedFolderName = `postgresql-${version}-${pgArch}-apple-darwin`;
        url = `https://github.com/theseus-rs/postgresql-binaries/releases/download/v${version}/postgresql-${version}-${pgArch}-apple-darwin.tar.gz`;
        break;
      case 'mysql':
        version = version === 'latest' ? '9.5.0' : version;
        extractedFolderName = `mysql-${version}-macos15-x86_64`;
        url = `https://dev.mysql.com/get/Downloads/MySQL-${version}/mysql-${version}-macos15-x86_64.tar.gz`;
        break;
      default:
        throw new Error(`Unsupported engine: ${engine}`);
    }

    const tgzPath = path.join(this.binariesDir, `${engine}-${version}.tgz`);

    try {
      console.log(`[DBEngine] Downloading ${engine} from: ${url}`);
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to download ${engine}: ${res.statusText}`);

      const total = Number(res.headers.get('content-length')) || 0;
      let downloaded = 0;

      const fileStream = fs.createWriteStream(tgzPath);

      await new Promise((resolve, reject) => {
        res.body.on('data', chunk => {
          downloaded += chunk.length;
          if (onProgress && total) onProgress(Math.round((downloaded / total) * 100));
        });
        res.body.pipe(fileStream);
        res.body.on('error', reject);
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
      });

      console.log(`[DBEngine] Download complete. Extracting to ${this.binariesDir}...`);

      // Extract the archive
      await tar.x({ 
        file: tgzPath, 
        cwd: this.binariesDir 
      });

      console.log(`[DBEngine] Extraction complete.`);

      // The archive extracts to extractedFolderName, but we want it named as targetDir
      const extractedPath = path.join(this.binariesDir, extractedFolderName);
      
      console.log(`[DBEngine] Looking for extracted folder: ${extractedPath}`);
      console.log(`[DBEngine] Target directory: ${targetDir}`);

      if (fs.existsSync(extractedPath)) {
        // Rename to our standard naming convention
        if (extractedPath !== targetDir) {
          console.log(`[DBEngine] Renaming ${extractedPath} to ${targetDir}`);
          fs.renameSync(extractedPath, targetDir);
        }
      } else {
        throw new Error(`Extracted folder not found at: ${extractedPath}`);
      }

      // Verify the binary exists
      let binaryPath = '';
      if (engine === 'mongo') binaryPath = path.join(targetDir, 'bin', 'mongod');
      if (engine === 'postgres') binaryPath = path.join(targetDir, 'bin', 'postgres');
      if (engine === 'mysql') binaryPath = path.join(targetDir, 'bin', 'mysqld');

      console.log(`[DBEngine] Checking for binary at: ${binaryPath}`);

      if (!fs.existsSync(binaryPath)) {
        throw new Error(`Binary not found at expected path: ${binaryPath}. Check extraction.`);
      }

      // Make binary executable
      try {
        fs.chmodSync(binaryPath, '755');
        console.log(`[DBEngine] Made binary executable: ${binaryPath}`);
      } catch (chmodErr) {
        console.warn(`[DBEngine] Could not chmod binary: ${chmodErr.message}`);
      }

      // Clean up tar file
      if (fs.existsSync(tgzPath)) {
        fs.unlinkSync(tgzPath);
        console.log(`[DBEngine] Cleaned up archive file`);
      }

      console.log(`[DBEngine] Successfully installed ${engine} binary to: ${targetDir}`);
      return targetDir;

    } catch (err) {
      console.error(`[DBEngine] Error downloading/extracting ${engine}:`, err);
      
      // Clean up on error
      if (fs.existsSync(tgzPath)) {
        try { fs.unlinkSync(tgzPath); } catch (e) {}
      }
      if (fs.existsSync(targetDir)) {
        try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch (e) {}
      }
      
      throw err;
    }
  }

  async createInstance(engine, requestedPort, version) {
    const port = requestedPort || (await getPort());
    console.log({port, requestedPort});
    
    const instances = this.loadInstances();
    const id = `${engine}@${port}`;
    const dataPath = path.join(app.getPath('userData'), id, 'data');
    
    // Create shorter socket directory for PostgreSQL (to avoid 103 byte limit)
    const socketDir = engine === 'postgres' ? '/tmp' : dataPath;
    
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }

    try {
      let binaryPath = this.binaries[engine]?.path;

      // Download binary if not found
      if (!binaryPath || !fs.existsSync(binaryPath)) {
        console.log(`[DBEngine] Binary for ${engine} not found, downloading...`);
        
        const binDir = await this.downloadBinary(engine, version, progress => {
          console.log(`${engine} download: ${progress}%`);
        });
        
        if (engine === 'mongo') binaryPath = path.join(binDir, 'bin', 'mongod');
        if (engine === 'postgres') binaryPath = path.join(binDir, 'bin', 'postgres');
        if (engine === 'mysql') binaryPath = path.join(binDir, 'bin', 'mysqld');
        
        this.binaries[engine] = { installed: true, path: binaryPath };
      }

      console.log(`[DBEngine] Using binary for ${engine}: ${binaryPath}`);

      // Final verification
      if (!fs.existsSync(binaryPath)) {
        throw new Error(`Binary not found at: ${binaryPath}`);
      }

      const args = [];
      
      if (engine === 'mongo') {
        args.push(
          '--dbpath', dataPath,
          '--port', port.toString(),
          '--logpath', path.join(dataPath, 'mongod.log'),
          '--bind_ip', '127.0.0.1'
        );
      } else if (engine === 'postgres') {
        // Initialize PostgreSQL if needed
        const pgVersionFile = path.join(dataPath, 'PG_VERSION');
        if (!fs.existsSync(pgVersionFile)) {
          const initdbPath = path.join(path.dirname(binaryPath), 'initdb');
          console.log(`[DBEngine] Initializing PostgreSQL at ${dataPath}`);
          
          // Initialize with postgres user and trust authentication (no password)
          await new Promise((resolve, reject) => {
            const initProc = spawn(initdbPath, [
              '-D', dataPath, 
              '-U', 'postgres',
              '--auth=trust'  // Allow connections without password initially
            ], { shell: false });
            
            initProc.stdout.on('data', data => console.log(`[initdb] ${data}`));
            initProc.stderr.on('data', data => console.error(`[initdb] ${data}`));
            initProc.on('exit', code => {
              if (code === 0) {
                console.log(`[DBEngine] PostgreSQL initialized successfully`);
                
                // Configure pg_hba.conf to use trust initially, then switch to md5 after password is set
                const pgHbaPath = path.join(dataPath, 'pg_hba.conf');
                const pgHbaContent = `# TYPE  DATABASE        USER            ADDRESS                 METHOD
# Allow local connections without password initially (trust)
local   all             all                                     trust
# Allow TCP connections without password initially
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
`;
                fs.writeFileSync(pgHbaPath, pgHbaContent);
                console.log(`[DBEngine] Configured pg_hba.conf for trust authentication (no password required initially)`);
                
                resolve();
              } else {
                reject(new Error(`initdb failed with code ${code}`));
              }
            });
          });
        }
        
        // Start PostgreSQL
        args.push(
          '-D', dataPath,
          '-p', port.toString(),
          '-h', '127.0.0.1',
          '-k', socketDir
        );
      } else if (engine === 'mysql') {
        // Initialize MySQL if needed
        const mysqlInitMarker = path.join(dataPath, 'mysql');
        if (!fs.existsSync(mysqlInitMarker)) {
          console.log(`[DBEngine] Initializing MySQL at ${dataPath}`);
          
          // Initialize with --initialize-insecure (no root password)
          await new Promise((resolve, reject) => {
            const initProc = spawn(binaryPath, [
              '--initialize-insecure',
              `--datadir=${dataPath}`
            ], { shell: false });
            
            initProc.stdout.on('data', data => console.log(`[mysql-init] ${data}`));
            initProc.stderr.on('data', data => console.error(`[mysql-init] ${data}`));
            initProc.on('exit', code => {
              if (code === 0) {
                console.log(`[DBEngine] MySQL initialized successfully with no root password`);
                resolve();
              } else {
                reject(new Error(`MySQL init failed with code ${code}`));
              }
            });
          });
        }
        
        const socketPath = `/tmp/mysql_${port}.sock`;
        const mysqlxSocketPath = `/tmp/mysqlx_${port}.sock`;
        const pidFile = path.join(dataPath, `mysqld_${port}.pid`);

        // Clean up stale files before starting
        [socketPath, mysqlxSocketPath, pidFile].forEach(file => {
          if (fs.existsSync(file)) {
            try {
              fs.unlinkSync(file);
              console.log(`[DBEngine] Removed stale file: ${file}`);
            } catch (e) {
              console.warn(`[DBEngine] Could not remove ${file}: ${e.message}`);
            }
          }
        });

        // MySQL runtime arguments - start WITHOUT skip-grant-tables initially
        args.push(
          `--datadir=${dataPath}`,
          `--port=${port}`,
          `--socket=${socketPath}`,
          `--pid-file=${pidFile}`,
          `--mysqlx-socket=${mysqlxSocketPath}`,
          `--bind-address=127.0.0.1`
        );
      }

      console.log(`[DBEngine] Starting ${engine} with args:`, args);

      // Spawn the database process
      const proc = spawn(binaryPath, args, { 
        shell: false,
        detached: false
      });

      proc.stdout.on('data', data => console.log(`[${engine}:${port}]`, data.toString()));
      proc.stderr.on('data', data => console.error(`[${engine}:${port}]`, data.toString()));
      
      proc.on('exit', code => {
        console.log(`[${engine}:${port}] exited with code ${code}`);
        delete this.runningProcesses[id];
        
        // Update instance status
        const instances = this.loadInstances();
        const inst = instances.find(i => i.id === id);
        if (inst) {
          inst.status = 'stopped';
          inst.pid = null;
          this.saveInstances(instances);
        }
      });

      proc.on('error', err => {
        console.error(`[${engine}:${port}] process error:`, err);
        delete this.runningProcesses[id];
      });

      const instance = { 
        id, 
        engine, 
        port, 
        version: version || 'latest', 
        dataPath,
        socketDir: engine === 'postgres' ? socketDir : null,
        username: engine === 'postgres' ? "postgres" : (engine === 'mysql' ? 'root' : null),
        status: 'running', 
        pid: proc.pid, 
        logs: '',
        passwordSet: false  // Track if password has been set
      };
      
      this.runningProcesses[id] = proc;
      instances.push(instance);
      this.saveInstances(instances);

      console.log(`[DBEngine] Instance created successfully: ${id}`);
      return instance;

    } catch (err) {
      console.error(`[DBEngine] Error creating instance:`, err);
      dialog.showErrorBox('Database Setup Error', err.message);
      return null;
    }
  }

  startInstance(id) {
    const instances = this.loadInstances();
    const instance = instances.find(i => i.id === id);
    
    if (!instance) {
      throw new Error('Instance not found');
    }
    
    if (instance.status === 'running') {
      console.log(`[DBEngine] Instance ${id} already running`);
      return instance;
    }

    const binaryPath = this.binaries[instance.engine]?.path;
    if (!binaryPath || !fs.existsSync(binaryPath)) {
      throw new Error(`Binary for ${instance.engine} not found at ${binaryPath}`);
    }

    const args = [];
    if (instance.engine === 'mongo') {
      args.push(
        '--dbpath', instance.dataPath, 
        '--port', instance.port.toString(),
        '--logpath', path.join(instance.dataPath, 'mongod.log'),
        '--bind_ip', '127.0.0.1'
      );
    }
    if (instance.engine === 'postgres') {
      const socketDir = instance.socketDir || '/tmp';
      args.push(
        '-D', instance.dataPath,
        '-p', instance.port.toString(),
        '-h', '127.0.0.1',
        '-k', socketDir
      );
    }
    if (instance.engine === 'mysql') {
      const socketPath = `/tmp/mysql_${instance.port}.sock`;
      const mysqlxSocketPath = `/tmp/mysqlx_${instance.port}.sock`;
      const pidFile = path.join(instance.dataPath, `mysqld_${instance.port}.pid`);
      
      // Clean up stale socket/pid files if they exist
      [socketPath, mysqlxSocketPath, pidFile].forEach(file => {
        if (fs.existsSync(file)) {
          try {
            fs.unlinkSync(file);
            console.log(`[DBEngine] Removed stale file: ${file}`);
          } catch (e) {
            console.warn(`[DBEngine] Could not remove ${file}: ${e.message}`);
          }
        }
      });
      
      args.push(
        `--datadir=${instance.dataPath}`,
        `--port=${instance.port}`,
        `--socket=${socketPath}`,
        `--pid-file=${pidFile}`,
        `--mysqlx-socket=${mysqlxSocketPath}`,
        `--bind-address=127.0.0.1`
      );
    }

    console.log(`[DBEngine] Starting instance ${id}`);
    const proc = spawn(binaryPath, args, { shell: false });

    proc.stdout.on('data', data => { 
      const log = data.toString();
      console.log(`[${id}]`, log);
      instance.logs += log;
    });
    
    proc.stderr.on('data', data => { 
      const log = data.toString();
      console.error(`[${id}]`, log);
      instance.logs += log;
    });
    
    proc.on('exit', code => { 
      console.log(`[${id}] exited with code ${code}`);
      instance.status = 'stopped'; 
      instance.pid = null;
      delete this.runningProcesses[id];
      this.saveInstances(instances); 
    });

    instance.status = 'running';
    instance.pid = proc.pid;
    this.runningProcesses[id] = proc;
    this.saveInstances(instances);
    
    return instance;
  }

  stopInstance(id) {
    const instances = this.loadInstances();
    const instance = instances.find(i => i.id === id);
    
    if (!instance) {
      throw new Error('Instance not found');
    }
    
    if (instance.status !== 'running') {
      console.log(`[DBEngine] Instance ${id} not running`);
      return instance;
    }

    const proc = this.runningProcesses[id];
    if (proc) {
      console.log(`[DBEngine] Stopping instance ${id} (PID: ${proc.pid})`);
      
      // Try graceful shutdown first
      proc.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!proc.killed) {
          console.log(`[DBEngine] Force killing ${id}`);
          proc.kill('SIGKILL');
        }
      }, 5000);
    }

    instance.status = 'stopped';
    instance.pid = null;
    instance.logs += '\n[Stopped by user]';
    delete this.runningProcesses[id];

    this.saveInstances(instances);
    return instance;
  }

  deleteInstance(id) {
    const instances = this.loadInstances();
    const instance = instances.find(i => i.id === id);
    
    if (!instance) {
      throw new Error('Instance not found');
    }

    // Stop if running
    if (instance.status === 'running') {
      this.stopInstance(id);
    }

    // Remove data directory
    const instanceDir = path.dirname(instance.dataPath);
    if (fs.existsSync(instanceDir)) {
      console.log(`[DBEngine] Deleting instance data at ${instanceDir}`);
      fs.rmSync(instanceDir, { recursive: true, force: true });
    }

    // Remove from instances list
    const updatedInstances = instances.filter(i => i.id !== id);
    this.saveInstances(updatedInstances);

    console.log(`[DBEngine] Instance ${id} deleted`);
    return { success: true, message: 'Instance deleted' };
  }

  getInstanceLogs(id) {
    const instances = this.loadInstances();
    const instance = instances.find(i => i.id === id);
    return instance ? instance.logs : '';
  }

  // Get connection info for an instance
  getConnectionInfo(id) {
    const instances = this.loadInstances();
    const instance = instances.find(i => i.id === id);
    
    if (!instance) {
      throw new Error('Instance not found');
    }

    const info = {
      engine: instance.engine,
      host: '127.0.0.1',
      port: instance.port,
      status: instance.status
    };

    if (instance.engine === 'mongo') {
      info.connectionString = `mongodb://127.0.0.1:${instance.port}`;
      info.username = null;
      info.password = null;
      info.database = 'admin';
    } else if (instance.engine === 'postgres') {
      const pgUser = 'postgres';
      info.connectionString = `postgresql://${pgUser}@127.0.0.1:${instance.port}/postgres`;
      info.username = pgUser;
      info.password = instance.passwordSet ? '(password required)' : null;
      info.database = 'postgres';
      info.note = instance.passwordSet 
        ? 'Password authentication is enabled. Connect with: psql "postgresql://postgres:yourpassword@127.0.0.1:' + instance.port + '/postgres"'
        : 'No password required initially. Connect with: psql "postgresql://postgres@127.0.0.1:' + instance.port + '/postgres" then set password with: ALTER ROLE postgres WITH PASSWORD \'yourpassword\';';
    } else if (instance.engine === 'mysql') {
      const mySqlUser = 'root';
      info.connectionString = `mysql://root@127.0.0.1:${instance.port}`;
      info.username = mySqlUser;
      info.password = instance.passwordSet ? '(password required)' : null;
      info.database = 'mysql';
      info.note = instance.passwordSet
        ? 'Password authentication is enabled. Connect with: mysql -u root -p -h 127.0.0.1 -P ' + instance.port
        : 'No password required initially. Connect with: mysql -u root -h 127.0.0.1 -P ' + instance.port + ' then set password with: ALTER USER \'root\'@\'localhost\' IDENTIFIED BY \'yourpassword\'; FLUSH PRIVILEGES;';
    }

    return info;
  }
// my_secure_password
// my_new_user
  // Mark that password has been set for an instance
  setPasswordEnabled(id) {
    const instances = this.loadInstances();
    const instance = instances.find(i => i.id === id);
    
    if (instance) {
      instance.passwordSet = true;
      this.saveInstances(instances);
      
      // For PostgreSQL, update pg_hba.conf to require password authentication
      if (instance.engine === 'postgres') {
        const pgHbaPath = path.join(instance.dataPath, 'pg_hba.conf');
        const pgHbaContent = `# TYPE  DATABASE        USER            ADDRESS                 METHOD
# Require password authentication (md5)
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
`;
        fs.writeFileSync(pgHbaPath, pgHbaContent);
        console.log(`[DBEngine] Updated pg_hba.conf to require password authentication for ${id}`);
        console.log(`[DBEngine] Please restart the PostgreSQL instance for changes to take effect`);
      }
      
      console.log(`[DBEngine] Password authentication enabled for ${id}`);
      return instance;
    }
    
    throw new Error('Instance not found');
  }

  // Cleanup all running processes on app exit
  async cleanup() {
    console.log('[DBEngine] Cleaning up all running instances...');
    const instances = this.loadInstances();
    
    for (const instance of instances) {
      if (instance.status === 'running') {
        try {
          this.stopInstance(instance.id);
        } catch (err) {
          console.error(`[DBEngine] Error stopping ${instance.id}:`, err);
        }
      }
    }
  }
}

export const DbEngine = new DBEngine();