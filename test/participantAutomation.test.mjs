import assert from 'node:assert/strict'

// 1. Delete confirmation rule test
function isDeleteConfirmed(input) {
  return typeof input === 'string' && input.trim() === 'DELETE'
}

console.log('Delete confirmation validation:')
assert.equal(isDeleteConfirmed('DELETE'), true, 'exact DELETE passes')
assert.equal(isDeleteConfirmed('  DELETE  '), true, 'DELETE with surrounding space passes trim')
assert.equal(isDeleteConfirmed('delete'), false, 'lowercase delete fails')
assert.equal(isDeleteConfirmed('Delete'), false, 'capitalized Delete fails')
assert.equal(isDeleteConfirmed(''), false, 'empty fails')
assert.equal(isDeleteConfirmed(null), false, 'null fails')
console.log('  ok - DELETE validation rules strictly enforced')

// 2. CSV parsing and validation test
function parseParticipantCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) throw new Error('Input CSV has a header row but no data rows')

  const parseLine = (line) => {
    const res = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (c === ',' && !inQuotes) {
        res.push(cur.trim())
        cur = ''
      } else {
        cur += c
      }
    }
    res.push(cur.trim())
    return res
  }

  const headers = parseLine(lines[0])
  const missing = ['name', 'reg_no'].filter((req) => !headers.includes(req))
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`)
  }

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i])
    if (vals.length === 0 || (vals.length === 1 && !vals[0])) continue
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] ?? ''
    })
    rows.push(obj)
  }
  return rows
}

console.log('CSV parser validation:')
const sampleCsv = `name,reg_no,email
Vedant Vaibhav,23BMH1026,vedant@example.com
"Berlia, Keshav",25BRS1092,keshav@example.com
`
const parsed = parseParticipantCsv(sampleCsv)
assert.equal(parsed.length, 2, 'parses 2 participants')
assert.equal(parsed[0].name, 'Vedant Vaibhav', 'first row name')
assert.equal(parsed[0].reg_no, '23BMH1026', 'first row reg_no')
assert.equal(parsed[1].name, 'Berlia, Keshav', 'handles quoted commas in name')
console.log('  ok - CSV parsing correctly handles commas, quotes, and whitespace')

assert.throws(
  () => parseParticipantCsv('email,phone\nfoo@bar.com,12345'),
  /Missing required columns: name, reg_no/,
  'throws on missing required columns'
)
console.log('  ok - missing required columns throws error')

// 3. Email template replacement validation
function formatEmailTemplate(template, row) {
  const replacements = {
    name: row.name || '',
    reg_no: row.reg_no || '',
    token: row.token || '',
    setup_link: row.setup_link || '',
  }
  let body = template
  for (const [k, v] of Object.entries(replacements)) {
    body = body.replaceAll(`{${k}}`, v)
  }
  return body
}

console.log('Email template placeholder formatting:')
const template = 'Namaskar {name}! Your pass code is {token} for reg {reg_no}.'
const formatted = formatEmailTemplate(template, {
  name: 'VEDANT',
  token: 'Y8PKPVWC',
  reg_no: '23BMH1026',
})
assert.equal(formatted, 'Namaskar VEDANT! Your pass code is Y8PKPVWC for reg 23BMH1026.')
console.log('  ok - formats template with placeholders without errors')

// 4. Token verification and sync checking logic
function verifyTokens(emailRows, dbParticipants) {
  const tokenByRegNo = new Map()
  for (const p of dbParticipants) {
    if (p.reg_no && p.token) {
      tokenByRegNo.set(p.reg_no.trim(), p.token.trim())
    }
  }

  const mismatches = []
  for (const r of emailRows) {
    const dbToken = tokenByRegNo.get(r.reg_no)
    if (!dbToken) {
      mismatches.push({ reg_no: r.reg_no, reason: 'not_in_db', emailToken: r.token })
    } else if (dbToken !== r.token) {
      mismatches.push({ reg_no: r.reg_no, reason: 'token_mismatch', emailToken: r.token, dbToken })
    }
  }

  return {
    inSync: mismatches.length === 0,
    mismatches,
    totalEmails: emailRows.length,
  }
}

console.log('Token verification and sync logic:')
const mockDb = [
  { reg_no: '24BCE5001', token: 'R4V3ZTW3', name: 'Demo 1' },
  { reg_no: '24BCE5002', token: 'G9YESHX5', name: 'Demo 2' },
]

const inSyncRows = [
  { reg_no: '24BCE5001', token: 'R4V3ZTW3' },
  { reg_no: '24BCE5002', token: 'G9YESHX5' },
]
const inSyncResult = verifyTokens(inSyncRows, mockDb)
assert.equal(inSyncResult.inSync, true, 'matching tokens report inSync true')
assert.equal(inSyncResult.mismatches.length, 0, 'no mismatches for identical tokens')

const outOfSyncRows = [
  { reg_no: '24BCE5001', token: 'NEWTOKEN1' },
  { reg_no: '24BCE5003', token: 'NEWTOKEN3' },
]
const outOfSyncResult = verifyTokens(outOfSyncRows, mockDb)
assert.equal(outOfSyncResult.inSync, false, 'different tokens report inSync false')
assert.equal(outOfSyncResult.mismatches.length, 2, 'detects both mismatched and missing tokens')
assert.equal(outOfSyncResult.mismatches[0].reason, 'token_mismatch')
assert.equal(outOfSyncResult.mismatches[1].reason, 'not_in_db')
console.log('  ok - token sync verification correctly identifies mismatches and missing records')

// 5. Email Template & Inline Embedded Poster Tests
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

console.log('Email template and embedded poster checks:')
const templatePath = path.resolve('food event email automation', 'email_template.txt')
const posterPath = path.resolve('food event email automation', 'poster.png')

assert.equal(fs.existsSync(templatePath), true, 'email_template.txt exists')
const templateContent = fs.readFileSync(templatePath, 'utf-8')
assert.match(templateContent, /Counter Number:\s*12/, 'email template contains Counter Number: 12')
assert.doesNotMatch(templateContent, /Counter Number:\s*5\b/, 'email template no longer contains Counter Number: 5')
console.log('  ok - email_template.txt successfully updated with Counter Number: 12')

assert.equal(fs.existsSync(posterPath), true, 'poster.png exists')
const posterStats = fs.statSync(posterPath)
assert.ok(posterStats.size > 10000, 'poster.png is a valid non-empty image file')
console.log(`  ok - poster.png exists (${posterStats.size} bytes)`)

// Execute python dry-run to verify email builder with poster embedding
const dryRunOutput = execSync('python "food event email automation/send_setup_emails.py" --dry-run', {
  encoding: 'utf-8',
})
assert.match(dryRunOutput, /Counter Number: 12/, 'dry-run output includes Counter Number: 12')
assert.match(dryRunOutput, /POSTER: Found poster\.png/, 'dry-run output acknowledges found poster.png')
assert.match(dryRunOutput, /directly embedded into email body/i, 'dry-run output confirms poster is embedded inline, NOT attachment')
assert.match(dryRunOutput, /\[Directly Embedded Image: poster\.png/, 'dry-run preview includes directly embedded poster')
assert.match(dryRunOutput, /\[Attachment: .*_qr\.png\]/, 'dry-run preview preserves QR attachment')
console.log('  ok - send_setup_emails.py --dry-run embeds poster inline and sends Counter Number: 12')

console.log('All participantAutomation checks passed!')

