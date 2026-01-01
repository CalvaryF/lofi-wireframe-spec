import { Router, Request, Response } from 'express'
import * as fs from 'fs'
import * as path from 'path'

const router = Router()
const TEMP_DIR = path.join(process.cwd(), '.tmp-specs')

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

export default router
