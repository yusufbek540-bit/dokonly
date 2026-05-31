import fs from 'node:fs'
import path from 'node:path'

const appDir = path.resolve('src/app')

const expectedFiles = [
  ['(ru)/layout.tsx', 'lang="ru"'],
  ['(store)/layout.tsx', 'lang="ru"'],
  ['(uz)/layout.tsx', 'lang="uz"'],
  ['(ru)/page.tsx'],
  ['(ru)/blog/page.tsx'],
  ['(ru)/nishi/page.tsx'],
  ['(uz)/uz/page.tsx'],
  ['(uz)/uz/blog/page.tsx'],
  ['(uz)/uz/sohalar/page.tsx'],
  ['(store)/[slug]/page.tsx'],
  ['(ru)/not-found.tsx'],
  ['(store)/not-found.tsx'],
  ['(uz)/not-found.tsx'],
]

const unexpectedFiles = [
  'layout.tsx',
  'page.tsx',
  'blog/page.tsx',
  'nishi/page.tsx',
  'uz/page.tsx',
  '[slug]/page.tsx',
  'not-found.tsx',
]

const failures = []

for (const [relativePath, requiredText] of expectedFiles) {
  const fullPath = path.join(appDir, relativePath)
  if (!fs.existsSync(fullPath)) {
    failures.push(`Expected ${relativePath} to exist`)
    continue
  }

  if (requiredText) {
    const contents = fs.readFileSync(fullPath, 'utf8')
    if (!contents.includes(requiredText)) {
      failures.push(`Expected ${relativePath} to include ${requiredText}`)
    }
    if (!contents.includes("import '../globals.css'")) {
      failures.push(`Expected ${relativePath} to import ../globals.css`)
    }
  }
}

for (const relativePath of unexpectedFiles) {
  const fullPath = path.join(appDir, relativePath)
  if (fs.existsSync(fullPath)) {
    failures.push(`Expected ${relativePath} to be moved into a route group`)
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}
