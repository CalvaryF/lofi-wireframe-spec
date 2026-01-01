import { Router, Request, Response } from 'express'
import * as fs from 'fs'
import * as path from 'path'

const router = Router()
const TEMP_DIR = path.join(process.cwd(), '.tmp-specs')
const SPECS_DIR = path.join(process.cwd(), 'specs')

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const type = req.query.type as string || 'wireframe'

  const filename = `${id}-${type}.yaml`
  const filepath = path.join(TEMP_DIR, filename)

  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: 'Spec not found' })
    return
  }

  const content = fs.readFileSync(filepath, 'utf-8')
  res.setHeader('Content-Type', 'text/yaml')
  res.send(content)
})

// Save YAML content to a spec file
router.post('/save', (req: Request, res: Response) => {
  const { filename, content } = req.body

  if (!filename || typeof filename !== 'string') {
    res.status(400).json({ error: 'Missing or invalid filename' })
    return
  }

  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'Missing or invalid content' })
    return
  }

  // Security: only allow .yaml files in specs directory
  if (!filename.endsWith('.yaml') || filename.includes('..') || filename.includes('/')) {
    res.status(400).json({ error: 'Invalid filename' })
    return
  }

  const filepath = path.join(SPECS_DIR, filename)

  try {
    fs.writeFileSync(filepath, content, 'utf-8')
    res.json({ success: true })
  } catch (err) {
    console.error('Failed to save spec:', err)
    res.status(500).json({ error: 'Failed to save spec' })
  }
})

export default router
