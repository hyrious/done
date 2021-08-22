"use strict"

const { join } = require("path")
const { existsSync } = require("fs")
const { inspect } = require("util")
const { spawnSync } = require("child_process")
const readline = require('readline')
const { inc } = require("semver")

const preid = 'beta'

module.exports = async () => {
  let info = prepare()

  // ask for new version
  let [action] = await ask(info)

  // run `npm version <action> --preid <preid>`
  release(action, info)

  // run `git commit && git push && git push --tags`
  await commit(action, info)

  // run `git push && npm publish --access public`
  push_publish(action, info)
}

const log = console.log.bind(console)
const error = console.error.bind(console)
const exit = process.exit.bind(process)

const types = ['major', 'minor', 'patch',
               'premajor', 'preminor', 'prepatch', 'prerelease']

function prepare() {
  let cwd = process.cwd()
  let pkgPath = join(cwd, "package.json")
  if (!existsSync(pkgPath)) error("not found package.json."), exit(1);

  let { name, version } = require(pkgPath)
  if (!name) error("not found 'name' field in package.json."), exit(1);
  if (!version) error("not found 'version' field in package.json."), exit(1);
  let nextVersions = types.map(t => [t, inc(version, t, preid)])

  if (!existsSync(join(cwd, '.git'))) error("not found .git/."), exit(1);

  let npm
  if (existsSync(join(cwd, 'package-lock.json'))) {
    npm = 'npm'
  } else if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
    npm = 'pnpm'
  } else if (existsSync(join(cwd, 'yarn.lock'))) {
    npm = 'yarn'
  } else {
    npm = 'npm'
  }

  let hook
  for (let file of ['release.js', 'scripts/release.js']) {
    let path = join(cwd, file)
    if (existsSync(path)) hook = path;
  }

  let publish = true
  for (let file of ['.github/workflows/npm-publish.yml']) {
    let path = join(cwd, file)
    if (existsSync(path)) publish = false;
  }

  return { name, version, nextVersions, npm, hook, publish }
}

function ask(info) {
  let { name, version, nextVersions } = info
  let prefix = `Releasing ${name} ${version} → `
  log(`${prefix}? (J/K to move, Return to submit)`)
  let index = 0, N = nextVersions.length

  let input = process.stdin, output = process.stdout
  let rl = readline.createInterface({ input, output })
  let resolve, p = new Promise(r => { resolve = r })

  const refresh = () => {
    nextVersions.forEach(([action, preview], i) => {
      if (index === i) {
        log(`> ${action.padEnd(10)} (${preview})`)
      } else {
        log(`  ${action.padEnd(10)} (${preview})`)
      }
    })
  }

  const clearLines = (n = N) => {
    output.clearLine()
    while (n--) {
      output.moveCursor(0, -1)
      output.clearLine()
      output.cursorTo(0)
    }
  }

  const cursor = {
    hide() { output.isTTY && output.write('\u001B[?25l') },
    show() { output.isTTY && output.write('\u001B[?25h') },
  }

  const onkeypress = (key, { name, ctrl }) => {
    if (ctrl && name === 'c') {
      cursor.show(), rl.pause()
      return
    }

    if (name === 'return') {
      clearLines(N + 1)

      // change ? to selected version
      output.moveCursor(0, -1)
      output.cursorTo(prefix.length)
      output.clearLine(1)
      log(nextVersions[index][1])

      cursor.show()
      rl.pause()
      input.setRawMode(false)
      input.removeListener('keypress', onkeypress);

      info.nextVersion = nextVersions[index][1]
      resolve(nextVersions[index])
    } else if (name === 'down' || key === 'j') {
      index = Math.min(index + 1, N - 1)
      clearLines(N), refresh()
    } else if (name === 'up' || key === 'k') {
      index = Math.max(index - 1, 0)
      clearLines(N), refresh()
    }
  }

  cursor.hide()
  refresh()
  input.setRawMode(true)
  input.on('keypress', onkeypress)

  return p
}

function exec(command, args) {
  let result = spawnSync(command, args)
  if (result.error) throw result.error;
  if (result.status !== 0) {
    error(result.stderr.toString()), exit(result.status || 1)
  }
}

function release(action, { npm }) {
  let args = ['version', action, '--no-git-tag-version']
  if (action.startsWith('pre')) args.push('--preid', preid);
  if (npm === 'yarn') args[1] = '--' + args[1];

  log(`Running "${npm} ${args.join(' ')}"`)
  if (process.platform === 'win32') npm += '.cmd';
  exec(npm, args)
}

async function commit(action, { nextVersion, hook }) {
  let message, tag = `v${nextVersion}`
  if (hook) {
    message = await require(hook)({
      type: action,
      version: nextVersion
    })
  }
  message || (message = `release ${nextVersion}`)

  log(`Running "git add -A && git commit -m ${inspect(message)} && git tag ${tag}`)
  exec('git', ['add', '-A'])
  exec('git', ['commit', '-m', message])
  exec('git', ['tag', tag])
}

function push_publish(action, { npm, publish }) {
  log(`Running "git push && git push --tags"`)
  exec('git', ['push'])
  exec('git', ['push', '--tags'])

  if (publish) {
    log(`Running "${npm} publish --access public"`)
    if (process.platform === 'win32') npm += '.cmd';
    let args = ['publish', '--access', 'public']
    if (action.startsWith('pre')) args.push('--tag', preid);
    exec(npm, args)
  }
}
