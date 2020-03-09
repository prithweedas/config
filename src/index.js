const inquirer = require('inquirer')
const Listr = require('listr')
const fs = require('fs')
const execa = require('execa')
const path = require('path')

const CWD = process.cwd()

const copyFile = (source, destination) => {
  return new Promise((resolve, reject) => {
    const sourceStream = fs.createReadStream(source)
    const destinationStream = fs.createWriteStream(destination)
    sourceStream.pipe(destinationStream)
    destinationStream.on('close', resolve)
  })
}

const templates = {
  vscode: 'vscode-settings.json',
  'rn-tsconfig': 'react-native-tsconfig.json',
  'r-tsconfig': 'react-tsconfig.json',
  'n-tsconfig': 'node-tsconfig.json'
}

const getTemplatePath = name => {
  return path.join(__dirname, '..', 'templates', templates[name])
}

const getTsConfig = platform => {
  if (platform === 'react-native') return 'rn-tsconfig'
  if (platform === 'react') return 'r-tsconfig'
  return 'n-tsconfig'
}

const questions = [
  {
    name: 'platform',
    type: 'list',
    choices: ['react', 'react-native', 'node']
  },

  {
    name: 'typescript',
    type: 'confirm',
    message: 'Are you using typescript for this project?'
  },
  {
    name: 'babel',
    type: 'confirm',
    message: 'Are you using babel for this project?',
    when: answers => {
      return answers.platform === 'node' && !answers.typescript
    }
  }
]

inquirer.prompt(questions).then(answers => {
  const tasks = new Listr([
    {
      title: 'Copying vscode settings',
      task: () => {
        const vscodeSettingsPath = getTemplatePath('vscode')
        const destinationPath = path.join(CWD, '.vscode', 'settings.json')
        if (!fs.existsSync(path.join(CWD, '.vscode')))
          fs.mkdirSync(path.join(CWD, '.vscode'))
        return copyFile(vscodeSettingsPath, destinationPath)
      }
    },
    {
      title: 'Configuring typescript',
      task: () => {
        return new Listr([
          {
            title: 'Creating tsconfig.json',
            task: () => {
              const tsconfig = getTsConfig(answers.platform)
              const configPath = getTemplatePath(tsconfig)
              const destinationPath = path.join(CWD, 'tsconfig.json')
              return copyFile(configPath, destinationPath)
            }
          },
          {
            title: 'Installing typescript',
            task: () => {
              return execa('npm', ['install', '-D', 'typescript'])
            }
          }
        ])
      },
      enabled: () => answers.typescript === true
    },
    {
      title: 'Configuring ESlint',
      task: () => {
        const packageJson = path.join(CWD, 'package.json')
        const contents = fs.readFileSync(packageJson, {
          encoding: 'utf8'
        })
        const json = JSON.parse(contents)
        if (json.eslintConfig) delete json.eslintConfig
        fs.writeFileSync(packageJson, JSON.stringify(json, null, 2), {
          encoding: 'utf8'
        })
      }
    }
  ])

  tasks.run().catch(console.error)
})
