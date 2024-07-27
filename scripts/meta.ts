import { authors } from '../src/consts'
import { exec } from 'child_process'
import { program } from 'commander'
import { promises as fs } from 'fs'
import inquirer from 'inquirer'
import { promisify } from 'util'

type DeviceType = 'all' | 'pc' | 'sp'

type AnswersBase = {
  title: string
  author: (typeof authors)[number]
  tags: string[]
  addNewTag: boolean
  newTags?: string[]
  device: DeviceType
}

type UpdateAnswers = {
  categories: ('title' | 'author' | 'tags' | 'device')[]
} & Partial<AnswersBase>

// コマンドライン引数を解析
program.parse(process.argv)
const [type] = program.args
if (!type) throw new Error('The type (new or update) is needed as an argument')

// リポジトリ名の取得
async function getRepositoryName(): Promise<string | undefined> {
  const execPromise = promisify(exec)
  try {
    // 'git remote get-url origin' を実行してoriginのURLを取得
    const { stdout: url } = await execPromise(`git remote get-url origin`)
    // URLから '.git' を取り除いてリポジトリ名を抽出
    return url.trim().split('/').pop()?.replace('.git', '')
  } catch (error) {
    throw new Error(`Error fetching repository name: ${error}`)
  }
}

// astro.config.tsのbaseを書き換える
async function changeBaseUrl(repoName: string) {
  try {
    const data = await fs.readFile('astro.config.ts', 'utf8')
    const newData = data
      .replace(/base: '\/post\/[^']+'/, `base: '/post/${repoName}'`)
      .replace(/server: { open: '\/post\/[^']+' }/, `server: { open: '/post/${repoName}' }`)

    await fs.writeFile('astro.config.ts', newData, 'utf8')
  } catch (error) {
    throw new Error(`Error reading src/meta.json: ${error}`)
  }
}

// tagの情報を取得
async function fetchTags() {
  try {
    const response = await fetch('https://playground.shiftbrain.com/tags.json')
    const tags: {
      name: string
      total: number
    }[] = await response.json()
    // タグ名だけを抽出した配列を作成
    return tags.map((tag) => tag.name)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return []
  }
}

// meta.jsonの取得
async function readMetaJson() {
  try {
    const data = await fs.readFile('src/meta.json', 'utf8')
    return JSON.parse(data)
  } catch (error) {
    throw new Error(`Error reading src/meta.json: ${error}`)
  }
}

// 全角文字チェック
function isZenkaku(str: string) {
  return /^[^\x01-\x7E\uFF61-\uFF9F]+$/.test(str)
}

// 文字数カウント
function wordCount(str: string) {
  const totalCount = [...str.trim()].reduce((counter, char) => {
    // 全角文字の場合は2文字としてカウント
    return counter + (isZenkaku(char) ? 2 : 1)
  }, 0)

  return totalCount
}

const questionsBase = {
  title: {
    type: 'input',
    name: 'title',
    message: 'プロジェクトのタイトルを入力してください:',
    validate: async (value: string) => {
      // 文字数をカウント
      const characterCount = wordCount(value)
      // 80文字を超えないようにする
      if (characterCount > 80) {
        return `80文字以内で入力してください。現在の入力文字数：${characterCount} ※日本語などの全角文字は2文字カウントです。`
      }
      return true
    },
    filter: (value: string) => {
      return value.trim()
    },
  },
  author: {
    type: 'list',
    name: 'author',
    message: 'authorを次から選択してください:',
    choices: authors,
  },
  tags: {
    type: 'checkbox',
    name: 'tags',
    message:
      '既存のTagから追加したいものがあれば選択してください:\n※何も選択したくない場合はそのままEnterを押してください',
  },
  addNewTag: {
    type: 'confirm',
    name: 'addNewTag',
  },
  newTags: {
    type: 'input',
    name: 'newTags',
    message:
      '追加したい新規のTagを英語の小文字で入力してください:\n※複数追加の場合カンマ区切り (ex) hoge,fuga',
    validate: async (value: string) => {
      const reg = new RegExp(
        /^[a-zA-Z0-9\_\-\.\$\%\^\&\*\(\)\+\=\[\]\\\{\}\|\;\'\:\"\,\<\>\?\/\`\~]+$/,
      )
      if (reg.test(value)) return true
      return 'Tagは英数字と記号のみで入力してください'
    },
    // この質問は `addNewTag` が true の場合のみ表示されます
    // @ts-ignore
    when: ({ addNewTag }) => addNewTag,
    filter: (value: string) => {
      return value
        .toLowerCase() // 小文字に変換
        .split(',') // カンマを区切り文字として文字列を配列に分割
        .filter((item) => {
          // 空文字列でない要素のみを残す
          return item.trim() !== ''
        })
    },
  },
  device: {
    type: 'list',
    name: 'device',
    message: 'デバイスタイプを選択してください。(ex) PCのみに対応している場合→PC only :',
    choices: [
      {
        name: 'All',
        value: 'all',
      },
      {
        name: 'PC only',
        value: 'pc',
      },
      {
        name: 'SP only',
        value: 'sp',
      },
    ],
  },
}

// meta.jsonを新規作成時の質問項目
const newQuestions = async (tags: string[]) => {
  // タグが存在するか
  const hasTag = tags.length > 0
  const addNewTagMessage = hasTag
    ? '新規のTagを追加しますか？'
    : 'まだ登録されているTagがありません。新規Tagを追加しますか？'

  const questions = [
    { ...questionsBase.title },
    { ...questionsBase.author },
    {
      ...questionsBase.tags,
      choices: tags,
      when: () => hasTag,
    },
    {
      ...questionsBase.addNewTag,
      message: addNewTagMessage,
    },
    { ...questionsBase.newTags },
    {
      ...questionsBase.device,
    },
  ]

  return await inquirer.prompt(questions)
}

// meta.jsonをupdate時の質問項目
const updateQuestions = async (tags: string[]) => {
  // タグが存在するか
  const hasTag = tags.length > 0
  const addNewTagMessage = hasTag
    ? '新規のTagを追加しますか？'
    : 'まだ登録されているTagがありません。新規Tagを追加しますか？'

  const questions = [
    {
      type: 'checkbox',
      name: 'categories',
      message: '変更したい項目を選択してください（複数選択可能）:',
      choices: [
        { name: 'title', value: 'title' },
        { name: 'author', value: 'author' },
        { name: 'tag', value: 'tags' },
        { name: 'device type', value: 'device' },
      ],
    },
    {
      ...questionsBase.title,
      when: (answers: { categories: string[] }) => answers.categories.includes('title'),
    },
    {
      ...questionsBase.author,
      when: (answers: { categories: string[] }) => answers.categories.includes('author'),
    },
    {
      ...questionsBase.tags,
      choices: tags,
      when: (answers: { categories: string[] }) => hasTag && answers.categories.includes('tags'),
    },
    {
      ...questionsBase.addNewTag,
      message: addNewTagMessage,
      when: (answers: { categories: string[] }) => answers.categories.includes('tags'),
    },
    {
      ...questionsBase.newTags,
    },
    {
      ...questionsBase.device,
      when: (answers: { categories: string[] }) => answers.categories.includes('device'),
    },
  ]

  return await inquirer.prompt(questions)
}

async function saveToFile(data: Object) {
  try {
    const jsonString = JSON.stringify(data, null, 2)
    await fs.writeFile('src/meta.json', jsonString, 'utf8')
  } catch (error) {
    console.error('Error saving to file:', error)
  }
}

async function createMeta() {
  const tags = await fetchTags()
  const answers = (await newQuestions(tags)) as AnswersBase
  const repoName = await getRepositoryName()
  if (!repoName) return
  const slug = repoName.replace('playground-', '')

  const mergedTags = [...answers.tags, ...(answers.newTags || [])]
  const metaData = {
    slug,
    title: answers.title,
    author: answers.author,
    tags: mergedTags,
    device: answers.device,
  }

  await saveToFile(metaData)
  console.log('✅meta.jsonが作成されました。', metaData)
  await changeBaseUrl(slug)
  console.log('✅astro.config.tsのbaseがupdateされました')
}

async function updateMeta() {
  const tags = await fetchTags()
  const meta = await readMetaJson()
  const answers = (await updateQuestions(tags)) as UpdateAnswers
  const mergedTags = answers.categories.includes('tags')
    ? // @ts-ignore
      [...answers.tags, ...(answers.newTags || [])]
    : []

  const metaData = {
    slug: meta.slug,
    title: answers.title ?? meta.title,
    author: answers.author ?? meta.author,
    tags: answers.categories.includes('tags') ? mergedTags : meta.tags,
    device: answers.device ?? meta.device,
  }

  await saveToFile(metaData)
  console.log('✅meta.jsonが更新されました。', metaData)
}

switch (type) {
  case 'new':
    createMeta()
    break
  case 'update':
    updateMeta()
    break
}
