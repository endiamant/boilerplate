/* eslint-disable import/no-duplicates */
import express from 'express'
import path from 'path'
import cors from 'cors'
import bodyParser from 'body-parser'
import sockjs from 'sockjs'
import axios from 'axios'
import cookieParser from 'cookie-parser'
import Html from '../client/html'

let connections = []

const port = process.env.PORT || 3000
const server = express()

const { readFile, writeFile, unlink } = require('fs').promises

server.use(cors())

server.use(express.static(path.resolve(__dirname, '../dist/assets')))
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))
server.use(bodyParser.json({ limit: '50mb', extended: true }))

server.use(cookieParser())
server.use((req, res, next) => {
  res.set('x-skillcrucial-user', '7db94c19-07d8-4b07-82e3-dbb9e1fb3f31')
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
  next()
})
const saveFile = async (users) => {
  const b = await writeFile(`${__dirname}/primer.json`, JSON.stringify(users), { encoding: 'utf8' })
  return b
}
const readUsers = async () => {
  const a = await readFile(`${__dirname}/primer.json`, { encoding: 'utf8' })
    .then((data) => {
      return JSON.parse(data)
    })
    .catch(async () => {
      const { data: users } = await axios('https://jsonplaceholder.typicode.com/users')
      await saveFile(users)
      return users
    })
  return a
}
server.get('/api/v1/users', async (req, res) => {
  const users = await readUsers()
  res.json(users)
})
server.post('/api/v1/users', async (req, res) => {
  const users = await readUsers()
  const newUserBody = req.body
  const UserLength = users[users.length - 1].id
  newUserBody.id = UserLength + 1
  const newUser = [...users, newUserBody]
  saveFile(newUser)
  res.json({ status: 'success', id: newUserBody.id })
})
server.patch('/api/v1/users/:userId', async (req, res) => {
  const users = await readUsers()
  const { userId } = req.params
  const newUserBody = req.body
  const newUserArray = users.map((it) => (it.id === +userId ? Object.assign(it, newUserBody) : it))
  saveFile(newUserArray)
  res.json({ status: 'success', id: userId })
})
server.delete('/api/v1/users/:userId', async (req, res) => {
  const users = await readUsers()
  const { userId } = req.params
  users.splice(Number(userId) - 1, 1)
  saveFile(users)
  res.json({ status: 'success', id: Number(userId) })
})
server.delete('/api/v1/users', async (req, res) => {
  unlink(`${__dirname}/primer.json`)
  res.json('ok')
})

server.use('/api/', (req, res) => {
  res.status(404)
  res.end()
})

const echo = sockjs.createServer()
echo.on('connection', (conn) => {
  connections.push(conn)
  conn.on('data', async () => {})

  conn.on('close', () => {
    connections = connections.filter((c) => c.readyState !== 3)
  })
})

server.get('/', (req, res) => {
  // const body = renderToString(<Root />);
  const title = 'Server side Rendering'
  res.send(
    Html({
      body: '',
      title
    })
  )
})

server.get('/*', (req, res) => {
  const initialState = {
    location: req.url
  }

  return res.send(
    Html({
      body: '',
      initialState
    })
  )
})

const app = server.listen(port)

echo.installHandlers(app, { prefix: '/ws' })

// eslint-disable-next-line no-console
console.log(`Serving at http://localhost:${port}`)
