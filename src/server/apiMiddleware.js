import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

const SCRIPT_DIR = path.resolve('food event email automation')
const TEMPLATE_FILE = path.join(SCRIPT_DIR, 'email_template.txt')
const POSTER_FILE = path.join(SCRIPT_DIR, 'poster.png')
const PARTICIPANTS_CSV = path.join(SCRIPT_DIR, 'participants.csv')
const OUTPUT_DIR = path.join(SCRIPT_DIR, 'output')
const SUPABASE_CSV = path.join(OUTPUT_DIR, 'participants_for_supabase.csv')
const EMAILS_CSV = path.join(OUTPUT_DIR, 'participant_emails.csv')

function parseCsv(content) {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''))
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    // Basic CSV splitting handling simple quotes
    const values = []
    let cur = ''
    let inQuotes = false
    const line = lines[i]
    for (let j = 0; j < line.length; j++) {
      const char = line[charIndex => j](j)
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(cur.trim().replace(/^["']|["']$/g, ''))
        cur = ''
      } else {
        cur += char
      }
    }
    values.push(cur.trim().replace(/^["']|["']$/g, ''))

    const row = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] || ''
    })
    rows.push(row)
  }
  return rows
}

function parseCsvReliable(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

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
  const result = []
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i])
    if (vals.length === 0 || (vals.length === 1 && !vals[0])) continue
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] ?? ''
    })
    result.push(obj)
  }
  return result
}

function readTemplate() {
  if (!fs.existsSync(TEMPLATE_FILE)) {
    return { subject: 'Khau Galli Pass For Food Festival', body: '' }
  }
  const raw = fs.readFileSync(TEMPLATE_FILE, 'utf-8')
  if (raw.startsWith('Subject:')) {
    const parts = raw.split(/\r?\n\r?\n/)
    const subject = parts[0].replace('Subject:', '').trim()
    const body = parts.slice(1).join('\n\n')
    return { subject, body }
  }
  return { subject: 'Khau Galli Pass For Food Festival', body: raw }
}

export function apiMiddleware(req, res, next) {
  const url = new URL(req.url, 'http://localhost')

  if (url.pathname === '/api/status' && req.method === 'GET') {
    const template = readTemplate()
    const hasParticipants = fs.existsSync(PARTICIPANTS_CSV)
    const hasOutput = fs.existsSync(OUTPUT_DIR)
    const hasEmailsCsv = fs.existsSync(EMAILS_CSV)
    const hasPoster = fs.existsSync(POSTER_FILE)
    let emailCount = 0
    if (hasEmailsCsv) {
      try {
        const rows = parseCsvReliable(fs.readFileSync(EMAILS_CSV, 'utf-8'))
        emailCount = rows.length
      } catch {
        // ignore
      }
    }

    const logPath = path.join(OUTPUT_DIR, 'sent_log.txt')
    let sentLogCount = 0
    let sentLogEmails = []
    if (fs.existsSync(logPath)) {
      try {
        sentLogEmails = fs
          .readFileSync(logPath, 'utf-8')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
        sentLogCount = sentLogEmails.length
      } catch {
        // ignore
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        ready: true,
        template,
        hasParticipants,
        hasOutput,
        emailCount,
        sentLogCount,
        sentLogEmails,
        hasPoster,
        posterName: 'poster.png',
      })
    )
    return
  }

  if ((url.pathname === '/api/poster' || url.pathname === '/api/poster.png') && req.method === 'GET') {
    if (fs.existsSync(POSTER_FILE)) {
      res.writeHead(200, { 'Content-Type': 'image/png' })
      fs.createReadStream(POSTER_FILE).pipe(res)
      return
    }
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'poster.png not found' }))
    return
  }

  if (url.pathname === '/api/save-template' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const { subject, body: templateBody } = JSON.parse(body || '{}')
        if (typeof templateBody === 'string') {
          const content = subject ? `Subject: ${subject.trim()}\n\n${templateBody}` : templateBody
          fs.writeFileSync(TEMPLATE_FILE, content, 'utf-8')
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, template: readTemplate() }))
          return
        }
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid template body' }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  if (url.pathname === '/api/clear-sent-log' && req.method === 'POST') {
    const logPath = path.join(OUTPUT_DIR, 'sent_log.txt')
    if (fs.existsSync(logPath)) {
      try {
        fs.unlinkSync(logPath)
      } catch {
        // ignore
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', cleared: true }))
    return
  }

  if (url.pathname === '/api/generate-batch' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}')
        if (data.csvText) {
          if (!fs.existsSync(SCRIPT_DIR)) {
            fs.mkdirSync(SCRIPT_DIR, { recursive: true })
          }
          fs.writeFileSync(PARTICIPANTS_CSV, data.csvText, 'utf-8')
        }

        const genScript = path.join(SCRIPT_DIR, 'generate_batch.py')
        if (!fs.existsSync(genScript)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: `generate_batch.py not found at ${genScript}` }))
          return
        }

        const args = [genScript]
        let tokensFile = null
        if (data.tokensMapping && Object.keys(data.tokensMapping).length > 0) {
          if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true })
          }
          tokensFile = path.join(OUTPUT_DIR, 'tokens_mapping.json')
          fs.writeFileSync(tokensFile, JSON.stringify(data.tokensMapping), 'utf-8')
          args.push('--tokens-json', tokensFile)
        }

        const py = spawn('python', args, {
          cwd: SCRIPT_DIR,
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        })

        let stdout = ''
        let stderr = ''
        py.stdout.on('data', (d) => {
          stdout += d.toString('utf-8')
        })
        py.stderr.on('data', (d) => {
          stderr += d.toString('utf-8')
        })

        py.on('close', (code) => {
          if (code !== 0) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(
              JSON.stringify({
                error: `generate_batch.py failed (exit code ${code}): ${stderr || stdout}`,
              })
            )
            return
          }

          let participants = []
          let emails = []
          if (fs.existsSync(SUPABASE_CSV)) {
            participants = parseCsvReliable(fs.readFileSync(SUPABASE_CSV, 'utf-8'))
          }
          if (fs.existsSync(EMAILS_CSV)) {
            emails = parseCsvReliable(fs.readFileSync(EMAILS_CSV, 'utf-8'))
          }

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              success: true,
              participants,
              emails,
              total: participants.length,
              emailCount: emails.length,
              logs: stdout,
            })
          )
        })
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  if (url.pathname === '/api/verify-tokens' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const { dbParticipants = [] } = JSON.parse(body || '{}')
        if (!fs.existsSync(EMAILS_CSV)) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ inSync: true, message: 'No emails CSV yet', count: 0 }))
          return
        }

        const emails = parseCsvReliable(fs.readFileSync(EMAILS_CSV, 'utf-8'))
        const dbMap = new Map()
        dbParticipants.forEach((p) => {
          if (p.reg_no) dbMap.set(p.reg_no.trim(), p.token?.trim())
        })

        const mismatches = []
        emails.forEach((e) => {
          const regNo = e.reg_no?.trim()
          const emailToken = e.token?.trim()
          const dbToken = dbMap.get(regNo)
          if (dbToken && dbToken !== emailToken) {
            mismatches.push({
              reg_no: regNo,
              name: e.name,
              email: e.email,
              emailToken,
              dbToken,
            })
          }
        })

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            inSync: mismatches.length === 0,
            mismatches,
            emailCount: emails.length,
          })
        )
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  if (url.pathname === '/api/send-emails' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const { senderEmail, senderPassword, dryRun, forceResend } = JSON.parse(body || '{}')
        if (!dryRun && (!senderEmail || !senderPassword)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'senderEmail and senderPassword are required' }))
          return
        }

        const sendScript = path.join(SCRIPT_DIR, 'send_setup_emails.py')
        if (!fs.existsSync(sendScript)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: `send_setup_emails.py not found at ${sendScript}` }))
          return
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        })

        const sendEvent = (data) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`)
        }

        const args = [sendScript, '--yes']
        if (dryRun) args.push('--dry-run')
        if (forceResend) args.push('--force')
        if (senderEmail) args.push('--sender-email', senderEmail)
        if (senderPassword) args.push('--sender-password', senderPassword)
        if (fs.existsSync(TEMPLATE_FILE)) args.push('--template', TEMPLATE_FILE)
        if (fs.existsSync(POSTER_FILE)) args.push('--poster', POSTER_FILE)
        if (fs.existsSync(EMAILS_CSV)) args.push('--csv', EMAILS_CSV)

        const py = spawn('python', args, {
          cwd: SCRIPT_DIR,
          env: {
            ...process.env,
            PYTHONIOENCODING: 'utf-8',
            SENDER_EMAIL: senderEmail || '',
            SENDER_PASSWORD: senderPassword || '',
            AUTO_CONFIRM: '1',
          },
        })

        let buffer = ''
        py.stdout.on('data', (chunk) => {
          buffer += chunk.toString('utf-8')
          const lines = buffer.split(/\r?\n/)
          buffer = lines.pop() // keep remainder in buffer

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue

            if (trimmed.startsWith('PROGRESS:')) {
              // PROGRESS:idx/total:email:name
              const parts = trimmed.substring(9).split(':')
              const [idx, total] = (parts[0] || '').split('/')
              sendEvent({
                type: 'progress',
                current: parseInt(idx, 10),
                total: parseInt(total, 10),
                email: parts[1] || '',
                name: parts[2] || '',
              })
            } else if (trimmed.startsWith('SENT:')) {
              sendEvent({
                type: 'sent',
                message: trimmed.substring(5).trim(),
              })
            } else if (trimmed.startsWith('FAILED:')) {
              sendEvent({
                type: 'failed',
                message: trimmed.substring(7).trim(),
              })
            } else if (trimmed.startsWith('COMPLETED:')) {
              const parts = trimmed.substring(10).split(':')
              sendEvent({
                type: 'completed',
                sent: parseInt(parts[0], 10),
                failed: parseInt(parts[1], 10),
              })
            } else {
              sendEvent({
                type: 'log',
                message: trimmed,
              })
            }
          }
        })

        py.stderr.on('data', (chunk) => {
          sendEvent({
            type: 'error',
            message: chunk.toString('utf-8').trim(),
          })
        })

        py.on('close', (code) => {
          if (buffer.trim()) {
            sendEvent({ type: 'log', message: buffer.trim() })
          }
          sendEvent({ type: 'done', code })
          res.end()
        })
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  next()
}
