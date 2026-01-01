import { Router, Request, Response } from 'express'
import { render } from '../services/renderer'
import type { RenderRequest } from '../types'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  const body = req.body as RenderRequest

  // Validate request
  if (!body.spec || typeof body.spec !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Missing or invalid spec field',
    })
    return
  }

  if (body.mode && !['frame', 'annotated', 'selections'].includes(body.mode)) {
    res.status(400).json({
      success: false,
      error: 'Invalid mode. Must be one of: frame, annotated, selections',
    })
    return
  }

  try {
    console.log(`Rendering spec (mode: ${body.mode || 'annotated'})...`)
    const zipBuffer = await render(body)

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', 'attachment; filename="wireframes.zip"')
    res.send(zipBuffer)
    console.log('Render complete')

  } catch (err) {
    console.error('Render failed:', err)
    res.status(500).json({
      success: false,
      error: 'Render failed',
      details: err instanceof Error ? err.message : String(err),
    })
  }
})

export default router
