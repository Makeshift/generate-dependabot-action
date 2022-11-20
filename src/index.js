const core = require('@actions/core');
const yaml = require('js-yaml');
const fs = require('fs').promises;
const util = require('util');
const glob = util.promisify(require('glob'))
const path = require('path')
const github = require('@actions/github')

const globOpts = {
  root: process.cwd(),
  mark: true,
  matchBase: true,
  nomount: true,
  follow: core.getInput('follow-symbolic-links') === 'true' || true
}

const clone = obj => JSON.parse(JSON.stringify(obj))

async function run() {
  const templateFile = core.getInput('template-file') || '.github/dependabot.template.yml';
  const template = yaml.load(await fs.readFile(templateFile, 'utf8'));

  const newUpdates = []

  for (let entry of template.updates) {
    core.info(`Processing entry ${entry.directory} for ecosystem ${entry["package-ecosystem"]}`)
    const baseUpdate = clone(entry)
    const matchingFiles = await glob(entry.directory, globOpts)
    core.info(`Found ${matchingFiles.length} files matching ${entry.directory}`)
    const matchingDirs = new Set(matchingFiles.map(file => path.dirname(file)))
    core.info(`Found ${matchingDirs.length} directories matching ${entry.directory}`)

    for (let dir of matchingDirs) {
      core.info(`Creating entry for ${dir} with ecosystem ${entry["package-ecosystem"]}`)
      const newUpdate = clone(baseUpdate)
      newUpdate.directory = dir
      newUpdates.push(newUpdate)
    }
  }

  core.info(`Here's the final config: ${JSON.stringify(newUpdates)}`)
  template.updates = newUpdates
  core.info("Writing config to .github/dependabot.yml")
  await fs.writeFile('.github/dependabot.yml', yaml.dump(template))
}

run().catch(error => {
  console.log(error)
  core.setFailed(error.message)
});
