import express from 'express'
import { login, authMiddleware, requireAdmin } from './auth'

const app = express()
app.use(express.json())

app.post('/login', login)

app.get('/profile', authMiddleware, (req, res) => {
  res.json({ user: (req as any).user })
})

app.get('/admin/users', authMiddleware, requireAdmin, (req, res) => {
  // TODO: fetch from database
  res.json({ users: [] })
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
})

export default app
