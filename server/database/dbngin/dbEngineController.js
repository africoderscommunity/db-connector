
import { spawn, execSync, spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import getPort from 'get-port'
import { app, dialog } from 'electron'
import fetch from 'node-fetch'
import { pipeline } from 'stream'
import { promisify } from 'util'
import tar from 'tar'

const streamPipeline = promisify(pipeline)

class DBEngine {
  instancesFile
  runningProcesses
  binariesDir
  binaries
  dbUser = null

  constructor() {
    this.instancesFile = path.join(
      app.getPath('userData'),
      'dbs-instances.json'
    )
    if (!fs.existsSync(this.instancesFile))
      fs.writeFileSync(this.instancesFile, '[]')

    this.runningProcesses = {}
    this.binariesDir = path.join(app.getPath('userData'), 'db-binaries')
    console.log({ binariesDir: this.binariesDir })
    if (!fs.existsSync(this.binariesDir))
      fs.mkdirSync(this.binariesDir, { recursive: true })

    // Determine the user to run database processes
    this.dbUser = this.getDatabaseUser()
    console.log(
      `[DBEngine] Will run database processes as user: ${this.dbUser}`
    )

    this.binaries = this.listBinaries()
  }

  getDatabaseUser() {
    const currentUser = os.userInfo().username

    if (currentUser !== 'root' && process.getuid && process.getuid() !== 0) {
      return currentUser
    }

    console.log(
      '[DBEngine] Running as root, finding non-root user for database processes...'
    )

    const candidates = [
      process.env.SUDO_USER,
      '_postgres',
      'postgres',
      '_mysql',
      'mysql',
      'nobody',
    ].filter(Boolean)

    for (const user of candidates) {
      try {
        execSync(`id ${user}`, { stdio: 'ignore' })
        console.log(`[DBEngine] Found suitable user: ${user}`)
        return user
      } catch (e) {
        // User doesn't exist, try next
      }
    }

    throw new Error(
      'Running as root but no suitable non-privileged user found. ' +
        'Please run this application as a regular user, or create a dedicated database user.'
    )
  }

  spawnAsUser(command, args, options = {}) {
    const currentUser = os.userInfo().username

    if (currentUser === this.dbUser) {
      return spawn(command, args, options)
    }

    console.log(
      `[DBEngine] Spawning as user ${this.dbUser}: ${command} ${args.join(' ')}`
    )

    const suArgs = [
      '-',
      this.dbUser,
      '-c',
      `"${command}" ${args.map((arg) => `"${arg}"`).join(' ')}`,
    ]

    return spawn('su', suArgs, {
      ...options,
      shell: true,
    })
  }

  fixDataDirPermissions(dataPath) {
    const currentUser = os.userInfo().username

    if (currentUser === 'root' && this.dbUser && this.dbUser !== 'root') {
      try {
        console.log(
          `[DBEngine] Fixing ownership of ${dataPath} for user ${this.dbUser}`
        )
        execSync(`chown -R ${this.dbUser} "${dataPath}"`, { stdio: 'ignore' })
        execSync(`chmod -R 700 "${dataPath}"`, { stdio: 'ignore' })
      } catch (e) {
        console.warn(`[DBEngine] Could not fix permissions: ${e.message}`)
      }
    }
  }

  loadInstances() {
    if (!fs.existsSync(this.instancesFile)) return []
    return JSON.parse(fs.readFileSync(this.instancesFile, 'utf8'))
  }

  saveInstances(instances) {
    fs.writeFileSync(
      this.instancesFile,
      JSON.stringify(instances, null, 2),
      'utf8'
    )
  }

  listInstances() {
    return this.loadInstances()
  }

  listBinaries() {
    const binaries = {}
    ;['mongo', 'postgres', 'mysql', 'redis'].forEach((engine) => {
      const dirs = fs.existsSync(this.binariesDir)
        ? fs
            .readdirSync(this.binariesDir)
            .filter((d) => d.startsWith(`${engine}-`))
        : []

      if (dirs.length > 0) {
        const latest = dirs.sort().reverse()[0]
        let binPath = ''
        if (engine === 'mongo')
          binPath = path.join(this.binariesDir, latest, 'bin', 'mongod')
        if (engine === 'postgres')
          binPath = path.join(this.binariesDir, latest, 'bin', 'postgres')
        if (engine === 'mysql')
          binPath = path.join(this.binariesDir, latest, 'bin', 'mysqld')
        if (engine === 'redis')
          binPath = path.join(this.binariesDir, latest, 'src', 'redis-server')

        if (fs.existsSync(binPath)) {
          binaries[engine] = { installed: true, path: binPath, isSystem: false }
        } else {
          binaries[engine] = { installed: false }
        }
      } else {
        binaries[engine] = { installed: false }
      }
    })
    return binaries
  }

  async downloadBinary(engine, version, onProgress) {
    let url
    let extractedFolderName

    version = version || 'latest'
    const targetDir = path.join(this.binariesDir, `${engine}-${version}`)

    if (fs.existsSync(targetDir)) {
      console.log(`[DBEngine] Binary already exists at: ${targetDir}`)
      return targetDir
    }

    switch (engine) {
      case 'mongo':
        version = version === 'latest' ? '6.0.6' : version
        extractedFolderName = `mongodb-macos-x86_64-${version}`
        url = `https://fastdl.mongodb.org/osx/${extractedFolderName}.tgz`
        break
      case 'postgres':
        version = version === 'latest' ? '17.2.0' : version
        const pgArch = process.arch === 'arm64' ? 'aarch64' : 'x86_64'
        extractedFolderName = `postgresql-${version}-${pgArch}-apple-darwin`
        console.log({ pgArch })
        url = `https://github.com/theseus-rs/postgresql-binaries/releases/download/${version}/postgresql-${version}-${pgArch}-apple-darwin.tar.gz`
        break
      case 'mysql':
        version = version === 'latest' ? '9.5.0' : version
        extractedFolderName = `mysql-${version}-macos15-x86_64`
        url = `https://dev.mysql.com/get/Downloads/MySQL-${version}/mysql-${version}-macos15-x86_64.tar.gz`
        break
      case 'redis':
        version = version === 'latest' ? '7.4.1' : version
        extractedFolderName = `redis-${version}`
        url = `https://download.redis.io/releases/redis-${version}.tar.gz`
        break
      default:
        throw new Error(`Unsupported engine: ${engine}`)
    }

    const tgzPath = path.join(this.binariesDir, `${engine}-${version}.tgz`)

    try {
      console.log(`[DBEngine] Downloading ${engine} from: ${url}`)

      const res = await fetch(url)
      if (!res.ok)
        throw new Error(`Failed to download ${engine}: ${res.statusText}`)

      const total = Number(res.headers.get('content-length')) || 0
      let downloaded = 0

      const fileStream = fs.createWriteStream(tgzPath)

      await new Promise((resolve, reject) => {
        res.body.on('data', (chunk) => {
          downloaded += chunk.length
          if (onProgress && total)
            onProgress(Math.round((downloaded / total) * 100))
        })
        res.body.pipe(fileStream)
        res.body.on('error', reject)
        fileStream.on('finish', resolve)
        fileStream.on('error', reject)
      })

      console.log(
        `[DBEngine] Download complete. Extracting to ${this.binariesDir}...`
      )

      await tar.x({
        file: tgzPath,
        cwd: this.binariesDir,
      })

      console.log(`[DBEngine] Extraction complete.`)

      const extractedPath = path.join(this.binariesDir, extractedFolderName)

      console.log(`[DBEngine] Looking for extracted folder: ${extractedPath}`)
      console.log(`[DBEngine] Target directory: ${targetDir}`)

      if (fs.existsSync(extractedPath)) {
        if (extractedPath !== targetDir) {
          console.log(`[DBEngine] Renaming ${extractedPath} to ${targetDir}`)
          fs.renameSync(extractedPath, targetDir)
        }
      } else {
        throw new Error(`Extracted folder not found at: ${extractedPath}`)
      }

      // Compile Redis AFTER renaming
      if (engine === 'redis') {
        console.log(`[DBEngine] Compiling Redis...`)
        try {
          const makeResult = spawnSync('make', [], {
            cwd: targetDir, // Use targetDir (after rename)
            stdio: 'inherit',
            shell: true,
            env: {
              ...process.env,
              PATH:
                '/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin:' +
                process.env.PATH,
            },
          })

          if (makeResult.error || makeResult.status !== 0) {
            throw new Error(
              `Make command failed: ${makeResult.error?.message || `Exit code ${makeResult.status}`}`
            )
          }

          console.log(`[DBEngine] Redis compilation complete`)
        } catch (compileErr) {
          console.error('[DBEngine] Compilation error:', compileErr)
          throw new Error(`Redis compilation failed: ${compileErr.message}`)
        }
      }

      // Verify the binary exists
      let binaryPath = ''
      if (engine === 'mongo') binaryPath = path.join(targetDir, 'bin', 'mongod')
      if (engine === 'postgres')
        binaryPath = path.join(targetDir, 'bin', 'postgres')
      if (engine === 'mysql') binaryPath = path.join(targetDir, 'bin', 'mysqld')
      if (engine === 'redis')
        binaryPath = path.join(targetDir, 'src', 'redis-server')

      console.log(`[DBEngine] Checking for binary at: ${binaryPath}`)

      if (!fs.existsSync(binaryPath)) {
        throw new Error(
          `Binary not found at expected path: ${binaryPath}. Check extraction.`
        )
      }

      // Make binary executable
      try {
        fs.chmodSync(binaryPath, '755')
        console.log(`[DBEngine] Made binary executable: ${binaryPath}`)
      } catch (chmodErr) {
        console.warn(`[DBEngine] Could not chmod binary: ${chmodErr.message}`)
      }

      // Clean up tar file
      if (fs.existsSync(tgzPath)) {
        fs.unlinkSync(tgzPath)
        console.log(`[DBEngine] Cleaned up archive file`)
      }

      console.log(
        `[DBEngine] Successfully installed ${engine} binary to: ${targetDir}`
      )
      return targetDir
    } catch (err) {
      console.error(`[DBEngine] Error downloading/extracting ${engine}:`, err)

      // Clean up on error
      if (fs.existsSync(tgzPath)) {
        try {
          fs.unlinkSync(tgzPath)
        } catch (e) {}
      }
      if (fs.existsSync(targetDir)) {
        try {
          fs.rmSync(targetDir, { recursive: true, force: true })
        } catch (e) {}
      }

      throw err
    }
  }

  async createInstance(engine, requestedPort, version) {
    const port = requestedPort || (await getPort())
    console.log({ port, requestedPort })

    const instances = this.loadInstances()
    const id = `${engine}@${port}`
    const dataPath = path.join(app.getPath('userData'), id, 'data')

    const socketDir = engine === 'postgres' ? '/tmp' : dataPath

    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true })
    }

    this.fixDataDirPermissions(dataPath)

    try {
      let binaryPath = this.binaries[engine]?.path

      if (!binaryPath || !fs.existsSync(binaryPath)) {
        console.log(`[DBEngine] Binary for ${engine} not found, downloading...`)

        const binDir = await this.downloadBinary(
          engine,
          version,
          (progress) => {
            console.log(`${engine} download: ${progress}%`)
          }
        )

        if (engine === 'mongo') binaryPath = path.join(binDir, 'bin', 'mongod')
        if (engine === 'postgres')
          binaryPath = path.join(binDir, 'bin', 'postgres')
        if (engine === 'mysql') binaryPath = path.join(binDir, 'bin', 'mysqld')
        if (engine === 'redis')
          binaryPath = path.join(binDir, 'src', 'redis-server')

        this.binaries[engine] = { installed: true, path: binaryPath }
      }

      console.log(`[DBEngine] Using binary for ${engine}: ${binaryPath}`)

      if (!fs.existsSync(binaryPath)) {
        throw new Error(`Binary not found at: ${binaryPath}`)
      }

      const args = []

      if (engine === 'mongo') {
        args.push(
          '--dbpath',
          dataPath,
          '--port',
          port.toString(),
          '--logpath',
          path.join(dataPath, 'mongod.log'),
          '--bind_ip',
          '127.0.0.1'
        )
      } else if (engine === 'postgres') {
        const pgVersionFile = path.join(dataPath, 'PG_VERSION')
        if (!fs.existsSync(pgVersionFile)) {
          const initdbPath = path.join(path.dirname(binaryPath), 'initdb')
          console.log(
            `[DBEngine] Initializing PostgreSQL at ${dataPath} as user ${this.dbUser}`
          )

          await new Promise((resolve, reject) => {
            const initProc = this.spawnAsUser(
              initdbPath,
              ['-D', dataPath, '-U', 'postgres', '--auth=trust'],
              { shell: false }
            )

            initProc.stdout.on('data', (data) =>
              console.log(`[initdb] ${data}`)
            )
            initProc.stderr.on('data', (data) =>
              console.error(`[initdb] ${data}`)
            )
            initProc.on('exit', (code) => {
              if (code === 0) {
                console.log(`[DBEngine] PostgreSQL initialized successfully`)

                const pgHbaPath = path.join(dataPath, 'pg_hba.conf')
                const pgHbaContent = `# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
`
                fs.writeFileSync(pgHbaPath, pgHbaContent)
                this.fixDataDirPermissions(dataPath)
                console.log(
                  `[DBEngine] Configured pg_hba.conf for trust authentication`
                )

                resolve()
              } else {
                reject(new Error(`initdb failed with code ${code}`))
              }
            })
          })
        }

        args.push(
          '-D',
          dataPath,
          '-p',
          port.toString(),
          '-h',
          '127.0.0.1',
          '-k',
          socketDir
        )
      } else if (engine === 'mysql') {
        const mysqlInitMarker = path.join(dataPath, 'mysql')
        if (!fs.existsSync(mysqlInitMarker)) {
          console.log(
            `[DBEngine] Initializing MySQL at ${dataPath} as user ${this.dbUser}`
          )

          await new Promise((resolve, reject) => {
            const initProc = this.spawnAsUser(
              binaryPath,
              ['--initialize-insecure', `--datadir=${dataPath}`],
              { shell: false }
            )

            initProc.stdout.on('data', (data) =>
              console.log(`[mysql-init] ${data}`)
            )
            initProc.stderr.on('data', (data) =>
              console.error(`[mysql-init] ${data}`)
            )
            initProc.on('exit', (code) => {
              if (code === 0) {
                console.log(`[DBEngine] MySQL initialized successfully`)
                this.fixDataDirPermissions(dataPath)
                resolve()
              } else {
                reject(new Error(`MySQL init failed with code ${code}`))
              }
            })
          })
        }

        const socketPath = `/tmp/mysql_${port}.sock`
        const mysqlxSocketPath = `/tmp/mysqlx_${port}.sock`
        const pidFile = path.join(dataPath, `mysqld_${port}.pid`)

        ;[socketPath, mysqlxSocketPath, pidFile].forEach((file) => {
          if (fs.existsSync(file)) {
            try {
              fs.unlinkSync(file)
              console.log(`[DBEngine] Removed stale file: ${file}`)
            } catch (e) {
              console.warn(`[DBEngine] Could not remove ${file}: ${e.message}`)
            }
          }
        })

        args.push(
          `--datadir=${dataPath}`,
          `--port=${port}`,
          `--socket=${socketPath}`,
          `--pid-file=${pidFile}`,
          `--mysqlx-socket=${mysqlxSocketPath}`,
          `--bind-address=127.0.0.1`
        )
      } else if (engine === 'redis') {
        const redisConfPath = path.join(dataPath, 'redis.conf')

        if (!fs.existsSync(redisConfPath)) {
          console.log(`[DBEngine] Creating Redis config at ${dataPath}`)
          const redisConfig = `# Redis configuration
port ${port}
bind 127.0.0.1
dir "${dataPath}"
dbfilename dump.rdb
# Save the DB on disk
save 900 1
save 300 10
save 60 10000
`
          fs.writeFileSync(redisConfPath, redisConfig)
        }

        args.push(redisConfPath)
      }

      console.log(
        `[DBEngine] Starting ${engine} as user ${this.dbUser} with args:`,
        args
      )

      const proc = this.spawnAsUser(binaryPath, args, {
        shell: false,
        detached: false,
      })

      proc.stdout.on('data', (data) =>
        console.log(`[${engine}:${port}]`, data.toString())
      )
      proc.stderr.on('data', (data) =>
        console.error(`[${engine}:${port}]`, data.toString())
      )

      proc.on('exit', (code) => {
        console.log(`[${engine}:${port}] exited with code ${code}`)
        delete this.runningProcesses[id]

        const instances = this.loadInstances()
        const inst = instances.find((i) => i.id === id)
        if (inst) {
          inst.status = 'stopped'
          inst.pid = null
          this.saveInstances(instances)
        }
      })

      proc.on('error', (err) => {
        console.error(`[${engine}:${port}] process error:`, err)
        delete this.runningProcesses[id]
      })

      const instance = {
        id,
        engine,
        port,
        version: version || 'latest',
        dataPath,
        socketDir: engine === 'postgres' ? socketDir : null,
        username:
          engine === 'postgres'
            ? 'postgres'
            : engine === 'mysql'
              ? 'root'
              : null,
        status: 'running',
        pid: proc.pid,
        logs: '',
        passwordSet: false,
      }

      this.runningProcesses[id] = proc
      instances.push(instance)
      this.saveInstances(instances)

      console.log(`[DBEngine] Instance created successfully: ${id}`)
      return instance
    } catch (err) {
      console.error(`[DBEngine] Error creating instance:`, err)
      dialog.showErrorBox('Database Setup Error', err.message)
      return null
    }
  }

  startInstance(id) {
    const instances = this.loadInstances()
    const instance = instances.find((i) => i.id === id)

    if (!instance) {
      throw new Error('Instance not found')
    }

    if (instance.status === 'running') {
      console.log(`[DBEngine] Instance ${id} already running`)
      return instance
    }

    const binaryPath = this.binaries[instance.engine]?.path
    if (!binaryPath || !fs.existsSync(binaryPath)) {
      throw new Error(
        `Binary for ${instance.engine} not found at ${binaryPath}`
      )
    }

    this.fixDataDirPermissions(instance.dataPath)

    const args = []
    if (instance.engine === 'mongo') {
      args.push(
        '--dbpath',
        instance.dataPath,
        '--port',
        instance.port.toString(),
        '--logpath',
        path.join(instance.dataPath, 'mongod.log'),
        '--bind_ip',
        '127.0.0.1'
      )
    }
    if (instance.engine === 'postgres') {
      const socketDir = instance.socketDir || '/tmp'
      args.push(
        '-D',
        instance.dataPath,
        '-p',
        instance.port.toString(),
        '-h',
        '127.0.0.1',
        '-k',
        socketDir
      )
    }
    if (instance.engine === 'mysql') {
      const socketPath = `/tmp/mysql_${instance.port}.sock`
      const mysqlxSocketPath = `/tmp/mysqlx_${instance.port}.sock`
      const pidFile = path.join(
        instance.dataPath,
        `mysqld_${instance.port}.pid`
      )

      ;[socketPath, mysqlxSocketPath, pidFile].forEach((file) => {
        if (fs.existsSync(file)) {
          try {
            fs.unlinkSync(file)
            console.log(`[DBEngine] Removed stale file: ${file}`)
          } catch (e) {
            console.warn(`[DBEngine] Could not remove ${file}: ${e.message}`)
          }
        }
      })

      args.push(
        `--datadir=${instance.dataPath}`,
        `--port=${instance.port}`,
        `--socket=${socketPath}`,
        `--pid-file=${pidFile}`,
        `--mysqlx-socket=${mysqlxSocketPath}`,
        `--bind-address=127.0.0.1`
      )
    }
    if (instance.engine === 'redis') {
      const redisConfPath = path.join(instance.dataPath, 'redis.conf')
      args.push(redisConfPath)
    }

    console.log(`[DBEngine] Starting instance ${id} as user ${this.dbUser}`)
    const proc = this.spawnAsUser(binaryPath, args, { shell: false })

    proc.stdout.on('data', (data) => {
      const log = data.toString()
      console.log(`[${id}]`, log)
      instance.logs += log
    })

    proc.stderr.on('data', (data) => {
      const log = data.toString()
      console.error(`[${id}]`, log)
      instance.logs += log
    })

    proc.on('exit', (code) => {
      console.log(`[${id}] exited with code ${code}`)
      instance.status = 'stopped'
      instance.pid = null
      delete this.runningProcesses[id]
      this.saveInstances(instances)
    })

    instance.status = 'running'
    instance.pid = proc.pid
    this.runningProcesses[id] = proc
    this.saveInstances(instances)

    return instance
  }

  stopInstance(id) {
    const instances = this.loadInstances()
    const instance = instances.find((i) => i.id === id)

    if (!instance) {
      throw new Error('Instance not found')
    }

    if (instance.status !== 'running') {
      console.log(`[DBEngine] Instance ${id} not running`)
      return instance
    }

    const proc = this.runningProcesses[id]
    if (proc) {
      console.log(`[DBEngine] Stopping instance ${id} (PID: ${proc.pid})`)

      proc.kill('SIGTERM')

      setTimeout(() => {
        if (!proc.killed) {
          console.log(`[DBEngine] Force killing ${id}`)
          proc.kill('SIGKILL')
        }
      }, 5000)
    }

    instance.status = 'stopped'
    instance.pid = null
    instance.logs += '\n[Stopped by user]'
    delete this.runningProcesses[id]

    this.saveInstances(instances)
    return instance
  }

  deleteInstance(id) {
    const instances = this.loadInstances()
    const instance = instances.find((i) => i.id === id)

    if (!instance) {
      throw new Error('Instance not found')
    }

    if (instance.status === 'running') {
      this.stopInstance(id)
    }

    const instanceDir = path.dirname(instance.dataPath)
    if (fs.existsSync(instanceDir)) {
      console.log(`[DBEngine] Deleting instance data at ${instanceDir}`)
      fs.rmSync(instanceDir, { recursive: true, force: true })
    }

    const updatedInstances = instances.filter((i) => i.id !== id)
    this.saveInstances(updatedInstances)

    console.log(`[DBEngine] Instance ${id} deleted`)
    return { success: true, message: 'Instance deleted' }
  }

  getInstanceLogs(id) {
    const instances = this.loadInstances()
    const instance = instances.find((i) => i.id === id)
    return instance ? instance.logs : ''
  }

  getConnectionInfo(id) {
    const instances = this.loadInstances()
    const instance = instances.find((i) => i.id === id)

    if (!instance) {
      throw new Error('Instance not found')
    }

    const info = {
      engine: instance.engine,
      host: '127.0.0.1',
      port: instance.port,
      status: instance.status,
    }

    if (instance.engine === 'mongo') {
      info.connectionString = `mongodb://127.0.0.1:${instance.port}`
      info.username = null
      info.password = null
      info.database = 'admin'
    } else if (instance.engine === 'postgres') {
      const pgUser = 'postgres'
      info.connectionString = `postgresql://${pgUser}@127.0.0.1:${instance.port}/postgres`
      info.username = pgUser
      info.password = instance.passwordSet ? '(password required)' : null
      info.database = 'postgres'
      info.note = instance.passwordSet
        ? 'Password authentication is enabled. Connect with: psql "postgresql://postgres:yourpassword@127.0.0.1:' +
          instance.port +
          '/postgres"'
        : 'No password required initially. Connect with: psql "postgresql://postgres@127.0.0.1:' +
          instance.port +
          "/postgres\" then set password with: ALTER ROLE postgres WITH PASSWORD 'yourpassword';"
    } else if (instance.engine === 'mysql') {
      const mySqlUser = 'root'
      info.connectionString = `mysql://root@127.0.0.1:${instance.port}`
      info.username = mySqlUser
      info.password = instance.passwordSet ? '(password required)' : null
      info.database = 'mysql'
      info.note = instance.passwordSet
        ? 'Password authentication is enabled. Connect with: mysql -u root -p -h 127.0.0.1 -P ' +
          instance.port
        : 'No password required initially. Connect with: mysql -u root -h 127.0.0.1 -P ' +
          instance.port +
          " then set password with: ALTER USER 'root'@'localhost' IDENTIFIED BY 'yourpassword'; FLUSH PRIVILEGES;"
    } else if (instance.engine === 'redis') {
      info.connectionString = `redis://127.0.0.1:${instance.port}`
      info.username = null
      info.password = null
      info.database = '0'
      info.note = 'Connect with: redis-cli -h 127.0.0.1 -p ' + instance.port
    }

    return info
  }

  setPasswordEnabled(id) {
    const instances = this.loadInstances()
    const instance = instances.find((i) => i.id === id)

    if (instance) {
      instance.passwordSet = true
      this.saveInstances(instances)

      if (instance.engine === 'postgres') {
        const pgHbaPath = path.join(instance.dataPath, 'pg_hba.conf')
        const pgHbaContent = `# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
`
        fs.writeFileSync(pgHbaPath, pgHbaContent)
        console.log(
          `[DBEngine] Updated pg_hba.conf to require password authentication for ${id}`
        )
        console.log(
          `[DBEngine] Please restart the PostgreSQL instance for changes to take effect`
        )
      }

      console.log(`[DBEngine] Password authentication enabled for ${id}`)
      return instance
    }

    throw new Error('Instance not found')
  }

  async cleanup() {
    console.log('[DBEngine] Cleaning up all running instances...')
    const instances = this.loadInstances()

    for (const instance of instances) {
      if (instance.status === 'running') {
        try {
          this.stopInstance(instance.id)
        } catch (err) {
          console.error(`[DBEngine] Error stopping ${instance.id}:`, err)
        }
      }
    }
  }
}

export const DbEngine = new DBEngine()
