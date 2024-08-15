import fs from 'fs'
import path from 'path'
import { parse } from './src'

const code1 = fs.readFileSync(path.resolve(__dirname, './demo/1.ts'), 'utf-8')
const code = parse(code1)
fs.writeFileSync(path.resolve(__dirname, './demo/_1.ts'), code)
